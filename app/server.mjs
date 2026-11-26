// Bug Hunt Lab server. Zero dependencies: Node's built-in http module only.
//
//   BUGS=none node app/server.mjs        all bugs off (the correct app)
//   BUGS=all  node app/server.mjs        all bugs on
//   BUGS=CART-1,DATES-3 node app/server.mjs   just those bugs
//
// The bug set can also be changed at runtime from the lab's header bar (POST /api/bugs).

import { readFile } from 'node:fs/promises';
import http from 'node:http';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { validateSignup } from '../public/lib/validation.js';

const ROOT = path.dirname(fileURLToPath(import.meta.url));
const PUBLIC = path.resolve(ROOT, '..', 'public');
const BUG_LIST = JSON.parse(await readFile(path.join(ROOT, 'bugs.json'), 'utf8'));
const BUG_IDS = new Set(BUG_LIST.map((b) => b.id));
const PORT = Number(process.env.PORT ?? 3000);
const HOST = process.env.HOST ?? '127.0.0.1';
const ALLOW_TOGGLE = process.env.ALLOW_TOGGLE !== '0';

function parseBugs(value) {
  const v = String(value ?? 'none').trim();
  if (v === 'all') return new Set(BUG_IDS);
  if (v === 'none' || v === '') return new Set();
  const ids = v.split(',').map((s) => s.trim().toUpperCase()).filter(Boolean);
  const unknown = ids.filter((id) => !BUG_IDS.has(id));
  if (unknown.length) throw new Error(`Unknown bug id(s): ${unknown.join(', ')}`);
  return new Set(ids);
}

let enabled = parseBugs(process.env.BUGS);
const bug = (id) => enabled.has(id);

// --- data -----------------------------------------------------------------

const PRODUCTS = [
  ['USB Cable', 9.99, 'Accessories'], ['Laptop Stand', 49.5, 'Accessories'], ['Mechanical Keyboard', 100, 'Peripherals'],
  ['Wireless Mouse', 25, 'Peripherals'], ['Monitor Arm', 89, 'Accessories'], ['Webcam', 64.99, 'Peripherals'],
  ['Desk Lamp', 34, 'Office'], ['Notebook', 4.5, 'Office'], ['Gel Pens (12)', 12, 'Office'],
  ['Headphones', 199, 'Audio'], ['Bluetooth Speaker', 59, 'Audio'], ['Microphone', 129, 'Audio'],
  ['Phone Charger', 19.99, 'Accessories'], ['HDMI Adapter', 15, 'Accessories'], ['Ergonomic Chair', 349, 'Office'],
  ['Standing Desk', 499, 'Office'], ['Mouse Pad', 8, 'Accessories'], ['Laptop Sleeve', 29, 'Accessories'],
  ['Portable SSD', 119, 'Storage'], ['USB Flash Drive', 11.5, 'Storage'], ['Memory Card', 22, 'Storage'],
  ['Cable Organizer', 7.25, 'Office'], ['Smart Plug', 18, 'Home'],
].map(([name, price, category], i) => ({ id: i + 1, name, price, category }));

const SEARCH_WORDS = [
  'apple', 'apricot', 'banana', 'grape', 'grapefruit', 'pineapple', 'papaya', 'peach', 'pear',
  'plum', 'mango', 'melon', 'watermelon', 'lemon', 'lime', 'kiwi', 'cherry', 'blueberry', 'raspberry',
];

let users = [];

// --- helpers --------------------------------------------------------------

const MIME = {
  '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8', '.json': 'application/json', '.svg': 'image/svg+xml',
};

function send(res, status, body, headers = {}) {
  const isJson = typeof body !== 'string';
  res.writeHead(status, {
    'Content-Type': isJson ? 'application/json' : 'text/plain; charset=utf-8',
    'Cache-Control': 'no-store',
    ...headers,
  });
  res.end(isJson ? JSON.stringify(body) : body);
}

