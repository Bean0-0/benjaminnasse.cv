(() => {
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');

  document.querySelectorAll('details.folder').forEach(folder => {
    const summary = folder.querySelector(':scope > summary');
    const files = folder.querySelector(':scope > .folder-files');
    let expanded = folder.open;
    let animation = null;

    function sync() {
      folder.dataset.expanded = String(expanded);
      summary.setAttribute('aria-expanded', String(expanded));
      files.inert = !expanded;
    }

    function finish() {
      if (animation) animation.cancel();
      animation = null;
      folder.open = expanded;
      delete folder.dataset.animating;
    }

    sync();
    summary.addEventListener('click', event => {
      event.preventDefault();
      const start = folder.getBoundingClientRect().height;
      expanded = !expanded;
      if (!expanded && files.contains(document.activeElement)) summary.focus();
      sync();
      finish();

      if (reducedMotion.matches || !folder.animate) return;
      const end = folder.getBoundingClientRect().height;
      // Keep native contents rendered until the closing animation completes.
      folder.open = true;
      folder.dataset.animating = '';
      const next = folder.animate([
        { height: `${start}px` },
        { height: `${end}px` },
      ], { duration: 180, easing: 'cubic-bezier(.2, 0, 0, 1)' });
      animation = next;
      next.onfinish = () => {
        if (animation !== next) return;
        animation = null;
        folder.open = expanded;
        delete folder.dataset.animating;
      };
    });

    // Keep state correct if the browser opens a folder for find-in-page.
    folder.addEventListener('toggle', () => {
      if (animation) return;
      expanded = folder.open;
      sync();
    });
    reducedMotion.addEventListener('change', () => {
      if (reducedMotion.matches) finish();
    });
  });
})();
