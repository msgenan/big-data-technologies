/* Güvenlik slaytı sahnesi: kodla çizilmiş raf fotoğrafı (gerçek kişi yok). Döngü 8 sn: 0-1,5 sn yüz net,
   1,5-2,5 sn bulanıklaşır ve kesik çerçeve belirir, sonra bulanık kalır. Statik modda bulanık hâl çizilir. */
(function () {
  'use strict';
  const sl = document.getElementById('guvenlik');
  const svg = sl && sl.querySelector('svg.yuz');
  if (!svg || !window.Deck) return;
  const NS = 'http://www.w3.org/2000/svg';
  const urunler = svg.querySelector('.urunler'), d = svg.querySelector('#bulanik-d'), kutu = svg.querySelector('.yuz-kutu');
  const renk = ['#2440d8', '#9fb0ee', '#d26a4a', '#5aa37a', '#e8b84a', '#7b86a6'];
  [[12, 46], [12, 98], [12, 150]].forEach(([x0, y], raf) => {
    let x = x0;
    while (x < 420) {
      const w = 22 + ((x * 7 + raf * 13) % 18), h = 26 + ((x * 3 + raf * 5) % 12);
      const r = document.createElementNS(NS, 'rect');
      r.setAttribute('x', x); r.setAttribute('y', y - h); r.setAttribute('width', w); r.setAttribute('height', h); r.setAttribute('rx', 3);
      r.setAttribute('fill', renk[(x + raf * 3) % renk.length]);
      urunler.appendChild(r);
      x += w + 6;
    }
    const c = document.createElementNS(NS, 'line');
    c.setAttribute('x1', 0); c.setAttribute('x2', 440); c.setAttribute('y1', y + 2); c.setAttribute('y2', y + 2); c.setAttribute('class', 'raf-c');
    urunler.appendChild(c);
  });
  const ciz = (t) => {
    const u = Math.max(0, Math.min(1, (t - 1.5) / 1));
    d.setAttribute('stdDeviation', (9 * u).toFixed(2));
    kutu.setAttribute('opacity', u.toFixed(2));
  };
  if (Deck.mode !== 'live') { ciz(8); return; }
  const no = Deck.slides.indexOf(sl) + 1, t0 = performance.now();
  (function kare(simdi) {
    requestAnimationFrame(kare);
    if (Deck.state().slide !== no) return;
    ciz(((simdi - t0) / 1000) % 8);
  })(t0);
})();
