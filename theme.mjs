// Apply the saved preference before paint; System follows OS changes.
(() => {
  const key = 'resolve-theme';
  const system = matchMedia('(prefers-color-scheme: dark)');
  const choices = ['system', 'light', 'dark'];
  const label = value => value[0].toUpperCase() + value.slice(1);
  let choice = 'system';
  try { choice = localStorage.getItem(key) || 'system'; } catch {}
  if (!['system', 'light', 'dark'].includes(choice)) choice = 'system';
  const apply = () => {
    document.documentElement.dataset.theme = choice === 'system' ? (system.matches ? 'dark' : 'light') : choice;
    const control = document.querySelector('#theme');
    if (control) {
      const next = choices[(choices.indexOf(choice) + 1) % choices.length];
      if (!control.querySelector('.theme-label')) {
        control.innerHTML = '<svg class="theme-icon" viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path/></svg><span class="theme-label"></span>';
      }
      const paths = {
        system: 'M4 4h16v12H4z M8 20h8 M12 16v4',
        light: 'M16 12a4 4 0 1 1-8 0 4 4 0 0 1 8 0 M12 2v2 M12 20v2 M2 12h2 M20 12h2 M5 5l1.5 1.5 M17.5 17.5 19 19 M5 19l1.5-1.5 M17.5 6.5 19 5',
        dark: 'M20.5 13.2A8.5 8.5 0 0 1 10.8 3.5 8.5 8.5 0 1 0 20.5 13.2Z'
      };
      control.querySelector('.theme-icon path').setAttribute('d', paths[choice]);
      control.querySelector('.theme-label').textContent = 'Theme: ' + label(choice);
      control.setAttribute('aria-label', 'Theme: ' + label(choice) + '. Switch to ' + label(next));
      control.title = 'Switch to ' + label(next) + ' theme';
    }
  };
  apply();
  system.addEventListener('change', apply);
  addEventListener('storage', event => {
    if (event.key !== key && event.key !== null) return;
    choice = ['light', 'dark'].includes(event.newValue) ? event.newValue : 'system';
    apply();
  });
  document.addEventListener('DOMContentLoaded', () => {
    const header = document.querySelector('header');
    if (header) {
      const measureHeader = () => document.documentElement.style.setProperty('--header-height', `${header.getBoundingClientRect().height}px`);
      measureHeader();
      new ResizeObserver(measureHeader).observe(header);
    }
    const control = document.querySelector('#theme');
    apply();
    control.addEventListener('click', () => {
      choice = choices[(choices.indexOf(choice) + 1) % choices.length];
      apply();
      try { localStorage.setItem(key, choice); } catch {}
    });
  });
})();
