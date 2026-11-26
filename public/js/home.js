import { config } from './lab.js';

const CHALLENGES = {
  signup: ['Signup form', 'Validation, boundaries and form state'],
  cart: ['Shopping cart', 'Money maths, quantities and discounts'],
  table: ['Product table', 'Sorting, search, pagination and the API behind it'],
  dates: ['Dates', 'Ages, month lengths and time zones'],
  search: ['Live search', 'Race conditions, request spam and error handling'],
  a11y: ['Accessibility', 'Keyboard use, labels and dialogs'],
};

const list = document.getElementById('challenges');
for (const [key, [title, blurb]] of Object.entries(CHALLENGES)) {
  const bugs = config.bugs.filter((b) => b.challenge === key);
  const li = document.createElement('li');
  li.className = 'card';
  li.innerHTML = `<h3><a href="/${key}.html"></a></h3><p></p><p><small></small></p><details><summary>Hints</summary><ol></ol></details>`;
  li.querySelector('a').textContent = title;
  li.querySelector('p').textContent = blurb;
  li.querySelector('small').textContent = `${bugs.length} bugs hidden here`;
  for (const b of bugs) {
    const item = document.createElement('li');
    item.textContent = `${b.id}: ${b.hint}`;
    li.querySelector('ol').appendChild(item);
  }
  list.appendChild(li);
}
