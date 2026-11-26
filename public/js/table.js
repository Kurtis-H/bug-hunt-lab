import { sortRows } from '/lib/table.js';
import { bug } from './lab.js';

const SIZE = 5;
let page = 1;
let q = '';
let rows = [];
let totalPages = 0;
let sort = null; // { key, dir }

const tbody = document.getElementById('rows');
const info = document.getElementById('page-info');
const prev = document.getElementById('prev');
const next = document.getElementById('next');

function render() {
  const view = sort ? sortRows(rows, sort.key, sort.dir, bug) : rows;
  tbody.textContent = '';
  for (const p of view) {
    const tr = document.createElement('tr');
    tr.innerHTML = '<td class="name"></td><td></td><td class="num price"></td>';
    tr.children[0].textContent = p.name;
    tr.children[1].textContent = p.category;
    tr.children[2].textContent = `$${p.price.toFixed(2)}`;
    tbody.appendChild(tr);
  }
  if (!view.length) tbody.innerHTML = '<tr><td colspan="3">No products found.</td></tr>';
  info.textContent = totalPages ? `Page ${page} of ${totalPages}` : 'No pages';
  prev.disabled = page <= 1;
  next.disabled = page >= totalPages;
  for (const btn of document.querySelectorAll('th button')) {
    const active = sort?.key === btn.dataset.sort;
    btn.closest('th').setAttribute('aria-sort', active ? (sort.dir === 'asc' ? 'ascending' : 'descending') : 'none');
  }
}

async function load() {
  const res = await fetch(`/api/products?page=${page}&size=${SIZE}&q=${encodeURIComponent(q)}`);
  const data = await res.json();
  rows = data.items ?? [];
  totalPages = data.totalPages ?? 0;
  render();
}

for (const btn of document.querySelectorAll('th button')) {
  btn.addEventListener('click', () => {
    const key = btn.dataset.sort;
    sort = { key, dir: sort?.key === key && sort.dir === 'asc' ? 'desc' : 'asc' };
    render();
  });
}
prev.addEventListener('click', () => { page -= 1; load(); });
next.addEventListener('click', () => { page += 1; load(); });

let timer;
document.getElementById('q').addEventListener('input', (e) => {
  clearTimeout(timer);
  timer = setTimeout(() => {
    q = e.target.value;
    page = 1;
    load();
  }, 200);
});

load();