async function readJson(req) {
  let raw = '';
  for await (const chunk of req) {
    raw += chunk;
    if (raw.length > 100_000) throw Object.assign(new Error('Body too large'), { status: 413 });
  }
  try {
    return raw ? JSON.parse(raw) : {};
  } catch {
    throw Object.assign(new Error('Invalid JSON'), { status: 400 });
  }
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function serveStatic(res, urlPath) {
  const rel = urlPath === '/' ? 'index.html' : decodeURIComponent(urlPath).replace(/^\/+/, '');
  const file = path.resolve(PUBLIC, rel);
  // Block path traversal (e.g. /../app/server.mjs) - only files inside public/ are served.
  if (!file.startsWith(PUBLIC + path.sep)) return send(res, 403, 'Forbidden');
  try {
    const body = await readFile(file);
    res.writeHead(200, { 'Content-Type': MIME[path.extname(file)] ?? 'application/octet-stream', 'Cache-Control': 'no-store' });
    res.end(body);
  } catch {
    send(res, 404, 'Not found');
  }
}

// --- routes ---------------------------------------------------------------

async function api(req, res, url) {
  const route = `${req.method} ${url.pathname}`;

  if (route === 'GET /api/health') return send(res, 200, { status: 'ok' });

  if (route === 'GET /api/config') {
    return send(res, 200, { enabled: [...enabled].sort(), bugs: BUG_LIST, toggle: ALLOW_TOGGLE });
  }

  if (route === 'POST /api/bugs') {
    if (!ALLOW_TOGGLE) return send(res, 403, { error: 'Bug toggling is disabled on this server' });
    const body = await readJson(req);
    try {
      enabled = parseBugs(Array.isArray(body.enabled) ? body.enabled.join(',') : body.enabled);
    } catch (e) {
      return send(res, 400, { error: e.message });
    }
    return send(res, 200, { enabled: [...enabled].sort() });
  }

  if (route === 'POST /api/reset') {
    users = [];
    return send(res, 200, { ok: true });
  }

  if (route === 'POST /api/signup') {
    const body = await readJson(req);
    const { ok, errors } = validateSignup(body, bug);
    if (!ok) return send(res, 400, { errors });
    await sleep(300); // a realistic network/database delay
    const email = String(body.email).trim().toLowerCase();
    if (users.some((u) => u.email === email)) {
      return send(res, 409, { errors: { email: 'An account with this email already exists' } });
    }
    const user = { id: users.length + 1, name: String(body.name).trim(), email };
    users.push(user);
    return send(res, 201, user);
  }

  if (route === 'GET /api/users') return send(res, 200, users);

  if (route === 'GET /api/products') {
    const page = Number(url.searchParams.get('page') ?? 1);
    const size = Number(url.searchParams.get('size') ?? 5);
    const q = (url.searchParams.get('q') ?? '').trim();

    const validPage = Number.isInteger(page) && page >= 1;
    const validSize = Number.isInteger(size) && size >= 1 && size <= 50;
    if (!validPage || !validSize) {
      if (bug('TABLE-4')) return send(res, 200, { items: [], total: 0, page, size, totalPages: 0 });
      return send(res, 400, { error: 'page must be an integer >= 1 and size an integer from 1 to 50' });
    }

    const matches = PRODUCTS.filter((p) =>
      bug('TABLE-3') ? p.name.includes(q) : p.name.toLowerCase().includes(q.toLowerCase()),
    );
    const totalPages = bug('TABLE-2') ? Math.floor(matches.length / size) : Math.ceil(matches.length / size);
    const items = page <= totalPages ? matches.slice((page - 1) * size, page * size) : [];
    return send(res, 200, { items, total: matches.length, page, size, totalPages });
  }

  if (route === 'GET /api/search') {
    const q = (url.searchParams.get('q') ?? '').trim().toLowerCase();
    // Shorter queries are slower on purpose, so responses can arrive out of order.
    await sleep(Math.max(50, 1200 - q.length * 250));
    if (q === 'error') return send(res, 500, { error: 'Search service unavailable' });
    return send(res, 200, { q, results: q ? SEARCH_WORDS.filter((w) => w.includes(q)) : [] });
  }

  return send(res, 404, { error: 'Not found' });
}

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, `http://${req.headers.host ?? 'localhost'}`);
  try {
    if (url.pathname.startsWith('/api/')) return await api(req, res, url);
    if (req.method !== 'GET') return send(res, 405, 'Method not allowed');
    return await serveStatic(res, url.pathname);
  } catch (e) {
    return send(res, e.status ?? 500, { error: e.status ? e.message : 'Internal error' });
  }
});

server.listen(PORT, HOST, () => {
  const which = enabled.size === BUG_IDS.size ? 'all' : enabled.size ? [...enabled].join(', ') : 'none';
  console.log(`Bug Hunt Lab on http://${HOST}:${PORT}  (bugs: ${which})`);
});
