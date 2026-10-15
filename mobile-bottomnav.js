/* iPhone-friendly, scroll-direction-aware navigation. Presentation only. */
(() => {
  'use strict';
  const narrow = window.matchMedia('(max-width:800px)');
  const cls = 'bp-bottomnav-hidden';
  let lastY = Math.max(0, window.scrollY);
  let pending = false;
  const show = () => document.body.classList.remove(cls);
  const update = () => {
    pending = false;
    const y = Math.max(0, window.scrollY);
    const delta = y - lastY;
    lastY = y;
    if (!narrow.matches || y < 70) { show(); return; }
    if (Math.abs(delta) < 7) return;
    if (delta > 0) document.body.classList.add(cls);
    else show();
  };
  window.addEventListener('scroll', () => {
    if (!pending) { pending = true; requestAnimationFrame(update); }
  }, { passive: true });
  window.addEventListener('hashchange', () => { show(); lastY = Math.max(0, window.scrollY); });
  window.addEventListener('resize', () => { if (!narrow.matches) show(); lastY = Math.max(0, window.scrollY); });
  document.addEventListener('click', e => { if (e.target.closest('.bottomnav')) show(); });
  document.addEventListener('focusin', e => { if (e.target.closest('.bottomnav')) show(); });
})();
