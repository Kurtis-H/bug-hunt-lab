#!/usr/bin/env node
// Bug-detection scorecard: how many of the lab's bugs does a test suite actually catch?
//
// 1. Runs the suite against the CORRECT app. It must pass, or the suite is reporting
//    false alarms and the scorecard stops.
// 2. Runs the suite once per bug, with only that bug switched on. A bug counts as
//    "caught" if at least one test fails consistently. Every failing test gets one
//    retry: a real bug fails both times, while a test that only failed because of timing
//    noise passes on retry, is reported as flaky, and does NOT count as a catch.
//
// This is mutation testing: the bugs are hand-written "mutants" of the correct code.
//
//   npm run scorecard                          # scores your suite in tests/
//   npm run scorecard -- --tests solutions/e2e # scores the reference suite
//   npm run scorecard -- --only CART-1,CART-2  # just some bugs
//   npm run scorecard -- --min-score 100       # fail unless every bug is caught

import { spawn } from 'node:child_process';
import { mkdtemp, readFile, rm, writeFile, appendFile } from 'node:fs/promises';
import { availableParallelism, tmpdir } from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { parseArgs } from 'node:util';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const BUGS = JSON.parse(await readFile(path.join(ROOT, 'app', 'bugs.json'), 'utf8'));

const { values: args } = parseArgs({
  options: {
    tests: { type: 'string', default: 'tests' },
    only: { type: 'string' },
    // Too many browsers at once on a small machine causes timeouts that look like catches.
    concurrency: { type: 'string', default: String(Math.max(1, Math.floor(availableParallelism() / 2))) },
    workers: { type: 'string', default: '2' },
    'base-port': { type: 'string', default: '4100' },
    'min-score': { type: 'string', default: '0' },
    out: { type: 'string', default: 'scorecard.md' },
  },
});

const selected = args.only
  ? BUGS.filter((b) => args.only.split(',').map((s) => s.trim().toUpperCase()).includes(b.id))
  : BUGS;
const tmp = await mkdtemp(path.join(tmpdir(), 'scorecard-'));

// --- helpers ------------------------------------------------------------------

function startServer(port, bugs) {
  const child = spawn(process.execPath, ['app/server.mjs'], {
    cwd: ROOT,
    env: { ...process.env, PORT: String(port), BUGS: bugs, ALLOW_TOGGLE: '0' },
    stdio: ['ignore', 'ignore', 'pipe'],
  });
  let stderr = '';
  child.stderr.on('data', (d) => (stderr += d));
  return { child, stderr: () => stderr };
}

async function waitHealthy(port, server) {
  for (let i = 0; i < 100; i++) {
    if (server.child.exitCode !== null) throw new Error(`server exited: ${server.stderr()}`);
    try {
      if ((await fetch(`http://127.0.0.1:${port}/api/health`)).ok) return;
    } catch {
      /* not up yet */
    }
    await new Promise((r) => setTimeout(r, 100));
  }
  throw new Error(`server on port ${port} did not start`);
}

function runPlaywright(port, jsonFile) {
  return new Promise((resolve) => {
    const cli = ['playwright', 'test', '--reporter=json', `--workers=${args.workers}`, '--retries=1'];
    const child = spawn('npx', cli, {
      cwd: ROOT,
      env: {
        ...process.env,
        TEST_DIR: args.tests,
        BASE_URL: `http://127.0.0.1:${port}`,
        PLAYWRIGHT_JSON_OUTPUT_NAME: jsonFile,
        CI: '', // allow test.only etc. to behave as in local runs
      },
      stdio: ['ignore', 'ignore', 'pipe'],
    });
    let stderr = '';
    child.stderr.on('data', (d) => (stderr += d));
    child.on('close', (code) => resolve({ code, stderr }));
  });
}

/** Titles of tests whose final outcome is `status` ('unexpected' = failed even on retry). */
function titlesWith(report, status) {
  const titles = [];
  const walk = (suite, trail) => {
    for (const s of suite.suites ?? []) walk(s, [...trail, s.title]);
    for (const spec of suite.specs ?? []) {
      if (spec.tests.some((t) => t.status === status)) {
        titles.push([...trail.slice(1), spec.title].filter(Boolean).join(' › '));
      }
    }
  };
  for (const s of report.suites ?? []) walk(s, [s.title]);
  return titles;
}

