/* Mobile navigation presentation only; routes and app data stay unchanged. */
(() => {
  'use strict';
  const narrow = window.matchMedia('(max-width:800px)');
  const cls = 'bp-bottomnav-hidden';
  const position = () => Math.min(Math.max(0, window.scrollY), Math.max(0, document.documentElement.scrollHeight - window.innerHeight));
  let lastY = position(), travel = 0, direction = 0, pending = false;
  const show = () => document.body.classList.remove(cls);
  const reset = () => { show(); lastY = position(); travel = 0; direction = 0; };
  const editing = () => {
    const el = document.activeElement;
    return !!(el?.closest('input,textarea,select,[contenteditable="true"]') || (el?.closest('.bottomnav') && el.matches(':focus-visible')));
  };
  const update = () => {
    pending = false;
    const y = position(), delta = y - lastY;
    lastY = y;
    if (!narrow.matches || y <= 70 || editing()) { reset(); return; }
    if (!delta) return; // Horizontal table gestures and Safari overscroll do not change direction.
    const next = Math.sign(delta);
    travel = next === direction ? travel + Math.abs(delta) : Math.abs(delta);
    direction = next;
    if (travel < 8) return;
    if (direction > 0) document.body.classList.add(cls);
    else show();
    travel = 0;
  };
  window.addEventListener('scroll', () => {
    if (!pending) { pending = true; requestAnimationFrame(update); }
  }, { passive: true });
  for (const event of ['hashchange', 'popstate', 'pageshow', 'resize']) window.addEventListener(event, reset);
  narrow.addEventListener('change', reset);
  document.addEventListener('click', e => { if (e.target.closest('.bottomnav,[data-action="go"],[data-action="profile"],[data-action="back"],[data-action="openyear"]')) reset(); });
  document.addEventListener('focusin', e => { if (e.target.closest('.bottomnav,input,textarea,select,[contenteditable="true"]')) reset(); });
  document.addEventListener('keydown', e => { if (e.key === 'Tab') reset(); });
  document.addEventListener('focusout', () => { lastY = position(); travel = 0; direction = 0; });
})();
