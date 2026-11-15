# TazeRota: dokuz kaynaktan tek veri platformu

YBS025 Büyük Veri Teknolojileri, Vaka A, ara denetim sunumu (İstinye Üniversitesi, 2026 Güz).
Ekip: Sefa Ünal (Veri Mimarı), Muhammed Sabit Genan (Veri Mühendisi), Zeynep Berfe Koçak (Analitik ve Yönetişim).

Sunum: https://msgenan.github.io/big-data-technologies/
İlk sürüm (kareli defter görünümü): https://msgenan.github.io/big-data-technologies/v1/

## Kullanım
- Sağ ok, boşluk ya da tıklayıcı: sonraki adım. Sol ok: geri.
- `K`: konuşmacı görünümü (notlar, sonraki adım, süre). `N`: notlar. `F`: tam ekran.
- `?prova`: süreli prova. `?static`: tüm slaytlar son hâliyle (yazdırma).

Sunum kodla yazılmış bir HTML destesidir, ağ bağlantısı gerektirmez: klasörü indirip `index.html` dosyasını Chrome'da açmak yeterlidir.
Slaytlardaki her sayı `values.js` dosyasından okunur; ölçümler `olcum.js` (Kafka/MQTT güvenlik ölçümü), demo kaydı `demo_kayit.js`
(Docker'da gerçek koşu, 10 Kasım 2026).

Görünüm "Raftan yola, yoldan rafa": deste soğuk zincirde tek bir yolculuk (raf, yol, depo); fotoğraflar diyagramın kendisidir
(aracın ekranı A5 kaynağı, otoyolun şeritleri Kafka bölümleri, deponun katları ve koridoru depolama katmanları).
Fotoğraflar tek bir renk derecesinden geçer (`araclar/derece.sh`).
Yazı tipleri Newsreader ve Instrument Sans, SIL Open Font License ile dağıtılır (`fonts/`, `THIRD_PARTY.md`).
