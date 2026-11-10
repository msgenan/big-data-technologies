/* Motion library: named, data-attribute-driven effects for deck.js.
   <h1 data-motion="line-rise" data-delay=".3" data-dur="1.1">  (seconds; delay/dur optional)
   Rules: the DOM is built in its final state; effects only play "from" something back to it (WAAPI, fill backwards),
   so print, export and reduced motion show the final state with no extra work. Every effect is a Web Animation or a
   driver on a null-target Animation, so Motion.seek(ms) can put any frame on screen (render mode, video export).
   Catalogue with when-to-use notes: skills/presentation/references/motion-patterns.md */
(function () {
  'use strict';
  const reduce = matchMedia('(prefers-reduced-motion: reduce)');
  const E = { in: 'cubic-bezier(.16,1,.3,1)', out: 'cubic-bezier(.7,0,.84,0)', move: 'cubic-bezier(.65,0,.35,1)', cam: 'cubic-bezier(.33,0,.2,1)' };
  const easeOut3 = (x) => 1 - Math.pow(1 - x, 3);
  const clamp = (x, a = 0, b = 1) => Math.min(b, Math.max(a, x));

  const M = { patterns: {}, mode: 'live', E };   // mode: live | render (paused, seek-driven) | static (no motion)
  M.active = () => M.mode !== 'static' && !reduce.matches;
  M.reduced = () => reduce.matches;

  /* ------------------------------------------------ seeded random (same seed, same drawing) */
  M.rng = function (seed) {
    let s = typeof seed === 'number' ? seed : [...String(seed)].reduce((h, c) => Math.imul(h ^ c.charCodeAt(0), 16777619), 2166136261);
    return function () {
      s |= 0; s = (s + 0x6D2B79F5) | 0;
      let t = Math.imul(s ^ (s >>> 15), 1 | s);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  };

  /* ------------------------------------------------ runs: every animation of the current step, so the engine can seek or finish them */
  let run = { anims: [] };
  const drivers = new Set();
  M.beginRun = () => (run = { anims: [] });
  M.currentRun = () => run;
  M.finishRun = (r = run) => r.anims.forEach((a) => { try { if (a.effect && a.effect.getTiming().duration !== Infinity) a.finish(); else a.cancel(); } catch (_) { a.cancel(); } });
  M.cancelRun = (r = run) => r.anims.forEach((a) => a.cancel());
  M.runEnd = (r = run) => r.anims.reduce((m, a) => (a._ambient ? m : Math.max(m, a.effect.getComputedTiming().endTime || 0)), 0);
  M.settled = (r = run) => Promise.all(r.anims.filter((a) => !a._ambient).map((a) => a.finished.catch(() => {})));
  M.seek = function (ms, r = run) {
    r.anims.forEach((a) => { a.pause(); a.currentTime = ms; });
    M.tick();
  };

  function track(a, ambient) {
    a._ambient = !!ambient;
    if (M.mode === 'render') a.pause();
    run.anims.push(a);
    return a;
  }
  /* WAAPI on an element: from-keyframe held during the delay (fill backwards), natural CSS after. */
  M.wa = function (el, keyframes, { delay = 0, dur = 900, easing = E.in, fill = 'backwards', ambient = false } = {}) {
    return track(el.animate(keyframes, { delay, duration: dur, easing, fill }), ambient);
  };
  /* Driver: fn(p, ms) for JS effects (count-up, karaoke, particles). p is linear 0..1; ms is local time. */
  M.driver = function (fn, { delay = 0, dur = 1000, ambient = false } = {}) {
    const a = new Animation(new KeyframeEffect(null, null, { delay, duration: dur, fill: 'both' }), document.timeline);
    const d = { a, fn, delay, dur };
    a.play();
    track(a, ambient);
    drivers.add(d);
    const end = () => { if (drivers.delete(d)) fn(1, dur); };
    a.finished.then(end, end);
    loop();
    return a;
  };
  let raf = 0;
  M.tick = function () {
    drivers.forEach((d) => {
      const t = d.a.currentTime == null ? 0 : d.a.currentTime;
      const local = Math.max(0, t - d.delay);
      d.fn(d.dur === Infinity ? 0 : clamp(local / d.dur), local);
    });
  };
  function loop() {
    if (raf || M.mode === 'render') return;
    const step = () => { M.tick(); raf = drivers.size ? requestAnimationFrame(step) : 0; };
    raf = requestAnimationFrame(step);
  }

  /* ------------------------------------------------ registry */
  M.define = (name, spec) => { M.patterns[name] = spec; };
  const opt = (el, o = {}) => ({
    delay: (o.base || 0) + (o.delay != null ? o.delay : (parseFloat(el.dataset.delay) || 0) * 1000),
    dur: el.dataset.dur ? parseFloat(el.dataset.dur) * 1000 : o.dur,
    index: o.index || 0,
  });
  /* Build content that must exist in every mode (pen marks, marker wash) or only when animating (word splits). */
  M.prepare = function (root) {
    root.querySelectorAll('[data-motion]').forEach((el) => {
      const p = M.patterns[el.dataset.motion];
      if (!p) { console.error('[motion] unknown pattern: ' + el.dataset.motion, el); return; }
      if (p.build) p.build(el);
      if (p.prepare && M.active()) p.prepare(el);
    });
  };
  M.play = function (el, name, o) {
    const p = M.patterns[name || el.dataset.motion || 'rise'];
    if (!p || !M.active() || !p.enter) return;
    p.enter(el, opt(el, o));
  };
  M.exit = function (el, done) {
    if (!M.active()) { done(); return; }
    const l = lift(el, '0 0', '0 -20px', { dur: 340, easing: E.out, fill: 'forwards' });
    const a = M.wa(el, [{ opacity: op(el) }, { opacity: 0 }], { dur: 340, easing: E.out, fill: 'forwards' });
    const fin = () => { done(); a.cancel(); l.cancel(); };
    a.finished.then(fin, fin);
  };

  /* ================================================ patterns ================================================ */

  const op = (el) => getComputedStyle(el).opacity;           // animate to the element's own opacity, not to 1
  /* offsets are added on top of the element's own translate (composite add), so a centred element (translate: 0 -50%)
     never jumps when the animation ends */
  const lift = (el, from, to, o) => track(el.animate([{ translate: from }, { translate: to }], { delay: o.delay, duration: o.dur, easing: o.easing || E.in, fill: o.fill || 'backwards', composite: 'add' }));
  M.define('rise', {
    enter: (el, o) => {
      M.wa(el, [{ opacity: 0 }, { opacity: op(el) }], { delay: o.delay, dur: (o.dur || 900) * .7, easing: 'ease-out' });
      lift(el, '0 28px', '0 0', { delay: o.delay, dur: o.dur || 900 });
    },
  });
  M.define('fade', {
    enter: (el, o) => M.wa(el, [{ opacity: 0 }, { opacity: op(el) }], { delay: o.delay, dur: o.dur || 700, easing: 'ease-out' }),
  });

  /* line-rise: each word rises out of its own line mask, staggered */
  function splitWords(el) {
    if (el._split) return el._split;
    const words = [];
    const wrap = (node) => {
      const w = document.createElement('span'); w.className = 'mw';
      const i = document.createElement('span'); i.className = 'mw-i';
      w.appendChild(i); return [w, i];
    };
    Array.from(el.childNodes).forEach((n) => {
      if (n.nodeType === 3) {
        const frag = document.createDocumentFragment();
        n.textContent.split(/(\s+)/).forEach((part) => {
          if (!part) return;
          if (/^\s+$/.test(part)) { frag.appendChild(document.createTextNode(part)); return; }
          const [w, i] = wrap(); i.textContent = part; frag.appendChild(w); words.push(i);
        });
        el.replaceChild(frag, n);
      } else if (n.nodeType === 1 && n.tagName !== 'BR' && !n.classList.contains('pen-svg')) {
        const [w, i] = wrap(); el.replaceChild(w, n); i.appendChild(n); words.push(i);
        if (n.matches('[data-motion], .has-pen') || n.querySelector('[data-motion]')) w.classList.add('nest');   // nested effect: no mask
      }
    });
    return (el._split = words);
  }
  M.define('line-rise', {
    prepare: splitWords,
    enter: (el, o) => {
      const gap = parseFloat(el.dataset.gap || '.07') * 1000;
      splitWords(el).forEach((w, i) => {
        const kf = w.parentNode.classList.contains('nest') ? [{ translate: '0 .5em', opacity: 0 }, { translate: '0 0', opacity: 1 }] : [{ translate: '0 112%' }, { translate: '0 0' }];
        M.wa(w, kf, { delay: o.delay + i * gap, dur: o.dur || 950 });
      });
    },
  });

  /* blur-in: out of a blur, letters tighten from wide tracking to their set spacing */
  M.define('blur-in', {
    enter: (el, o) => {
      const ls = getComputedStyle(el).letterSpacing;
      const end = ls === 'normal' ? '0px' : ls;
      M.wa(el, [{ opacity: 0, filter: 'blur(12px)', letterSpacing: '.08em' }, { opacity: 1, offset: .55 }, { opacity: 1, filter: 'blur(0px)', letterSpacing: end }],
        { delay: o.delay, dur: o.dur || 1150 });
    },
  });

  /* focus: rack focus, soft and slightly large to sharp */
  M.define('focus', {
    enter: (el, o) => M.wa(el, [{ opacity: 0, filter: 'blur(14px)', scale: '1.05' }, { opacity: 1, offset: .6 }, { opacity: 1, filter: 'blur(0px)', scale: '1' }],
      { delay: o.delay, dur: o.dur || 1150 }),
  });

  /* ink-wipe: the line is inked left to right, colour settles from the pen to the text colour */
  M.define('ink-wipe', {
    enter: (el, o) => {
      const dur = o.dur || 1200;
      M.wa(el, [{ clipPath: 'inset(-25% 100% -25% 0)' }, { clipPath: 'inset(-25% 0% -25% 0)' }], { delay: o.delay, dur, easing: E.move });
      if (!('keepColor' in el.dataset)) {
        const c = getComputedStyle(el).color, pen = getComputedStyle(el).getPropertyValue('--pen').trim();
        if (pen && c) M.wa(el, [{ color: pen }, { color: c }], { delay: o.delay, dur: dur * 2, easing: 'ease-out' });
      }
    },
  });

  /* count-up: number counts from zero (or data-from) with ease-out; final text is restored exactly */
  M.define('count-up', {
    enter: (el, o) => {
      const D = window.DeckData;
      if (!el.dataset.num && !el.dataset.value) { const inner = el.querySelector('[data-num]'); if (inner) { M.patterns['count-up'].enter(inner, o); return; } }
      const key = el.dataset.num;
      const target = key && D ? D.val(key) : parseFloat(el.dataset.value);
      if (!isFinite(target)) return;
      const fmt = key && D ? (v) => D.format(key, v) : (v) => Math.round(v).toLocaleString('tr-TR');
      const from = parseFloat(el.dataset.from || '0');
      const final = el.textContent;
      el.style.minWidth = el.offsetWidth + 'px';
      M.driver((p) => {
        el.textContent = p >= 1 ? final : fmt(from + (target - from) * easeOut3(p));
        if (p >= 1) el.style.minWidth = '';
      }, { delay: o.delay, dur: o.dur || 1600 });
    },
  });

  /* draw: SVG strokes draw themselves; filled marks and text fade in after */
  const GEOM = 'path,line,polyline,polygon,circle,rect,ellipse';
  M.define('draw', {
    enter: (el, o) => {
      const dur = o.dur || 1400, gap = parseFloat(el.dataset.gap || '.12') * 1000;
      const shapes = (el.matches(GEOM) ? [el] : Array.from(el.querySelectorAll(GEOM)));
      let k = 0;
      shapes.forEach((s) => {
        const cs = getComputedStyle(s);
        const linear = /^(path|line|polyline|polygon)$/.test(s.tagName) || cs.fill === 'none';
        if (!linear || cs.stroke === 'none' || cs.strokeDasharray !== 'none' || !s.getTotalLength) {
          M.wa(s, [{ opacity: 0 }, { opacity: 1 }], { delay: o.delay + dur * .75, dur: 500, easing: 'ease-out' });
          return;
        }
        const len = Math.ceil(s.getTotalLength()) + 2;
        M.wa(s, [{ strokeDasharray: `${len} ${len}`, strokeDashoffset: `${len}` }, { strokeDasharray: `${len} ${len}`, strokeDashoffset: '0' }],
          { delay: o.delay + gap * k++, dur, easing: E.move });
      });
      el.querySelectorAll('text').forEach((t) => M.wa(t, [{ opacity: 0 }, { opacity: 1 }], { delay: o.delay + dur * .8, dur: 500, easing: 'ease-out' }));
    },
  });

  /* pen-mark: a hand-drawn ballpoint circle / underline / box / strike, seeded by the text so it never changes */
  function penPath(kind, w, h, r) {
    const j = (a) => (r() - .5) * a;
    if (kind === 'underline') {
      const y = h + 6;
      return `M ${-6 + j(6)} ${y + j(4)} C ${w * .3} ${y + 5 + j(4)}, ${w * .65} ${y - 3 + j(4)}, ${w + 8 + j(6)} ${y + 2 + j(4)}`;
    }
    if (kind === 'strike') {
      const y = h * .55;
      return `M ${-8} ${y + j(6)} C ${w * .35} ${y - 6 + j(4)}, ${w * .7} ${y + 6 + j(4)}, ${w + 10} ${y - 4 + j(6)}`;
    }
    if (kind === 'box') {
      const p = 14;
      return `M ${-p + j(4)} ${-p + j(4)} L ${w + p + j(6)} ${-p + 2 + j(4)} L ${w + p - 2 + j(4)} ${h + p + j(6)} L ${-p + 3 + j(4)} ${h + p - 2 + j(4)} Z`;
    }
    const cx = w / 2, cy = h / 2, rx = w / 2 + 12 + j(4), ry = h / 2 + 10 + j(4);
    const a0 = -Math.PI * .62 + j(.3), turn = Math.PI * 2 * 1.12;
    let d = '';
    for (let i = 0; i <= 64; i++) {
      const t = i / 64, a = a0 + turn * t, wob = 1 + .045 * Math.sin(t * 9 + r() * .4) + j(.012);
      const x = cx + Math.cos(a) * rx * wob, y = cy + Math.sin(a) * ry * wob * (1 + .06 * t);
      d += (i ? ' L ' : 'M ') + x.toFixed(1) + ' ' + y.toFixed(1);
    }
    return d;
  }
  M.define('pen-mark', {
    build: (el) => {
      if (el.querySelector(':scope > .pen-svg')) return;
      el.classList.add('has-pen');
      const w = el.offsetWidth, h = el.offsetHeight, kind = el.dataset.mark || 'circle';
      const r = M.rng(el.textContent + kind);
      const NS = 'http://www.w3.org/2000/svg';
      const svg = document.createElementNS(NS, 'svg');
      const pad = 40;
      svg.setAttribute('class', 'pen-svg'); svg.setAttribute('aria-hidden', 'true');
      svg.setAttribute('width', w + pad * 2); svg.setAttribute('height', h + pad * 2);
      svg.setAttribute('viewBox', `${-pad} ${-pad} ${w + pad * 2} ${h + pad * 2}`);
      svg.style.left = -pad + 'px'; svg.style.top = -pad + 'px';
      const p = document.createElementNS(NS, 'path');
      p.setAttribute('d', penPath(kind, w, h, r));
      p.setAttribute('stroke-width', el.dataset.weight || (kind === 'circle' ? 5 : 6));
      svg.appendChild(p); el.appendChild(svg);
    },
    enter: (el, o) => {
      const p = el.querySelector(':scope > .pen-svg path');
      if (!p) return;
      const len = Math.ceil(p.getTotalLength()) + 2;
      M.wa(p, [{ strokeDasharray: `${len} ${len}`, strokeDashoffset: `${len}` }, { strokeDasharray: `${len} ${len}`, strokeDashoffset: '0' }],
        { delay: o.delay, dur: o.dur || 900, easing: 'cubic-bezier(.45,.05,.3,1)' });
    },
  });

  /* marker: highlighter sweeps behind the words */
  M.define('marker', {
    build: (el) => el.classList.add('mk'),
    enter: (el, o) => M.wa(el, [{ backgroundSize: '0% 46%' }, { backgroundSize: '100% 46%' }], { delay: o.delay, dur: o.dur || 800, easing: E.move }),
  });

  /* grow: bar grows from its axis (data-axis="y" for columns) */
  M.define('grow', {
    enter: (el, o) => {
      const y = el.dataset.axis === 'y';
      M.wa(el, [{ scale: y ? '1 0' : '0 1' }, { scale: '1 1' }], { delay: o.delay, dur: o.dur || 1000, easing: E.move });
    },
  });

  /* stagger: children enter one after another (data-child = their pattern, data-gap = seconds between) */
  M.define('stagger', {
    container: true,
    enter: (el, o) => {
      const gap = parseFloat(el.dataset.gap || '.12') * 1000;
      Array.from(el.children).forEach((c, i) => {
        if (c.classList.contains('is-future') || c.classList.contains('is-past')) return;
        M.play(c, c.dataset.motion || el.dataset.child || 'rise', { delay: o.delay + i * gap + (parseFloat(c.dataset.delay) || 0) * 1000 });
      });
    },
  });

  /* wall: tiles land from the centre outwards; add a .veil child with a later data-step to dim it */
  M.define('wall', {
    container: true,
    enter: (el, o) => {
      const tiles = Array.from(el.children).filter((c) => !c.classList.contains('veil'));
      const xs = [...new Set(tiles.map((t) => t.offsetLeft))].sort((a, b) => a - b);
      const ys = [...new Set(tiles.map((t) => t.offsetTop))].sort((a, b) => a - b);
      const mid = (xs.length - 1) / 2;
      tiles.forEach((t) => {
        const c = xs.indexOf(t.offsetLeft), r = ys.indexOf(t.offsetTop);
        const j = Math.round(Math.abs(c - mid) * 2 + r);
        M.wa(t, [{ opacity: 0, scale: '1.25' }, { opacity: 1, scale: '1' }], { delay: o.delay + j * 55, dur: o.dur || 1300 });
      });
    },
  });

  /* wheel: one slot, words roll through it on steps. <span data-motion="wheel"><i>a</i><i data-step="1">b</i></span> */
  M.define('wheel', {
    container: true,
    build: (el) => {
      el.classList.add('wheel');
      Array.from(el.children).forEach((c) => {
        const s = c.dataset.step;
        c._wheelStep = s == null ? 0 : parseInt(s, 10);
        c.removeAttribute('data-step');
      });
    },
    steps: (el) => Math.max(0, ...Array.from(el.children).map((c) => c._wheelStep || 0)),
    setStep: (el, k, animate) => {
      const kids = Array.from(el.children);
      let on = kids[0];
      kids.forEach((c) => { if (c._wheelStep <= k) on = c; });
      const prev = kids.find((c) => c.classList.contains('is-on'));
      if (prev === on) return;
      const w0 = el.offsetWidth;
      kids.forEach((c) => c.classList.remove('is-on', 'is-out'));
      on.classList.add('is-on');
      if (!animate || !M.active() || !prev) return;
      prev.classList.add('is-out');
      const w1 = el.offsetWidth;
      M.wa(el, [{ width: w0 + 'px' }, { width: w1 + 'px' }], { dur: 700, easing: E.move });
      M.wa(on, [{ translate: '0 105%', opacity: 0 }, { translate: '0 0', opacity: 1 }], { delay: 120, dur: 800 });
      const out = M.wa(prev, [{ translate: '0 0', opacity: 1 }, { translate: '0 -105%', opacity: 0 }], { dur: 450, easing: E.out, fill: 'forwards' });
      const done = () => { prev.classList.remove('is-out'); out.cancel(); };
      out.finished.then(done, done);
    },
  });

  /* karaoke: words light up in time. data-times="0,.4,.9,..." (s per word) or data-wps="2.5"; data-audio="#id" syncs to a real recording */
  M.define('karaoke', {
    prepare: (el) => {
      if (el._words) return;
      const words = [];
      const walk = (node) => Array.from(node.childNodes).forEach((n) => {
        if (n.nodeType === 3) {
          const frag = document.createDocumentFragment();
          n.textContent.split(/(\s+)/).forEach((part) => {
            if (!part) return;
            if (/^\s+$/.test(part)) { frag.appendChild(document.createTextNode(part)); return; }
            const s = document.createElement('span'); s.className = 'kw'; s.textContent = part; frag.appendChild(s); words.push(s);
          });
          node.replaceChild(frag, n);
        } else if (n.nodeType === 1) walk(n);
      });
      walk(el);
      el._words = words;
      const t = el.dataset.times ? el.dataset.times.split(',').map(Number) : null;
      const wps = parseFloat(el.dataset.wps || '2.6');
      el._times = words.map((_, i) => (t && t[i] != null ? t[i] : i / wps));
    },
    enter: (el, o) => {
      if (!el._words) return;
      el.classList.add('karaoke-live');
      const set = (sec) => {
        let k = -1;
        el._times.forEach((t, i) => { if (t <= sec + .03) k = i; });
        el._words.forEach((w, i) => { w.classList.toggle('is-read', i < k); w.classList.toggle('is-now', i === k); });
      };
      const audio = el.dataset.audio && document.querySelector(el.dataset.audio);
      if (audio && M.mode === 'live') {
        audio.currentTime = 0;
        const p = audio.play(); if (p && p.catch) p.catch((e) => console.warn('[motion] karaoke audio blocked: ' + e.name));
        const loopA = () => { set(audio.currentTime); if (!audio.paused && el.isConnected) requestAnimationFrame(loopA); else if (audio.ended) done(); };
        const done = () => { el.classList.remove('karaoke-live'); };
        requestAnimationFrame(loopA);
        return;
      }
      const total = (el._times[el._times.length - 1] || 0) * 1000 + 900;
      M.driver((p, ms) => {
        if (p >= 1) { el.classList.remove('karaoke-live'); el._words.forEach((w) => w.classList.remove('is-read', 'is-now')); return; }
        set(ms / 1000);
      }, { delay: o.delay, dur: total });
    },
  });

  /* ================================================ slide-level effects (called by deck.js) ================================================ */

  /* transitions: data-transition="fade" (default) | "iris" | "none" on the incoming slide */
  M.transition = function (slide, kind, focus) {
    if (!M.active() || kind === 'none') return;
    if (kind === 'iris') {
      const at = `${focus ? focus.x + 'px' : '50%'} ${focus ? focus.y + 'px' : '50%'}`;
      M.wa(slide, [{ clipPath: `circle(0px at ${at})` }, { clipPath: `circle(2300px at ${at})` }], { dur: 1100 });
    } else {
      M.wa(slide, [{ opacity: 0 }, { opacity: 1 }], { dur: 650, easing: 'ease-out' });
    }
  };
  M.leave = function (slide, done) {
    if (!M.active()) { done(); return; }
    const a = slide.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 420, easing: E.out, fill: 'forwards' });
    const fin = () => { done(); a.cancel(); };
    a.finished.then(fin, fin);
  };
  /* camera push: data-camera="push" on a slide, a slow scale over the slide's planned time */
  /* Kept outside the step runs, so a step change never finishes it early; Deck.seek drives it from slide time. */
  M.camera = function (slide) {
    if (slide._cam) { slide._cam.cancel(); slide._cam = null; }
    if (!M.active() || slide.dataset.camera !== 'push') return;
    const sec = parseFloat(slide.dataset.duration || '30') + 10;
    slide._cam = slide.animate([{ scale: '1' }, { scale: '1.025' }], { duration: sec * 1000, easing: E.cam, fill: 'both' });
    if (M.mode === 'render') slide._cam.pause();
  };
  M.stopCamera = (slide) => { if (slide && slide._cam) { slide._cam.cancel(); slide._cam = null; } };

  /* paper: seeded background texture, rendered once to an image (also used by print and PPTX) */
  M.paper = function ({ kind = 'grid', w = 1920, h = 1080, ground, line, margin, marginX = 150, step = 48, seed = 77 }) {
    const c = document.createElement('canvas'); c.width = w; c.height = h;
    const g = c.getContext('2d');
    g.fillStyle = ground; g.fillRect(0, 0, w, h);
    const r = M.rng(seed);
    if (kind === 'grid') {
      g.strokeStyle = line; g.lineWidth = 1;
      g.beginPath();
      for (let x = marginX % step + .5; x < w; x += step) { g.moveTo(x, 0); g.lineTo(x, h); }
      for (let y = 36.5; y < h; y += step) { g.moveTo(0, y); g.lineTo(w, y); }
      g.stroke();
    }
    if (kind === 'grid' || kind === 'grain') {   // paper fibres
      g.lineCap = 'round';
      for (let i = 0, n = Math.round(w * h / 2600); i < n; i++) {
        const x = r() * w, y = r() * h, l = 4 + r() * 14, a = r() * 6.28;
        g.strokeStyle = r() < .7 ? 'rgba(20,26,46,' + (.018 + r() * .03).toFixed(3) + ')' : 'rgba(255,255,255,' + (.15 + r() * .25).toFixed(3) + ')';
        g.lineWidth = .6 + r() * .5;
        g.beginPath(); g.moveTo(x, y);
        g.quadraticCurveTo(x + Math.cos(a + .6) * l * .6, y + Math.sin(a + .6) * l * .6, x + Math.cos(a) * l, y + Math.sin(a) * l);
        g.stroke();
      }
    }
    if (margin) { g.fillStyle = margin; g.fillRect(marginX, 0, 2, h); }
    return c.toDataURL('image/png');
  };

  /* drift: seeded ballpoint flecks drifting at the edges; a slide change gives them a kick. Position is a pure function
     of time and the kick times, so a seek shows the same frame every time. data-particles="drift" on .deck */
  M.drift = function (canvas, { count = 30, color = '#2440d8', seed = 11 } = {}) {
    const r = M.rng(seed);
    const P = Array.from({ length: count }, () => {
      const edge = r();
      return { x: edge < .5 ? r() * .1 : .9 + r() * .1, y: r(), vx: (r() - .5) * .006, vy: -.004 - r() * .008, len: 6 + r() * 16,
        a: r() * 6.28, spin: (r() - .5) * .8, k: .4 + r(), alpha: .12 + r() * .26 };
    });
    const kicks = [];
    let W = 0, H = 0;
    const size = () => { const d = Math.min(2, devicePixelRatio || 1); W = innerWidth; H = innerHeight; canvas.width = W * d; canvas.height = H * d; canvas.getContext('2d').setTransform(d, 0, 0, d, 0, 0); };
    size(); addEventListener('resize', size);
    const g = canvas.getContext('2d');
    const draw = (sec) => {
      g.clearRect(0, 0, W, H);
      g.lineCap = 'round'; g.strokeStyle = color;
      P.forEach((p) => {
        let x = p.x + p.vx * sec, y = p.y + p.vy * sec, a = p.a + p.spin * sec;
        kicks.forEach((k) => {
          const dt = sec - k.t; if (dt <= 0) return;
          const e = 1 - Math.exp(-dt / .9);
          x += k.dir * .05 * p.k * e; y -= .03 * p.k * e; a += 2.4 * p.k * e * k.dir;
        });
        x = ((x % 1) + 1) % 1; y = ((y % 1) + 1) % 1;
        if (x > .12 && x < .88) return;                       // keep the reading area clear
        const px = x * W, py = y * H, l = p.len;
        g.globalAlpha = p.alpha; g.lineWidth = 2.2;
        g.beginPath(); g.moveTo(px - Math.cos(a) * l / 2, py - Math.sin(a) * l / 2);
        g.quadraticCurveTo(px + Math.sin(a) * 3, py - Math.cos(a) * 3, px + Math.cos(a) * l / 2, py + Math.sin(a) * l / 2); g.stroke();
      });
      g.globalAlpha = 1;
    };
    const t0 = performance.now();
    let clock = null;                                         // set by seek in render mode
    const now = () => (clock != null ? clock : (performance.now() - t0) / 1000);
    if (M.reduced() || M.mode === 'static') { draw(0); return { kick() {}, seek() {} }; }
    if (M.mode === 'live') { const f = () => { draw(now()); requestAnimationFrame(f); }; requestAnimationFrame(f); }
    return {
      kick(dir) { kicks.push({ t: now(), dir: dir < 0 ? -1 : 1 }); },        // kept forever: dropping one would jump
      kickAt(sec, dir) {                                     // render mode: kicks at fixed film times, idempotent
        if (kicks.some((k) => Math.abs(k.t - sec) < 1e-6)) return;
        kicks.push({ t: sec, dir: dir < 0 ? -1 : 1 }); kicks.sort((a, b) => a.t - b.t);
      },
      seek(sec) { clock = sec; draw(sec); },
    };
  };

  window.Motion = M;
})();
