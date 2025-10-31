// ==UserScript==
// @name         wplace.lockTheme
// @namespace    http://tampermonkey.net/
// @version      1.1
// @description  Only lock localStorage.theme to "custom-winter" on wplace.live with minimal interference
// @match        https://wplace.live/*
// @grant        none
// @run-at       document-start
// ==/UserScript==

(function () {
  'use strict';

  const LOCK_KEY = 'theme';
  const LOCK_VALUE = 'custom-winter';
  const RESTORE_INTERVAL_MS = 1000; // 可以改为 2000 或更大以更温和

  // Small payload to inject into page context (so page scripts see the native overrides)
  const pageCode = `(() => {
    try {
      const LOCK_KEY = ${JSON.stringify(LOCK_KEY)};
      const LOCK_VALUE = ${JSON.stringify(LOCK_VALUE)};

      // keep original setItem/removeItem
      const __orig_set = Storage.prototype.setItem;
      const __orig_remove = Storage.prototype.removeItem;

      // replace setItem: only block writes to LOCK_KEY; other keys behave normally
      Storage.prototype.setItem = function(key, value) {
        if (key === LOCK_KEY) {
          // ensure locked value stays; do NOT call original with other value
          try { __orig_set.call(this, LOCK_KEY, LOCK_VALUE); } catch (e) {}
          return;
        }
        return __orig_set.apply(this, arguments);
      };

      // replace removeItem: block removal of LOCK_KEY only
      Storage.prototype.removeItem = function(key) {
        if (key === LOCK_KEY) return;
        return __orig_remove.apply(this, arguments);
      };

      // ensure initial value
      try { __orig_set.call(localStorage, LOCK_KEY, LOCK_VALUE); } catch(e){}

      // periodic restore (minimal, only touches LOCK_KEY)
      setInterval(() => {
        try {
          const cur = localStorage.getItem(LOCK_KEY);
          if (cur !== LOCK_VALUE) {
            __orig_set.call(localStorage, LOCK_KEY, LOCK_VALUE);
          }
        } catch (e) {}
      }, ${RESTORE_INTERVAL_MS});

    } catch (err) {}
  })();`;

  // inject as early as possible into page context
  function inject(src) {
    try {
      const s = document.createElement('script');
      s.textContent = src;
      (document.documentElement || document.head || document.body || document).appendChild(s);
      s.parentNode && s.parentNode.removeChild(s);
    } catch (e) {}
  }

  inject(pageCode);

  // Do not override anything here in userscript sandbox to avoid double interfering.
})();
