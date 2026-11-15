/* Mimari şema sahnesi: okların üzerinde veri noktaları akar. Her okun nokta yoğunluğu, o oktan geçen ortalama ileti
   hızının (values.js, akis.*) kareköküyle orantılıdır; günde bir gelen dosyalar (POS, dış veri) ve gece işi tek "dosya"
   olarak düşer. Adım 1 bayram: hız 4 katı. Adım 2-4: akış yalnız vurgulanan sorgu yolunda sürer.
   Yalnız canlı modda çalışır; statik, PDF ve PPTX'te şema durağandır. */
(function () {
  'use strict';
  const sl = document.getElementById('sema');
  if (!sl || !window.Deck || Deck.mode !== 'live') return;
  const NS = 'http://www.w3.org/2000/svg';
  const svg = sl.querySelector('svg.sema'), katman = svg && svg.querySelector('.parcacik');
  if (!katman) return;
  const V = (k) => window.DeckData.val(k);
  const r = { arac: V('akis.arac'), sensor: V('akis.sensor'), terminal: V('akis.terminal'), erp: V('akis.erp'), foto: V('akis.foto') };
  const HIZ = {
    'a5>mqtt': r.arac, 'mqtt>kafka': r.arac, 'a6>uc': r.sensor, 'uc>kafka': r.sensor,
    'a3>api': r.terminal, 'api>kafka': r.terminal, 'a1>dbz': r.erp, 'dbz>kafka': r.erp,
    'a4>yuk': r.foto, 'yuk>bronze': r.foto, 'a2>nifi': 'gun', 'a9>nifi': 'gun', 'nifi>bronze': 'gun',
    'kafka>flink': r.arac + r.sensor, 'flink>redis': r.arac, 'redis>alarm': 0.3,
    'kafka>bronze': r.arac + r.sensor + r.terminal + r.erp, 'kafka>neo': r.erp, 'neo>geri': 0.2,
    'spark>silver': 'gece', 'gold>trino': 0.6,
  };
  const kenar = Array.from(svg.querySelectorAll('.oklar path.ok')).map((p) => {
    const ad = p.dataset.a + '>' + p.dataset.b;
    return { ad, p, L: p.getTotalLength(), acc: Math.random(), hiz: HIZ[ad] };
  });
  const no = Deck.slides.indexOf(sl) + 1;
  let parca = [], son = performance.now();

  function izinli(adim) {
    if (adim < 2) return null;
    const g = svg.querySelector(`.vurgu[data-step="${adim}-${adim}"]`);
    return g ? new Set(Array.from(g.querySelectorAll('path')).map((p) => p.dataset.a + '>' + p.dataset.b)) : null;
  }
  function yeni(k, toplu, tepe) {
    const el = document.createElementNS(NS, toplu ? 'rect' : 'circle');
    if (toplu) { el.setAttribute('x', -10); el.setAttribute('y', -7); el.setAttribute('width', 20); el.setAttribute('height', 14); el.setAttribute('rx', 2); }
    else el.setAttribute('r', 4.5);
    if (tepe) el.classList.add('tepe');
    katman.appendChild(el);
    parca.push({ el, k, d: 0, v: toplu ? 260 : 420 });
  }
  function temizle() { parca.forEach((x) => x.el.remove()); parca = []; }

  function kare(simdi) {
    requestAnimationFrame(kare);
    const st = Deck.state();
    if (st.slide !== no) { if (parca.length) temizle(); son = simdi; return; }
    const dt = Math.min(0.05, (simdi - son) / 1000);
    son = simdi;
    const kat = st.step === 1 ? 4 : 1, izin = izinli(st.step);
    for (const k of kenar) {
      if (!k.hiz || (izin && !izin.has(k.ad))) continue;
      if (typeof k.hiz === 'string') {
        k.acc += dt / (k.hiz === 'gece' ? 8 : 6);
        if (k.acc >= 1) { k.acc -= 1; yeni(k, true, false); }
      } else {
        k.acc += dt * Math.min(18, 0.6 * Math.sqrt(k.hiz * kat));
        while (k.acc >= 1) { k.acc -= 1; yeni(k, false, kat > 1); }
      }
    }
    for (let i = parca.length - 1; i >= 0; i--) {
      const x = parca[i];
      x.d += dt * x.v;
      if (x.d >= x.k.L || (izin && !izin.has(x.k.ad))) { x.el.remove(); parca.splice(i, 1); continue; }
      const nk = x.k.p.getPointAtLength(x.d);
      x.el.setAttribute('transform', `translate(${nk.x.toFixed(1)},${nk.y.toFixed(1)})`);
    }
  }
  requestAnimationFrame(kare);
})();
