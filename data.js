/* Number registry: every figure on a slide comes from one object, so the deck can be audited.
   values.js:  window.DECK_DATA = { values: { "tokens.before": { v: 1240000, f: "mn1", label: "Önce", src: "ccusage, 3-9 Kasım" } } }
   slide:      <span data-num="tokens.before"></span>   (text is filled here; count-up animates from it)
   audit:      DeckData.audit() -> { figures, missing, raw }  ("raw" = digits typed into slide text outside data-num)
   Formats are Turkish: decimal comma, thousands dot, % before the number. */
(function () {
  'use strict';
  const src = (window.DECK_DATA && window.DECK_DATA.values) || {};
  const fixed = (v, nd) => Math.abs(v).toFixed(nd);
  const group = (s) => s.replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  const num = (v, nd) => { const [i, d] = fixed(v, nd).split('.'); return group(i) + (d ? ',' + d : ''); };
  const minus = (v, nd) => (v < 0 && Number(fixed(v, nd)) !== 0 ? '−' : '');
  const signed = (v, nd) => (Number(fixed(v, nd)) === 0 ? '' : v < 0 ? '−' : '+') + num(v, nd);
  const F = {
    n0: (v) => minus(v, 0) + num(v, 0),
    n1: (v) => minus(v, 1) + num(v, 1),
    n2: (v) => minus(v, 2) + num(v, 2),
    p0: (v) => '%' + minus(v * 100, 0) + num(v * 100, 0),          // 0.38 -> %38
    p1: (v) => '%' + minus(v * 100, 1) + num(v * 100, 1),
    s0: (v) => signed(v, 0), s1: (v) => signed(v, 1),               // +12 / −3,4
    sp0: (v) => (v < 0 ? '−%' : '+%') + num(v * 100, 0),             // −0.38 -> −%38
    pp1: (v) => signed(v * 100, 1) + ' puan',
    bin0: (v) => minus(v, 0) + num(v / 1e3, 0) + ' bin',
    bin1: (v) => minus(v, 1) + num(v / 1e3, 1) + ' bin',
    mn1: (v) => minus(v, 1) + num(v / 1e6, 1) + ' Mn',
    mn2: (v) => minus(v, 2) + num(v / 1e6, 2) + ' Mn',
    usd2: (v) => minus(v, 2) + '$' + num(v, 2),
    try0: (v) => minus(v, 0) + num(v, 0) + ' ₺',
    try2: (v) => minus(v, 2) + num(v, 2) + ' ₺',
    x1: (v) => num(v, 1) + ' kat',
    dk: (v) => num(v, 0) + ' dk',
    sn1: (v) => num(v, 1) + ' sn',
    txt: (v) => String(v),
  };
  const D = {
    formats: F,
    has: (k) => Object.prototype.hasOwnProperty.call(src, k),
    entry(k) { if (!D.has(k)) throw new Error('[data] no value for key: ' + k); return src[k]; },
    val: (k) => D.entry(k).v,
    label: (k) => D.entry(k).label || k,
    format(k, v) { const e = D.entry(k); const f = F[e.f || 'n0']; if (!f) throw new Error('[data] unknown format ' + e.f + ' for ' + k); return f(v == null ? e.v : v); },
    text: (k) => D.format(k),
    keys: () => Object.keys(src),
  };
  /* Fill every [data-num] under root. Unknown keys are shown loudly, never silently. */
  D.fill = function (root = document) {
    const missing = [];
    root.querySelectorAll('[data-num]').forEach((el) => {
      const k = el.dataset.num;
      if (!D.has(k)) { missing.push(k); el.textContent = '⟨' + k + '?⟩'; el.style.outline = '3px solid #c2412d'; console.error('[data] missing value: ' + k); return; }
      el.textContent = D.format(k);
      el.dataset.v = D.val(k);
    });
    return missing;
  };
  /* Audit: every figure shown, missing keys, and digits typed by hand into slide text (mark deliberate ones with data-raw). */
  D.audit = function (root = document) {
    const figures = [], raw = [], missing = [];
    const slides = Array.from(root.querySelectorAll('.slide'));
    slides.forEach((s, i) => {
      s.querySelectorAll('[data-num]').forEach((el) => {
        const k = el.dataset.num;
        if (!D.has(k)) { missing.push({ slide: i + 1, key: k }); return; }
        const e = src[k];
        figures.push({ slide: i + 1, key: k, value: e.v, text: D.format(k), src: e.src || '' });
      });
      const walker = document.createTreeWalker(s, NodeFilter.SHOW_TEXT);
      for (let n = walker.nextNode(); n; n = walker.nextNode()) {
        if (!/\d/.test(n.textContent)) continue;
        const p = n.parentElement;
        if (!p || p.closest('[data-num], [data-raw], .notes, .folio, script, style, svg[data-chart-svg], .pen-svg')) continue;
        raw.push({ slide: i + 1, text: n.textContent.trim().slice(0, 80) });
      }
    });
    return { figures, missing, raw };
  };
  window.DeckData = D;
})();
