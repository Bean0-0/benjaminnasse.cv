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
      toggle.checked = theme === 'dark';
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
    toggle.closest('.theme-control').hidden = false;
    toggle.addEventListener('keydown', event => {
      if (event.key === 'Enter' && !event.repeat) {
        event.preventDefault();
        toggle.click();
      }
    });
    toggle.addEventListener('change', () => {
      preference = toggle.checked ? 'dark' : 'light';
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
