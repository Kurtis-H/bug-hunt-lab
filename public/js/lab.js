// Shared by every page: loads which bugs are on and draws the lab header bar.

const res = await fetch('/api/config');
const config = await res.json();
const enabled = new Set(config.enabled);

/** True when the given bug is switched on. */
export const bug = (id) => enabled.has(id);

function header() {
  const bar = document.createElement('header');
  bar.className = 'labbar';
  const total = config.bugs.length;
  const label = enabled.size === 0 ? 'Fixed mode: all bugs off' : `Buggy mode: ${enabled.size} of ${total} bugs on`;
  bar.innerHTML = `
    <a href="/" class="brand">🐞 Bug Hunt Lab</a>
    <span class="mode ${enabled.size ? 'buggy' : 'fixed'}" data-testid="lab-mode"></span>
    <span class="spacer"></span>`;
  bar.querySelector('.mode').textContent = label;
  if (config.toggle) {
    for (const [text, value] of [['Bugs on', 'all'], ['Bugs off', 'none']]) {
      const b = document.createElement('button');
      b.type = 'button';
      b.className = 'lab-toggle';
      b.textContent = text;
      b.addEventListener('click', async () => {
        await fetch('/api/bugs', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ enabled: value }),
        });
        location.reload();
      });
      bar.appendChild(b);
    }
  }
  document.body.prepend(bar);
}

header();
export { config };
