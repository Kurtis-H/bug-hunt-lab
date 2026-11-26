// Signup validation. Shared by the browser and the server, so a bug here shows up in both.
// `bug(id)` returns true when that bug is switched on.

const GOOD_EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const LOOSE_EMAIL = /.+@.+/;
export const MIN_PASSWORD = 8;

export function validateSignup(data, bug = () => false) {
  const errors = {};
  const name = String(data.name ?? '').trim();
  const email = String(data.email ?? '').trim();
  const password = String(data.password ?? '');
  const confirm = String(data.confirm ?? '');
  const age = Number(data.age);

  if (!name) errors.name = 'Name is required';

  const emailPattern = bug('SIGNUP-1') ? LOOSE_EMAIL : GOOD_EMAIL;
  if (!emailPattern.test(email)) errors.email = 'Enter a valid email address';

  const longEnough = bug('SIGNUP-2') ? password.length > MIN_PASSWORD : password.length >= MIN_PASSWORD;
  if (!longEnough) errors.password = `Password must be at least ${MIN_PASSWORD} characters`;

  if (password !== confirm) errors.confirm = 'Passwords do not match';

  if (!Number.isInteger(age) || age < 13 || age > 120) errors.age = 'Age must be a whole number from 13 to 120';

  return { ok: Object.keys(errors).length === 0, errors };
}
