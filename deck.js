/* Deck engine. Slides are <section class="slide"> inside <main class="deck">; the stage is 1920x1080, scaled to the window.
   Steps:   data-step="2" appears at step 2 and stays; data-step="1-2" shows on steps 1-2 and exits at step 3.
   Motion:  data-motion="<pattern>" (motion.js); an element with data-step and no data-motion uses "rise".
   Slide:   data-title, data-duration (s, planned), data-transition="fade|iris|none", data-camera="push", data-focus="x,y",
            class "night" (dark variant), "bare" (no folio), data-export="image" (export as a picture in the editable PPTX).
   Film:    <video class="film" src="media/film.mp4" poster="media/film-poster.png"></video> on a slide: a step of its own
            (after the slide's other steps, or its data-step). Next plays it, next again leaves the slide (like PowerPoint);
            back rewinds to the poster; P or a click pauses / resumes; M mutes. Static modes and exports show the poster.
   Notes:   <aside class="notes"> inside the slide.
   URL:     #5 or #5.2 (slide.step) · ?speaker · ?prova (rehearsal) · ?static (every slide, final state; print/export)
            · ?embed (one slide at #n.s, no motion) · ?render (paused; drive frames with Deck.seek for video).
   Keys:    → ↓ Space Enter PageDown D next · ← ↑ PageUp Backspace A back · Home End · F full screen · K speaker view
            · N notes · B or . black screen · digits then Enter: go to slide · ? help. The mouse never advances. */
