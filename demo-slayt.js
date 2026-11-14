/* Demo slaytı: 10 Kasım'da Docker'da alınan gerçek koşunun kaydı (demo_kayit.js) adım adım oynatılır; sınıfta canlı Docker yok.
   Adım 0 akış normal, 1 aracı durdurulur (iletiler araçta birikir), 2 bağlantı gelir (birikim Kafka'ya akar),
   3 iki koşunun karşılaştırması (varsayılan kuyruk 3.820 kayıp, büyütülmüş kuyruk 0), 4 ders.
   Sayaçlar, yığın, bölüm çubukları ve eğriler kayıttan; noktalar akışı temsil eder (nokta sayısı ileti sayısı değildir).
   Sahne, adımın yerel zamanının saf bir işlevidir: Motion.driver ile çalışır, ?render'da kare kare aranabilir; statik
   modda (PDF, PPTX, ekran görüntüsü) ve geri gidişte adımın son hâli çizilir. */
(function () {
  'use strict';
  const sl = document.getElementById('demo');
  const M = window.Motion;
  if (!sl || !window.Deck || !window.DEMO_KAYIT || !M) return;
  const NS = 'http://www.w3.org/2000/svg';
  const K = window.DEMO_KAYIT, A = K.akis, D = window.DeckData;
  const n0 = (x) => D.formats.n0(x);
  const $ = (id) => document.getElementById(id);
  const olay = (oz, o) => oz.olaylar.find((x) => x.olay === o).t;
  const KES = olay(K.duzeltilmis, 'kesildi'), BAG = olay(K.duzeltilmis, 'baglandi'), SON = A[A.length - 1].t;
  const svg = $('d-svg');
  const mk = (ad, at, ust) => { const e = document.createElementNS(NS, ad); for (const k in at) e.setAttribute(k, at[k]); if (ust) ust.appendChild(e); return e; };

  /* ---------- kayıt: kare ve ara değer ---------- */
  function kare(T) { let i = 0; while (i + 1 < A.length && A[i + 1].t <= T + 1e-6) i++; return A[i]; }
  function ara(T, f) {
    let i = 0; while (i + 1 < A.length && A[i + 1].t <= T) i++;
    const a = A[i], b = A[Math.min(i + 1, A.length - 1)], u = b.t > a.t ? Math.min(1, Math.max(0, (T - a.t) / (b.t - a.t))) : 0;
    return f(a) + (f(b) - f(a)) * u;
  }
  // adımın yerel zamanı (sn) → kayıt saati ve oynatma hızı (kesinti 2 kat hızlı, boşalma yarı hızda)
  function zaman(adim, t) {
    if (adim === 0) return { T: Math.min(A[0].t + t, KES - 0.25), hiz: 1 };
    if (adim === 1) return { T: Math.min(KES + 2 * t, BAG - 0.05), hiz: 2 };
    if (t <= 4) return { T: BAG + 0.5 * t, hiz: 0.5 };
    return { T: Math.min(BAG + 2 + (t - 4), SON), hiz: 1 };
  }

  /* ---------- sabit sahne: tırlar, yığın, bölümler ---------- */
  const tirlar = svg.querySelector('.d-tirlar');
  for (let r = 0; r < 4; r++) for (let c = 0; c < 3; c++) mk('use', { href: '#d-tir', x: c * 84, y: 100 + r * 58, width: 72, height: 40 }, tirlar);
  const YN = 96, yigin = svg.querySelector('.d-yigin'), yDot = [];
  for (let j = 0; j < YN; j++) {   // alttan yukarı dolar
    const c = j % 12, r = Math.floor(j / 12);
    yDot.push(mk('circle', { cx: 296 + c * 15, cy: 320 - r * 15, r: 5.5, opacity: 0 }, yigin));
  }
  const TEPE = D.val('demo.tepe'), PAY = TEPE / YN;
  const bolG = svg.querySelector('.d-bolumler'), LY = (i) => 84 + i * 26, LX = 1190, LW = 350;
  const SONB = A[A.length - 1].bolum, BMAX = Math.max(...SONB);
  const cubuk = SONB.map((_, i) => {
    mk('line', { x1: LX, y1: LY(i), x2: LX + LW, y2: LY(i) }, bolG);
    mk('text', { x: 1154, y: LY(i) + 6 }, bolG).textContent = String(i);
    return mk('rect', { x: LX, y: LY(i) - 6, height: 12, width: 0, rx: 3 }, bolG);
  });
  // noktaların bölüm seçimi, kaydın son bölüm dağılımıyla ağırlıklı
  const birikimli = []; SONB.reduce((s, x, i) => (birikimli[i] = s + x), 0);
  const TOPB = birikimli[birikimli.length - 1];
  const hash = (k) => { const x = Math.sin(k * 12.9898 + 78.233) * 43758.5453; return x - Math.floor(x); };
  const bolumSec = (k) => { const r = hash(k) * TOPB; let i = 0; while (birikimli[i] < r) i++; return i; };

  /* ---------- noktalar ---------- */
  const parcaG = svg.querySelector('.d-parca'), havuz = [];
  const V = 520, R = 16, DUVAR = 250, X0 = 270, Y0 = 170, KX = 1130;   // px/sn, nokta/sn, aracı önündeki duvar (yol px)
  function konum(s, i, uc) {
    if (s <= KX - X0) return [X0 + s, Y0];
    const s2 = s - (KX - X0), dy = LY(i) - Y0, Lf = Math.hypot(LX - KX, dy);
    if (s2 <= Lf) return [KX + (LX - KX) * s2 / Lf, Y0 + dy * s2 / Lf];
    const x = LX + s2 - Lf;
    return x >= uc[i] ? null : [x, LY(i)];
  }
  let kul = 0;
  function nokta(p, b) {
    let c = havuz[kul];
    if (!c) { c = mk('circle', { r: 7 }, parcaG); havuz.push(c); }
    kul++;
    c.setAttribute('cx', p[0].toFixed(1)); c.setAttribute('cy', p[1].toFixed(1));
    c.setAttribute('class', b ? 'b' : ''); c.style.display = '';
  }

  // 2. adımda yığındaki noktalar kayıttaki boşalmaya göre bırakılır: j. nokta, bekleyen j*PAY'ın altına indiği an
  const birak = [];
  (function () {
    let j = Math.round(ara(BAG, (a) => a.yolda) / PAY) - 1;
    for (let t = 0; t < 12 && j >= 0; t += 0.01) {
      const y = ara(zaman(2, t).T, (a) => a.yolda);
      while (j >= 0 && y < j * PAY + PAY / 2) { birak.push(t); j--; }
    }
  })();

  /* ---------- akış sahnesi: adım (0-2) ve yerel zaman (sn; Infinity = son hâl) ---------- */
  function akis(adim, t) {
    const son = !isFinite(t);
    const z = son ? { T: 1e4, hiz: 1 } : zaman(adim, t);
    const T = adim === 0 ? Math.min(z.T, KES - 0.25) : adim === 1 ? Math.min(z.T, BAG - 0.05) : Math.min(z.T, SON);
    const f = kare(T), bitti = adim === 2 && T >= SON;
    const p = K.duzeltilmis;
    const yolda = bitti ? p.gonderilen - p.alinan : f.yolda;
    $('d-gonderilen').textContent = n0(bitti ? p.gonderilen : f.gonderilen);
    $('d-alinan').textContent = n0(bitti ? p.alinan : f.alinan);
    $('d-yolda').textContent = n0(yolda);
    $('d-yolda').classList.toggle('dolu', yolda > 50);
    $('d-kayip').textContent = n0(bitti ? p.kayip : f.kayip);
    const kesik = f.baglanti === 'kesik';
    svg.classList.toggle('kesik', kesik);
    $('d-araci').classList.toggle('kesik', kesik);
    const dk = Math.floor(T / 60), sn = Math.floor(T % 60);
    $('d-saat').textContent = 'kayıt saati ' + dk + ':' + String(sn).padStart(2, '0') +
      (z.hiz === 1 ? '' : ' · ' + String(z.hiz).replace('.', ',') + '× ' + (z.hiz > 1 ? 'hızlı' : 'yavaş'));
    // yığın ve bölümler kayıttan (görsel için kareler arası doğrusal)
    const yv = son ? yolda : Math.max(0, ara(T, (a) => a.yolda));
    const dolu = adim === 0 ? 0 : Math.min(YN, Math.round(yv / PAY));
    yDot.forEach((c, j) => c.setAttribute('opacity', j < dolu ? 1 : 0));
    $('d-yigin-et').textContent = dolu ? n0(yolda) + ' ileti araçta' : '';
    const uc = cubuk.map((r, i) => {
      const w = LW * ara(T, (a) => a.bolum[i]) / BMAX;
      r.setAttribute('width', w.toFixed(1));
      return LX + Math.max(10, w);
    });
    // noktalar: k. nokta k/R anında araçtan çıkar; 1. adımda duvarı geçmemiş olanlar durur, 2. adımda yığından bırakılır
    kul = 0;
    const tt = son ? 30 : t, ILK = Math.floor((tt - 3.4) * R), SONK = Math.floor(tt * R);
    for (let k = ILK; k <= SONK; k++) {
      const e = k / R, s = (tt - e) * V;
      if (s < 0) continue;
      if (adim === 1 && !(e < 0 && -e * V >= DUVAR)) { if (s < DUVAR) nokta([X0 + s, Y0]); continue; }
      if (adim === 2 && e < 0) continue;
      const q = konum(s, bolumSec(k + 1000), uc);
      if (q) nokta(q);
    }
    if (adim === 2) birak.forEach((r, j) => {
      if (tt < r) return;
      const q = konum(DUVAR + (tt - r) * V, bolumSec(j + 5000), uc);
      if (q) nokta(q, true);
    });
    for (let j = kul; j < havuz.length; j++) havuz[j].style.display = 'none';
  }

  /* ---------- karşılaştırma: iki koşunun "Kafka'ya ulaşmamış ileti" eğrisi ---------- */
  const S1 = K.akis1.map((r) => [r[0], r[1]]), S2 = A.map((a) => [a.t, a.yolda]);
  const XMAX = Math.max(S1[S1.length - 1][0], S2[S2.length - 1][0]);
  const YMAX = Math.ceil(Math.max(...S1.map((r) => r[1]), ...S2.map((r) => r[1])) / 1000) * 1000;
  const GX = (t) => 76 + 650 * t / XMAX, GY = (v) => 196 - 176 * v / YMAX;
  function grafikKur(el, oz, iyi) {
    el.classList.toggle('iyi', iyi);
    for (let v = 0; v <= YMAX; v += 2000) {
      mk('line', { x1: 76, x2: 726, y1: GY(v), y2: GY(v), class: v ? 'izgara' : 'eksen' }, el);
      if (v) mk('text', { x: 64, y: GY(v) + 6, 'text-anchor': 'end', class: 'tik' }, el).textContent = n0(v);
    }
    for (let s = 0; s <= XMAX; s += 20) mk('text', { x: GX(s), y: 224, 'text-anchor': 'middle', class: 'tik' }, el).textContent = s + ' sn';
    const a = olay(oz, 'kesildi'), b = olay(oz, 'baglandi');
    mk('rect', { x: GX(a), y: 14, width: GX(b) - GX(a), height: 182, class: 'kesinti' }, el);
    mk('text', { x: (GX(a) + GX(b)) / 2, y: 6, 'text-anchor': 'middle', class: 'kesinti-et' }, el).textContent = 'kesinti';
    return { alan: mk('path', { class: 'alan' }, el), cizgi: mk('path', { class: 'cizgi' }, el) };
  }
  const G1 = grafikKur($('d-grafik1'), K.prova1, false), G2 = grafikKur($('d-grafik2'), K.duzeltilmis, true);
  function egri(g, S, p) {
    const n = S.filter((r) => r[0] <= XMAX * p);
    if (n.length < 2) { g.alan.setAttribute('d', ''); g.cizgi.setAttribute('d', ''); return; }
    const d = n.map((r, i) => (i ? 'L' : 'M') + GX(r[0]).toFixed(1) + ',' + GY(r[1]).toFixed(1)).join('');
    g.cizgi.setAttribute('d', d);
    g.alan.setAttribute('d', d + `L${GX(n[n.length - 1][0]).toFixed(1)},${GY(0)}L${GX(n[0][0]).toFixed(1)},${GY(0)}Z`);
  }
  const kars = (p) => { egri(G1, S1, p); egri(G2, S2, p); };

  /* ---------- çizim girişi: adım ve yerel zaman ---------- */
  function ciz(adim, t) {
    if (adim <= 2) { akis(adim, t); kars(0); }
    else { akis(2, Infinity); kars(1); $('d-saat').textContent = ''; }
    ciz.adim = adim;
  }
  ciz.adim = -1;

  // her adımın işaretçisi (i.d-tik) bir sürücü başlatır: 0-2 sonsuz ortam sürücüsü, 3 eğrileri çizer.
  // İptal edilen eski sürücünün bitiş çağrısı geç (söz zinciriyle) gelir; yalnız en son başlayan sürücü çizer.
  let aktif = 0;
  M.define('demo-sahne', {
    enter(el) {
      const adim = +el.dataset.adim, id = ++aktif;
      if (adim <= 2) { M.driver((p, ms) => { if (id === aktif) ciz(adim, ms / 1000); }, { dur: Infinity, ambient: true }); return; }
      ciz(3, Infinity); kars(0);
      M.driver((p) => { if (id === aktif) kars(p); }, { delay: 500, dur: 2600 });
    },
  });

  const no = Deck.slides.indexOf(sl) + 1;
  if (Deck.mode === 'embed') {
    const goster = () => { const [n, s] = (location.hash || '').slice(1).split('.').map((x) => parseInt(x, 10)); if (n === no) ciz(s || 0, Infinity); };
    goster(); addEventListener('hashchange', goster); return;
  }
  ciz(4, Infinity);   // statik mod (PDF, PPTX, ekran görüntüsü): son hâl
  // geri gidiş, numarayla atlama ve azaltılmış hareket: sürücü yoksa adımın son hâli
  if (Deck.mode === 'live') setInterval(() => {
    let st; try { st = Deck.state(); } catch (_) { return; }
    if (st.slide === no && ciz.adim !== st.step) ciz(st.step, Infinity);
  }, 200);
})();
