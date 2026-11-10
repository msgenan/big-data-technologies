/* Canlı demo slaytı. Varsayılan: 10 Kasım'da Docker'da alınan gerçek koşunun kaydı (demo_kayit.js) sunucunun adımlarına
   göre oynatılır. Adrese ?canli eklenirse http://127.0.0.1:8787/durum okunur (canli_demo/demo.py); ulaşılamazsa yine kayıt. Adım 1 aracıyı durdurur (POST /kes),
   adım 2 geri bağlar (POST /bagla); slayttan çıkınca bağlantı kesik kaldıysa geri bağlanır.
   Statik modda (PDF, PPTX, ekran görüntüsü) prova kaydının tamamı çizilir. */
(function () {
  'use strict';
  const sl = document.getElementById('demo');
  if (!sl || !window.Deck || !window.DEMO_KAYIT) return;
  const API = 'http://127.0.0.1:8787';
  const K = window.DEMO_KAYIT, akis = K.akis;
  const n0 = (x) => window.DeckData.formats.n0(x);
  const $ = (id) => document.getElementById(id);
  const olay = (o) => K.duzeltilmis.olaylar.find((x) => x.olay === o).t;
  const KES = olay('kesildi'), BAG = olay('baglandi'), SON = akis[akis.length - 1].t;
  const no = Deck.slides.indexOf(sl) + 1;
  const CANLI = new URLSearchParams(location.search).has('canli');
  const ETIKET = 'Kayıt · Docker\u2019da gerçek koşu, 10 Kasım';
  $('d-kaynak').textContent = ETIKET;

  function ciz(d, gecmis) {
    $('d-gonderilen').textContent = n0(d.gonderilen);
    $('d-alinan').textContent = n0(d.alinan);
    $('d-yolda').textContent = n0(d.yolda);
    $('d-yolda').classList.toggle('dolu', d.yolda > 50);
    $('d-kayip').textContent = n0(d.kayip);
    $('d-lamba').classList.toggle('kesik', d.baglanti === 'kesik');
    $('d-p99').innerHTML = d.p99 == null ? 'ileti gelmiyor' : `<span class="t-num">${n0(d.p99)}</span> ms`;
    $('d-hiz').textContent = n0(d.hiz_alinan);
    const top = Math.max(1, ...d.bolum);
    $('d-bolum').querySelectorAll('i').forEach((b, i) => { b.style.height = (8 + 92 * d.bolum[i] / top).toFixed(1) + '%'; });
    // son 60 sn bekleyen ileti
    const son = gecmis.filter((g) => g.t >= d.t - 60);
    const ust = Math.max(1000, ...son.map((g) => g.yolda)) * 1.1;
    const x = (t) => (1000 * (t - (d.t - 60)) / 60).toFixed(1), y = (v) => (200 - 200 * v / ust).toFixed(1);
    const cizgi = son.map((g, i) => (i ? 'L' : 'M') + x(g.t) + ',' + y(g.yolda)).join('');
    sl.querySelector('.d-cizgi').setAttribute('d', cizgi);
    sl.querySelector('.d-alan').setAttribute('d', son.length ? cizgi + `L${x(son[son.length - 1].t)},200L${x(son[0].t)},200Z` : '');
  }

  // Prova kaydından oynatma: adım 0 kesinti öncesini döngüler, adım 1 kesintiyi, adım 2+ bağlantı sonrasını oynatır.
  let kSeg = -1, kDuvar = 0;
  function kayittan(adim) {
    const seg = adim <= 0 ? 0 : adim === 1 ? 1 : 2;
    if (seg !== kSeg) { kSeg = seg; kDuvar = performance.now(); }
    const gecen = (performance.now() - kDuvar) / 1000;
    let t = seg === 0 ? 5 + (gecen % (KES - 6)) : seg === 1 ? Math.min(KES + gecen, BAG - 0.1) : Math.min(BAG + gecen, SON);
    const i = Math.max(0, akis.findIndex((a) => a.t >= t));
    return { d: akis[i], gecmis: akis.slice(0, i + 1) };
  }

  if (Deck.mode !== 'live') {   // statik: kaydın tamamı
    const son = akis[akis.length - 1];
    const p = K.duzeltilmis;   // boşalma sonrası kesin özet
    ciz(Object.assign({}, son, { gonderilen: p.gonderilen, alinan: p.alinan, yolda: p.gonderilen - p.alinan, kayip: p.kayip, hiz_alinan: 440 }),
      akis.map((a) => ({ t: a.t, yolda: a.yolda })));
    return;
  }

  let kaynak = null, oncekiAdim = -1, kesikBirakildi = false, gecmis = [], bekliyor = false;
  const gonder = (yol) => fetch(API + yol, { method: 'POST' }).catch(() => null);

  async function tik() {
    if (bekliyor) return;
    const st = Deck.state();
    const burada = st.slide === no;
    if (!burada) {
      if (kesikBirakildi && kaynak === 'canli') { kesikBirakildi = false; gonder('/bagla'); }
      oncekiAdim = -1; kSeg = -1;
      return;
    }
    if (st.step !== oncekiAdim) {
      if (kaynak === 'canli' && st.step > oncekiAdim) {
        if (st.step === 1) { gonder('/kes'); kesikBirakildi = true; }
        if (st.step === 2) { gonder('/bagla'); kesikBirakildi = false; }
      }
      oncekiAdim = st.step;
    }
    bekliyor = true;
    let d = null;
    if (CANLI) try {
      const r = await fetch(API + '/durum', { cache: 'no-store', signal: AbortSignal.timeout(600) });
      d = await r.json();
    } catch (e) { d = null; }
    bekliyor = false;
    if (d) {
      if (kaynak !== 'canli') { kaynak = 'canli'; gecmis = []; $('d-kaynak').textContent = 'Canlı · Docker’da şu an çalışıyor'; }
      gecmis.push({ t: d.t, yolda: d.yolda });
      if (gecmis.length > 400) gecmis.shift();
      ciz(d, gecmis);
    } else {
      if (kaynak !== 'kayit') { kaynak = 'kayit'; $('d-kaynak').textContent = ETIKET; }
      const k = kayittan(st.step);
      ciz(k.d, k.gecmis);
    }
  }
  setInterval(tik, 250);
})();
