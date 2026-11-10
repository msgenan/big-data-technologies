/* Every figure in the deck lives here. f = format (data.js), label = chart label, src = where the number comes from.
   Hacim: Veri Mimarı raporu (Sefa, TazeRota_Data_Architect_Raporu-5, G2). Girdiler ham, türetilenler formülle. */
(function () {
  const RAPOR = 'Veri Mimarı raporu v5, G2';
  const mevsim = (275 + 90 * 4) / 365;        // 1,74
  const buyume = 1 + 1.2 + 1.44;               // 3 yıl, %20 bileşik
  const kaynak = {                             // GB/gün (normal gün), sıkıştırma oranı, etiket
    A1: [0.70, 2, 'ERP kayıtları'],
    A2: [9.0, 4, 'POS satışları'],
    A3: [0.86, 2, 'Saha terminali'],
    A4: [150, 1, 'Raf fotoğrafı'],
    A5: [2.38, 2, 'Araç telemetrisi'],
    A6: [87.1, 2, 'Fabrika sensörü'],
  };
  const v = {
    'hacim.mevsim': { v: mevsim, f: 'n2', label: 'Mevsim çarpanı', src: 'vaka: sezonda 4 kat, 90 gün' },
    'hacim.buyume': { v: buyume, f: 'n2', label: '3 yıllık büyüme', src: RAPOR + ', %20 bileşik' },
  };
  let ham = 0, sik = 0;
  for (const [k, [gb, oran, lab]] of Object.entries(kaynak)) {
    const tb = gb * 365 * mevsim * buyume / 1000;
    ham += tb; sik += tb / oran;
    v['ham.' + k] = { v: tb, f: 'n1', label: lab, src: RAPOR };
  }
  v['hacim.ham'] = { v: ham, f: 'n0', label: '3 yıl ham (TB)', src: RAPOR };
  v['hacim.sik'] = { v: sik, f: 'n0', label: 'Sıkıştırılmış (TB)', src: RAPOR };
  v['hacim.kopya3'] = { v: sik * 3, f: 'n0', label: '3 kopya', src: RAPOR };
  v['hacim.ec'] = { v: sik * 1.25, f: 'n0', label: '8+2 EC', src: RAPOR };
  v['hacim.ec_fark'] = { v: sik * 3 - sik * 1.25, f: 'n0', label: 'EC ile tasarruf (TB)', src: 'hesap' };
  v['hacim.a4_pay'] = { v: v['ham.A4'].v / ham, f: 'p0', label: 'A4 payı', src: 'hesap' };

  /* S7 ölçümü: olcum.js (araclar/olcum_aktar.py <- s7_olcum/results.jsonl) */
  const O = window.OLCUM_S7, OLC = 'S7 ölçümü, Docker, 2 tekrar ortalaması';
  const p99 = (k, lab) => ({ v: O[k].p99, f: 'n1', label: lab, src: OLC + ' (' + k + ')' });
  v['s7.k440.duz'] = p99('kafka.440.plain', 'Kafka · şifresiz');
  v['s7.k440.mtls'] = p99('kafka.440.mtls', 'Kafka · mTLS + ACL');
  v['s7.k760.duz'] = p99('kafka.760.plain', 'Kafka 3. yıl · şifresiz');
  v['s7.k760.mtls'] = p99('kafka.760.mtls', 'Kafka 3. yıl · mTLS + ACL');
  v['s7.m440.duz'] = p99('mqtt.440.plain', 'MQTT · şifresiz');
  v['s7.m440.mtls'] = p99('mqtt.440.mtls', 'MQTT · mTLS + ACL');
  v['s7.fark'] = { v: O['kafka.440.mtls'].p99 - O['kafka.440.plain'].p99, f: 's1', label: 'mTLS bedeli (ms)', src: 'hesap: ' + OLC };
  const top = (a) => Object.values(O).reduce((s, r) => s + r[a], 0);
  v['s7.gonderilen'] = { v: top('gonderilen'), f: 'n0', label: 'Gönderilen ileti', src: OLC };
  v['s7.alinan'] = { v: top('alinan'), f: 'n0', label: 'Alınan ileti', src: OLC };
  v['s7.kayip'] = { v: top('gonderilen') - top('alinan'), f: 'n0', label: 'Kayıp', src: 'hesap: ' + OLC };
  v['s7.bag.duz'] = { v: O['mqtt.440.plain'].baglanti_ms, f: 'n1', label: 'MQTT yeniden bağlanma, şifresiz (ms)', src: OLC };
  v['s7.bag.mtls'] = { v: O['mqtt.440.mtls'].baglanti_ms, f: 'n1', label: 'MQTT yeniden bağlanma, mTLS (ms)', src: OLC };

  /* Kafka bölüm sayısı türetmesi (G4 taslağı, Bölüm 3) */
  const G4 = 'G4 veri alımı, Bölüm 3';
  const arac = 1100, aralik = 10, ort = arac / aralik, tepe = ort * 4, buy3 = Math.pow(1.2, 3), uc = Math.round(tepe * buy3);
  const birikim = uc * 600, eritme = birikim / 120 + uc, kap = 500, gorev = Math.ceil(eritme / kap);
  Object.assign(v, {
    'k.arac': { v: arac, f: 'n0', label: 'Araç', src: 'vaka' },
    'k.aralik': { v: aralik, f: 'n0', label: 'Gönderim aralığı (sn)', src: 'vaka' },
    'k.ort': { v: ort, f: 'n0', label: 'Ortalama ileti/sn', src: G4 },
    'k.tepe': { v: tepe, f: 'n0', label: 'Bayram tepesi ileti/sn', src: G4 + ', 4 kat mevsim' },
    'k.buy3': { v: buy3, f: 'n2', label: '3 yıl büyüme', src: G4 + ', %20/yıl' },
    'k.uc': { v: uc, f: 'n0', label: '3. yıl tepe ileti/sn', src: G4 },
    'k.birikim': { v: birikim, f: 'n0', label: '10 dk kesinti birikimi', src: G4 },
    'k.eritme': { v: eritme, f: 'n0', label: '2 dk eritme hızı', src: G4 },
    'k.kap': { v: kap, f: 'n0', label: 'Görev kapasitesi (varsayım)', src: G4 + ', G4-V1 varsayım' },
    'k.gorev': { v: gorev, f: 'n0', label: 'Gereken görev', src: G4 },
    'k.bolum': { v: 12, f: 'n0', label: 'Bölüm', src: G4 + ': 2, 3, 4, 6 ile bölünür' },
    'a6.olcum': { v: 10080, f: 'n0', label: 'A6 ölçüm/sn', src: 'vaka: 84 hat × 120 sensör' },
    'a6.ileti': { v: 84, f: 'n0', label: 'A6 ileti/sn', src: G4 + ', hat başına paket' },
    'a4.mb': { v: 2.5, f: 'n1', label: 'Fotoğraf (MB)', src: 'vaka' },
  });
  const konu = [['telemetri', 12, 7], ['terminal', 3, 7], ['foto', 3, 7], ['sensor', 6, 3], ['dlq', 1, 14]];
  for (const [k, b, s] of konu) {
    v['konu.' + k + '.b'] = { v: b, f: 'n0', label: 'Bölüm', src: G4 };
    v['konu.' + k + '.s'] = { v: s, f: 'n0', label: 'Saklama (gün)', src: G4 };
  }

  /* Canlı demo provaları: demo_kayit.js (araclar/demo_aktar.py <- canli_demo/prova*.log) */
  const K = window.DEMO_KAYIT, DM = 'Canlı demo provası, 10 Kasım';
  const olay = (o) => K.duzeltilmis.olaylar.find((x) => x.olay === o).t;
  Object.assign(v, {
    'demo.p1.kayip': { v: K.prova1.kayip, f: 'n0', label: 'Prova 1 kayıp', src: DM + ', varsayılan aracı kuyruğu' },
    'demo.p1.gonderilen': { v: K.prova1.gonderilen, f: 'n0', label: 'Prova 1 gönderilen', src: DM },
    'demo.p2.kayip': { v: K.duzeltilmis.kayip, f: 'n0', label: 'Kayıp', src: DM + ', kuyruk 500.000' },
    'demo.p2.gonderilen': { v: K.duzeltilmis.gonderilen, f: 'n0', label: 'Gönderilen', src: DM },
    'demo.p2.alinan': { v: K.duzeltilmis.alinan, f: 'n0', label: 'Kafka\'ya ulaşan', src: DM },
    'demo.p2.yolda': { v: K.duzeltilmis.gonderilen - K.duzeltilmis.alinan, f: 'n0', label: 'Araçta bekleyen', src: DM },
    'demo.kesinti': { v: olay('baglandi') - olay('kesildi'), f: 'n0', label: 'Kesinti (sn)', src: DM },
    'demo.sinir': { v: 1000, f: 'n0', label: 'Mosquitto varsayılan kuyruk', src: 'Mosquitto max_queued_messages varsayılanı' },
    'demo.hiz': { v: 440, f: 'n0', label: 'İleti/sn', src: 'bayram tepesi, G4' },
    'demo.bolum': { v: 12, f: 'n0', label: 'Bölüm', src: G4 },
  });

  /* İş hedefleri (vaka; Sefa G1), KA-1 ve güvenlik (Zeynep G10), depolama (Sefa G5) */
  const VAKA = 'vaka', ZG = 'Zeynep G10', SG = 'Veri Mimarı raporu, G5';
  Object.assign(v, {
    'h.i3': { v: 30, f: 'n0', label: 'Soğuk zincir alarmı (sn)', src: VAKA },
    'h.i2': { v: 15, f: 'n0', label: 'Raf boşluğu tespiti (dk)', src: VAKA },
    'h.i5': { v: 2, f: 'n0', label: 'Geri çağırma (saat)', src: VAKA },
    'h.i4': { v: 10, f: 'n0', label: 'Promosyon sorgusu (sn)', src: VAKA },
    'kay.toplam': { v: 9, f: 'n0', label: 'Kaynak', src: VAKA },
    'kay.toplanan': { v: 7, f: 'n0', label: 'Toplanan kaynak', src: 'Veri Mimarı raporu, G1' },
    'ka1.zincir': { v: 12, f: 'n0', label: 'Zincir', src: VAKA },
    'ka1.sku': { v: 3200, f: 'n0', label: 'SKU', src: VAKA },
    'ka1.satir': { v: 45, f: 'n0', label: 'Günlük satır (milyon)', src: ZG + ', KA-1' },
    'ka1.tablo': { v: 12 * 3200, f: 'n0', label: 'Eşleştirme tablosu satırı', src: ZG + ', KA-1' },
    'ka1.oto': { v: 0.90, f: 'n2', label: 'Otomatik kabul eşiği', src: ZG + ', KA-1' },
    'ka1.alt': { v: 0.60, f: 'n2', label: 'Onaya düşme eşiği', src: ZG + ', KA-1' },
    'ka1.h200': { v: 0.98, f: 'p0', label: 'İlk 200 SKU hedefi', src: ZG + ', K2' },
    'ka1.htum': { v: 0.95, f: 'p0', label: 'Tüm SKU hedefi', src: ZG + ', K2' },
    'ka1.ilk': { v: 200, f: 'n0', label: 'En çok satan SKU', src: VAKA },
    'ka1.ciro': { v: 0.70, f: 'p0', label: 'İlk 200 SKU ciro payı', src: VAKA },
    'kv.gun': { v: 30, f: 'n0', label: 'Konumun okunabildiği gün', src: ZG + ', 10.3' },
    'kv.temsilci': { v: 2400, f: 'n0', label: 'Temsilci', src: VAKA },
    'kv.anahtar': { v: 2400 * 30, f: 'n0', label: 'Etkin anahtar', src: ZG + ', 10.3' },
    'kv.dlq': { v: 14, f: 'n0', label: 'Hata kuyruğu (gün)', src: ZG + ', 10.4' },
    'kv.mali': { v: 10, f: 'n0', label: 'Mali kayıt (yıl)', src: VAKA },
    'dep.dosya': { v: 256, f: 'n0', label: 'Iceberg hedef dosya (MB)', src: SG },
    'dep.sicak': { v: 30, f: 'n0', label: 'Sıcak (gün)', src: SG },
    'dep.ilik': { v: 180, f: 'n0', label: 'Ilık (gün)', src: SG },
    'dep.soguk': { v: 360, f: 'n0', label: 'Soğuk (gün)', src: SG },
    'dep.ham': { v: 3, f: 'n0', label: 'Ham saklama (yıl)', src: VAKA },
  });

  /* Vaka ölçeği (yönerge, Vaka A) */
  Object.assign(v, {
    'v.fabrika': { v: 6, f: 'n0', label: 'Fabrika', src: VAKA }, 'v.hat': { v: 84, f: 'n0', label: 'Üretim hattı', src: VAKA + ': 6 × 14' },
    'v.arac': { v: 1100, f: 'n0', label: 'Soğutuculu araç', src: VAKA }, 'v.temsilci': { v: 2400, f: 'n0', label: 'Temsilci', src: VAKA },
    'v.nokta': { v: 185000, f: 'n0', label: 'Satış noktası', src: VAKA }, 'v.zincir': { v: 12, f: 'n0', label: 'Zincir', src: VAKA },
    'v.sku': { v: 3200, f: 'n0', label: 'SKU', src: VAKA }, 'v.kaynak': { v: 9, f: 'n0', label: 'Kaynak', src: VAKA },
    'v.is': { v: 5, f: 'n0', label: 'İş sorunu', src: VAKA },
  });
  window.DECK_DATA = { values: v };
})();
