import { bug } from './lab.js';

const input = document.getElementById('search');
const spinner = document.getElementById('spinner');
const results = document.getElementById('results');
const errorBox = document.getElementById('search-error');
const DEBOUNCE_MS = 250;

let latest = 0;
let timer;

function show(words) {
  results.textContent = '';
  for (const w of words) {
    const li = document.createElement('li');
    li.textContent = w;
    results.appendChild(li);
  }
}

async function search(q) {
  const id = ++latest;
  errorBox.textContent = '';
  if (!q.trim()) {
    show([]);
    spinner.hidden = true;
    return;
  }
  spinner.hidden = false;

  if (bug('SEARCH-3')) {
    // Assumes the request always succeeds: on a 500, data.results is undefined,
    // show() throws, and the spinner is never hidden.
    const res = await fetch(`/api/search?q=${encodeURIComponent(q)}`);
    const data = await res.json();
    if (!bug('SEARCH-1') && id !== latest) return;
    show(data.results);
    spinner.hidden = true;
    return;
  }

  try {
    const res = await fetch(`/api/search?q=${encodeURIComponent(q)}`);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    if (!bug('SEARCH-1') && id !== latest) return; // a newer search has started: ignore this one
    show(data.results);
  } catch {
    if (!bug('SEARCH-1') && id !== latest) return;
    show([]);
    errorBox.textContent = 'Search is unavailable right now. Please try again.';
  } finally {
    if (bug('SEARCH-1') || id === latest) spinner.hidden = true;
  }
}

input.addEventListener('input', () => {
  if (bug('SEARCH-2')) {
    search(input.value); // a request on every keystroke
    return;
  }
  clearTimeout(timer);
  timer = setTimeout(() => search(input.value), DEBOUNCE_MS);
});
