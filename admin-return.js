/* Explicit allowlisted return destinations; no arbitrary URL redirects. */
(() => {
  'use strict';
  const destinations = Object.freeze({
    'nav-work10': 'https://baergsunne-nav-work10-20261015.baergsunne-poker-2026.workers.dev/#live',
    'push-work12': 'https://baergsunne-push-work12-20261015.baergsunne-poker-2026.workers.dev/#live'
  });
  function applyReturnTarget() {
    const link = document.querySelector('a[href="./#live"],a[data-admin-live-return]');
    if (!link) return;
    link.dataset.adminLiveReturn = 'true';
    const values = new URLSearchParams(location.search).getAll('return');
    const target = values.length === 1 ? destinations[values[0]] : null;
    link.setAttribute('href', target || './#live');
    link.referrerPolicy = 'no-referrer';
  }
  applyReturnTarget();
  window.addEventListener('pageshow', applyReturnTarget);
})();
