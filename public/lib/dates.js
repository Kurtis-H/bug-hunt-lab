// Date helpers. Inputs and outputs are 'YYYY-MM-DD' strings from <input type="date">.

function parts(str) {
  const [y, m, d] = str.split('-').map(Number);
  return { y, m, d };
}

function iso(date) {
  const p = (n) => String(n).padStart(2, '0');
  return `${date.getFullYear()}-${p(date.getMonth() + 1)}-${p(date.getDate())}`;
}

/** Age in whole years on `today`. */
export function ageOn(birth, today, bug = () => false) {
  const b = parts(birth);
  const t = parts(today);
  let years = t.y - b.y;
  if (!bug('DATES-1') && (t.m < b.m || (t.m === b.m && t.d < b.d))) years -= 1;
  return years;
}

/** Same day next month, clamped to the end of shorter months (Jan 31 -> Feb 28/29). */
export function addMonths(start, months, bug = () => false) {
  const { y, m, d } = parts(start);
  if (bug('DATES-2')) {
    const date = new Date(y, m - 1, d);
    date.setMonth(date.getMonth() + months); // JS rolls Feb 31 over into March
    return iso(date);
  }
  const target = new Date(y, m - 1 + months, 1);
  const lastDay = new Date(target.getFullYear(), target.getMonth() + 1, 0).getDate();
  target.setDate(Math.min(d, lastDay));
  return iso(target);
}

/** 'March 1, 2026' in the user's own time zone. */
export function formatLong(str, bug = () => false) {
  // new Date('2026-03-01') is midnight UTC - the evening before in the Americas.
  const date = bug('DATES-3') ? new Date(str) : new Date(parts(str).y, parts(str).m - 1, parts(str).d);
  return date.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
}
