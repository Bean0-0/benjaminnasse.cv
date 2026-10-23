(() => {
  const root = document.documentElement;
  const system = window.matchMedia('(prefers-color-scheme: dark)');
  const normalize = value => value === 'light' || value === 'dark' ? value : 'system';
  let preference = 'system';

  try {
    preference = normalize(localStorage.getItem('theme'));
  } catch {
    // Storage may be disabled; the current page still supports theme changes.
  }

  function apply() {
    const theme = preference === 'system' ? (system.matches ? 'dark' : 'light') : preference;
    root.dataset.theme = theme;
    root.dataset.themePreference = preference;
    const meta = document.querySelector('meta[name="theme-color"]');
    if (meta) meta.content = theme === 'dark' ? '#1e1e1e' : '#eeeeee';
    const toggle = document.getElementById('theme-toggle');
    if (toggle) {
      toggle.setAttribute('aria-checked', String(theme === 'dark'));
      toggle.title = theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode';
    }
  }

  // Run before styles load to avoid flashing the wrong saved theme.
  apply();
  system.addEventListener('change', apply);
  window.addEventListener('storage', event => {
    if (event.key === 'theme' || event.key === null) {
      preference = normalize(event.newValue);
      apply();
    }
  });

  document.addEventListener('DOMContentLoaded', () => {
    const toggle = document.getElementById('theme-toggle');
    if (!toggle) return;
    toggle.hidden = false;
    toggle.addEventListener('click', () => {
      preference = root.dataset.theme === 'dark' ? 'light' : 'dark';
      try {
        localStorage.setItem('theme', preference);
      } catch {
        // Keep the in-memory choice when persistence is unavailable.
      }
      apply();
    });
    apply();
    // Enable color transitions only after the saved initial theme is applied.
    root.classList.add('theme-ready');
  });
})();
