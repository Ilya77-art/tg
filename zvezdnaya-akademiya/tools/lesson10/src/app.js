(() => {
'use strict';
const { Position, sqName, sqIndex, sanToRu, colorOf } = window.ChessCore;
const D = window.MELNICA;
const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => Array.from(r.querySelectorAll(s));
const NS = 'melnitsa-torre:';
const store = {
  get(k, d) { try { const v = localStorage.getItem(NS + k); return v == null ? d : JSON.parse(v); } catch (e) { return d; } },
  set(k, v) { try { localStorage.setItem(NS + k, JSON.stringify(v)); } catch (e) { /* storage unavailable: state lives in memory */ } }
};
const reduceMotion = !!(window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches);
const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const ru = san => sanToRu(san);
const RUP = s => esc(ru(s));
const SVGNS = 'http://www.w3.org/2000/svg';
const plural = (n, a, b, c) => { const m = n % 10, h = n % 100; return m === 1 && h !== 11 ? a : (m >= 2 && m <= 4 && (h < 12 || h > 14) ? b : c); };
const uciOf = m => sqName(m.from) + sqName(m.to) + (m.promotion || '');
const PIECE_RU = { k: 'Кр', q: 'Ф', r: 'Л', b: 'С', n: 'К', p: '' };

/* ---------- pieces sprite ---------- */
(function buildSprite() {
  const P = window.PIECE_PATHS;
  let s = '<svg xmlns="http://www.w3.org/2000/svg" style="position:absolute;width:0;height:0;overflow:hidden" aria-hidden="true">';
  Object.keys(P).forEach(k => {
    const light = k[0] === 'w' ? '#fffcf3' : '#f1e1c4';
    s += `<symbol id="pc-${k}" viewBox="0 0 45 45"><path d="${P[k].s}" fill="${light}"/><path d="${P[k].f}" fill="#24170b"/></symbol>`;
  });
  document.body.insertAdjacentHTML('afterbegin', s + '</svg>');
})();
function pieceSvg(letter, cls) {
  const id = (letter === letter.toUpperCase() ? 'w' : 'b') + letter.toUpperCase();
  return `<svg class="${cls || ''}" viewBox="0 0 45 45" aria-hidden="true"><use href="#pc-${id}"></use></svg>`;
}

/* ---------- sound ---------- */
const prefs = { sound: store.get('sound', true) };
const Sound = (() => {
  let ctx = null, noise = null;
  const ac = () => {
    if (!ctx) { const C = window.AudioContext || window.webkitAudioContext; if (!C) return null; ctx = new C(); }
    if (ctx.state === 'suspended') ctx.resume();
    return ctx;
  };
  function tone(freq, dur, o = {}) {
    if (!prefs.sound) return;
    const a = ac(); if (!a) return;
    const t = a.currentTime + (o.when || 0);
    const osc = a.createOscillator(), g = a.createGain();
    osc.type = o.type || 'sine';
    osc.frequency.setValueAtTime(freq, t);
    if (o.slide) osc.frequency.exponentialRampToValueAtTime(freq * o.slide, t + dur);
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(o.gain || 0.06, t + 0.012);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    osc.connect(g); g.connect(a.destination);
    osc.start(t); osc.stop(t + dur + 0.03);
  }
  // a breath of wind: filtered noise sweeping up and down
  function whoosh(dur, from, to, gain) {
    if (!prefs.sound) return;
    const a = ac(); if (!a) return;
    if (!noise) { noise = a.createBuffer(1, a.sampleRate * 1.5, a.sampleRate); const d = noise.getChannelData(0); for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1; }
    const t = a.currentTime, src = a.createBufferSource(), f = a.createBiquadFilter(), g = a.createGain();
    src.buffer = noise; f.type = 'bandpass'; f.Q.value = 1.4;
    f.frequency.setValueAtTime(from, t); f.frequency.exponentialRampToValueAtTime(to, t + dur * 0.6); f.frequency.exponentialRampToValueAtTime(from, t + dur);
    g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(gain, t + dur * 0.35); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    src.connect(f); f.connect(g); g.connect(a.destination); src.start(t); src.stop(t + dur + 0.05);
  }
  return {
    move() { tone(380, 0.07, { type: 'triangle', gain: 0.08, slide: 0.7 }); tone(120, 0.05, { type: 'sine', gain: 0.05 }); },
    capture() { tone(220, 0.12, { type: 'triangle', gain: 0.1, slide: 0.55 }); tone(560, 0.04, { type: 'square', gain: 0.012 }); },
    ok() { [523, 659, 784].forEach((f, i) => tone(f, 0.2, { gain: 0.07, when: i * 0.08 })); },
    harvest() { [392, 523, 659, 784].forEach((f, i) => tone(f, 0.22, { type: 'triangle', gain: 0.08, when: i * 0.1 })); tone(1046, 0.6, { type: 'triangle', gain: 0.08, when: 0.42 }); tone(784, 0.6, { gain: 0.05, when: 0.42 }); },
    bad() { tone(165, 0.22, { type: 'square', gain: 0.03, slide: 0.75 }); },
    reveal() { tone(880, 0.09, { type: 'triangle', gain: 0.05, slide: 1.3 }); },
    tick() { tone(1250, 0.03, { type: 'square', gain: 0.012 }); },
    wind() { whoosh(0.9, 300, 1500, 0.06); },
    gust() { whoosh(1.6, 200, 900, 0.08); },
    grind() { [0, 0.09, 0.18].forEach(w => tone(70 + Math.random() * 12, 0.14, { type: 'sawtooth', gain: 0.03, slide: 0.8, when: w })); tone(660, 0.08, { type: 'triangle', gain: 0.03, when: 0.2 }); },
    stamp() { tone(110, 0.16, { type: 'square', gain: 0.05, slide: 0.6 }); whoosh(0.18, 900, 2000, 0.05); },
    double() { tone(988, 0.12, { type: 'triangle', gain: 0.06 }); tone(1318, 0.18, { type: 'triangle', gain: 0.06, when: 0.1 }); }
  };
})();

/* ---------- grain and flour ---------- */
const Grain = (() => {
  const cv = $('#grain'); let ctx = null, parts = [], raf = 0;
  function tick() {
    const W = cv.width, H = cv.height, k = window.devicePixelRatio || 1;
    ctx.clearRect(0, 0, W, H);
    parts.forEach(p => {
      p.vy += 0.16 * k; p.vx *= 0.986; p.vy *= 0.986; p.x += p.vx; p.y += p.vy; p.r += p.vr; p.life++;
      ctx.save(); ctx.globalAlpha = Math.max(0, 1 - p.life / p.max); ctx.translate(p.x, p.y); ctx.rotate(p.r); ctx.fillStyle = p.c;
      ctx.beginPath(); if (p.kind === 'grain') ctx.ellipse(0, 0, p.s, p.s * 0.48, 0, 0, Math.PI * 2); else ctx.arc(0, 0, p.s * 0.5, 0, Math.PI * 2); ctx.fill();
      if (p.kind === 'grain') { ctx.strokeStyle = 'rgba(110, 70, 10, .5)'; ctx.lineWidth = k; ctx.beginPath(); ctx.moveTo(-p.s * 0.7, 0); ctx.lineTo(p.s * 0.7, 0); ctx.stroke(); }
      ctx.restore();
    });
    parts = parts.filter(p => p.life < p.max && p.y < H + 40);
    if (parts.length) raf = requestAnimationFrame(tick); else { raf = 0; ctx.clearRect(0, 0, W, H); }
  }
  return {
    burst(power = 1, at) {
      if (reduceMotion) return;
      const k = window.devicePixelRatio || 1;
      if (!raf) { cv.width = window.innerWidth * k; cv.height = window.innerHeight * k; }
      ctx = ctx || cv.getContext('2d');
      const colors = ['#f0c14b', '#d9a42c', '#e8b84a', '#c98d1c'], flour = ['#fffdf5', '#fff6dc', '#f7ecd0'];
      const n = Math.round(120 * power);
      const ox = at ? at.x * k : cv.width * 0.5, oy = at ? at.y * k : cv.height * 0.38;
      for (let i = 0; i < n; i++) {
        const a = Math.random() * Math.PI * 2, sp = (2 + Math.random() * 9) * k, grain = i % 3 !== 0;
        parts.push({ x: ox, y: oy, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp - 3 * k, s: (grain ? 3 + Math.random() * 3 : 2 + Math.random() * 4) * k, r: Math.random() * 6, vr: (Math.random() - 0.5) * 0.3,
          c: grain ? colors[i % colors.length] : flour[i % flour.length], kind: grain ? 'grain' : 'flour', life: 0, max: 70 + Math.random() * 70 });
      }
      if (!raf) raf = requestAnimationFrame(tick);
    }
  };
})();
function flourAt(x, y, size) {
  if (reduceMotion) return;
  const d = document.createElement('div'); d.className = 'puff'; d.style.left = x + 'px'; d.style.top = y + 'px';
  const s = size || 60; let h = '';
  for (let i = 0; i < 10; i++) { const a = i / 10 * Math.PI * 2; h += `<i style="--s:${(s * (0.5 + Math.random() * 0.5)).toFixed(0)}px;--x:${(Math.cos(a) * s * 0.75).toFixed(0)}px;--y:${(Math.sin(a) * s * 0.6 - s * 0.35).toFixed(0)}px;--d:${(Math.random() * 0.08).toFixed(2)}s"></i>`; }
  d.innerHTML = h; document.body.appendChild(d); setTimeout(() => d.remove(), 1150);
}
/* the big windmill turns all the time; every good move is a gust of wind */
const Wind = (() => {
  const g = $('#bmSails'); let a = 0, boost = 0, last = 0;
  function tick(t) {
    const dt = last ? Math.min(64, t - last) : 16; last = t;
    boost *= Math.pow(0.982, dt / 16);
    a = (a + (0.32 + boost) * dt / 16) % 360;
    g.setAttribute('transform', `translate(100 96) rotate(${a.toFixed(2)})`);
    requestAnimationFrame(tick);
  }
  if (g && !reduceMotion) requestAnimationFrame(tick);
  return { gust(p = 1) { boost = Math.min(12, boost + 4 * p); } };
})();

/* ---------- small helpers ---------- */
function feedback(el, type, html) {
  if (!type) { el.innerHTML = ''; el.removeAttribute('data-type'); return; }
  el.dataset.type = type;
  const mark = { ok: '✓', bad: '×', warn: '!', info: 'i' }[type];
  el.innerHTML = `<span class="fb-mark" aria-hidden="true">${mark}</span><div class="fb-body">${html}</div>`;
  if (type === 'bad' && !reduceMotion) { el.classList.remove('shake'); void el.offsetWidth; el.classList.add('shake'); }
}
function flash(frame, kind) {
  if (reduceMotion || !frame) return;
  const c = kind === 'ok' ? 'flash-ok' : 'flash-bad';
  frame.classList.remove(c); void frame.offsetWidth; frame.classList.add(c);
}
function twoStep(btn, armedLabel, action) {
  const idle = btn.textContent; let armed = 0;
  const disarm = () => { clearTimeout(armed); armed = 0; btn.textContent = idle; btn.classList.remove('armed'); };
  btn.addEventListener('click', () => {
    if (armed) { disarm(); action(); return; }
    btn.textContent = armedLabel; btn.classList.add('armed');
    armed = setTimeout(disarm, 3500);
  });
}

/* ---------- lines that a move opens: the cannon behind the screen ---------- */
const DIRS8 = [[1, 0], [-1, 0], [0, 1], [0, -1], [1, 1], [1, -1], [-1, 1], [-1, -1]];
function unveiled(p, m) {
  if (m.flags === 'k' || m.flags === 'q') return [];
  const b = p.board, mine = colorOf(b[m.from]), out = [];
  const f0 = m.from & 7, r0 = m.from >> 3, inb = (f, r) => f >= 0 && f < 8 && r >= 0 && r < 8;
  for (const [df, dr] of DIRS8) {
    const diag = df !== 0 && dr !== 0;
    let f = f0 - df, r = r0 - dr, cannon = -1;
    while (inb(f, r)) { const s = r * 8 + f; if (b[s]) { const t = b[s].toLowerCase(); if (colorOf(b[s]) === mine && (t === 'q' || (diag ? t === 'b' : t === 'r'))) cannon = s; break; } f -= df; r -= dr; }
    if (cannon < 0) continue;
    f = f0 + df; r = r0 + dr;
    while (inb(f, r)) { const s = r * 8 + f; if (s === m.to) break; if (b[s]) { if (colorOf(b[s]) !== mine) out.push({ from: cannon, to: s, k: b[s].toLowerCase() === 'k' }); break; } f += df; r += dr; }
  }
  return out.filter(x => x.k || 'qrbn'.includes(b[x.to].toLowerCase()));
}
/* which pieces give check to the side to move */
function checkersOf(p) {
  const k = p.kingSq(p.turn); if (k < 0) return [];
  const turn = p.turn, ep = p.ep, cas = p.castling;
  p.turn = turn === 'w' ? 'b' : 'w'; p.ep = -1; p.castling = '';
  const ms = p.pseudo();
  p.turn = turn; p.ep = ep; p.castling = cas;
  return Array.from(new Set(ms.filter(m => m.to === k).map(m => m.from)));
}
let BEAMS = [], TRAIL = null;
/* a line stays lit while the cannon still sees its target */
function stillOpen(p, bm) {
  const a = p.board[bm.from], t = p.board[bm.to]; if (!a || !t || colorOf(a) === colorOf(t)) return false;
  const df = Math.sign((bm.to & 7) - (bm.from & 7)), dr = Math.sign((bm.to >> 3) - (bm.from >> 3));
  const kind = a.toLowerCase(), diag = df !== 0 && dr !== 0;
  if (!(kind === 'q' || (diag ? kind === 'b' : kind === 'r'))) return false;
  for (let s = bm.from + dr * 8 + df; s !== bm.to; s += dr * 8 + df) if (p.board[s]) return false;
  return (bm.k ? t.toLowerCase() === 'k' : true);
}
function overlayLayers(bd) {
  const ctr = i => { const q = bd.rc(i); return [q.col + 0.5, q.row + 0.5]; };
  let s = '';
  if (TRAIL && TRAIL.length > 1) {
    const pts = TRAIL.map(ctr);
    s += `<polyline class="path" points="${pts.map(p => p[0] + ',' + p[1]).join(' ')}"/>`;
    pts.forEach((p, i) => { s += `<circle class="foot" cx="${p[0]}" cy="${p[1]}" r="${i === pts.length - 1 ? 0.14 : 0.08}"/>`; });
  }
  BEAMS.forEach(bm => {
    const a = ctr(bm.from), c = ctr(bm.to), k = bm.k ? ' k' : '';
    s += `<line class="beamglow${k}" x1="${a[0]}" y1="${a[1]}" x2="${c[0]}" y2="${c[1]}"/><line class="beam${k}" x1="${a[0]}" y1="${a[1]}" x2="${c[0]}" y2="${c[1]}"/><circle class="ring${k}" cx="${c[0]}" cy="${c[1]}" r=".42"/>`;
  });
  return s;
}

/* ---------- board ---------- */
function arrowPath(x1, y1, x2, y2) {
  const dx = x2 - x1, dy = y2 - y1, len = Math.hypot(dx, dy) || 1;
  const ux = dx / len, uy = dy / len, px = -uy, py = ux;
  const sw = 0.09, hw = 0.27, hl = 0.38;
  const sx = x1 + ux * 0.2, sy = y1 + uy * 0.2, bx = x2 - ux * hl, by = y2 - uy * hl;
  const pts = [[sx + px * sw, sy + py * sw], [bx + px * sw, by + py * sw], [bx + px * hw, by + py * hw], [x2, y2],
    [bx - px * hw, by - py * hw], [bx - px * sw, by - py * sw], [sx - px * sw, sy - py * sw]];
  return 'M' + pts.map(p => p[0].toFixed(3) + ' ' + p[1].toFixed(3)).join('L') + 'Z';
}
class Board {
  constructor(el, orient) {
    this.el = el; this.orient = orient || 'w';
    this.onMove = null; this.canMove = () => false;
    this.pos = null; this.last = null; this.sel = -1; this.targets = [];
    this.marks = {}; this.arrows = []; this.drag = null; this.skipAnim = false; this.promoOpen = false; this.popNew = false;
    this.build();
    el.addEventListener('pointerdown', e => this.down(e));
    window.addEventListener('pointermove', e => this.moveP(e));
    window.addEventListener('pointerup', e => this.up(e));
    window.addEventListener('pointercancel', () => this.cancelDrag());
  }
  idxAt(row, col) { return this.orient === 'w' ? (7 - row) * 8 + col : row * 8 + (7 - col); }
  rc(i) { const f = i & 7, r = i >> 3; return this.orient === 'w' ? { row: 7 - r, col: f } : { row: r, col: 7 - f }; }
  build() {
    this.el.innerHTML = '';
    this.sqEls = new Array(64);
    for (let row = 0; row < 8; row++) {
      for (let col = 0; col < 8; col++) {
        const i = this.idxAt(row, col);
        const d = document.createElement('div');
        d.className = 'sq ' + ((((i >> 3) + (i & 7)) % 2) ? 'l' : 'd');
        d.dataset.sq = sqName(i);
        if (col === 0) { const s = document.createElement('span'); s.className = 'co co-r'; s.textContent = String((i >> 3) + 1); d.appendChild(s); }
        if (row === 7) { const s = document.createElement('span'); s.className = 'co co-f'; s.textContent = 'abcdefgh'[i & 7]; d.appendChild(s); }
        this.sqEls[i] = d; this.el.appendChild(d);
      }
    }
    this.ov = document.createElementNS(SVGNS, 'svg');
    this.ov.setAttribute('class', 'ov'); this.ov.setAttribute('viewBox', '0 0 8 8'); this.ov.setAttribute('aria-hidden', 'true');
    this.el.appendChild(this.ov);
    this.cur = new Array(64).fill(null);
  }
  setOrient(o) { if (o && o !== this.orient) { this.orient = o; this.build(); if (this.pos) this.render(); } }
  pieceEl(p) {
    const s = document.createElementNS(SVGNS, 'svg');
    s.setAttribute('class', 'pc'); s.setAttribute('viewBox', '0 0 45 45');
    const u = document.createElementNS(SVGNS, 'use');
    u.setAttribute('href', '#pc-' + (p === p.toUpperCase() ? 'w' : 'b') + p.toUpperCase());
    s.appendChild(u);
    return s;
  }
  set(pos, opts = {}) {
    this.pos = pos;
    this.last = 'last' in opts ? opts.last : null;
    this.sel = -1; this.targets = [];
    if (!opts.keepMarks) { this.marks = {}; this.arrows = []; }
    this.popNew = !!opts.pop;
    const anim = opts.anim && !this.skipAnim && !reduceMotion ? opts.anim : null;
    this.skipAnim = false;
    this.render(anim);
    this.popNew = false;
  }
  render(anim) {
    const b = this.pos ? this.pos.board : [];
    let chk = -1;
    if (this.pos) { const k = this.pos.kingSq(this.pos.turn); if (k >= 0 && this.pos.inCheck()) chk = k; }
    for (let i = 0; i < 64; i++) {
      const el = this.sqEls[i], p = b[i] || '';
      if (this.cur[i] !== p) {
        const old = el.querySelector('.pc'); if (old) old.remove();
        if (p) { const pe = this.pieceEl(p); if (this.popNew && !reduceMotion) pe.classList.add('pop'); el.appendChild(pe); }
        this.cur[i] = p;
      }
      const isT = this.targets.indexOf(i) >= 0;
      el.classList.toggle('last', !!this.last && (i === this.last.from || i === this.last.to));
      el.classList.toggle('sel', i === this.sel);
      el.classList.toggle('dot', isT && !p);
      el.classList.toggle('cap', isT && !!p);
      el.classList.toggle('check', i === chk);
      el.dataset.mark = this.marks[sqName(i)] || '';
    }
    if (anim) this.animate(anim);
    this.drawOverlay();
  }
  animate(m) {
    const size = this.el.clientWidth / 8;
    if (!size) return;
    const one = (from, to) => {
      const pe = this.sqEls[to].querySelector('.pc'); if (!pe) return;
      const a = this.rc(from), c = this.rc(to);
      pe.classList.remove('anim');
      pe.style.transform = `translate(${(a.col - c.col) * size}px, ${(a.row - c.row) * size}px)`;
      void pe.getBoundingClientRect();
      pe.classList.add('anim'); pe.style.transform = '';
      setTimeout(() => pe.classList.remove('anim'), 260);
    };
    one(m.from, m.to);
    if (m.flags === 'k') one(m.to + 1, m.to - 1);
    if (m.flags === 'q') one(m.to - 2, m.to + 1);
  }
  drawOverlay() {
    const ctr = i => { const q = this.rc(i); return [q.col + 0.5, q.row + 0.5]; };
    this.ov.innerHTML = overlayLayers(this) + this.arrows.map(ar => {
      const p1 = ctr(ar.from), p2 = ctr(ar.to);
      return `<path d="${arrowPath(p1[0], p1[1], p2[0], p2[1])}" style="fill:${ar.color || 'var(--sky)'};opacity:.85"/>`;
    }).join('');
  }
  sqAt(x, y) {
    const r = this.el.getBoundingClientRect();
    if (x < r.left || y < r.top || x >= r.right || y >= r.bottom) return -1;
    const col = Math.min(7, Math.floor((x - r.left) / (r.width / 8)));
    const row = Math.min(7, Math.floor((y - r.top) / (r.height / 8)));
    return this.idxAt(row, col);
  }
  mine(i) {
    const p = this.pos && this.pos.board[i];
    return !!p && this.canMove() && ((p === p.toUpperCase()) === (this.pos.turn === 'w'));
  }
  select(i) {
    this.sel = i;
    this.targets = i >= 0 ? this.pos.moves().filter(m => m.from === i).map(m => m.to) : [];
    this.render();
  }
  down(e) {
    if ((e.button && e.button !== 0) || this.promoOpen || !this.pos || !this.canMove()) return;
    const i = this.sqAt(e.clientX, e.clientY); if (i < 0) return;
    if (this.sel >= 0 && this.targets.indexOf(i) >= 0) { e.preventDefault(); this.tryMove(this.sel, i, false); return; }
    if (this.mine(i)) {
      e.preventDefault();
      if (this.sel !== i) this.select(i);
      this.drag = { from: i, x: e.clientX, y: e.clientY, on: false };
    } else if (this.sel >= 0) this.select(-1);
  }
  moveP(e) {
    const d = this.drag; if (!d) return;
    if (!d.on) {
      if (Math.hypot(e.clientX - d.x, e.clientY - d.y) < 6) return;
      d.on = true;
      const size = this.el.clientWidth / 8;
      const g = this.pieceEl(this.pos.board[d.from]);
      g.setAttribute('class', 'drag-ghost'); g.style.width = size + 'px'; g.style.height = size + 'px';
      document.body.appendChild(g); d.ghost = g;
      const pe = this.sqEls[d.from].querySelector('.pc'); if (pe) pe.classList.add('lift');
    }
    d.ghost.style.left = e.clientX + 'px'; d.ghost.style.top = e.clientY + 'px';
  }
  up(e) {
    const d = this.drag; if (!d) return;
    this.drag = null;
    if (!d.on) return;
    d.ghost.remove();
    const pe = this.sqEls[d.from].querySelector('.pc'); if (pe) pe.classList.remove('lift');
    const to = this.sqAt(e.clientX, e.clientY);
    if (to >= 0 && to !== d.from && this.targets.indexOf(to) >= 0 && this.canMove()) this.tryMove(d.from, to, true);
    else if (to !== d.from) this.select(-1);
  }
  cancelDrag() {
    const d = this.drag; if (!d) return;
    this.drag = null; if (d.ghost) d.ghost.remove();
    const pe = this.sqEls[d.from].querySelector('.pc'); if (pe) pe.classList.remove('lift');
  }
  tryMove(from, to, dragged) {
    const cands = this.pos.moves().filter(m => m.from === from && m.to === to);
    if (!cands.length) return;
    this.sel = -1; this.targets = [];
    const send = pr => {
      this.skipAnim = dragged;
      if (this.onMove) this.onMove({ from, to, promotion: pr });
      this.skipAnim = false;
      this.render();
    };
    if (cands.length > 1) { this.render(); this.askPromo(this.pos.turn, pr => { if (pr) send(pr); else this.render(); }); return; }
    send('');
  }
  askPromo(color, cb) {
    this.promoOpen = true;
    const wrap = document.createElement('div'); wrap.className = 'promo';
    const box = document.createElement('div'); box.className = 'promo-box';
    const names = { q: 'Ферзь', r: 'Ладья', b: 'Слон', n: 'Конь' };
    const close = t => { wrap.remove(); this.promoOpen = false; cb(t); };
    ['q', 'r', 'b', 'n'].forEach(t => {
      const btn = document.createElement('button'); btn.type = 'button';
      btn.title = names[t]; btn.setAttribute('aria-label', names[t]);
      btn.appendChild(this.pieceEl(color === 'w' ? t.toUpperCase() : t));
      btn.addEventListener('click', ev => { ev.stopPropagation(); close(t); });
      box.appendChild(btn);
    });
    wrap.appendChild(box);
    wrap.addEventListener('pointerdown', ev => { ev.stopPropagation(); if (ev.target === wrap) close(null); });
    this.el.appendChild(wrap);
    box.querySelector('button').focus();
  }
  // plays a move (from/to/promotion or SAN) with sound, flour, the opened line and a double-check stamp
  play(mv) {
    const m = this.pos.findMove(mv); if (!m) return null;
    const san = this.pos.san(m);
    const opened = unveiled(this.pos, m);
    this.pos.make(m);
    BEAMS = opened.concat(BEAMS.filter(bm => stillOpen(this.pos, bm) && !opened.some(o => o.from === bm.from && o.to === bm.to)));
    const dbl = this.pos.inCheck() && checkersOf(this.pos).length > 1;
    if (m.captured) { Sound.capture(); const r = this.sqEls[m.to].getBoundingClientRect(); setTimeout(() => flourAt(r.left + r.width / 2, r.top + r.height / 2, r.width * 0.9), 110); } else Sound.move();
    if (opened.length) { setTimeout(() => Sound.wind(), 80); Wind.gust(0.5); }
    this.set(this.pos, { last: { from: m.from, to: m.to }, anim: m });
    if (dbl && this.pos.status() !== 'mate') { seal('Двойной шах', 'blue'); Sound.double(); }
    return { m, san };
  }
}

/* ---------- shell ---------- */
const CH = [
  { t: 'Мельница', no: '✦' }, { t: 'Засада', no: '1' }, { t: 'Открытый шах', no: '2' }, { t: 'Двойной шах', no: '3' },
  { t: 'Жернова', no: '4' }, { t: 'Торре — Ласкер', no: '5' }, { t: 'Чужая засада', no: '6' }, { t: 'Королевская охота', no: '7' }, { t: 'Мешок муки', no: '★' }
];
const SCORED = [1, 2, 3, 4, 5, 6, 7];
const MAXS = SCORED.length * 3;
let state = store.get('state', null);
if (!state || state.v !== 1) state = { v: 1, ch: 0, st: {} };
const save = () => store.set('state', state);
const totalS = () => SCORED.reduce((s, k) => s + (state.st[k] || 0), 0);
function setS(ch, n) {
  n = Math.max(1, Math.min(3, n));
  if (window.Academy && Academy.on) Academy.reward('ch' + ch, n, CH[ch].t);
  state.st[ch] = Math.max(state.st[ch] || 0, n); save(); renderTabs();
  const s = $('#stars'); s.classList.remove('bump'); void s.offsetWidth; s.classList.add('bump');
}
const board = new Board($('#board'));
const card = $('#card');
let cur = null; const IMPL = {};
let epoch = 0, demoGen = 0;
const later = (fn, ms) => { const e = epoch; return setTimeout(() => { if (e === epoch) fn(); }, ms); };

const STAR = '<path d="M24 3l5.6 13.2L44 17.6 33 27.2 36.4 41.6 24 34 11.6 41.6 15 27.2 4 17.6l14.4-1.4z" fill="currentColor"/>';
const starSvg = cls => `<svg class="${cls || ''}" viewBox="0 0 48 48" aria-hidden="true">${STAR}</svg>`;
const SHEAF = '<svg viewBox="0 0 32 32" aria-hidden="true"><path d="M16 30V12M16 30l-6-14M16 30l6-14M16 30l-9-8M16 30l9-8" stroke="#6b4310" stroke-width="1.6" fill="none" stroke-linecap="round"/><ellipse cx="16" cy="8" rx="2.6" ry="6" fill="#fff3c8"/><ellipse cx="9.6" cy="13" rx="2.2" ry="5" fill="#fff3c8" transform="rotate(-24 9.6 13)"/><ellipse cx="22.4" cy="13" rx="2.2" ry="5" fill="#fff3c8" transform="rotate(24 22.4 13)"/><path d="M11 22h10" stroke="#8f3420" stroke-width="2.4" stroke-linecap="round"/></svg>';

function renderTabs() {
  $('#tabs').innerHTML = CH.map((c, i) => {
    const n = state.st[i] || 0;
    const lv = SCORED.includes(i) ? `<span class="lv" aria-label="${n} из 3 звёзд">${[0, 1, 2].map(k => `<i class="${k < n ? 'on' : ''}"></i>`).join('')}</span>` : '';
    return `<button type="button" data-c="${i}" aria-current="${state.ch === i}" title="${c.no} · ${c.t}">${c.no}<span class="tl">${c.t}</span>${lv}</button>`;
  }).join('');
  $('#stars').innerHTML = `${starSvg()}<b>${totalS()}</b>/${MAXS}`;
}
$('#tabs').addEventListener('click', e => { const b = e.target.closest('[data-c]'); if (b) go(+b.dataset.c); });
function go(i) {
  if (cur && cur.leave) cur.leave();
  epoch++; demoGen++;
  clearSeal();
  state.ch = i; save();
  BEAMS = []; TRAIL = null;
  board.canMove = () => false; board.onMove = null; board.marks = {}; board.arrows = [];
  board.setOrient('w');
  $('#board').classList.remove('clicky');
  tape([]);
  cur = IMPL[i]; renderTabs(); renderNotes();
  cur.enter();
  const t = $(`#tabs [data-c="${i}"]`); if (t && t.scrollIntoView) t.scrollIntoView({ block: 'nearest', inline: 'center' });
}
$('#board').addEventListener('click', e => { if (!cur || !cur.onSquare) return; const s = board.sqAt(e.clientX, e.clientY); if (s >= 0) cur.onSquare(s); });
card.addEventListener('click', e => {
  const n = e.target.closest('[data-next]'); if (n) { go(+n.dataset.next); return; }
  const r = e.target.closest('[data-replay]'); if (r) { go(+r.dataset.replay); return; }
  const f = e.target.closest('.fact button'); if (f) { const box = f.closest('.fact'); box.classList.toggle('open'); f.setAttribute('aria-expanded', box.classList.contains('open')); Sound.reveal(); }
});

/* card helpers */
function head(kicker, right, title, task) { return `<p class="kicker"><span>${kicker}</span><b>${right || ''}</b></p><h1 class="title">${title}</h1>${task ? `<p class="task" id="task">${task}</p>` : ''}`; }
function pips(n, i, res) { return `<span class="pips" aria-label="Задача ${Math.min(i + 1, n)} из ${n}">${Array.from({ length: n }, (_, k) => `<i class="${res[k] === true ? 'done' : (res[k] === false ? 'miss' : (k === i ? 'now' : ''))}"></i>`).join('')}</span>`; }
const say = (type, html) => { const el = $('#fb'); if (el) feedback(el, type, html); };
function factHtml(title, sub, body) {
  return `<div class="fact"><button type="button" aria-expanded="false"><span class="inner"><span class="face front">${SHEAF}<span><b>${title}</b><span>${sub || 'нажмите, чтобы перевернуть'}</span></span></span><span class="face back">${body}</span></span></button></div>`;
}
function seal(text, kind, small) { clearSeal(); const s = document.createElement('div'); s.className = 'seal' + (kind ? ' ' + kind : ''); s.innerHTML = text + (small ? `<small>${small}</small>` : ''); $('#frame').appendChild(s); Sound.stamp(); }
function clearSeal() { $$('.seal').forEach(x => x.remove()); }
const scoreBy = errs => errs === 0 ? 3 : (errs <= 2 ? 2 : 1);
const MINIMILL = `<svg class="minimill" viewBox="0 0 92 110" aria-hidden="true">
  <path d="M30 108 L37 46 H55 L62 108 Z" fill="#f4ead6" stroke="#5b3a22" stroke-width="2"/>
  <path d="M34 48 Q36 30 46 28 Q56 30 58 48 Z" fill="#b4462b" stroke="#5b3a22" stroke-width="2"/>
  <path d="M41 108 V96 Q46 90 51 96 V108 Z" fill="#5b3a22"/>
  <g class="ms" style="--mill-sail:#fffaf0;--mill-frame:#5b3a22"><g transform="translate(46 34) scale(.36)"><use href="#sails4"/></g></g>
  <circle cx="46" cy="34" r="3" fill="#5b3a22"/>
</svg>`;
function finishCard(ch, n, line, nextLabel) {
  setS(ch, n); n = state.st[ch];
  Sound.harvest(); later(() => Grain.burst(n === 3 ? 1 : 0.5), 300); Wind.gust(3);
  return `<div class="finale">${MINIMILL}<div style="display:grid;gap:8px"><div class="starrow" aria-label="${n} ${plural(n, 'звезда', 'звезды', 'звёзд')} из 3">${[0, 1, 2].map(k => starSvg(k < n ? '' : 'off')).join('')}</div><p class="task">${line}</p></div></div>
    <div class="controls"><button type="button" class="btn primary big" data-next="${ch + 1}">${nextLabel || 'Следующая глава →'}</button><button type="button" class="btn" data-replay="${ch}">Ещё раз</button></div>`;
}
function ctl(html) { const el = $('#ctl'); if (el) el.innerHTML = html; }
const Bt = (id, label, cls) => `<button type="button" class="btn ${cls || ''}" id="${id}">${label}</button>`;
const on = (id, fn) => { const el = $('#' + id); if (el) el.onclick = fn; };

/* moves plank */
function tape(sans, startFen) {
  const el = $('#tapeMoves'); if (!sans.length) { el.innerHTML = ''; return; }
  const p = new Position(startFen); let n = p.full, t = p.turn; const out = [];
  sans.forEach((s, k) => { out.push(t === 'w' ? `<span><span class="n">${n}.</span>${esc(ru(s))}</span>` : `<span>${k === 0 ? `<span class="n">${n}…</span>` : ''}${esc(ru(s))}</span>`); if (t === 'b') n++; t = t === 'w' ? 'b' : 'w'; });
  el.innerHTML = out.slice(-8).join('');
}
const fenAfter = (fen, sans) => { const p = new Position(fen); sans.forEach(s => { const m = p.findMove(s); if (!m) throw new Error('bad move ' + s); p.make(m); }); return p.fen(); };
const keyOf = p => p.fen().split(' ').slice(0, 3).join(' ');
const sqFromU = u => ({ from: sqIndex(u.slice(0, 2)), to: sqIndex(u.slice(2, 4)), promotion: u[4] || '' });

/* autoplay a SAN line from fen; cb() at the end */
function demoLine(fen, sans, cb, opts) {
  opts = opts || {};
  const p = new Position(fen); BEAMS = []; board.set(p); board.arrows = [];
  const shown = []; tape(shown, fen);
  const my = ++demoGen; let k = 0;
  const step = () => {
    if (my !== demoGen) return;
    if (k >= sans.length) { if (cb) cb(); return; }
    const r = board.play(sans[k]); if (!r) { if (cb) cb(); return; }
    shown.push(r.san); tape(shown, fen); k++;
    if (opts.onPly) opts.onPly(k, r.san);
    later(step, opts.delay || 800);
  };
  later(step, opts.first || 450);
}

/* ---------- verified move-graph player: the student moves, the computer replies ---------- */
function makeGraph(o) {
  // o: { task:{fen, side, G}, onDone(kind, stats), onStep(k, san, pos), onReply(k, san, pos), badText(san, refSan, u), eqText(san), wText(san), showRef: 'play' | 'arrow', limitSeal }
  const T = o.task, G = T.G;
  let pos, sans, busy, over, gen = 0, k; let mistakes = 0, hints = 0;
  const showTape = () => tape(sans, T.fen);
  function reset() {
    gen++; demoGen++;
    pos = new Position(T.fen); sans = []; busy = false; over = false; k = 0; BEAMS = [];
    board.setOrient(T.side); board.set(pos); board.arrows = []; board.render(); showTape(); clearSeal();
    if (o.onReset) o.onReset(pos);
  }
  reset();
  function done(kind) {
    over = true;
    if (kind === 'mate') seal('Мат!', '', o.mateSmall || 'жернова смололи');
    else if (o.limitSeal) seal(o.limitSeal[0], o.limitSeal[1] || 'green', o.limitSeal[2]);
    flash($('#frame'), 'ok'); Sound.harvest(); Wind.gust(2); Grain.burst(0.35);
    o.onDone(kind, { mistakes, hints, sans });
  }
  board.canMove = () => !busy && !over && pos.turn === T.side;
  board.onMove = mv => {
    const prev = pos.fen(), key = keyOf(pos), nd = G[key];
    const r = board.play(mv); if (!r) return;
    const u = uciOf(r.m);
    if (nd && u in nd.g) {
      sans.push(r.san); showTape(); board.arrows = []; board.marks = {}; board.render(); Sound.ok(); Wind.gust(0.8); k++;
      if (o.onStep) o.onStep(k, r.san, pos);
      const st = pos.status();
      if (st === 'mate' || st === 'stalemate') { done(st); return; }
      const rep = nd.g[u];
      if (!rep) { done('limit'); return; }
      busy = true; const g0 = gen;
      later(() => {
        if (g0 !== gen) return;
        const rr = board.play(sqFromU(rep)); sans.push(rr.san); showTape(); busy = false;
        if (o.onReply) o.onReply(k, rr.san, pos);
        const st2 = pos.status();
        if (st2 === 'mate' || st2 === 'stalemate') { done(st2); return; }
        if (!G[keyOf(pos)]) done('limit');
      }, 760);
      return;
    }
    busy = true; const g1 = gen;
    const back = ms => later(() => { if (g1 !== gen) return; pos = new Position(prev); BEAMS = []; board.set(pos); board.arrows = []; board.marks = {}; board.render(); clearSeal(); busy = false; }, ms);
    if (nd && nd.e.includes(u)) { Sound.tick(); say('warn', o.eqText ? o.eqText(r.san) : `${RUP(r.san)} — тоже неплохо, но ищем другой ход.`); back(1800); return; }
    if (nd && nd.w && nd.w.includes(u)) { Sound.tick(); say('warn', o.wText ? o.wText(r.san) : `${RUP(r.san)} — сильный ход, но есть ещё сильнее. Ищите!`); back(1800); return; }
    mistakes++; Sound.bad(); flash($('#frame'), 'bad');
    const ref = nd && nd.b[u]; let refSan = '';
    if (ref) {
      const m2 = pos.findMove(sqFromU(ref));
      if (m2) {
        refSan = pos.san(m2);
        if (o.showRef === 'play') later(() => { if (g1 === gen && !over) board.play(sqFromU(ref)); }, 700);
        else { board.arrows = [{ from: m2.from, to: m2.to, color: 'var(--brick)' }]; board.render(); }
      }
    }
    say('bad', o.badText ? o.badText(r.san, refSan, u) : `${RUP(r.san)}? ${refSan ? `Ответ <b>${RUP(refSan)}</b> — и замысел рушится.` : 'Так не выйдет.'}`);
    back(o.showRef === 'play' ? 2900 : 2100);
  };
  return {
    reset,
    hint() {
      if (busy || over) return false; const nd = G[keyOf(pos)]; if (!nd) return false;
      const u = o.hintMove ? o.hintMove(nd, pos) : Object.keys(nd.g)[0]; if (!u) return false;
      hints++; board.arrows = [{ from: sqIndex(u.slice(0, 2)), to: sqIndex(u.slice(2, 4)), color: 'var(--plum)' }]; board.render(); Sound.reveal(); return true;
    },
    stats: () => ({ mistakes, hints }),
    pos: () => pos
  };
}

/* shared: a chapter of rounds; a round is a graph task or a custom game (r.custom) */
function roundsChapter(ch, rounds, cfg) {
  let i, res, errs, L;
  function next() {
    const last = i === rounds.length - 1;
    ctl(Bt('nx', last ? 'Итог главы →' : 'Следующая задача →', 'primary'));
    on('nx', () => { clearSeal(); if (last) finish(); else { i++; show(); } });
  }
  function show() {
    const r = rounds[i];
    if (r.custom) {
      r.custom({ kicker: cfg.kicker, pips: () => pips(rounds.length, i, res), finish(e) { errs += e; res[i] = e === 0; const kb = card.querySelector('.kicker b'); if (kb) kb.innerHTML = pips(rounds.length, i, res); next(); } });
      return;
    }
    card.innerHTML = head(cfg.kicker, pips(rounds.length, i, res), r.title, r.text) +
      (r.extra || '') + `<div class="fb" id="fb"></div><div class="controls" id="ctl"></div>` + (r.fact ? factHtml(r.fact[0], r.fact[1], r.fact[2]) : '');
    ctl(Bt('hintB', 'Подсказка', 'hint') + Bt('rsB', 'Заново'));
    on('hintB', () => { if (L.hint()) say('warn', cfg.hintText || 'Стрелка показывает нужный ход.'); });
    on('rsB', () => { L.reset(); say(); if (r.onReset) r.onReset(); });
    if (r.onShow) r.onShow();
    L = makeGraph(Object.assign({ showRef: cfg.showRef, eqText: cfg.eqText, wText: cfg.wText, badText: cfg.badText }, r.opts || {}, {
      task: r.task,
      onStep(k, san, pos) { const t = r.steps && r.steps[k - 1]; if (t) say('ok', typeof t === 'function' ? t(san) : t); else say(); if (r.onStep) r.onStep(k, san, pos); },
      onReply(k, san, pos) { if (r.onReply) r.onReply(k, san, pos); },
      onDone(kind, st) {
        const e = st.mistakes + st.hints; errs += e; res[i] = e === 0;
        card.querySelector('.kicker b').innerHTML = pips(rounds.length, i, res);
        if (r.onDoneHook) r.onDoneHook(kind, st);
        const d = r.done || {};
        say('ok', typeof d === 'function' ? d(kind, st) : (d[kind] || d.any || 'Готово!'));
        next();
      }
    }));
  }
  function finish() { card.innerHTML = head(cfg.kicker, '', cfg.doneTitle, '') + finishCard(ch, scoreBy(errs), cfg.doneLine); }
  return { enter() { i = 0; res = []; errs = 0; if (cfg.before) cfg.before(e => { errs = e; show(); }); else show(); } };
}

/* ---------- notes for the host ---------- */
const PLAN = [['Пролог: история и анатомия засады', 8], ['Засада', 12], ['Открытый шах', 12], ['Двойной шах', 14], ['Жернова', 10], ['Торре — Ласкер', 12], ['Чужая засада', 10], ['Королевская охота', 8], ['Итоги и домашка', 4]];
const NOTES = [
  ['Расскажите завязку: Москва, 1925, молодой мексиканец Карлос Торре против экс-чемпиона мира Эмануила Ласкера. Сам удар не показывайте — это сюрприз главы 5.', 'Анатомия засады: ученики по очереди называют клетки пушки, ширмы и мишени, ведущий нажимает. Потом кнопка «Выстрел».', 'Главное правило дня: ширма уходит С УГРОЗОЙ.'],
  ['Три задачи. Перед ходом пусть ученик вслух назовёт пушку, ширму и мишень.', 'Золотой луч на доске показывает линию, которую открыл ход. Красный луч — линию на короля.', 'Задача 3 — за чёрных: доска развернётся.', 'Звёзды: 3 за главу без ошибок и подсказок.'],
  ['Открытый шах: ширма может пойти куда угодно — даже под бой.', 'Задачи 1 и 3 — ловушки из дебюта. Спросите: какой ход чёрных был ошибкой?', 'Задача 2 — мат в 4 хода, дайте подумать.'],
  ['Сначала 6 карточек «Три ответа на шах»: голосование в чате, потом ведущий отмечает ответы и нажимает «Проверить».', 'Красные рамки — шахующие фигуры. Две рамки — двойной шах: только королём!', 'Затем две задачи на мат двойным шахом.'],
  ['Жернова: ученики по очереди делают ходы, мешок считает муку.', 'Ритм мельницы: открытый шах — шах — открытый шах. Ход без шаха останавливает мельницу.', 'Полный мешок — 15 очков: сначала всё на 7-й горизонтали, ферзя — последним.', 'Вторая задача — мат в 4 хода с помощью второй ладьи.'],
  ['Партия Торре — Ласкер, Москва, 1925. Над 25-м ходом дайте подумать 2–3 минуты.', 'Холостые шахи не засчитываются: Торре на каждом обороте что-то забирал.', 'После партии — кнопка «Досмотреть партию» и факты на карточках.'],
  ['Ученики играют чёрными и ищут защиту от засады.', 'Ошибка показывает удар соперника прямо на доске.', 'Три способа: убрать мишень, закрыть линию, не выпускать ширму с шахом.'],
  ['Эдвард Ласкер — Томас, Лондон, 1912. Белые ходы делает группа.', 'Следите за следом короля: от g8 до g1!', 'На последнем ходу подходят и 18.Крd2#, и 18.0-0-0#.'],
  ['Подведите итог, раздайте домашнее задание и PGN для Lichess.']
];
function renderNotes() {
  const total = PLAN.reduce((s, x) => s + x[1], 0);
  $('#notes').innerHTML = `<p class="kicker" style="margin-bottom:8px"><span>${CH[state.ch].no} · ${CH[state.ch].t}</span><b>${PLAN[state.ch][1]} мин</b></p><ul>${NOTES[state.ch].map(n => `<li>${n}</li>`).join('')}</ul>
    <div class="plan"><b>План на ${total} минут</b><br>${PLAN.map((x, i) => `${CH[i].no} ${x[0]} — ${x[1]} мин`).join('<br>')}</div>`;
}
$('#notesBtn').addEventListener('click', () => $('#drawer').classList.toggle('open'));
$('#drawerClose').addEventListener('click', () => $('#drawer').classList.remove('open'));
document.addEventListener('keydown', e => { if (e.key === 'Escape') $('#drawer').classList.remove('open'); });
$('#soundBtn').setAttribute('aria-pressed', String(prefs.sound));
$('#soundBtn').addEventListener('click', () => { prefs.sound = !prefs.sound; store.set('sound', prefs.sound); $('#soundBtn').setAttribute('aria-pressed', String(prefs.sound)); if (prefs.sound) Sound.gust(); });


/* ---------- the chapters ---------- */

/* ✦ — prologue: the anatomy of an ambush */
IMPL[0] = (() => {
  const PARTS = [
    { sq: 'd1', cls: 'cannon', n: 'П', name: 'Пушка', t: '<b>Пушка — ладья d1.</b> Дальнобойная фигура: выстрелит, как только линия откроется.' },
    { sq: 'd5', cls: 'screen', n: 'Ш', name: 'Ширма', t: '<b>Ширма — конь d5.</b> Загораживает пушку. Уходя, ширма тоже нападает!' },
    { sq: 'd7', cls: 'target', n: 'М', name: 'Мишень', t: '<b>Мишень — ферзь d7.</b> На неё смотрит пушка.' }
  ];
  let found, fired;
  const list = () => `<ul class="parts" id="parts">${PARTS.map(p => `<li class="${p.cls}${found.has(p.sq) ? '' : ' dim'}"><i>${p.n}</i><span>${found.has(p.sq) ? p.t : `${p.name}: где она?`}</span></li>`).join('')}</ul>`;
  function draw() {
    board.marks = {}; PARTS.forEach(p => { if (found.has(p.sq)) board.marks[p.sq] = p.cls; });
    BEAMS = found.size === PARTS.length ? [{ from: sqIndex('d1'), to: sqIndex('d7'), k: false }] : [];
    board.render();
  }
  function shot() {
    if (fired) return; fired = true; clearSeal();
    board.marks = {}; $('#board').classList.remove('clicky');
    demoLine(D.pro.fen, D.pro.demo, () => { seal('Засада!', '', 'ферзь выигран'); Grain.burst(0.5); Wind.gust(2); say('ok', 'Конь ушёл <b>с шахом</b> — королю не до ферзя. Пушка выстрелила: ладья забрала ферзя. Ширма за ферзя — отличная сделка!'); fired = false; }, { delay: 900 });
  }
  return {
    enter() {
      found = new Set(); fired = false;
      board.set(new Position(D.pro.fen)); $('#board').classList.add('clicky');
      card.innerHTML = head('Пролог', '90 минут', 'Мельница Торре',
        'Москва, 1925. Молодой мексиканец Карлос Торре обыгрывает бывшего чемпиона мира Эмануила Ласкера ударом, который назовут <b>мельницей</b>. Сегодня разберём, как устроены вскрытые удары, и сами запустим жернова.') +
        `<div class="prog">${CH.slice(1, 8).map((c, i) => `<span><i>${i + 1}</i>${c.t}</span>`).join('')}</div>
        <p class="kicker"><span>Анатомия засады: найдите на доске три детали</span></p>${list()}
        <div class="fb" id="fb"></div>
        <div class="controls" id="ctl">${Bt('shotB', '▶ Выстрел')}<button type="button" class="btn primary big" data-next="1">Глава 1 →</button></div>` +
        factHtml('Кто такой Торре', 'мексиканец, обыгравший Ласкера', 'Карлос Торре Репетто (1904–1978) — мексиканский мастер. Его имя носит дебют 1.d4 Кf6 2.Кf3 e6 3.Сg5 — <b>атака Торре</b>. А его самый знаменитый удар мы разыграем в главе 5.');
      $('#shotB').disabled = true; on('shotB', shot);
      draw();
    },
    onSquare(s) {
      if (fired) return;
      const n = sqName(s), part = PARTS.find(p => p.sq === n), pc = board.pos.board[s];
      if (part && !found.has(n)) {
        found.add(n); Sound.reveal(); draw(); $('#parts').outerHTML = list();
        if (found.size === PARTS.length) { say('ok', 'Засада собрана! Золотой луч — линия пушки. Теперь нажмите «Выстрел».'); $('#shotB').disabled = false; Wind.gust(1); Sound.wind(); }
        else say('ok', `Найдено ${found.size} из ${PARTS.length}.`);
      } else if (pc && !part) { Sound.tick(); say('warn', 'Эта фигура в засаде не участвует. Подсказка: всё происходит на линии «d».'); }
    }
  };
})();

/* 1 — ambush: discovered attacks */
IMPL[1] = roundsChapter(1, [
  { title: 'Слон-ширма', task: D.g.a1,
    text: 'Ход белых. Ладья d1 смотрит на ферзя d6, но между ними — свой слон d3. Уберите ширму так, чтобы чёрным было <b>не до ферзя</b>.',
    steps: ['С:h7+! Ширма уходит с шахом.', 'Л:d6 — пушка выстрелила, ферзь ваш!'],
    done: { any: 'Слон отдан, ферзь взят. Шах не дал чёрным спасти ферзя — так работает засада.' },
    opts: { limitSeal: ['Засада!', '', 'ферзь выигран'], eqText: san => `${RUP(san)} — тоже шах, но пушка уже заряжена: забирайте ферзя!` } },
  { title: 'Пешка-ширма', task: D.g.a2,
    text: 'Ход белых. Слон b2 спрятан за пешкой d4 и целится в ферзя f6. Двиньте ширму — пусть она тоже нападает!',
    steps: ['d5! Слон напал на ферзя, а пешка — на коня c6 и слона e6.', 'Фигура выиграна!'],
    done: { any: 'Пешка-ширма открыла слона и сама ударила вилкой. Три угрозы сразу: ферзь убежал, а фигура пропала.' },
    opts: { limitSeal: ['Засада!', '', 'фигура выиграна'], eqText: san => `${RUP(san)} — неплохо, но лучше сразу забрать фигуру!` },
    fact: ['Мельничный факт', 'пешка — тоже ширма', 'Самые частые ширмы в дебюте — пешки. Ход e4–e5 или d4–d5 открывает линию слону или ферзю и сам нападает на коня. Так фигуру можно выиграть уже на десятом ходу.'] },
  { title: 'Засада чёрных', task: D.g.a3,
    text: 'Теперь вы играете чёрными. Ладья e8 смотрит на ферзя e1, между ними — конь e5. Куда прыгнуть коню, чтобы белым было не до ферзя?',
    steps: ['Кf3+! Шах — и ладья e8 смотрит прямо на ферзя.', 'Л:e1+ — ферзь взят, да ещё с шахом!'],
    done: { any: 'Конь отдал себя с шахом, ладья забрала ферзя. Мораль: не ставьте ферзя на одну линию с чужой ладьёй!' },
    opts: { limitSeal: ['Засада!', '', 'ферзь выигран'] } }
], { kicker: 'Глава 1 · засада', doneTitle: 'Засада сработала',
  wText: san => `${RUP(san)} — сильно, но есть удар мощнее. Где пушка и где ширма?`,
  doneLine: 'Вскрытое нападение: ширма уходит <b>с угрозой</b> — лучше всего с шахом, — а пушка позади бьёт по мишени. Две угрозы сразу, а ход у соперника один.' });

/* 2 — discovered check */
IMPL[2] = roundsChapter(2, [
  { title: 'Ловушка в русской партии', task: D.g.b1,
    text: '1.e4 e5 2.Кf3 Кf6 3.К:e5 К:e4? 4.Фe2 Кf6?? Ход белых. Ферзь e2 смотрит на короля e8 сквозь вашего коня. Ширма может пойти <b>куда угодно</b> — шах всё равно будет. Куда же лучше всего?',
    steps: ['Кc6+! Открытый шах — и конь напал на ферзя d8.', 'К:d8 — ферзь в мешке!'],
    done: { any: 'Королю надо спасаться, а конь тем временем съел ферзя. Как чёрным было защищаться — узнаем в главе 6.' },
    opts: { limitSeal: ['Открытый шах', '', 'ферзь выигран'], wText: san => `${RUP(san)} — сильно, но есть добыча покрупнее. Куда прыгнуть коню, чтобы напасть на ферзя?` } },
  { title: 'Слон под боем?', task: D.g.b2,
    text: 'Ход белых. Ферзь c7 напал на слона e5. Отступать? Ни за что: за слоном — ладья e1, а король чёрных стоит на линии «e». <b>Мат в 4 хода!</b>',
    steps: ['С:c7+! Открытый шах — и ферзь взят.', 'Сd6+ — слон гонит короля.', 'Лe8+! Ладья врывается на последнюю горизонталь.', 'Л:f8# — мат!'],
    done: { mate: 'Открытый шах выиграл ферзя, а слон с ладьёй довели атаку до мата.' },
    opts: { eqText: san => `${RUP(san)} — тоже ведёт к мату! Но давайте пройдём путь слона и ладьи.`, wText: san => `${RUP(san)} — сильно, но здесь есть мат. Ищите шах!` } },
  { title: 'Ловушка в Каро — Канн', task: D.g.b3,
    text: '1.e4 c6 2.d4 d5 3.Кc3 d:e4 4.К:e4 Кd7 5.Фe2 Кgf6?? Ход белых. <b>Мат в 1 ход!</b>',
    done: { mate: 'Кd6#! Пешка e7 не может взять коня: её связал ферзь e2. Конь ушёл и <b>вскрыл связку</b>. Чёрным надо было играть 5…Кdf6.' },
    opts: { wText: san => `${RUP(san)} — неплохо, но здесь мат в один ход. Где ширма?` },
    fact: ['Мельничный факт', 'мат на шестом ходу', 'Это одна из самых коротких ловушек в дебюте: мат на шестом ходу. Секрет в том, что ферзь e2 и король e8 стоят на одной линии — и пешка e7 оказывается связанной.'] }
], { kicker: 'Глава 2 · открытый шах', doneTitle: 'Шах из-за спины',
  doneLine: 'Открытый шах — ширма открывает линию к королю. Ширма ходит куда угодно, даже под бой и даже на ферзя: соперник обязан сначала спасать короля.' });

/* 3 — double check: three answers to a check, then two mates */
function defenses(p) {
  const ch = checkersOf(p), k = p.kingSq(p.turn), legal = p.moves(), r = { run: [], take: [], block: [], ch };
  legal.forEach(m => { const s = p.san(m, legal); if (m.from === k) r.run.push(s); else if (ch.includes(m.to) || (m.flags === 'e' && ch.includes(m.to + (p.turn === 'w' ? -8 : 8)))) r.take.push(s); else r.block.push(s); });
  return r;
}
function quizPhase(cb) {
  const Q = D.quiz; let i = 0, errs = 0, res = [], picked, checked;
  const WAYS = [
    { k: 'run', ic: '♚', t: 'Уйти королём', s: 'шаг в сторону или взятие королём' },
    { k: 'take', ic: '⚔', t: 'Взять шахующую', s: 'другой фигурой или пешкой' },
    { k: 'block', ic: '▮', t: 'Закрыться', s: 'поставить фигуру между' },
    { k: 'none', ic: '#', t: 'Ничем — это мат', s: 'защиты нет' }
  ];
  function show() {
    picked = new Set(); checked = false; clearSeal(); BEAMS = [];
    const p = new Position(Q[i]); board.setOrient(p.turn); board.set(p); board.marks = {}; board.render();
    card.innerHTML = head('Глава 3 · двойной шах', pips(Q.length, i, res), 'Три ответа на шах', `Ход ${p.turn === 'w' ? 'белых' : 'чёрных'}, им объявлен шах. Чем можно ответить? Отметьте <b>все</b> способы.`) +
      `<div class="ways" id="ways">${WAYS.map(w => `<button type="button" data-w="${w.k}" aria-pressed="false"><span class="ic" aria-hidden="true">${w.ic}</span>${w.t}<small>${w.s}</small></button>`).join('')}</div>
      <div class="fb" id="fb"></div><div class="controls" id="ctl">${Bt('chk', 'Проверить', 'primary')}</div>` +
      (i === 0 ? factHtml('Мельничный факт', 'самый сильный шах', 'От обычного шаха есть три защиты: уйти королём, взять шахующую фигуру, закрыться. От <b>двойного</b> — только одна: уйти королём. Поэтому ради двойного шаха можно отдать даже ферзя.') : '');
    $('#ways').onclick = e => {
      const b = e.target.closest('[data-w]'); if (!b || checked) return;
      const k = b.dataset.w;
      if (k === 'none') picked = picked.has('none') ? new Set() : new Set(['none']);
      else { picked.delete('none'); if (picked.has(k)) picked.delete(k); else picked.add(k); }
      $$('#ways [data-w]').forEach(x => x.setAttribute('aria-pressed', String(picked.has(x.dataset.w)))); Sound.tick();
    };
    on('chk', check);
  }
  function check() {
    if (checked) return;
    if (!picked.size) { say('warn', 'Отметьте хотя бы один вариант.'); return; }
    checked = true;
    const p = board.pos, d = defenses(p);
    const truth = new Set(['run', 'take', 'block'].filter(k => d[k].length)); if (!truth.size) truth.add('none');
    const ok = truth.size === picked.size && [...truth].every(k => picked.has(k));
    res[i] = ok; if (!ok) errs++;
    $$('#ways [data-w]').forEach(b => {
      const k = b.dataset.w; b.disabled = true;
      if (truth.has(k) && picked.has(k)) b.classList.add('right');
      else if (picked.has(k)) b.classList.add('wrong');
      else if (truth.has(k)) b.classList.add('missed');
    });
    card.querySelector('.kicker b').innerHTML = pips(Q.length, i, res);
    board.marks = {}; d.ch.forEach(s => { board.marks[sqName(s)] = 'checker'; }); board.render();
    const ex = a => a.slice(0, 4).map(s => `<b>${RUP(s)}</b>`).join(', ') + (a.length > 4 ? ' и другие' : '');
    const parts = [];
    if (d.run.length) parts.push(`Уйти: ${ex(d.run)}.`);
    if (d.take.length) parts.push(`Взять: ${ex(d.take)}.`);
    if (d.block.length) parts.push(`Закрыться: ${ex(d.block)}.`);
    const dbl = d.ch.length > 1;
    const lead = !parts.length ? 'Мат! Двойной шах, и королю некуда уйти.' : (dbl ? 'Двойной шах — только королём!' : 'Шах один.');
    say(ok ? 'ok' : 'bad', [lead].concat(parts).join(' '));
    if (!parts.length) seal('Мат', '', 'двойной шах'); else if (dbl) seal('Двойной шах', 'blue');
    if (ok) Sound.ok(); else Sound.bad();
    const last = i === Q.length - 1;
    ctl(Bt('nx', last ? 'К задачам →' : 'Следующая карточка →', 'primary'));
    on('nx', () => { clearSeal(); if (last) cb(errs); else { i++; show(); } });
  }
  show();
}
IMPL[3] = roundsChapter(3, [
  { title: 'Мат в 1 ход', task: D.g.d1,
    text: 'Ход белых. Слон b2 целится в h8 сквозь коня e5. Поставьте мат в 1 ход — <b>двойным шахом</b>!',
    done: { mate: 'Мат! Шахуют и конь, и слон. Пешкой коня не взять — останется шах слона. От двойного шаха спасает только бегство, а бежать некуда.' },
    opts: { wText: san => `${RUP(san)} — сильно, но здесь мат в один ход. Уберите ширму с шахом!` } },
  { title: 'Мат в 2 хода', task: D.g.d2,
    text: 'Ход белых. Ладья h1 спрятана за конём h5. Мат в 2 хода: сначала заманите короля на линию «h»!',
    steps: ['Ф:h7+!! Королю приходится брать ферзя.', 'Кf6# — двойной шах конём и ладьёй!'],
    done: { mate: 'Король шагнул на линию ладьи — и двойной шах поставил мат. Поле g8 стережёт конь, g6 — пешка f5.' },
    opts: { wText: san => `${RUP(san)} — неплохо, но здесь мат в 2 хода. Короля нужно заманить на линию ладьи.` } }
], { kicker: 'Глава 3 · двойной шах', doneTitle: 'Двойной удар', before: quizPhase,
  doneLine: 'Двойной шах — самый сильный: закрыться и взять нельзя, можно только уйти королём. А если уйти некуда — это мат.' });

/* 4 — the millstones: a windmill that counts flour, then a windmill that mates */
const VAL = { p: 1, n: 3, b: 3, r: 5, q: 9 };
const NAME = { p: 'пешка', n: 'конь', b: 'слон', r: 'ладья', q: 'ферзь' };
const SACK = `<div class="sack" id="sack"><svg viewBox="0 0 70 78" aria-hidden="true"><defs><clipPath id="sackClip"><path d="M14 22 Q6 46 9 66 Q12 76 35 76 Q58 76 61 66 Q64 46 56 22 Z"/></clipPath></defs>
  <path class="bag" d="M14 22 Q6 46 9 66 Q12 76 35 76 Q58 76 61 66 Q64 46 56 22 Z"/>
  <rect class="flour" id="sackFill" x="0" y="76" width="70" height="0" clip-path="url(#sackClip)"/>
  <path d="M14 22 Q6 46 9 66 Q12 76 35 76 Q58 76 61 66 Q64 46 56 22 Z" fill="none" stroke="#8a5b26" stroke-width="2"/>
  <path class="tie" d="M16 22 Q35 12 54 22 M30 14 Q35 4 40 14"/><text class="mark" x="35" y="54" text-anchor="middle">МУКА</text></svg>
  <div><b id="sackN">0 из 15</b><span id="sackT" style="font-size:14px;color:var(--muted)">очков муки в мешке</span><div class="got" id="sackGot"></div></div></div>`;
function millRound(api) {
  const T = D.mill, G = T.G, MAX = 15;
  let pos, sans, busy, over, flour, got, mistakes, hints, plies, gen = 0;
  card.innerHTML = head(api.kicker, api.pips(), 'Намелите муки',
    'Ход белых. Слон f6 и ладья g7 — готовая мельница. Ладья уходит по 7-й горизонтали с <b>открытым шахом</b> и забирает добычу, потом возвращается на g7 <b>с шахом</b>. Соберите всё — и только потом заберите ферзя!') +
    SACK + `<div class="fb" id="fb"></div><div class="controls" id="ctl"></div>`;
  function sack() {
    $('#sackN').textContent = `${flour} из ${MAX}`;
    const h = 52 * Math.min(1, flour / MAX); const f = $('#sackFill'); f.setAttribute('y', String(76 - h)); f.setAttribute('height', String(h));
    $('#sackGot').innerHTML = got.map(g => `<span>${g}</span>`).join('');
  }
  function controls() {
    ctl(Bt('hintB', 'Подсказка', 'hint') + Bt('rsB', 'Заново'));
    on('hintB', hint); on('rsB', () => { reset(); say(); });
  }
  function reset() {
    gen++; pos = new Position(T.fen); sans = []; busy = false; over = false; flour = 0; got = []; plies = 0; BEAMS = [];
    board.setOrient('w'); board.set(pos); board.arrows = []; board.render(); tape(sans, T.fen); clearSeal(); sack();
  }
  mistakes = 0; hints = 0; reset(); controls();
  function hint() {
    if (busy || over) return; const nd = G[keyOf(pos)]; if (!nd) return;
    const gs = Object.keys(nd.g).map(u => ({ u, m: pos.findMove(sqFromU(u)) }));
    const caps = gs.filter(x => x.m.captured && x.m.captured.toLowerCase() !== 'q');
    const back = gs.filter(x => sqName(x.m.to) === 'g7');
    const queen = gs.filter(x => x.m.captured && x.m.captured.toLowerCase() === 'q');
    const toQ = gs.filter(x => sqName(x.m.to) === 'g5');
    const pick = (caps[0] || back[0] || queen[0] || toQ[0] || gs[0]); if (!pick) return;
    hints++; board.arrows = [{ from: pick.m.from, to: pick.m.to, color: 'var(--plum)' }]; board.render(); Sound.reveal();
    say('warn', caps[0] ? 'Ближайшая добыча на 7-й горизонтали.' : back[0] ? 'Ладья возвращается на g7 — с шахом.' : 'На 7-й горизонтали пусто. Пора за ферзём!');
  }
  function finish(kind) {
    over = true; busy = false;
    const full = flour >= MAX;
    seal('Помол!', full ? 'green' : '', `${flour} из ${MAX}`);
    Sound.harvest(); Wind.gust(3); Grain.burst(full ? 1 : 0.5);
    say(full ? 'ok' : 'warn', full ? 'Полный мешок! Пешки, слон и ферзь — мельница смолола всё.' :
      kind === 'tired' ? `Мельник устал крутить вхолостую. В мешке ${flour} из ${MAX}.` : `Ферзь в мешке, но ${MAX - flour} ${plural(MAX - flour, 'очко', 'очка', 'очков')} муки остались лежать. Торре сначала собирал всё, что лежало на пути!`);
    api.finish(mistakes + hints + (full ? 0 : 1) + (flour < 9 ? 1 : 0));
  }
  board.canMove = () => !busy && !over && pos.turn === 'w';
  board.onMove = mv => {
    const prev = pos.fen(), nd = G[keyOf(pos)];
    const r = board.play(mv); if (!r) return;
    const u = uciOf(r.m);
    if (nd && u in nd.g) {
      sans.push(r.san); tape(sans, T.fen); board.arrows = []; board.render(); plies++; Wind.gust(1);
      if (r.m.captured) {
        const t = r.m.captured.toLowerCase(), v = VAL[t]; flour += v; got.push(`${PIECE_RU[t]}${sqName(r.m.to)} +${v}`); sack();
        const sk = $('#sack'); sk.classList.remove('bump'); void sk.offsetWidth; sk.classList.add('bump'); Sound.grind();
        say('ok', `+${v} — ${NAME[t]} в мешке!`);
      } else if (sqName(r.m.to) === 'g7') { Sound.ok(); say('info', 'Ладья вернулась на g7 с шахом — жернова снова заряжены.'); }
      else { Sound.tick(); say('info', 'Холостой оборот: шах есть, а муки нет.'); }
      const rep = nd.g[u];
      if (!rep) { finish('end'); return; }
      busy = true; const g0 = gen;
      later(() => {
        if (g0 !== gen) return;
        const rr = board.play(sqFromU(rep)); sans.push(rr.san); tape(sans, T.fen); busy = false;
        if (!G[keyOf(pos)]) finish('end'); else if (plies >= 30) finish('tired');
      }, 650);
      return;
    }
    mistakes++; busy = true; Sound.bad(); flash($('#frame'), 'bad');
    const ref = nd && nd.b[u]; let refSan = '';
    if (ref) { const m2 = pos.findMove(sqFromU(ref)); if (m2) { refSan = pos.san(m2); board.arrows = [{ from: m2.from, to: m2.to, color: 'var(--brick)' }]; board.render(); } }
    const early = r.m.captured && r.m.captured.toLowerCase() === 'q';
    say('bad', early ? `${RUP(r.san)}? Рано за ферзём! ${refSan ? `<b>${RUP(refSan)}</b> — и король нападает сразу на ладью и слона. ` : ''}Сначала соберите добычу с 7-й горизонтали.`
      : pos.inCheck() ? `${RUP(r.san)}? Шах есть, но ладья пропадёт${refSan ? `: <b>${RUP(refSan)}</b>` : ''}.`
        : `${RUP(r.san)}? Без шаха мельница встала${refSan ? ` — и чёрные отвечают <b>${RUP(refSan)}</b>` : ''}!`);
    const g1 = gen;
    later(() => { if (g1 !== gen) return; pos = new Position(prev); BEAMS = []; board.set(pos); board.arrows = []; board.render(); busy = false; }, 2200);
  };
}
IMPL[4] = roundsChapter(4, [
  { custom: millRound },
  { title: 'Мельница с секретом', task: D.g.w2,
    text: 'Ход белых. У белых есть вторая ладья — e1. Запустите мельницу и поставьте <b>мат в 4 хода</b>!',
    steps: ['Л:f7+ — первый оборот.', 'Лg7+ — ладья вернулась на место.', 'Ладья спускается по линии «g» с открытым шахом — 7-я горизонталь свободна!', 'Л:e7# — вторая ладья ставит мат!'],
    done: { mate: 'Мат! Мельница расчистила 7-ю горизонталь для второй ладьи.' },
    opts: { eqText: san => `${RUP(san)} — тоже к мату, но есть путь короче. Ищите!`, wText: san => `${RUP(san)} — сильно, но здесь мат в 4 хода. Крутите мельницу!` } }
], { kicker: 'Глава 4 · жернова', doneTitle: 'Мука в мешке',
  doneLine: 'Мельница: открытый шах — шах — открытый шах… Ладья ходит туда-обратно и на каждом обороте что-то забирает, а соперник успевает только переставлять короля.' });

/* 5 — Torre vs Lasker, Moscow 1925 */
IMPL[5] = (() => {
  let L, errs;
  const STEPS = ['Сf6!! Слон ушёл с 5-й горизонтали — ферзь h5 теперь под боем. Но это ловушка!', 'Л:g7+! Ладья врывается на g7 — слон f6 её защищает.', 'Л:f7+ — открытый шах, пешка f7 в мешке.', 'Лg7+ — ладья вернулась.', 'Л:b7+ — слон b7 в мешке!', 'Лg7+ — снова на место.', 'Лg5+! Последний оборот — по вертикали, к ферзю.', 'Л:h5 — ферзь вернулся!'];
  function show() {
    errs = 0;
    card.innerHTML = head('Глава 5 · Москва, 1925', 'Торре — Ласкер', 'Мельница Торре',
      'Белые: Карлос Торре. Чёрные: Эмануил Ласкер. Ход белых. Слон g5 атакован пешкой h6 и заслоняет ферзя h5 от ферзя b5. Торре нашёл ход, который потряс шахматный мир. Найдите и вы!') +
      `<div class="fb" id="fb"></div><div class="controls" id="ctl"></div>` +
      factHtml('Мельничный факт', 'атака Торре', 'Партия началась ходами 1.d4 Кf6 2.Кf3 e6 3.Сg5 — этот дебют и сегодня называют <b>атакой Торре</b>. Эмануил Ласкер был чемпионом мира 27 лет: с 1894 по 1921 год.') +
      factHtml('Кинофакт', 'Москва, 1925', 'Во время этого турнира режиссёр Всеволод Пудовкин снимал комедию <b>«Шахматная горячка»</b>. В фильме снялся сам Хосе Рауль Капабланка.');
    ctl(Bt('hintB', 'Подсказка', 'hint') + Bt('rsB', 'Заново'));
    on('hintB', () => { if (L.hint()) say('warn', 'Стрелка показывает ход Торре.'); });
    on('rsB', () => { L.reset(); say(); });
    L = makeGraph({ task: D.g.t1, limitSeal: ['Мельница!', '', 'ферзь вернулся'],
      eqText: san => `${RUP(san)} — тоже шах, но жернова крутятся вхолостую. Торре на каждом обороте что-то забирал: найдите его ход!`,
      wText: san => `${RUP(san)} — неплохо, но Торре нашёл сильнее.`,
      badText: (san, ref) => `${RUP(san)}? ${ref ? `Ответ <b>${RUP(ref)}</b> — и атака белых выдыхается.` : 'Так не выиграть.'}`,
      onReset() { tape(D.torre.moves.slice(D.torre.from - 6, D.torre.from), fenAfter(D.start, D.torre.moves.slice(0, D.torre.from - 6))); },
      onStep(k) { say('ok', STEPS[k - 1] || ''); if (k === 1) { Grain.burst(0.4); Sound.gust(); } },
      onDone(kind, st) {
        errs = st.mistakes + st.hints;
        say('ok', 'Торре отдал ферзя, а забрал ферзя, слона и две пешки. Ласкер сопротивлялся до 43-го хода, но к концу партии у белых было на четыре пешки больше — и он сдался.');
        ctl(Bt('rest', '▶ Досмотреть партию') + Bt('nx', 'Итог главы →', 'primary'));
        on('rest', () => { clearSeal(); const n = D.torre.from + 15; demoLine(fenAfter(D.start, D.torre.moves.slice(0, n)), D.torre.moves.slice(n), () => seal('1 : 0', 'green', 'Ласкер сдался'), { delay: 700 }); });
        on('nx', finish);
      }
    });
  }
  function finish() { clearSeal(); card.innerHTML = head('Глава 5 · Москва, 1925', '', 'Жернова Торре', '') + finishCard(5, scoreBy(errs), 'Слон f6 — ветер, ладья — крыло мельницы. Отдав ферзя, Торре забрал всё, что стояло на 7-й горизонтали, и вернул ферзя обратно.'); }
  return { enter() { show(); } };
})();

/* 6 — someone else's ambush: defence */
IMPL[6] = roundsChapter(6, [
  { title: 'Уберите мишень', task: D.g.e1,
    text: 'Ход чёрных. Знакомая засада из главы 1: белые грозят С:h7+ и Л:d6. Спасите ферзя заранее!',
    done: { any: 'Мишень ушла с линии «d» — пушке больше не во что стрелять.' },
    opts: { badText: (san, ref) => ref ? `${RUP(san)}? Смотрите: <b>${RUP(ref)}</b>${ref.startsWith('Bxh7') ? ' — засада срабатывает' : ''}.` : `${RUP(san)}? Ферзь остаётся мишенью.` } },
  { title: 'Закройте линию', task: D.g.e2,
    text: 'Ход чёрных. Русская партия: 1.e4 e5 2.Кf3 Кf6 3.К:e5 К:e4 4.Фe2. Белые грозят Ф:e4, а если конь уйдёт — Кc6+, как в главе 2. Как спастись?',
    steps: ['Фe7! Свой ферзь закрыл линию «e» — открытого шаха не будет.', 'd6! Конь e5 связан: уйдёт — пропадёт ферзь e4.'],
    done: { any: 'Связанный конь погибнет, и материал сравняется. Против засады лучшее средство — закрыть линию самому.' } },
  { title: 'Каким конём?', task: D.g.e3,
    text: 'Ход чёрных. Каро — Канн: 1.e4 c6 2.d4 d5 3.Кc3 d:e4 4.К:e4 Кd7 5.Фe2. Хочется развить коня на f6. Но <b>каким</b>?',
    done: { any: 'Кdf6! Конь d7 ушёл — теперь ферзь d8 стережёт поле d6, а у короля освободилось поле d7. А на 5…Кgf6?? последовал бы 6.Кd6# — вы видели это в главе 2.' },
    opts: { eqText: san => `${RUP(san)} — так можно, но задача — поставить коня на f6. Какого?` } }
], { kicker: 'Глава 6 · чужая засада', doneTitle: 'Засада раскрыта', showRef: 'play',
  eqText: san => `${RUP(san)} — тоже держит. Но найдите ход надёжнее!`,
  badText: (san, ref) => `${RUP(san)}? ${ref ? `Ответ <b>${RUP(ref)}</b> — и засада срабатывает.` : 'Так не спастись.'}`,
  doneLine: 'Видите ширму соперника на линии к вашему королю или ферзю? Уберите мишень, закройте линию или выбейте ширму — пока она не ушла.' });

/* 7 — Edward Lasker vs Thomas, London 1912: the king hunt */
IMPL[7] = (() => {
  let L, errs;
  const STEPS = ['Ф:h7+!! Ферзь отдан — король обязан взять.', 'К:f6+! Двойной шах — конём и слоном d3. Король вынужден идти вперёд.', 'Кeg4+ — король шагает дальше.', 'h4+ — в охоту вступили пешки.', 'g3+ — король уже на f3!', 'Сe2+ — дальше только g2.', 'Лh2+ — король дошёл до g1, в самый лагерь белых.'];
  function trail(pos) { const k = pos.kingSq('b'); if (k >= 0 && (!TRAIL || TRAIL[TRAIL.length - 1] !== k)) { TRAIL = (TRAIL || []).concat([k]); board.render(); } }
  function show() {
    errs = 0;
    card.innerHTML = head('Глава 7 · Лондон, 1912', 'Эд. Ласкер — Томас', 'Королевская охота',
      'Ход белых. Слон d3 целится в h7, а конь e4 — ширма. Эдвард Ласкер начал охоту, которая вошла во все учебники. Повторите её! Подсказка: всё начинается с жертвы.') +
      `<div class="fb" id="fb"></div><div class="controls" id="ctl"></div>` +
      factHtml('Охотничий факт', 'мат был ещё быстрее', 'После 15…Крf3 мат в 2 хода давали 16.Крf1! или 16.0-0! Но путь Ласкера красивее: чёрный король прошёл через всю доску — от g8 до g1.') +
      factHtml('Кто играл', 'однофамилец чемпиона', 'Эдвард Ласкер — инженер и сильный мастер, дальний родственник Эмануила Ласкера. Его соперник сэр Джордж Томас был чемпионом Британии по шахматам и знаменитым игроком в бадминтон.');
    ctl(Bt('hintB', 'Подсказка', 'hint') + Bt('rsB', 'Заново'));
    on('hintB', () => { if (L.hint()) say('warn', 'Стрелка показывает ход Ласкера.'); });
    on('rsB', () => { L.reset(); say(); });
    L = makeGraph({ task: D.g.h1, mateSmall: 'король дошёл до g1',
      eqText: san => `${RUP(san)} — тоже ведёт к мату! Но Эдвард Ласкер сыграл иначе — найдите его ход.`,
      wText: san => `${RUP(san)} — сильно, но здесь есть форсированный мат. Только шахи!`,
      onReset(pos) { TRAIL = [pos.kingSq('b')]; tape(D.lasker.moves.slice(D.lasker.from - 6, D.lasker.from), fenAfter(D.start, D.lasker.moves.slice(0, D.lasker.from - 6))); },
      onStep(k, san, pos) { say('ok', STEPS[k - 1] || ''); trail(pos); },
      onReply(k, san, pos) { trail(pos); },
      onDone(kind, st) {
        errs = st.mistakes + st.hints; trail(L.pos());
        const last = st.sans[st.sans.length - 1] || '';
        say('ok', last.startsWith('O-O-O') ? 'Мат рокировкой! В партии Ласкер сыграл 18.Крd2# — король открыл линию ладье a1, тоже мат.' : 'Крd2#! Король ушёл и открыл линию ладье a1 — мат <b>вскрытым шахом</b>. Чёрный король прошёл от g8 до g1!');
        ctl(Bt('nx', 'Итог главы →', 'primary')); on('nx', finish);
      }
    });
  }
  function finish() { clearSeal(); card.innerHTML = head('Глава 7 · Лондон, 1912', '', 'Охота окончена', '') + finishCard(7, scoreBy(errs), 'Жертва ферзя, двойной шах — и мат вскрытым шахом. Красный след — путь чёрного короля через всю доску.', 'К итогам →'); }
  return { enter() { show(); }, leave() { TRAIL = null; } };
})();

/* ★ — the flour sack: summary */
IMPL[8] = (() => {
  const RANKS = [[19, 'Хозяин мельницы'], [14, 'Мельник'], [8, 'Подмастерье'], [0, 'Ученик мельника']];
  const DESC = { 'Хозяин мельницы': 'жернова слушаются с полуслова', 'Мельник': 'мелет без холостых оборотов', 'Подмастерье': 'засаду видит издалека', 'Ученик мельника': 'всё ещё впереди' };
  return {
    enter() {
      const n = totalS(), rank = RANKS.find(r => n >= r[0])[1];
      const p = new Position(D.mill.fen); board.set(p);
      BEAMS = [{ from: sqIndex('f6'), to: sqIndex('h8'), k: false }]; board.render();
      card.innerHTML = head('Мешок муки', `${n} из ${MAXS}`, rank, `${DESC[rank][0].toUpperCase() + DESC[rank].slice(1)}.`) +
        `<div class="finale">${MINIMILL}<div class="starrow">${[0, 1, 2].map(k => starSvg(k < Math.round(n / MAXS * 3) ? '' : 'off')).join('')}</div></div>
        <ul class="recap">
          <li><i>⌖</i><span><b>Засада</b> — пушка, ширма и мишень. Ширма уходит с угрозой.</span></li>
          <li><i>+</i><span><b>Открытый шах</b> — ширма ходит куда угодно, даже на ферзя.</span></li>
          <li><i>✕</i><span><b>Двойной шах</b> — закрыться и взять нельзя, только уйти королём.</span></li>
          <li><i>✤</i><span><b>Мельница</b> — открытый шах, шах, открытый шах… и каждый оборот с добычей.</span></li>
          <li><i>⛨</i><span><b>Защита</b> — уберите мишень или закройте линию заранее.</span></li>
        </ul>
        <p class="kicker"><span>Домашнее задание</span></p>
        <div class="links">
          <a href="https://lichess.org/training/discoveredAttack" target="_blank" rel="noopener">Задачи «Вскрытое нападение» на Lichess <span>решите 10 задач: засады и открытые шахи</span></a>
          <a href="https://lichess.org/training/doubleCheck" target="_blank" rel="noopener">Задачи «Двойной шах» на Lichess <span>решите 5 задач</span></a>
          <button type="button" id="pgnB">Скачать PGN урока <span>Lichess → Исследование → Импорт PGN</span></button>
          <button type="button" id="pgnC">Скопировать PGN <span>и вставить в Lichess</span></button>
        </div>
        <div class="fb" id="fb"></div>
        <div class="controls"><button type="button" class="btn" id="resetAll">Сбросить звёзды</button></div>`;
      Sound.harvest(); later(() => Grain.burst(1.2), 400); Wind.gust(4);
      const PGN = window.MELNICA_PGN, FILE = 'melnitsa-torre-lichess';
      const blobSave = () => { try { const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([PGN], { type: 'application/x-chess-pgn' })); a.download = FILE + '.pgn'; document.body.appendChild(a); a.click(); setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 500); } catch (e) { say('warn', 'Скачивание недоступно — скопируйте PGN кнопкой ниже.'); } };
      on('pgnB', async () => {
        if (window.Academy && Academy.on) { Academy.download(FILE + '.txt', PGN); say('ok', 'Академия предложит сохранить файл. В Lichess: Исследование → Импорт PGN.'); return; }
        const dl = window.claude && window.claude.use ? await window.claude.use('downloads') : null;
        if (!dl) { blobSave(); return; }
        try { await dl.save({ filename: FILE + '.txt', data: PGN }); say('ok', 'Файл сохранён. В Lichess: Исследование → Импорт PGN → вставьте текст из файла.'); }
        catch (e) { if (e && e.code === 'declined') say(); else say('warn', 'Скачивание недоступно здесь — скопируйте PGN кнопкой ниже.'); }
      });
      on('pgnC', async () => {
        try { await navigator.clipboard.writeText(PGN); say('ok', 'PGN скопирован. В Lichess: Исследование → Импорт PGN → вставьте.'); }
        catch (e) { say('warn', 'Браузер не дал скопировать. Используйте кнопку «Скачать PGN».'); }
      });
      twoStep($('#resetAll'), 'Точно сбросить?', () => { state = { v: 1, ch: 8, st: {} }; save(); go(8); });
    }
  };
})();

/* ---------- start ---------- */
renderTabs();
go(Math.min(CH.length - 1, Math.max(0, state.ch || 0)));
(function intro() {
  const c = $('#intro'); if (!c) return;
  if (reduceMotion) { c.classList.add('gone'); return; }
  setTimeout(() => { c.classList.add('open'); Sound.gust(); Wind.gust(5); }, 1200);
  setTimeout(() => c.classList.add('gone'), 2100);
})();
})();
