/* Hacim slaytı, "ne olursa?": yıllık büyüme ve sezon katı kaydırıcıları. Veri Mimarı raporunun formülüyle
   (values.js, HACIM_GIRDI) bütün hacim sayıları ve çubuklar yeniden hesaplanır. Ölçek: kaydırıcılar en uçtayken
   raf fotoğrafının hacmi, böylece çubuklar büyüyüp küçülür. Slayttan çıkınca varsayılana döner. */
(function () {
  'use strict';
  const sl = document.getElementById('hacim'), G = window.HACIM_GIRDI;
  if (!sl || !G || !window.Deck || Deck.mode !== 'live') return;
  const F = window.DeckData.formats, $ = (id) => document.getElementById(id);
  const giris = { b: $('h-buyume'), s: $('h-sezon') };
  const no = Deck.slides.indexOf(sl) + 1;

  function hesap(buyume, sezonKat) {
    const mevsim = (365 - G.sezonGun + G.sezonGun * sezonKat) / 365;
    const b3 = 1 + (1 + buyume) + Math.pow(1 + buyume, 2);
    let ham = 0, sik = 0;
    const kay = {};
    for (const [k, [gb, oran]] of Object.entries(G.kaynak)) {
      const tb = gb * 365 * mevsim * b3 / 1000;
      kay[k] = tb; ham += tb; sik += tb / oran;
    }
    return { kay, ham, mevsim, b3, a4: kay.A4 / ham, kopya3: sik * 3, ec: sik * 1.25, fark: sik * 1.75 };
  }
  const EN_UST = hesap(0.40, 6).kay.A4;   // çubuk ölçeği

  function yaz(sonuc, olcekli) {
    const set = (k, metin) => sl.querySelectorAll(`[data-num="${k}"]`).forEach((e) => { e.textContent = metin; });
    set('hacim.ham', F.n0(sonuc.ham)); set('hacim.a4_pay', F.p0(sonuc.a4)); set('hacim.kopya3', F.n0(sonuc.kopya3));
    set('hacim.ec', F.n0(sonuc.ec)); set('hacim.ec_fark', F.n0(sonuc.fark)); set('hacim.mevsim', F.n2(sonuc.mevsim)); set('hacim.buyume', F.n2(sonuc.b3));
    const enBuyuk = olcekli ? EN_UST : Math.max(...Object.values(sonuc.kay));
    sl.querySelectorAll('.chart-bar .cb-row').forEach((row) => {
      const k = row.querySelector('.cb-val').dataset.num.replace('ham.', '');
      row.querySelector('.cb-fill').style.width = `calc((100% - var(--val-w, 200px)) * ${(sonuc.kay[k] / enBuyuk).toFixed(4)})`;
      row.querySelector('.cb-val').textContent = F.n1(sonuc.kay[k]);
    });
  }
  function guncelle() {
    const b = +giris.b.value / 100, s = +giris.s.value;
    $('h-buyume-d').textContent = '%' + giris.b.value;
    $('h-sezon-d').textContent = s + ' kat';
    yaz(hesap(b, s), true);
  }
  function varsayilan() {
    giris.b.value = Math.round(G.buyume * 100); giris.s.value = G.sezonKat;
    $('h-buyume-d').textContent = '%' + giris.b.value; $('h-sezon-d').textContent = G.sezonKat + ' kat';
    yaz(hesap(G.buyume, G.sezonKat), false);
  }
  for (const el of Object.values(giris)) {
    el.addEventListener('input', guncelle);
    el.addEventListener('keydown', (e) => e.stopPropagation());   // ok tuşları kaydırıcıyı oynatsın, desteyi değil
    el.addEventListener('change', () => el.blur());                // sonra tıklayıcı yine desteyi ilerletsin
  }
  let onceki = null;
  setInterval(() => {
    const st = Deck.state();
    const durum = st.slide === no ? (st.step >= 3 ? 'oyun' : 'normal') : 'disarda';
    if (durum === onceki) return;
    if (durum === 'oyun') guncelle(); else if (onceki === 'oyun' || durum === 'disarda') varsayilan();
    onceki = durum;
  }, 200);
})();
