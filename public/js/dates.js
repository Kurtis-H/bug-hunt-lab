import { addMonths, ageOn, formatLong } from '/lib/dates.js';
import { bug } from './lab.js';

const $ = (id) => document.getElementById(id);

function localToday() {
  const d = new Date();
  const p = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}

$('today').value = localToday();

function updateAge() {
  const birth = $('birth').value;
  const today = $('today').value;
  $('age-out').textContent = birth && today ? String(ageOn(birth, today, bug)) : '-';
}

function updateRenewal() {
  const start = $('start').value;
  $('renewal-out').textContent = start ? addMonths(start, 1, bug) : '-';
}

function updateShip() {
  const ship = $('ship').value;
  $('ship-out').textContent = ship ? `Your order ships on ${formatLong(ship, bug)}.` : '-';
}

$('birth').addEventListener('input', updateAge);
$('today').addEventListener('input', updateAge);
$('start').addEventListener('input', updateRenewal);
$('ship').addEventListener('input', updateShip);
