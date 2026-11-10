/* Charts from the number registry, labelled directly (no legends, no tooltips: this is a slide).
   Bars and columns are plain HTML boxes, so the editable PPTX keeps them as native shapes and text.
   The line chart is SVG (it becomes a picture in the editable PPTX).
   <div data-chart="bar" data-keys="d.mon,d.tue,d.wed" data-highlight="d.wed"></div>
   <div data-chart="columns" data-keys="..." data-height="520"></div>
   <div data-chart="line" data-x="Pzt,Sal,Çar" data-series="Önce:a1,a2,a3;Sonra:b1,b2,b3" data-highlight="Sonra" data-height="560"></div>
   Optional: data-max (axis top), data-delay (s, where the build starts), data-unit-key (key whose format labels the y axis). */
(function () {
  'use strict';
  const NS = 'http://www.w3.org/2000/svg';
  const D = () => window.DeckData;
  const keys = (s) => (s || '').split(',').map((k) => k.trim()).filter(Boolean);
  const el = (tag, cls, parent, text) => { const e = document.createElement(tag); if (cls) e.className = cls; if (text != null) e.textContent = text; if (parent) parent.appendChild(e); return e; };
  const svg = (tag, attrs, parent, text) => { const e = document.createElementNS(NS, tag); for (const k in attrs) e.setAttribute(k, attrs[k]); if (text != null) e.textContent = text; if (parent) parent.appendChild(e); return e; };

  /* nice axis: 1-2-2.5-5 steps */
  function nice(max, target = 5) {
    const raw = max / target, mag = Math.pow(10, Math.floor(Math.log10(raw || 1)));
    const step = [1, 2, 2.5, 5, 10].map((m) => m * mag).find((s) => s >= raw) || mag * 10;
    const top = Math.ceil(max / step - 1e-9) * step;
    const ticks = []; for (let v = 0; v <= top + 1e-9; v += step) ticks.push(+v.toFixed(10));
    return { step, top, ticks };
  }

  function bar(host, vertical) {
    const ks = keys(host.dataset.keys), hi = keys(host.dataset.highlight);
    const vals = ks.map((k) => D().val(k));
    const max = parseFloat(host.dataset.max) || Math.max(...vals);
    const base = parseFloat(host.dataset.delay || '0');
    host.classList.add(vertical ? 'chart-cols' : 'chart-bar');
    if (vertical) host.style.setProperty('--h', (parseFloat(host.dataset.height) || 520) + 'px');
    ks.forEach((k, i) => {
      const row = el('div', 'cb-row' + (hi.length && !hi.includes(k) ? ' is-dim' : ''), host);
      const lab = el('div', 'cb-label', null, D().label(k));
      const track = el('div', 'cb-track', row);
      const fill = el('div', 'cb-fill', track);
      const r = Math.max(0, vals[i] / max);
      if (vertical) fill.style.height = `calc((var(--h) - 70px) * ${r.toFixed(4)})`;
      else fill.style.width = `calc((100% - var(--val-w, 200px)) * ${r.toFixed(4)})`;
      fill.dataset.motion = 'grow'; if (vertical) fill.dataset.axis = 'y';
      fill.dataset.delay = (base + i * .09).toFixed(2);
      const v = el('span', 'cb-val', null); v.dataset.num = k; v.textContent = D().format(k);
      v.dataset.motion = 'fade'; v.dataset.delay = (base + i * .09 + .55).toFixed(2);
      if (vertical) { track.insertBefore(v, fill); row.appendChild(lab); }
      else { track.appendChild(v); row.insertBefore(lab, track); }
    });
  }

  function line(host) {
    const W = parseFloat(host.dataset.width) || host.clientWidth || 1200;
    const H = parseFloat(host.dataset.height) || 560;
    const xs = (host.dataset.x || '').split(',').map((s) => s.trim());
    const series = (host.dataset.series || '').split(';').filter(Boolean).map((s) => { const [name, ks] = s.split(':'); return { name: name.trim(), keys: keys(ks) }; });
    const hi = host.dataset.highlight || series[series.length - 1].name;
    const all = series.flatMap((s) => s.keys.map((k) => D().val(k)));
    const ax = nice(parseFloat(host.dataset.max) || Math.max(...all), 4);
    const unitKey = host.dataset.unitKey || series[0].keys[0];
    const pad = { l: 120, r: 250, t: 30, b: 70 };
    const X = (i) => pad.l + (xs.length < 2 ? 0 : (i / (xs.length - 1)) * (W - pad.l - pad.r));
    const Y = (v) => pad.t + (1 - v / ax.top) * (H - pad.t - pad.b);
    const s = svg('svg', { width: W, height: H, viewBox: `0 0 ${W} ${H}`, class: 'chart-line', 'data-chart-svg': '', role: 'img' });
    const axis = svg('g', { class: 'cl-axis' }, s);
    ax.ticks.forEach((t) => {
      svg('line', { x1: pad.l, x2: W - pad.r + 20, y1: Y(t), y2: Y(t), class: t === 0 ? 'cl-base' : 'cl-grid' }, axis);
      svg('text', { x: pad.l - 20, y: Y(t) + 9, 'text-anchor': 'end', class: 'cl-tick' }, axis, D().format(unitKey, t));
    });
    xs.forEach((x, i) => svg('text', { x: X(i), y: H - 22, 'text-anchor': 'middle', class: 'cl-tick' }, axis, x));
    const marks = svg('g', { 'data-motion': 'draw', 'data-delay': host.dataset.delay || '0' }, s);
    const ends = [];
    series.forEach((se) => {
      const on = se.name === hi;
      const pts = se.keys.map((k, i) => [X(i), Y(D().val(k))]);
      svg('polyline', { points: pts.map((p) => p.map((n) => n.toFixed(1)).join(',')).join(' '), class: on ? 'cl-line is-hi' : 'cl-line' }, marks);
      if (on) pts.forEach((p) => svg('circle', { cx: p[0], cy: p[1], r: 9, class: 'cl-dot' }, marks));
      const last = se.keys[se.keys.length - 1];
      ends.push({ y: pts[pts.length - 1][1], x: pts[pts.length - 1][0], name: se.name, key: last, on });
    });
    ends.sort((a, b) => a.y - b.y);                          // keep end labels from colliding
    for (let i = 1; i < ends.length; i++) if (ends[i].y - ends[i - 1].y < 64) ends[i].y = ends[i - 1].y + 64;
    ends.forEach((e) => {
      const t = svg('text', { x: e.x + 24, y: e.y - 4, class: e.on ? 'cl-end is-hi' : 'cl-end' }, marks);
      svg('tspan', { x: e.x + 24, dy: 0, class: 'cl-end-name' }, t, e.name);
      const v = svg('tspan', { x: e.x + 24, dy: 36, class: 'cl-end-val', 'data-num': e.key }, t, D().format(e.key));
      v.dataset.num = e.key;
    });
    host.appendChild(s);
  }

  const Charts = {
    nice,
    render(root = document) {
      root.querySelectorAll('[data-chart]').forEach((host) => {
        if (host.dataset.rendered) return;
        host.dataset.rendered = '1';
        try {
          const kind = host.dataset.chart;
          if (kind === 'bar') bar(host, false);
          else if (kind === 'columns') bar(host, true);
          else if (kind === 'line') line(host);
          else throw new Error('unknown chart type ' + kind);
        } catch (e) { console.error('[charts]', e.message, host); host.textContent = 'Grafik çizilemedi: ' + e.message; host.style.outline = '3px solid #c2412d'; }
      });
    },
  };
  window.Charts = Charts;
})();