async function runAgainst(bugs, port, label) {
  const server = startServer(port, bugs);
  try {
    await waitHealthy(port, server);
    const jsonFile = path.join(tmp, `${label}.json`);
    const { stderr } = await runPlaywright(port, jsonFile);
    let report;
    try {
      report = JSON.parse(await readFile(jsonFile, 'utf8'));
    } catch {
      throw new Error(`Playwright produced no report for ${label}:\n${stderr.slice(-2000)}`);
    }
    const { expected = 0, unexpected = 0, flaky = 0 } = report.stats ?? {};
    return {
      passed: expected,
      failed: unexpected,
      flaky,
      failures: titlesWith(report, 'unexpected'),
      flakyTitles: titlesWith(report, 'flaky'),
      errors: report.errors ?? [],
    };
  } finally {
    server.child.kill();
  }
}

async function pool(items, size, fn) {
  const results = new Array(items.length);
  let next = 0;
  await Promise.all(
    Array.from({ length: Math.min(size, items.length) }, async () => {
      while (next < items.length) {
        const i = next++;
        results[i] = await fn(items[i], i);
      }
    }),
  );
  return results;
}

// --- main -----------------------------------------------------------------------

const basePort = Number(args['base-port']);
console.log(`Scoring suite "${args.tests}" against ${selected.length} bugs\n`);

process.stdout.write('Baseline (all bugs off)... ');
const baseline = await runAgainst('none', basePort, 'baseline');
const total = baseline.passed + baseline.failed + baseline.flaky;
if (total === 0) {
  console.log('no tests found.');
  console.error(`\nNo tests ran from "${args.tests}". ${baseline.errors.map((e) => e.message).join('\n')}`);
  process.exit(2);
}
if (baseline.failed > 0) {
  console.log(`${baseline.failed} of ${total} tests FAILED.`);
  console.error('\nYour tests must pass against the correct app before bugs can be scored.');
  console.error('These tests fail even with every bug switched off (false alarms):');
  for (const t of baseline.failures) console.error(`  ✘ ${t}`);
  process.exit(2);
}
console.log(`${total} tests pass. ✓`);
if (baseline.flaky) {
  console.log(`⚠️  ${baseline.flaky} passed only on retry (flaky): ${baseline.flakyTitles.join('; ')}`);
}
console.log('');

const results = await pool(selected, Number(args.concurrency), async (bug, i) => {
  const r = await runAgainst(bug.id, basePort + 1 + i, bug.id);
  const caught = r.failed > 0;
  const noise = r.flaky ? ` [${r.flaky} flaky, ignored]` : '';
  console.log(`${caught ? '✅ caught' : '❌ missed'}  ${bug.id.padEnd(9)} ${caught ? `(${r.failed} failing)` : ''}${noise}`);
  return { bug, caught, failures: r.failures, flaky: r.flaky };
});

const caught = results.filter((r) => r.caught).length;
const score = Math.round((caught / results.length) * 100);

const md = [
  '## 🐞 Bug Hunt Lab scorecard',
  '',
  `Suite \`${args.tests}\` (${total} tests) caught **${caught} of ${results.length} bugs (${score}%)**.`,
  '',
  '| Bug | Challenge | Category | Result | Caught by |',
  '|---|---|---|---|---|',
  ...results.map(({ bug, caught: c, failures }) =>
    `| ${bug.id} | ${bug.challenge} | ${bug.category} | ${c ? '✅ caught' : '❌ missed'} | ${
      c ? failures.slice(0, 2).map((t) => t.replaceAll('|', '\\|')).join('<br>') + (failures.length > 2 ? ` +${failures.length - 2} more` : '') : `💡 ${bug.hint}`
    } |`,
  ),
  '',
].join('\n');

await writeFile(path.resolve(ROOT, args.out), md);
if (process.env.GITHUB_STEP_SUMMARY) await appendFile(process.env.GITHUB_STEP_SUMMARY, md);
await rm(tmp, { recursive: true, force: true });

console.log(`\nScore: ${caught}/${results.length} bugs caught (${score}%). Details in ${args.out}`);
const missed = results.filter((r) => !r.caught);
if (missed.length) {
  console.log('\nHints for the ones that got away:');
  for (const { bug } of missed) console.log(`  ${bug.id}: ${bug.hint}`);
}
process.exit(score >= Number(args['min-score']) ? 0 : 1);
