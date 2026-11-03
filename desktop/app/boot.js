'use strict';
/* Start-up: restore the saved project or the example, then draw.
   Classic script: everything at top level is shared with the other files, which load in the order index.html lists them. */
/* ---------- boot ---------- */
let restored = false;
try {
  const raw = localStorage.getItem(KEY);
  if (raw){ loadProject(JSON.parse(raw), false); restored = true; }
} catch {}
if (!restored) loadExample();
new ResizeObserver(() => { const first = !cw; resize(); if (first) fit(); }).observe(stage);
window.addEventListener('resize', resize);
if (window.matchMedia) window.matchMedia('(prefers-color-scheme: dark)').addEventListener?.('change', draw);
document.fonts && document.fonts.ready.then(draw);
ui();
