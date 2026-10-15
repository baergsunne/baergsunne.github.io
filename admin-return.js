/* Fixed preview return target only. No credentials, storage or arbitrary URLs. */
(() => {
  'use strict';
  function applyReturnTarget() {
    const link = document.querySelector('a[href="./#live"],a[data-admin-live-return]');
    if (!link) return;
    link.dataset.adminLiveReturn = 'true';
    const values = new URLSearchParams(location.search).getAll('return');
    const preview = values.length === 1 && values[0] === 'nav-work10';
    link.setAttribute('href', preview
      ? 'https://baergsunne-nav-work10-20261015.baergsunne-poker-2026.workers.dev/#live'
      : './#live');
    link.referrerPolicy = 'no-referrer';
  }
  applyReturnTarget();
  window.addEventListener('pageshow', applyReturnTarget);
})();
