/* Kafka slaytı sahnesi: soguk-zincir.telemetri konusunun 12 bölümü, kavşak fotoğrafındaki gerçek otoyolun üstüne
   12 paralel şerit olarak çizilir; iletiler şeritlerde akan ışıklardır ve şeridin sonundaki Flink görevine girer.
   Adımlar soldaki hesapla eşzamanlıdır: 1 ortalama hız, 2 bayram (4 kat), 3 üçüncü yıl, 4 Flink durur ve birikim
   456 bine çıkar (şeritlerin sonu kırmızıya döner), 5 on görev yeniden çalışır ve birikim erir.
   Sahne zamanı hızlandırılmıştır (birikim 4 sn'de dolar, 3 sn'de erir); sayılar values.js'ten.
   Şeritler her modda çizilir (statik, PDF ve PPTX'te de görünür); akış yalnız canlı modda. */
(function () {
  'use strict';
  const sl = document.getElementById('kafka');
  const svg = document.getElementById('k-yol');
  if (!sl || !svg || !window.Deck) return;
  const NS = 'http://www.w3.org/2000/svg', D = window.DeckData;
  const mk = (ad, at, ust) => { const e = document.createElementNS(NS, ad); for (const k in at) e.setAttribute(k, at[k]); if (ust) ust.appendChild(e); return e; };

  /* yolun ekseni (fotoğraf koordinatı, medya/derece/kavsak.webp): yatay otoyol; kamera (.k-kamera) onu yataya çevirip 1,5 kat büyütür */
  const EKSEN = [[430, 466], [500, 490], [600, 514], [700, 524], [800, 531], [900, 538], [1000, 546], [1100, 560], [1200, 575], [1300, 588], [1400, 596], [1452, 599]];
  const N = 12, ARA = 4.3;
  function egri(p) {   // Catmull-Rom → kübik Bézier
    let d = `M${p[0][0]},${p[0][1]}`;
    for (let i = 0; i < p.length - 1; i++) {
      const a = p[Math.max(0, i - 1)], b = p[i], c = p[i + 1], e = p[Math.min(p.length - 1, i + 2)];
      d += ` C${(b[0] + (c[0] - a[0]) / 6).toFixed(1)},${(b[1] + (c[1] - a[1]) / 6).toFixed(1)} ${(c[0] - (e[0] - b[0]) / 6).toFixed(1)},${(c[1] - (e[1] - b[1]) / 6).toFixed(1)} ${c[0]},${c[1]}`;
    }
    return d;
  }
  function kaydir(p, o) {   // eksene dik o px kaydırılmış nokta dizisi
    return p.map((q, i) => {
      const a = p[Math.max(0, i - 1)], b = p[Math.min(p.length - 1, i + 1)];
      const dx = b[0] - a[0], dy = b[1] - a[1], L = Math.hypot(dx, dy);
      return [+(q[0] - dy / L * o).toFixed(1), +(q[1] + dx / L * o).toFixed(1)];
    });
  }
  const gSerit = svg.querySelector('.k-seritler'), gLag = svg.querySelector('.k-lag'), gGorev = svg.querySelector('.k-gorevler');
  const seritler = [];
  for (let i = 0; i < N; i++) {
    const p = kaydir(EKSEN, (i - (N - 1) / 2) * ARA), d = egri(p);
    const yol = mk('path', { d, class: 'serit' }, gSerit);
    const lag = mk('path', { d, class: 'lag' }, gLag);
    const L = yol.getTotalLength(), uc = p[p.length - 1];
    lag.setAttribute('stroke-dasharray', `0 ${(L + 1).toFixed(1)}`);
    mk('rect', { x: uc[0] + 3, y: uc[1] - 2.4, width: 4.8, height: 4.8, rx: 1, class: 'gorev' }, gGorev);
    seritler.push({ yol, lag, L, w: 0 });
  }
  if (Deck.mode !== 'live') return;

  /* ------------------------------------------------ akış (yalnız canlı) */
  const katman = svg.querySelector('.k-parca');
  const agirlik = seritler.map((_, i) => 0.8 + 0.4 * Math.abs(Math.sin(i * 2.7 + 1)));   // anahtar dağılımı birebir eşit değil
  const toplamA = agirlik.reduce((a, b) => a + b, 0);
  const HIZ = [D.val('k.ort'), D.val('k.ort'), D.val('k.tepe'), D.val('k.uc'), D.val('k.uc'), D.val('k.uc')];
  const BIRIKIM = D.val('k.birikim'), DOLMA = 4, ERIME = 3, LAG_MAX = 470;
  const no = Deck.slides.indexOf(sl) + 1;
  const $ = (id) => document.getElementById(id);
  let parca = [], acc = 0, son = performance.now(), adim = -1, adimBas = 0, biriken = 0, erimeBas = 0, erimeT = 0;

  function serit() {
    let r = Math.random() * toplamA;
    for (let i = 0; i < agirlik.length; i++) { r -= agirlik[i]; if (r <= 0) return i; }
    return agirlik.length - 1;
  }
  function etiket(metin) { if ($('k-et').textContent !== metin) $('k-et').textContent = metin; }
  function sifirla() { parca.forEach((x) => x.el.remove()); parca = []; biriken = 0; }

  function kare(simdi) {
    requestAnimationFrame(kare);
    const st = Deck.state();
    if (st.slide !== no) { if (parca.length || biriken) sifirla(); adim = -1; son = simdi; return; }
    const dt = Math.min(0.05, (simdi - son) / 1000);
    son = simdi;
    if (st.step !== adim) {
      if (st.step === 5) { erimeBas = biriken; erimeT = simdi; }
      if (st.step < 4 || (st.step === 4 && adim !== 4)) biriken = 0;
      adim = st.step; adimBas = simdi;
    }
    const gecen = (simdi - adimBas) / 1000, durdu = adim === 4;
    sl.classList.toggle('k-durdu', durdu);
    if (adim === 4) biriken = Math.min(BIRIKIM, BIRIKIM * gecen / DOLMA);
    if (adim === 5) biriken = Math.max(0, erimeBas * (1 - (simdi - erimeT) / 1000 / ERIME));
    if (adim >= 6) biriken = 0;
    const hiz = HIZ[Math.min(adim, 5)];
    etiket(adim <= 1 ? 'Ortalama akış' : adim === 2 ? 'Bayram, 4 katı' : adim === 3 ? 'Üçüncü yıl tepesi' :
      adim === 4 ? 'Flink durdu, birikiyor:' : biriken > 0 ? '10 görev çalışıyor, eriyor:' : 'Birikim eridi');
    $('k-biriken').textContent = adim >= 4 ? D.formats.n0(biriken) : D.formats.n0(hiz) + '/sn';
    const oran = biriken / BIRIKIM;
    seritler.forEach((s, i) => {
      s.w = Math.min(s.L - 20, LAG_MAX * oran * agirlik[i] / 1.2);
      s.lag.setAttribute('stroke-dasharray', `0 ${(s.L - s.w).toFixed(1)} ${s.w.toFixed(1)} 1`);
    });
    acc += dt * 1.4 * Math.sqrt(hiz);
    while (acc >= 1) {
      acc -= 1;
      const i = serit(), el = mk('circle', { r: 2.9, class: adim >= 2 ? 'tepe' : '' }, katman);
      parca.push({ el, i, d: 0 });
    }
    for (let j = parca.length - 1; j >= 0; j--) {
      const p = parca[j], s = seritler[p.i];
      p.d += dt * 260;
      const hedef = durdu || s.w > 2 ? s.L - s.w : s.L;
      if (p.d >= hedef) { p.el.remove(); parca.splice(j, 1); continue; }
      const q = s.yol.getPointAtLength(p.d);
      p.el.setAttribute('cx', q.x.toFixed(1)); p.el.setAttribute('cy', q.y.toFixed(1));
    }
  }
  requestAnimationFrame(kare);
})();
