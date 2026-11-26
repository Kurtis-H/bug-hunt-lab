import { bug } from './lab.js';

const result = document.getElementById('subscribe-result');

// --- email field (A11Y-2) ---
const field = document.getElementById('email-field');
if (bug('A11Y-2')) {
  field.innerHTML = '<input id="news-email" type="email" placeholder="you@example.com">';
} else {
  field.innerHTML =
    '<label for="news-email">Email address</label><input id="news-email" type="email" placeholder="you@example.com" autocomplete="email">';
}

// --- subscribe control (A11Y-1) ---
function subscribe() {
  const email = document.getElementById('news-email').value.trim();
  result.textContent = email.includes('@') ? `Subscribed ${email}.` : 'Enter your email address first.';
}
const slot = document.getElementById('subscribe-slot');
if (bug('A11Y-1')) {
  const div = document.createElement('div');
  div.className = 'fake-button';
  div.textContent = 'Subscribe';
  div.addEventListener('click', subscribe); // looks like a button, but no keyboard access or role
  slot.appendChild(div);
} else {
  const button = document.createElement('button');
  button.type = 'button';
  button.textContent = 'Subscribe';
  button.addEventListener('click', subscribe);
  slot.appendChild(button);
}

// --- terms dialog (A11Y-3) ---
const opener = document.getElementById('open-terms');
const modalSlot = document.getElementById('modal-slot');
const TERMS = '<h2 id="terms-title">Newsletter terms</h2><p>We send one email a month. Unsubscribe any time.</p>';

if (bug('A11Y-3')) {
  // A div pretending to be a modal: focus stays behind it and Escape does nothing.
  modalSlot.innerHTML = `<div class="modal-overlay" hidden><div class="modal-box">${TERMS}<button type="button" class="close">Close</button></div></div>`;
  const overlay = modalSlot.querySelector('.modal-overlay');
  opener.addEventListener('click', () => { overlay.hidden = false; });
  overlay.querySelector('.close').addEventListener('click', () => { overlay.hidden = true; });
} else {
  // Native <dialog>: showModal() moves focus in, traps it, closes on Escape,
  // and focus returns to the opener when it closes.
  modalSlot.innerHTML = `<dialog aria-labelledby="terms-title">${TERMS}<form method="dialog"><button>Close</button></form></dialog>`;
  const dialog = modalSlot.querySelector('dialog');
  opener.addEventListener('click', () => dialog.showModal());
  dialog.addEventListener('close', () => opener.focus());
}
