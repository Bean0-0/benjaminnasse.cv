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
    const select = document.getElementById('theme-select');
    if (select) select.value = preference;
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
    const select = document.getElementById('theme-select');
    if (!select) return;
    select.closest('.theme-control').hidden = false;
    select.addEventListener('change', () => {
      preference = normalize(select.value);
      try {
        if (preference === 'system') localStorage.removeItem('theme');
        else localStorage.setItem('theme', preference);
      } catch {
        // Keep the in-memory choice when persistence is unavailable.
      }
      apply();
    });
    apply();
  });
})();
