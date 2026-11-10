/* Depolama slaytı sahnesi: Bronze, Silver, Gold kartlarının sağ yarısında 9 sn'lik döngü.
   0-4 sn akıştan küçük dosyalar Bronze'a düşer (bazıları hatalı), 4-5 sn gece birleştirme: küçükler iki büyük dosyaya
   (hedef boyut values.js dep.dosya) birleşir, 5-6,5 sn temiz veri Silver'a çıkar ve sütunlu olur, hatalılar karantinaya,
   6,5-8 sn Silver'dan Gold'a iş tablosu oluşur, 8-9 sn sönüp baştan. Zaman saf fonksiyon: aynı t aynı kare.
   Canlı modda döner; statik modda t = 7,6 karesi çizilir. */
(function () {
  'use strict';
  const sl = document.querySelector('.slide[data-title="Depolama katmanları"]');
  const katlar = sl && sl.querySelector('.katlar');
  if (!katlar || !window.Deck) return;
  const NS = 'http://www.w3.org/2000/svg', D = window.DeckData;
  const mk = (tag, at, ebeveyn) => { const e = document.createElementNS(NS, tag); for (const k in at) e.setAttribute(k, at[k]); ebeveyn.appendChild(e); return e; };
  const kart = (s) => { const e = katlar.querySelector(s); return { y: e.offsetTop, h: e.offsetHeight }; };
  let svg, G, S, B, tiles = [], bloklar = [], cubuklar = [], karantina, sutun = [];

  function kur() {
    G = kart('.k3'); S = kart('.k2'); B = kart('.k1');
    svg = mk('svg', { class: 'depo-sahne', 'data-serbest': '', width: 320, height: katlar.offsetHeight, viewBox: `0 0 320 ${katlar.offsetHeight}` }, katlar);
    for (let i = 0; i < 24; i++) {
      const r = mk('rect', { width: 18, height: 18, rx: 3, class: [3, 11, 19].includes(i) ? 'kt-hata' : 'kt-dosya' }, svg);
      tiles.push({ r, x: 12 + (i % 8) * 26, y: B.y + 14 + Math.floor(i / 8) * 24, hata: [3, 11, 19].includes(i) });
    }
    for (let j = 0; j < 2; j++) {
      const g = mk('g', {}, svg);
      const r = mk('rect', { width: 116, height: 44, rx: 4, class: 'kt-blok' }, g);
      for (let c = 1; c < 6; c++) sutun.push(mk('line', { x1: c * 19.3, y1: 4, x2: c * 19.3, y2: 40, class: 'kt-sutun' }, g));
      const t = mk('text', { x: 58, y: 29, 'text-anchor': 'middle', class: 'kt-boyut' }, g);
      t.textContent = D.format('dep.dosya') + ' MB';
      bloklar.push({ g, r, t, x: 12 + j * 132 });
    }
    karantina = mk('text', { x: 290, y: S.y + S.h / 2 + 8, 'text-anchor': 'end', class: 'kt-karantina' }, svg);
    karantina.textContent = 'karantina';
    for (let k = 0; k < 4; k++) cubuklar.push(mk('rect', { x: 40 + k * 46, width: 30, rx: 2, class: 'kt-gold' }, svg));
  }
  const ara = (t, a, b) => Math.max(0, Math.min(1, (t - a) / (b - a)));
  const yum = (u) => u * u * (3 - 2 * u);

  function ciz(t) {
    const sonma = 1 - ara(t, 8, 9);
    tiles.forEach((k, i) => {
      const gel = ara(t, i * 0.16, i * 0.16 + 0.25);
      let x = k.x, y = k.y, op = gel;
      if (!k.hata) {   // birleşme: iki bloğa doğru kay ve sön
        const b = bloklar[i % 2], u = yum(ara(t, 4, 5));
        x = k.x + (b.x + 49 - k.x) * u; y = k.y + (B.y + 22 - k.y) * u; op *= 1 - ara(t, 4.6, 5);
      } else {   // hatalı: karantinaya
        const u = yum(ara(t, 5, 6.3));
        x = k.x + (268 - k.x) * u; y = k.y + (S.y + S.h / 2 - 9 - k.y) * u; op *= 1 - ara(t, 6.3, 6.8);
      }
      k.r.setAttribute('x', x.toFixed(1)); k.r.setAttribute('y', y.toFixed(1)); k.r.setAttribute('opacity', (op * sonma).toFixed(2));
    });
    bloklar.forEach((b, j) => {
      const dog = ara(t, 4.5, 5), cik = yum(ara(t, 5, 6.3));
      const y = B.y + 12 + (S.y + 12 - (B.y + 12)) * cik;
      b.g.setAttribute('transform', `translate(${b.x},${y.toFixed(1)})`);
      b.g.setAttribute('opacity', (dog * sonma * (1 - 0.55 * ara(t, 6.6, 7.4))).toFixed(2));
    });
    sutun.forEach((l) => l.setAttribute('opacity', ara(t, 6, 6.4).toFixed(2)));
    karantina.setAttribute('opacity', (ara(t, 5.8, 6.3) * sonma).toFixed(2));
    cubuklar.forEach((c, k) => {
      const h = [30, 46, 22, 38][k] * yum(ara(t, 6.6 + k * 0.15, 7.4 + k * 0.15));
      c.setAttribute('y', (G.y + G.h - 12 - h).toFixed(1)); c.setAttribute('height', h.toFixed(1)); c.setAttribute('opacity', sonma.toFixed(2));
    });
  }

  function basla() {
    kur();
    if (Deck.mode !== 'live') { ciz(7.6); return; }
    const no = Deck.slides.indexOf(sl) + 1, t0 = performance.now();
    (function kare(simdi) {
      requestAnimationFrame(kare);
      if (Deck.state().slide !== no) return;
      ciz(((simdi - t0) / 1000) % 9);
    })(t0);
  }
  if (document.documentElement.hasAttribute('data-deck-ready')) basla();
  else new MutationObserver((m, o) => { if (document.documentElement.hasAttribute('data-deck-ready')) { o.disconnect(); basla(); } })
    .observe(document.documentElement, { attributes: true });
})();
