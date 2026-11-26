import { validateSignup } from '/lib/validation.js';
import { bug } from './lab.js';

const form = document.getElementById('signup');
const submit = document.getElementById('submit');
const result = document.getElementById('result');
const FIELDS = ['name', 'email', 'password', 'confirm', 'age'];

function showErrors(errors) {
  for (const f of FIELDS) {
    const el = document.getElementById(`${f}-error`);
    if (bug('SIGNUP-3')) {
      if (errors[f]) el.textContent = errors[f]; // never clears old messages
    } else {
      el.textContent = errors[f] ?? '';
    }
    document.getElementById(f).setAttribute('aria-invalid', errors[f] ? 'true' : 'false');
  }
}

form.addEventListener('submit', async (event) => {
  event.preventDefault();
  result.textContent = '';
  result.className = '';
  const data = Object.fromEntries(new FormData(form));
  const { ok, errors } = validateSignup(data, bug);
  showErrors(errors);
  if (!ok) return;

  if (!bug('SIGNUP-4')) submit.disabled = true;
  try {
    const res = await fetch('/api/signup', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    const body = await res.json();
    if (res.ok) {
      result.textContent = `Welcome, ${body.name}! Your account was created.`;
      result.className = 'success';
    } else {
      showErrors(body.errors ?? {});
      result.textContent = 'Please fix the errors above.';
      result.className = 'error';
    }
  } catch {
    result.textContent = 'Network error. Please try again.';
    result.className = 'error';
  } finally {
    submit.disabled = false;
  }
});
