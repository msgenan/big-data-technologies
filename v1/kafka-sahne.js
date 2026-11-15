/* Kafka slaytı sahnesi: soguk-zincir.telemetri konusunun 12 bölümü şerit olarak. İletiler araç anahtarına göre
   şeritlere düşer ve Flink görevine akar. Adımlar soldaki hesapla eşzamanlıdır: 1 ortalama hız, 2 bayram (4 kat),
   3 üçüncü yıl, 4 Flink durur ve birikim 456 bine çıkar, 5 on görev yeniden çalışır ve birikim erir.
   Sahne zamanı hızlandırılmıştır (birikim 4 sn'de dolar, 3 sn'de erir); sayılar values.js'ten. Yalnız canlı modda. */
(function () {
  'use strict';
  const sl = document.getElementById('kafka');
  if (!sl || !window.Deck || Deck.mode !== 'live') return;
  const NS = 'http://www.w3.org/2000/svg', D = window.DeckData;
  const svg = document.getElementById('k-sahne'), katman = svg.querySelector('.k-parca');
  const seritler = Array.from(svg.querySelectorAll('.serit')).map((g) => ({ lag: g.querySelector('.lag'), y: +g.querySelector('line').getAttribute('y1') }));
  const agirlik = seritler.map((_, i) => 0.8 + 0.4 * Math.abs(Math.sin(i * 2.7 + 1)));   // anahtar dağılımı birebir eşit değil
  const toplamA = agirlik.reduce((a, b) => a + b, 0);
  const HIZ = [D.val('k.ort'), D.val('k.ort'), D.val('k.tepe'), D.val('k.uc'), D.val('k.uc'), D.val('k.uc')];
  const BIRIKIM = D.val('k.birikim'), DOLMA = 4, ERIME = 3, UC = 440, LAG_MAX = 300;
  const no = Deck.slides.indexOf(sl) + 1;
  const $ = (id) => document.getElementById(id);
  let parca = [], acc = 0, son = performance.now(), adim = -1, adimBas = 0, biriken = 0, erimeBas = 0, erimeT = 0;

  function serit() {   // ağırlıklı rastgele şerit
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
      if (st.step < 4) biriken = 0;
      if (st.step === 4 && adim !== 4) biriken = 0;
      adim = st.step; adimBas = simdi;
    }
    const gecen = (simdi - adimBas) / 1000;
    const durdu = adim === 4;
    svg.classList.toggle('durdu', durdu);
    if (adim === 4) biriken = Math.min(BIRIKIM, BIRIKIM * gecen / DOLMA);
    if (adim === 5) biriken = Math.max(0, erimeBas * (1 - (simdi - erimeT) / 1000 / ERIME));
    if (adim >= 6) biriken = 0;
    const hiz = HIZ[Math.min(adim, 5)];
    etiket(adim <= 1 ? 'Ortalama akış' : adim === 2 ? 'Bayram, 4 katı' : adim === 3 ? 'Üçüncü yıl tepesi' :
      adim === 4 ? 'Flink durdu, birikiyor:' : biriken > 0 ? '10 görev çalışıyor, eriyor:' : 'Birikim eridi');
    $('k-biriken').textContent = adim >= 4 ? D.formats.n0(biriken) : D.formats.n0(hiz) + '/sn';
    const oran = biriken / BIRIKIM;
    seritler.forEach((s, i) => {
      const w = LAG_MAX * oran * agirlik[i] / 1.2;
      s.lag.setAttribute('x', (UC - w).toFixed(1)); s.lag.setAttribute('width', w.toFixed(1));
      s.w = w;
    });
    acc += dt * 1.2 * Math.sqrt(hiz);
    while (acc >= 1) {
      acc -= 1;
      const i = serit(), el = document.createElementNS(NS, 'circle');
      el.setAttribute('r', 5); el.setAttribute('cy', seritler[i].y);
      if (adim >= 2) el.classList.add('tepe');
      katman.appendChild(el);
      parca.push({ el, i, x: 20 });
    }
    for (let j = parca.length - 1; j >= 0; j--) {
      const p = parca[j];
      p.x += dt * 300;
      const hedef = durdu || seritler[p.i].w > 2 ? UC - seritler[p.i].w : 462;
      if (p.x >= hedef) { p.el.remove(); parca.splice(j, 1); continue; }
      p.el.setAttribute('cx', p.x.toFixed(1));
    }
  }
  requestAnimationFrame(kare);
})();
