/* Sahne: fotoğrafın içine yerleşen slaytlar için iki parça.
   1) "kamera" deseni: .sahne sarmalayıcısı (fotoğraf + üstündeki işaretler) slayta girerken data-kamera-from
      çerçevesinden CSS'teki son çerçeveye kayar (itme, kaydırma, dönme). Son hâl düz CSS olduğu için statik, PDF ve
      PPTX son kadrajı gösterir. Adım değişimi kamerayı kesmesin diye adım koşusuna kaydedilmez; yalnız canlı modda.
   2) Yolculuk şeridi: data-rota="kaynak|alim|depo" taşıyan slaytların sağ altına Raf → Yol → Depo şeridini ve sayfa
      numarasını ekler; bütün desteyi tek bir yolculuk olarak bağlar. */
(function () {
  'use strict';
  const M = window.Motion;
  if (M) M.define('kamera', {
    enter(el, o) {
      if (M.mode !== 'live' || !el.dataset.kameraFrom) return;
      const son = getComputedStyle(el).transform;
      el.animate([{ transform: el.dataset.kameraFrom }, { transform: son === 'none' ? 'none' : son }],
        { duration: parseFloat(el.dataset.dur || '2.6') * 1000, delay: o.delay || 0, easing: 'cubic-bezier(.33, 0, .2, 1)', fill: 'backwards' });
    },
  });

  const DURAK = [['kaynak', 'Raf', 'Kaynak'], ['alim', 'Yol', 'Alım'], ['depo', 'Depo', 'Depolama']];
  const slaytlar = Array.from(document.querySelectorAll('.deck > section.slide'));
  slaytlar.forEach((s, i) => {
    const yer = s.dataset.rota;
    if (!yer || s.querySelector(':scope > .rota')) return;
    const r = document.createElement('div');
    r.className = 'rota';
    r.setAttribute('aria-hidden', 'true');
    const k = DURAK.findIndex((d) => d[0] === yer);
    r.innerHTML = DURAK.map((d, j) => `<span class="durak${j === k ? ' bu' : j < k ? ' gecti' : ''}"><i></i>${j === k ? d[1] + ' · ' + d[2] : d[1]}</span>`).join('<b></b>') +
      `<em>${String(i + 1).padStart(2, '0')} / ${String(slaytlar.length).padStart(2, '0')}</em>`;
    s.appendChild(r);
    s.classList.add('rotali');
    const foto = s.querySelector(':scope > .sahne:not(.ust), :scope > .zemin-pan');   // kaynak satırı için alttan sis
    if (foto) { const sis = document.createElement('div'); sis.className = 'sis sis-alt'; foto.after(sis); }
  });
})();