(function () {
  'use strict';
  const P = new URLSearchParams(location.search);
  const MODE = P.has('speaker') ? 'speaker' : (P.has('static') || P.has('print')) ? 'static' : P.has('embed') ? 'embed' : P.has('render') ? 'render' : 'live';
  const REHEARSE = P.has('prova');
  const root = document.documentElement;
  const deck = document.querySelector('.deck');
  const slides = Array.from(deck.querySelectorAll(':scope > section.slide'));
  const M = window.Motion;
  M.mode = MODE === 'render' ? 'render' : (MODE === 'live' ? 'live' : 'static');

  if (MODE === 'speaker') { speakerView(); return; }

  /* ------------------------------------------------ build: numbers, charts, folios, paper */
  if (window.DeckData) window.DeckData.fill(deck);
  if (window.Charts) window.Charts.render(deck);
  if (window.DeckData) window.DeckData.fill(deck);
  slides.forEach((s, i) => {
    s.dataset.index = i + 1;
    if (!s.querySelector(':scope > .folio')) {
      const f = document.createElement('div'); f.className = 'folio'; f.setAttribute('aria-hidden', 'true');
      f.innerHTML = String(i + 1).padStart(2, '0') + '<small>/ ' + String(slides.length).padStart(2, '0') + '</small>';
      s.appendChild(f);
    }
    if (!s.hasAttribute('aria-label')) s.setAttribute('aria-label', s.dataset.title || 'Slayt ' + (i + 1));
  });
  function paintPaper() {
    const kind = deck.dataset.texture || 'grid';
    if (kind === 'none') return;
    const css = (el, v) => getComputedStyle(el).getPropertyValue(v).trim();
    const probe = document.createElement('section'); probe.className = 'slide night'; probe.style.display = 'none'; deck.appendChild(probe);
    const mx = parseFloat(css(root, '--margin-x')) || 150, step = parseFloat(css(root, '--grid-step')) || 48;
    const day = M.paper({ kind, ground: css(root, '--paper'), line: css(root, '--grid-line'), margin: css(root, '--margin-line'), marginX: mx, step });
    const night = M.paper({ kind, ground: css(probe, '--paper'), line: css(probe, '--grid-line'), margin: css(probe, '--margin-line'), marginX: mx, step });
    probe.remove();
    root.style.setProperty('--paper-img', `url(${day})`);
    root.style.setProperty('--night-img', `url(${night})`);
  }

  /* ------------------------------------------------ steps */
  const range = (el) => {
    const [a, b] = String(el.dataset.step).split('-');
    return [parseInt(a, 10) || 0, b == null || b === '' ? Infinity : parseInt(b, 10)];
  };
  function index(slide) {
    const stepped = Array.from(slide.querySelectorAll('[data-step]'));
    const wheels = Array.from(slide.querySelectorAll('[data-motion="wheel"]'));
    let n = 0;
    stepped.forEach((el) => { const [a, b] = range(el); n = Math.max(n, a, b === Infinity ? 0 : b + 1); });
    wheels.forEach((w) => { n = Math.max(n, M.patterns.wheel.steps(w)); });
    slide._films = Array.from(slide.querySelectorAll('.film-box')).map((box) => {
      const at = box.dataset.step ? parseInt(box.dataset.step, 10) : n + 1;
      n = Math.max(n, at);
      return { box, v: box.querySelector('video'), at };
    });
    slide._steps = n; slide._stepped = stepped; slide._wheels = wheels;
    slide._motion = Array.from(slide.querySelectorAll('[data-motion]')).filter((el) => {
      const p = el.parentElement && el.parentElement.closest('[data-motion]');
      return !(p && M.patterns[p.dataset.motion] && M.patterns[p.dataset.motion].container && el.parentElement === p && !el.hasAttribute('data-step'));
    });
  }
  const startOf = (el, slide) => { const s = el.closest('[data-step]'); return s && s !== slide && slide.contains(s) ? range(s)[0] : 0; };
  function setStep(slide, k, animate) {
    slide._stepped.forEach((el) => {
      const [a, b] = range(el);
      el.classList.toggle('is-future', k < a);
      el.classList.toggle('is-past', k > b);
    });
    slide._wheels.forEach((w) => M.patterns.wheel.setStep(w, k, animate));
    slide._films.forEach((f) => filmState(f, k >= f.at ? 'hold' : 'poster'));
    slide.dataset.at = k;
  }
  function playStep(slide, k, from) {
    // exits: ranges that ended at k-1; entries wait for them so the two never overlap
    let base = 0;
    slide._stepped.forEach((el) => {
      const [a, b] = range(el);
      if (b === k - 1 && from === k - 1) { base = M.active() ? 260 : 0; el.classList.remove('is-past'); M.exit(el, () => el.classList.add('is-past')); }
      else { el.classList.toggle('is-future', k < a); if (b !== k - 1) el.classList.toggle('is-past', k > b); }
    });
    slide._wheels.forEach((w) => M.patterns.wheel.setStep(w, k, true));
    slide._films.forEach((f) => filmState(f, k === f.at ? 'play' : k > f.at ? 'hold' : 'poster'));
    slide.dataset.at = k;
    // entries: elements that begin at k; motion elements whose own step (or an ancestor's) is k
    slide._stepped.forEach((el) => { if (range(el)[0] === k && !el.dataset.motion && !el.closest('[data-motion="wheel"]')) M.play(el, 'rise', { base }); });
    slide._motion.forEach((el) => {
      if (el.dataset.motion === 'wheel' || startOf(el, slide) !== k) return;
      if (el.closest('.is-future, .is-past')) return;
      M.play(el, null, { base });
    });
  }

  /* ------------------------------------------------ film (video slide): poster -> play -> hold; render mode seeks frames */
  function setupFilms() {
    deck.querySelectorAll('video.film').forEach((v) => {
      const box = document.createElement('figure'); box.className = 'film-box' + (v.classList.contains('full') ? ' full' : '');
      if (v.dataset.step) box.dataset.step = v.dataset.step;
      v.parentNode.insertBefore(box, v); box.appendChild(v);
      v.preload = 'auto'; v.playsInline = true; v.controls = false; v.removeAttribute('autoplay');
      if (v.getAttribute('poster')) { const im = document.createElement('img'); im.className = 'film-poster'; im.src = v.getAttribute('poster'); im.alt = v.getAttribute('aria-label') || 'Film'; box.appendChild(im); }
      box.insertAdjacentHTML('beforeend', '<span class="film-play" aria-hidden="true"><svg viewBox="0 0 24 24" width="64" height="64"><path d="M8 5.5v13l10.5-6.5z" fill="currentColor"/></svg></span><i class="film-bar"><b></b></i>');
      const bar = box.querySelector('.film-bar b');
      v.addEventListener('timeupdate', () => { bar.style.width = (v.duration ? v.currentTime / v.duration * 100 : 0) + '%'; });
      v.addEventListener('ended', () => box.classList.add('is-ended'));
      v.addEventListener('play', () => box.classList.add('is-playing'));
      v.addEventListener('pause', () => box.classList.remove('is-playing'));
      box.addEventListener('click', () => { if (MODE === 'live' && box.classList.contains('is-started')) (v.paused ? v.play() : v.pause()); });
    });
  }
  function filmState(f, st) {
    const { box, v } = f;
    if (st === 'poster') { v.pause(); if (v.currentTime) v.currentTime = 0; box.classList.remove('is-started', 'is-ended', 'is-playing'); return; }
    box.classList.add('is-started');
    if (st === 'play' && MODE === 'live') { box.classList.remove('is-ended'); v.currentTime = 0; const p = v.play(); if (p) p.catch(() => box.classList.remove('is-started')); }
  }
  function filmsOf(slide) { return slide ? slide._films || [] : []; }
  function filmKey(k) {
    const f = filmsOf(slides[cur]).find((x) => x.box.classList.contains('is-started'));
    if (!f) return false;
    if (k === 'p' || k === 'P') { f.v.paused ? f.v.play() : f.v.pause(); return true; }
    if (k === 'm' || k === 'M') { f.v.muted = !f.v.muted; f.box.classList.toggle('is-muted', f.v.muted); return true; }
    return false;
  }
  const filmReady = () => Promise.all(Array.from(deck.querySelectorAll('video.film')).map((v) => (v.readyState >= 1 ? null : new Promise((r) => { v.addEventListener('loadedmetadata', r, { once: true }); v.addEventListener('error', r, { once: true }); setTimeout(r, 8000); }))));
  async function seekFilms(slide, s, ms) {
    for (const f of filmsOf(slide)) {
      if (s < f.at) { f.box.classList.remove('is-started'); continue; }
      f.box.classList.add('is-started');
      const t = s === f.at ? Math.min(ms / 1000, f.v.duration - 0.001) : f.v.duration - 0.001;
      if (Math.abs(f.v.currentTime - t) > 1e-4) {
        await new Promise((r) => { f.v.addEventListener('seeked', r, { once: true }); f.v.currentTime = t; });
        if (f.v.requestVideoFrameCallback) await new Promise((r) => { let done = false; const fin = () => { if (!done) { done = true; r(); } }; f.v.requestVideoFrameCallback(fin); setTimeout(fin, 120); });   // the new frame is composited
      }
    }
  }

  /* ------------------------------------------------ static modes */
  function finalState() { slides.forEach((s) => setStep(s, s._steps, false)); }
  function whenReady() {
    const imgs = Array.from(document.images).map((im) => (im.decode ? im.decode().catch(() => {}) : null));
    return Promise.all([document.fonts ? document.fonts.ready : null, ...imgs]);
  }

  /* ------------------------------------------------ live navigation */
  let cur = -1, step = 0, startedAt = 0, speaker = null, drift = null, fx = null, lastFocus = null;
  const progress = document.createElement('div'); progress.id = 'deck-progress'; progress.innerHTML = '<i></i>';
  const black = document.createElement('div'); black.id = 'deck-black';
  const notesBox = document.createElement('div'); notesBox.id = 'deck-notes';
  const help = document.createElement('div'); help.id = 'deck-help';
  help.innerHTML = '<div><kbd>→</kbd><kbd>Boşluk</kbd><kbd>D</kbd>ileri</div><div><kbd>←</kbd><kbd>A</kbd>geri</div><div><kbd>K</kbd>konuşmacı ekranı</div>' +
    '<div><kbd>N</kbd>notlar</div><div><kbd>F</kbd>tam ekran</div><div><kbd>B</kbd>karart</div><div><kbd>5</kbd><kbd>Enter</kbd>5. slayta git</div><div><kbd>?</kbd>bu yardım</div>';

  function scale() {
    const k = Math.min(innerWidth / 1920, innerHeight / 1080);
    deck.style.transform = `translate(-50%, -50%) scale(${k})`;
    deck._k = k;
  }
  function focusPoint(slide) {
    if (slide.dataset.focus) { const [x, y] = slide.dataset.focus.split(',').map(Number); return { x, y }; }
    return null;
  }
  function lastShown(slide) {
    const els = slide._motion.filter((el) => !el.closest('.is-future, .is-past') && el.getClientRects().length);
    const el = els[els.length - 1];
    if (!el) return null;
    const r = el.getBoundingClientRect(), z = deck.getBoundingClientRect(), k = deck._k || 1;
    return { x: Math.round((r.left + r.width / 2 - z.left) / k), y: Math.round((r.top + r.height / 2 - z.top) / k) };
  }
  function enter(n, s, dir) {
    const old = slides[cur];
    M.finishRun();
    if (old && old !== slides[n]) {
      lastFocus = dir > 0 && MODE === 'live' ? lastShown(old) : null;
      old.classList.remove('is-current');
      filmsOf(old).forEach((f) => filmState(f, 'poster'));
      M.stopCamera(old);
      if (MODE === 'live') { old.classList.add('is-leaving'); M.leave(old, () => old.classList.remove('is-leaving')); }
    }
    cur = n; step = s;
    const sl = slides[n];
    sl.classList.add('is-current');
    document.body.classList.toggle('is-night', sl.classList.contains('night'));
    if (fx) fx.style.display = (sl.dataset.particles || deck.dataset.particles) === 'drift' ? '' : 'none';
    setStep(sl, s, false);
    M.beginRun();
    M.transition(sl, sl.dataset.transition || 'fade', focusPoint(sl) || lastFocus);
    M.camera(sl);
    if (s === 0 && dir >= 0) playStep(sl, 0, -1);
    if (drift && old) drift.kick(dir);
    after();
  }
  function stepTo(s, dir) {
    const sl = slides[cur];
    M.finishRun();
    M.beginRun();
    if (dir > 0 && s === step + 1) playStep(sl, s, step); else setStep(sl, s, false);
    step = s;
    after();
  }
  function go(n, s = 0, dir = 1) {
    n = Math.max(0, Math.min(slides.length - 1, n));
    s = Math.max(0, Math.min(slides[n]._steps, s));
    if (n === cur && s === step) return;
    if (n !== cur) enter(n, s, dir); else stepTo(s, dir);
  }
  const next = () => { if (!startedAt) startedAt = Date.now(); if (step < slides[cur]._steps) go(cur, step + 1, 1); else if (cur < slides.length - 1) go(cur + 1, 0, 1); };
  const prev = () => { if (step > 0) go(cur, step - 1, -1); else if (cur > 0) go(cur - 1, slides[cur - 1]._steps, -1); };

  let settleToken = 0;
  function after() {
    const t = ++settleToken;
    delete root.dataset.settled;
    M.settled().then(() => { if (t === settleToken) root.dataset.settled = `${cur + 1}.${step}`; });
    if (MODE !== 'live') return;
    progress.firstChild.style.width = ((cur + 1) / slides.length * 100) + '%';
    history.replaceState(null, '', location.pathname + location.search + '#' + (cur + 1) + (step ? '.' + step : ''));
    writeNotes(); broadcast(); rehearse();
  }

  /* ------------------------------------------------ notes, speaker window, rehearsal */
  const notesOf = (sl) => { const a = sl && sl.querySelector('aside.notes'); return a ? a.innerHTML : ''; };
  const titleOf = (sl) => (sl ? sl.dataset.title || sl.getAttribute('aria-label') : '');
  function writeNotes() {
    if (!notesBox.classList.contains('on')) return;
    notesBox.innerHTML = `<header><span>${cur + 1} / ${slides.length}</span><span>${titleOf(slides[cur])}</span><span>adım ${step} / ${slides[cur]._steps}</span></header>` + notesOf(slides[cur]);
  }
  function state() {
    const sl = slides[cur], nxt = step < sl._steps ? [cur, step + 1] : cur < slides.length - 1 ? [cur + 1, 0] : null;
    return { deck: 'state', slide: cur + 1, step, steps: sl._steps, total: slides.length, title: titleOf(sl), notes: notesOf(sl),
      next: nxt && { slide: nxt[0] + 1, step: nxt[1], title: titleOf(slides[nxt[0]]) }, startedAt,
      plan: slides.map((x) => parseFloat(x.dataset.duration || '0')) };
  }
  function broadcast() { if (speaker && !speaker.closed) { try { speaker.postMessage(state(), '*'); } catch (_) {} } }
  function openSpeaker() {
    if (speaker && !speaker.closed) { speaker.focus(); return; }
    speaker = window.open(location.pathname + '?speaker', 'deck-speaker', 'width=1280,height=800');
    setTimeout(broadcast, 500);
  }
  addEventListener('message', (e) => {
    const d = e.data || {};
    if (d.deck === 'hello') { speaker = e.source; broadcast(); }
    if (d.deck === 'key') key(d.key);
    if (d.deck === 'reset') { startedAt = Date.now(); broadcast(); }
  });
  let auto = 0, clock = null;
  function rehearse() {
    if (!REHEARSE) return;
    clearTimeout(auto);
    const sl = slides[cur], plan = parseFloat(sl.dataset.duration || '20') * 1000;
    if (!startedAt) startedAt = Date.now();
    auto = setTimeout(() => next(), Math.max(2500, plan / (sl._steps + 1)));
  }
  function tickClock() {
    if (!clock) return;
    const sec = startedAt ? (Date.now() - startedAt) / 1000 : 0;
    const due = slides.slice(0, cur + 1).reduce((a, s) => a + parseFloat(s.dataset.duration || '0'), 0);
    clock.textContent = `prova ${Math.floor(sec / 60)}:${String(Math.floor(sec % 60)).padStart(2, '0')} · plan ${Math.floor(due / 60)}:${String(Math.round(due % 60)).padStart(2, '0')}`;
    clock.classList.toggle('late', sec > due + 5);
  }

  /* ------------------------------------------------ keys */
  let typed = '';
  function key(k) {
    if (/^[0-9]$/.test(k)) { typed += k; return true; }
    if ((k === 'Enter' || k === 'g' || k === 'G') && typed) { const n = parseInt(typed, 10) - 1; typed = ''; go(n, 0, n > cur ? 1 : -1); return true; }
    typed = '';
    if (filmKey(k)) return true;
    if (['ArrowRight', 'ArrowDown', ' ', 'Enter', 'PageDown', 'd', 'D'].includes(k)) next();
    else if (['ArrowLeft', 'ArrowUp', 'PageUp', 'Backspace', 'a', 'A'].includes(k)) prev();
    else if (k === 'Home') go(0, 0, -1);
    else if (k === 'End') go(slides.length - 1, slides[slides.length - 1]._steps, 1);
    else if (k === 'f' || k === 'F') { if (!document.fullscreenElement) root.requestFullscreen && root.requestFullscreen().catch(() => {}); else document.exitFullscreen(); }
    else if (k === 'k' || k === 'K') openSpeaker();
    else if (k === 'n' || k === 'N') { notesBox.classList.toggle('on'); writeNotes(); }
    else if (k === 'b' || k === 'B' || k === '.') black.classList.toggle('on');
    else if (k === '?' || k === 'h' || k === 'H') help.classList.toggle('on');
    else if (k === 'Escape') { help.classList.remove('on'); black.classList.remove('on'); notesBox.classList.remove('on'); }
    else return false;
    return true;
  }
  const fromHash = () => {
    const [a, b] = (location.hash || '').slice(1).split('.');
    const n = parseInt(a, 10);
    return [n >= 1 && n <= slides.length ? n - 1 : 0, parseInt(b, 10) || 0];
  };

  /* ------------------------------------------------ public API (export tools, video renderer) */
  window.Deck = {
    mode: MODE, slides,
    go: (n, s = 0) => go(n - 1, s, 1),
    state: () => ({ slide: cur + 1, step, steps: slides[cur] ? slides[cur]._steps : 0, total: slides.length }),
    audit: () => (window.DeckData ? window.DeckData.audit(deck) : null),
    /* timeline(): per slide, each step's motion length in ms (render mode). The video hook: open ?render, then for
       every frame call await Deck.seek(slide, step, ms, filmMs) and capture the page. ms is time inside the step;
       filmMs (optional) is the film clock: camera push runs on time since the slide's step 0 began in the film and
       particles on film time, so both stay continuous across steps and slides. Same inputs give the same frame. */
    timeline() {
      const out = slides.map((s, i) => { const steps = []; for (let k = 0; k <= s._steps; k++) { seekBuild(i, k); const film = s._films.find((f) => f.at === k); steps.push({ step: k, ms: Math.ceil(Math.max(M.runEnd(), film && isFinite(film.v.duration) ? film.v.duration * 1000 : 0)) }); } return { slide: i + 1, title: titleOf(s), duration: parseFloat(s.dataset.duration || '0'), steps }; });
      return out;
    },
    seek(n, s, ms, filmMs) {
      const film = filmMs != null && isFinite(filmMs);
      if (film && s === 0) filmStart[n] = filmMs - ms;
      // camera: time since the slide began (film clock), else the steps before this one played to their end
      const camMs = film && filmStart[n] != null ? filmMs - filmStart[n] : ms + stepsBefore(n - 1, s);
      seekBuild(n - 1, s);
      M.seek(ms);
      const sl = slides[n - 1];
      if (sl._cam) { sl._cam.pause(); sl._cam.currentTime = camMs; }
      if (drift) {
        // every slide that starts after the film's beginning kicks the particles at its start (films run forward);
        // a kick only affects frames after it, so the frame depends on filmMs, not on the order of seeks
        if (film && filmStart[n] > 0) drift.kickAt(filmStart[n] / 1000, 1);
        drift.seek((film ? filmMs : ms) / 1000);
      }
      return seekFilms(sl, s, ms).then(() => new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r))));
    },
  };
  const filmStart = {};
  const stepLen = {};
  function stepsBefore(n, s) {
    let t = 0;
    for (let k = 0; k < s; k++) {
      const key = n + '.' + k;
      if (stepLen[key] == null) { seekBuild(n, k); stepLen[key] = Math.ceil(M.runEnd()); }
      t += stepLen[key];
    }
    return t;
  }
  let built = null;
  function seekBuild(n, s) {
    if (built && built[0] === n && built[1] === s) return;
    M.cancelRun();
    slides.forEach((x) => { x.classList.remove('is-current', 'is-leaving'); M.stopCamera(x); });
    cur = -1; step = 0;
    enter(n, 0, 1);
    for (let k = 1; k <= s; k++) { M.finishRun(); stepTo(k, 1); }
    built = [n, s];
  }

  /* ------------------------------------------------ start */
  setupFilms();
  whenReady().then(filmReady).then(() => {
    paintPaper();
    M.prepare(deck);
    slides.forEach(index);
    if (MODE === 'static') {
      root.classList.add('deck-static');
      finalState();
      slides.forEach((s) => s.classList.add('is-current'));
      root.dataset.deckReady = '1'; root.dataset.settled = 'all';
      return;
    }
    if (MODE === 'embed') {
      root.classList.add('deck-embed');
      scale(); addEventListener('resize', scale);
      const show = () => { const [n, s] = fromHash(); slides.forEach((x, i) => x.classList.toggle('is-current', i === n)); setStep(slides[n], s, false); };
      show(); addEventListener('hashchange', show);
      root.dataset.deckReady = '1';
      return;
    }
    scale(); addEventListener('resize', scale);
    document.body.append(progress, black, notesBox, help);
    if ((deck.dataset.particles === 'drift' || deck.querySelector('.slide[data-particles="drift"]')) && (MODE === 'live' || MODE === 'render')) {
      fx = document.createElement('canvas'); fx.className = 'deck-fx'; document.body.appendChild(fx);
      drift = M.drift(fx, { color: getComputedStyle(root).getPropertyValue('--pen').trim() });
    }
    if (REHEARSE) { clock = document.createElement('div'); clock.id = 'deck-clock'; document.body.appendChild(clock); setInterval(tickClock, 500); }
    addEventListener('keydown', (e) => { if (e.metaKey || e.ctrlKey || e.altKey) return; if (key(e.key)) e.preventDefault(); });
    addEventListener('hashchange', () => { const [n, s] = fromHash(); if (n !== cur || s !== step) go(n, s, n >= cur ? 1 : -1); });
    addEventListener('beforeprint', () => { root.classList.add('deck-static'); finalState(); slides.forEach((s) => s.classList.add('is-print')); });
    addEventListener('afterprint', () => { root.classList.remove('deck-static'); slides.forEach((s, i) => { if (i !== cur) setStep(s, 0, false); }); setStep(slides[cur], step, false); });
    if (MODE === 'render') { root.classList.add('deck-render'); const [n, s] = fromHash(); seekBuild(n, s); M.seek(0); }
    else { const [n, s] = fromHash(); go(n, s, s ? -1 : 1); }
    root.dataset.deckReady = '1';
  });

  /* ================================================ speaker view (?speaker) ================================================ */
  function speakerView() {
    const base = location.pathname;
    document.title = 'Konuşmacı · ' + document.title;
    root.classList.add('deck-speaker');
    deck.remove();
    const st = document.createElement('style');
    st.textContent = `
      html, body { background: #0f1530; color: #eef1f8; overflow: hidden; height: 100%; }
      #spk { display: grid; grid-template-columns: 1.55fr 1fr; grid-template-rows: auto 1fr auto; gap: 18px 24px; height: 100vh; padding: 20px 26px; font: 400 20px/1.5 var(--f-body); }
      #spk header { grid-column: 1 / 3; display: flex; align-items: baseline; gap: 28px; border-bottom: 1px solid #2a3355; padding-bottom: 12px; }
      #spk-time { font: 400 64px/1 var(--f-figure); color: #8fa3ff; font-variant-numeric: tabular-nums; }
      #spk-time.late { color: #ff8a73; }
      #spk-plan, #spk-now { color: #a3acc4; }
      #spk-where { margin-left: auto; text-align: right; font-weight: 700; font-size: 24px; }
      #spk-where small { display: block; font-weight: 400; font-size: 17px; color: #a3acc4; }
      .spk-frame { position: relative; width: 100%; aspect-ratio: 16 / 9; background: #000; border-radius: 8px; overflow: hidden; }
      .spk-frame iframe { position: absolute; inset: 0; width: 100%; height: 100%; border: 0; }
      .spk-label { font-size: 15px; font-weight: 700; color: #a3acc4; margin: 0 0 6px; }
      #spk-side { display: flex; flex-direction: column; gap: 16px; min-height: 0; }
      #spk-notes { flex: 1; overflow: auto; font-size: 26px; line-height: 1.5; padding-right: 8px; }
      #spk-notes b { color: #8fa3ff; }
      #spk footer { grid-column: 1 / 3; color: #a3acc4; font-size: 16px; display: flex; justify-content: space-between; }
      #spk button { font: inherit; color: #eef1f8; background: #26306b; border: 0; border-radius: 6px; padding: 4px 12px; cursor: pointer; }`;
    document.head.appendChild(st);
    const box = document.createElement('div'); box.id = 'spk';
    box.innerHTML = `<header><span id="spk-time">0:00</span><span id="spk-plan"></span><span id="spk-now"></span><span id="spk-where">Sunum penceresi bekleniyor<small></small></span></header>
      <div><p class="spk-label">Şimdi</p><div class="spk-frame"><iframe id="spk-cur" title="Şimdiki slayt"></iframe></div></div>
      <div id="spk-side"><div><p class="spk-label" id="spk-next-label">Sıradaki</p><div class="spk-frame"><iframe id="spk-next" title="Sıradaki"></iframe></div></div><div id="spk-notes"><p>Bu pencereyi sunumda K tuşu açar. Tuşlar burada da çalışır.</p></div></div>
      <footer><span>→ / Boşluk ileri · ← geri · B karart · Esc yardımı kapat</span><button type="button" id="spk-reset">Süreyi sıfırla</button></footer>`;
    document.body.appendChild(box);
    const $ = (id) => document.getElementById(id);
    const mmss = (s) => Math.floor(s / 60) + ':' + String(Math.floor(s % 60)).padStart(2, '0');
    const main = window.opener;
    let d = null;
    const setFrame = (f, n, s) => { const u = base + '?embed#' + n + '.' + s; if (f._u !== u) { f._u = u; f.src = u; } };
    addEventListener('message', (e) => {
      if (!e.data || e.data.deck !== 'state') return;
      d = e.data;
      $('spk-where').firstChild.textContent = `${d.slide} / ${d.total} · ${d.title}`;
      $('spk-where').querySelector('small').textContent = `adım ${d.step} / ${d.steps}`;
      $('spk-notes').innerHTML = d.notes || '<p style="color:#a3acc4">Bu slaytta not yok.</p>';
      setFrame($('spk-cur'), d.slide, d.step);
      if (d.next) { setFrame($('spk-next'), d.next.slide, d.next.step); $('spk-next-label').textContent = d.next.slide === d.slide ? 'Sıradaki adım' : 'Sıradaki: ' + d.next.title; }
      else $('spk-next-label').textContent = 'Son slayt';
      const before = d.plan.slice(0, d.slide - 1).reduce((a, b) => a + b, 0), total = d.plan.reduce((a, b) => a + b, 0);
      $('spk-plan').textContent = total ? `plan ${mmss(before)}–${mmss(before + d.plan[d.slide - 1])} / ${mmss(total)}` : '';
    });
    setInterval(() => {
      $('spk-now').textContent = new Date().toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' });
      if (!d || !d.startedAt) return;
      const s = (Date.now() - d.startedAt) / 1000;
      $('spk-time').textContent = mmss(s);
      $('spk-time').classList.toggle('late', s > d.plan.slice(0, d.slide).reduce((a, b) => a + b, 0) + 5);
    }, 250);
    addEventListener('keydown', (e) => { if (e.metaKey || e.ctrlKey || e.altKey || !main) return; main.postMessage({ deck: 'key', key: e.key }, '*'); e.preventDefault(); });
    $('spk-reset').addEventListener('click', () => main && main.postMessage({ deck: 'reset' }, '*'));
    if (main) main.postMessage({ deck: 'hello' }, '*');
  }
})();
