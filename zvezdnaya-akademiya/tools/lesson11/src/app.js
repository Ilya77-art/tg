(() => {
'use strict';
const { Position, sqName, sqIndex, sanToRu, colorOf } = window.ChessCore;
const D = window.TEATR;
const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => Array.from(r.querySelectorAll(s));
const NS = 'teatr-karabasa:';
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

/* ---------- sound: a puppet theatre ---------- */
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
    g.gain.exponentialRampToValueAtTime(o.gain || 0.06, t + 0.008);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    osc.connect(g); g.connect(a.destination);
    osc.start(t); osc.stop(t + dur + 0.03);
  }
  function hiss(dur, from, to, gain, when) {
    if (!prefs.sound) return;
    const a = ac(); if (!a) return;
    if (!noise) { noise = a.createBuffer(1, a.sampleRate * 1.5, a.sampleRate); const d = noise.getChannelData(0); for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1; }
    const t = a.currentTime + (when || 0), src = a.createBufferSource(), f = a.createBiquadFilter(), g = a.createGain();
    src.buffer = noise; f.type = 'bandpass'; f.Q.value = 1.2;
    f.frequency.setValueAtTime(from, t); f.frequency.exponentialRampToValueAtTime(to, t + dur * 0.7);
    g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(gain, t + Math.min(0.01, dur * 0.3)); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    src.connect(f); f.connect(g); g.connect(a.destination); src.start(t, Math.random() * 0.5); src.stop(t + dur + 0.05);
  }
  return {
    move() { tone(420, 0.06, { type: 'triangle', gain: 0.08, slide: 0.7 }); tone(130, 0.05, { gain: 0.05 }); },
    capture() { tone(240, 0.12, { type: 'triangle', gain: 0.1, slide: 0.55 }); hiss(0.06, 1800, 900, 0.05); },
    ok() { [523, 659, 784].forEach((f, i) => tone(f, 0.2, { gain: 0.07, when: i * 0.08 })); },
    bad() { tone(196, 0.24, { type: 'square', gain: 0.03, slide: 0.7 }); },
    reveal() { tone(880, 0.09, { type: 'triangle', gain: 0.05, slide: 1.3 }); },
    tick() { tone(1250, 0.03, { type: 'square', gain: 0.012 }); },
    // a plucked string: the pin is made
    pluck() { tone(587, 0.5, { type: 'triangle', gain: 0.07, slide: 0.985 }); tone(1174, 0.25, { gain: 0.025, slide: 0.99 }); tone(196, 0.12, { type: 'sawtooth', gain: 0.012 }); },
    // Buratino's nose goes through the canvas
    nose() { tone(310, 0.05, { type: 'square', gain: 0.03 }); hiss(0.35, 700, 3200, 0.05, 0.03); tone(990, 0.12, { type: 'triangle', gain: 0.04, when: 0.3, slide: 1.4 }); },
    // the third bell before the show
    bell() { [0, 0.42, 0.84].forEach(w => { tone(1568, 0.55, { gain: 0.045, when: w }); tone(2352, 0.3, { gain: 0.015, when: w }); }); },
    curtain() { hiss(1.3, 220, 900, 0.07); },
    bravo() {
      [392, 523, 659, 784].forEach((f, i) => tone(f, 0.24, { type: 'triangle', gain: 0.07, when: i * 0.09 }));
      tone(1046, 0.6, { type: 'triangle', gain: 0.07, when: 0.4 });
      for (let k = 0; k < 34; k++) hiss(0.04, 1400 + Math.random() * 900, 1200, 0.05 + Math.random() * 0.04, 0.35 + Math.random() * 1.3);
    },
    stamp() { tone(110, 0.16, { type: 'square', gain: 0.05, slide: 0.6 }); hiss(0.18, 900, 2000, 0.05); }
  };
})();

/* ---------- petals and confetti for the bows ---------- */
const Petals = (() => {
  const cv = $('#petals'); let ctx = null, parts = [], raf = 0;
  function tick() {
    const W = cv.width, H = cv.height, k = window.devicePixelRatio || 1;
    ctx.clearRect(0, 0, W, H);
    parts.forEach(p => {
      p.vy += 0.1 * k; p.vx *= 0.985; p.vy *= 0.975; p.x += p.vx + Math.sin(p.life / 9 + p.ph) * 0.8 * k; p.y += p.vy; p.r += p.vr; p.life++;
      ctx.save(); ctx.globalAlpha = Math.max(0, 1 - p.life / p.max); ctx.translate(p.x, p.y); ctx.rotate(p.r); ctx.fillStyle = p.c;
      ctx.beginPath();
      if (p.kind === 'petal') { ctx.ellipse(0, 0, p.s, p.s * 0.55 * Math.abs(Math.cos(p.life / 7 + p.ph)) + 0.5, 0, 0, Math.PI * 2); }
      else ctx.rect(-p.s / 2, -p.s / 4, p.s, p.s / 2);
      ctx.fill(); ctx.restore();
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
      const petals = ['#c4182f', '#e0425a', '#a3192b', '#f07a8a'], gold = ['#f2c14e', '#e2ad34', '#fff1c2'];
      const n = Math.round(110 * power);
      const ox = at ? at.x * k : cv.width * 0.5, oy = at ? at.y * k : cv.height * 0.32;
      for (let i = 0; i < n; i++) {
        const a = -Math.PI / 2 + (Math.random() - 0.5) * Math.PI * 1.6, sp = (3 + Math.random() * 9) * k, petal = i % 3 !== 0;
        parts.push({ x: ox, y: oy, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, s: (petal ? 5 + Math.random() * 4 : 4 + Math.random() * 4) * k, r: Math.random() * 6, vr: (Math.random() - 0.5) * 0.25, ph: Math.random() * 6,
          c: petal ? petals[i % petals.length] : gold[i % gold.length], kind: petal ? 'petal' : 'conf', life: 0, max: 90 + Math.random() * 80 });
      }
      if (!raf) raf = requestAnimationFrame(tick);
    }
  };
})();
function puffAt(x, y, size) {
  if (reduceMotion) return;
  const d = document.createElement('div'); d.className = 'puff'; d.style.left = x + 'px'; d.style.top = y + 'px';
  const s = size || 40, cols = ['#c4182f', '#f2c14e', '#e0425a', '#fff1c2']; let h = '';
  for (let i = 0; i < 9; i++) { const a = i / 9 * Math.PI * 2; h += `<i style="--c:${cols[i % 4]};--s:${(s * (0.18 + Math.random() * 0.12)).toFixed(0)}px;--x:${(Math.cos(a) * s * 0.8).toFixed(0)}px;--y:${(Math.sin(a) * s * 0.7 - s * 0.3).toFixed(0)}px;--d:${(Math.random() * 0.06).toFixed(2)}s"></i>`; }
  d.innerHTML = h; document.body.appendChild(d); setTimeout(() => d.remove(), 1000);
}

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

/* ---------- strings: every pin on the board ----------
   A long-range piece S, a piece P of the other colour, then T of P's colour on the same line.
   Full pin: T is the king. Pin to a queen or a rook: T is worth more than P, and S is cheaper than T or T is unprotected.
   The lesson's quiz answers were checked against the same rules when the data was built. */
const VAL = { p: 1, n: 3, b: 3, r: 5, q: 9, k: 100 };
const DIRS8 = [[1, 0], [-1, 0], [0, 1], [0, -1], [1, 1], [1, -1], [-1, 1], [-1, -1]];
function pinsOf(p) {
  const b = p.board, out = [];
  for (let s = 0; s < 64; s++) {
    const S = b[s]; if (!S) continue; const ts = S.toLowerCase(); if (!'qrb'.includes(ts)) continue;
    const mine = colorOf(S);
    for (const [df, dr] of DIRS8) {
      const diag = df && dr; if (ts === 'r' && diag) continue; if (ts === 'b' && !diag) continue;
      let f = (s & 7) + df, r = (s >> 3) + dr, first = -1;
      while (f >= 0 && f < 8 && r >= 0 && r < 8) {
        const q = r * 8 + f, x = b[q];
        if (x) {
          if (first < 0) { if (colorOf(x) === mine || x.toLowerCase() === 'k') break; first = q; }
          else {
            if (colorOf(x) === mine) break;
            const P = b[first].toLowerCase(), T = x.toLowerCase();
            if (T === 'k') out.push({ s, p: first, t: q, abs: true });
            else if ((T === 'q' || T === 'r') && VAL[T] > VAL[P] && (VAL[ts] < VAL[T] || !p.attacked(q, colorOf(x)))) out.push({ s, p: first, t: q, abs: false });
            break;
          }
        }
        f += df; r += dr;
      }
    }
  }
  return out;
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
/* Buratino's nose: a long-range check with a piece of the king's colour standing behind the king */
function skewerOf(p) {
  const k = p.kingSq(p.turn); if (k < 0) return null;
  for (const s of checkersOf(p)) {
    const t = p.board[s].toLowerCase(); if (!'qrb'.includes(t)) continue;
    const df = Math.sign((k & 7) - (s & 7)), dr = Math.sign((k >> 3) - (s >> 3));
    let f = (k & 7) + df, r = (k >> 3) + dr;
    while (f >= 0 && f < 8 && r >= 0 && r < 8) {
      const q = r * 8 + f, x = p.board[q];
      if (x) { if (colorOf(x) === p.turn && x.toLowerCase() !== 'p') return { s, k, b: q }; break; }
      f += df; r += dr;
    }
  }
  return null;
}
let SHOW_THREADS = true, NOSE = null;
function overlayLayers(bd) {
  if (!bd.pos) return '';
  const ctr = i => { const q = bd.rc(i); return [q.col + 0.5, q.row + 0.5]; };
  let s = '';
  if (SHOW_THREADS) pinsOf(bd.pos).forEach(pn => {
    const a = ctr(pn.s), m = ctr(pn.p), c = ctr(pn.t), k = pn.abs ? ' abs' : '';
    s += `<line class="threadglow${k}" x1="${a[0]}" y1="${a[1]}" x2="${c[0]}" y2="${c[1]}"/><line class="thread${k}" x1="${a[0]}" y1="${a[1]}" x2="${c[0]}" y2="${c[1]}"/>` +
      `<circle class="knot${k}" cx="${m[0]}" cy="${m[1]}" r=".44"/><circle class="bead${k}" cx="${a[0]}" cy="${a[1]}" r=".09"/><rect class="bead${k}" x="${c[0] - 0.08}" y="${c[1] - 0.08}" width=".16" height=".16" transform="rotate(45 ${c[0]} ${c[1]})"/>`;
  });
  if (NOSE && bd.pos.board[NOSE.s] && bd.pos.board[NOSE.b]) {
    const a = ctr(NOSE.s), c = ctr(NOSE.b), dx = c[0] - a[0], dy = c[1] - a[1], len = Math.hypot(dx, dy) || 1, px = -dy / len, py = dx / len;
    const tip = [c[0] - dx / len * 0.18, c[1] - dy / len * 0.18];
    s += `<line class="noseglow" x1="${a[0]}" y1="${a[1]}" x2="${tip[0]}" y2="${tip[1]}"/>` +
      `<path class="nose" d="M${(a[0] + px * 0.13).toFixed(3)} ${(a[1] + py * 0.13).toFixed(3)}L${tip[0].toFixed(3)} ${tip[1].toFixed(3)}L${(a[0] - px * 0.13).toFixed(3)} ${(a[1] - py * 0.13).toFixed(3)}Z"/>` +
      `<circle class="hole" cx="${c[0]}" cy="${c[1]}" r=".42"/>`;
  }
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
      return `<path d="${arrowPath(p1[0], p1[1], p2[0], p2[1])}" style="fill:${ar.color || 'var(--blue)'};opacity:.85"/>`;
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
  // plays a move (from/to/promotion or SAN) with sound, petals on a capture, a pluck for a new pin and the nose for a skewer
  play(mv) {
    const m = this.pos.findMove(mv); if (!m) return null;
    const san = this.pos.san(m);
    const mover = this.pos.turn, before = new Set(pinsOf(this.pos).map(x => x.s + ':' + x.p));
    this.pos.make(m);
    const fresh = pinsOf(this.pos).filter(x => colorOf(this.pos.board[x.s]) === mover && !before.has(x.s + ':' + x.p));
    const sk = this.pos.status() === 'mate' ? null : skewerOf(this.pos);
    if (sk) NOSE = Object.assign(sk, { c: mover });
    else if (NOSE && NOSE.c === mover) NOSE = null; // the skewering side moved on: took the prize or let it go
    if (m.captured) { Sound.capture(); const r = this.sqEls[m.to].getBoundingClientRect(); setTimeout(() => puffAt(r.left + r.width / 2, r.top + r.height / 2, r.width * 0.9), 110); } else Sound.move();
    if (fresh.length && SHOW_THREADS) setTimeout(() => Sound.pluck(), 90);
    if (sk) setTimeout(() => Sound.nose(), 120);
    this.set(this.pos, { last: { from: m.from, to: m.to }, anim: m });
    return { m, san };
  }
}

/* ---------- shell ---------- */
const CH = [
  { t: 'Театр', no: '✦' }, { t: 'Нитка к королю', no: '1' }, { t: 'Длинная нитка', no: '2' }, { t: 'Кто на ниточке?', no: '3' },
  { t: 'Нос Буратино', no: '4' }, { t: 'Рваные нитки', no: '5' }, { t: 'Ножницы', no: '6' }, { t: 'Афиша ловушек', no: '7' }, { t: 'Золотой ключик', no: '★' }
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
const MASKS = '<svg viewBox="0 0 34 34" aria-hidden="true"><path d="M3 6 Q11 3 18 6 Q19 16 11 21 Q3 16 3 6Z" fill="#ffe7a8" stroke="#7c1020" stroke-width="1.4"/><path d="M6 10 q2 -1.4 4 0 M12 10 q2 -1.4 4 0 M7 15 q4 3 8 0" fill="none" stroke="#7c1020" stroke-width="1.4" stroke-linecap="round"/><path d="M15 12 Q22 9 31 12 Q31 23 23 28 Q15 23 15 12Z" fill="#f2c14e" stroke="#7c1020" stroke-width="1.4"/><path d="M18 16 q2 1.4 4 0 M24 16 q2 1.4 4 0 M19 24 q4 -3 8 0" fill="none" stroke="#7c1020" stroke-width="1.4" stroke-linecap="round"/></svg>';
const ico = id => `<svg viewBox="0 0 16 16" aria-hidden="true"><use href="#${id}"/></svg>`;

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
  SHOW_THREADS = true; NOSE = null;
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
  return `<div class="fact"><button type="button" aria-expanded="false"><span class="inner"><span class="face front">${MASKS}<span><b>${title}</b><span>${sub || 'нажмите, чтобы перевернуть'}</span></span></span><span class="face back">${body}</span></span></button></div>`;
}
function seal(text, kind, small) { clearSeal(); const s = document.createElement('div'); s.className = 'seal' + (kind ? ' ' + kind : ''); s.innerHTML = text + (small ? `<small>${small}</small>` : ''); $('#frame').appendChild(s); Sound.stamp(); }
function clearSeal() { $$('.seal').forEach(x => x.remove()); }
const scoreBy = errs => errs === 0 ? 3 : (errs <= 2 ? 2 : 1);
const MINIKEY = `<svg class="minikey" viewBox="0 0 92 110" aria-hidden="true">
  <rect x="18" y="2" width="56" height="8" rx="3" fill="#c79a55" stroke="#5b3a22" stroke-width="2"/>
  <g class="k"><path d="M26 8 L44 40 M66 8 L48 40 M46 8 V40" stroke="#8a5b26" stroke-width="1.4"/>
  <g transform="translate(46 52) scale(1.45)"><use href="#keyArt"/></g></g>
</svg>`;
function finishCard(ch, n, line, nextLabel) {
  setS(ch, n); n = state.st[ch];
  Sound.bravo(); later(() => Petals.burst(n === 3 ? 1 : 0.5), 300);
  return `<div class="finale">${MINIKEY}<div style="display:grid;gap:8px"><div class="starrow" aria-label="${n} ${plural(n, 'звезда', 'звезды', 'звёзд')} из 3">${[0, 1, 2].map(k => starSvg(k < n ? '' : 'off')).join('')}</div><p class="task">${line}</p></div></div>
    <div class="controls"><button type="button" class="btn primary big" data-next="${ch + 1}">${nextLabel || 'Следующая глава →'}</button><button type="button" class="btn" data-replay="${ch}">Ещё раз</button></div>`;
}
function ctl(html) { const el = $('#ctl'); if (el) el.innerHTML = html; }
const Bt = (id, label, cls) => `<button type="button" class="btn ${cls || ''}" id="${id}">${label}</button>`;
const on = (id, fn) => { const el = $('#' + id); if (el) el.onclick = fn; };

/* the footlights: moves */
function tape(sans, startFen) {
  const el = $('#tapeMoves'); if (!sans.length) { el.innerHTML = ''; return; }
  const p = new Position(startFen); let n = p.full, t = p.turn; const out = [];
  sans.forEach((s, k) => { out.push(t === 'w' ? `<span><span class="n">${n}.</span>${esc(ru(s))}</span>` : `<span>${k === 0 ? `<span class="n">${n}…</span>` : ''}${esc(ru(s))}</span>`); if (t === 'b') n++; t = t === 'w' ? 'b' : 'w'; });
  el.innerHTML = out.slice(-8).join('');
}
const fenAfter = (fen, sans) => { const p = new Position(fen); sans.forEach(s => { const m = p.findMove(s); if (!m) throw new Error('bad move ' + s); p.make(m); }); return p.fen(); };
const keyOf = p => p.fen().split(' ').slice(0, 3).join(' ');
const sqFromU = u => ({ from: sqIndex(u.slice(0, 2)), to: sqIndex(u.slice(2, 4)), promotion: u[4] || '' });
/* the last moves of an opening on the footlights before a trap */
function openingTape(k) { const t = D.traps[k], a = Math.max(0, t.at - 6); tape(t.moves.slice(a, t.at), fenAfter(D.start, t.moves.slice(0, a))); }
const opening = (k, marks) => { const t = D.traps[k]; const p = new Position(D.start); let s = ''; t.moves.slice(0, t.at).forEach((m, i) => { const r = p.play(m); s += (i % 2 === 0 ? `${i / 2 + 1}.` : ' ') + ru(r.san) + ((marks || {})[i] || '') + (i % 2 ? ' ' : ''); }); return esc(s.trim()); };

/* autoplay a SAN line from fen; cb() at the end */
function demoLine(fen, sans, cb, opts) {
  opts = opts || {};
  const p = new Position(fen); NOSE = null; board.set(p); board.arrows = [];
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
    pos = new Position(T.fen); sans = []; busy = false; over = false; k = 0; NOSE = null;
    board.setOrient(T.side); board.set(pos); board.arrows = []; board.render(); showTape(); clearSeal();
    if (o.onReset) o.onReset(pos);
  }
  reset();
  function done(kind) {
    over = true;
    if (kind === 'mate') seal('Мат!', '', o.mateSmall || 'занавес');
    else if (o.limitSeal) seal(o.limitSeal[0], o.limitSeal[1] || 'green', o.limitSeal[2]);
    flash($('#frame'), 'ok'); Sound.bravo(); Petals.burst(0.35);
    o.onDone(kind, { mistakes, hints, sans });
  }
  board.canMove = () => !busy && !over && pos.turn === T.side;
  board.onMove = mv => {
    const prev = pos.fen(), key = keyOf(pos), nd = G[key];
    const r = board.play(mv); if (!r) return;
    const u = uciOf(r.m);
    if (nd && u in nd.g) {
      sans.push(r.san); showTape(); board.arrows = []; board.marks = {}; board.render(); Sound.ok(); k++;
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
    const back = ms => later(() => { if (g1 !== gen) return; pos = new Position(prev); NOSE = null; board.set(pos); board.arrows = []; board.marks = {}; board.render(); clearSeal(); busy = false; }, ms);
    if (nd && nd.e.includes(u)) { Sound.tick(); say('warn', o.eqText ? o.eqText(r.san) : `${RUP(r.san)} — тоже неплохо, но ищем другой ход.`); back(1900); return; }
    if (nd && nd.w && nd.w.includes(u)) { Sound.tick(); say('warn', o.wText ? o.wText(r.san) : `${RUP(r.san)} — сильный ход, но есть ещё сильнее. Ищите!`); back(1900); return; }
    mistakes++; Sound.bad(); flash($('#frame'), 'bad');
    const ref = nd && nd.b[u]; let refSan = '';
    if (ref) {
      const m2 = pos.findMove(sqFromU(ref));
      if (m2) {
        refSan = pos.san(m2);
        if (o.showRef === 'play') later(() => { if (g1 === gen && !over) board.play(sqFromU(ref)); }, 700);
        else { board.arrows = [{ from: m2.from, to: m2.to, color: 'var(--crimson)' }]; board.render(); }
      }
    }
    say('bad', o.badText ? o.badText(r.san, refSan, u) : `${RUP(r.san)}? ${refSan ? `Ответ <b>${RUP(refSan)}</b> — и спектакль не задался.` : 'Так не выйдет.'}`);
    back(o.showRef === 'play' ? 3000 : 2200);
  };
  return {
    reset,
    hint() {
      if (busy || over) return false; const nd = G[keyOf(pos)]; if (!nd) return false;
      const u = Object.keys(nd.g)[0]; if (!u) return false;
      hints++; board.arrows = [{ from: sqIndex(u.slice(0, 2)), to: sqIndex(u.slice(2, 4)), color: 'var(--plum)' }]; board.render(); Sound.reveal(); return true;
    },
    stats: () => ({ mistakes, hints }),
    pos: () => pos
  };
}

/* shared: a chapter of rounds; a round is a graph task */
function roundsChapter(ch, rounds, cfg) {
  let i, res, errs, L;
  function next() {
    const last = i === rounds.length - 1;
    ctl(Bt('nx', last ? 'Итог главы →' : 'Следующая задача →', 'primary'));
    on('nx', () => { clearSeal(); if (last) finish(); else { i++; show(); } });
  }
  function show() {
    const r = rounds[i];
    card.innerHTML = head(cfg.kicker, pips(rounds.length, i, res), r.title, r.text) +
      (r.extra || '') + `<div class="fb" id="fb"></div><div class="controls" id="ctl"></div>` + (r.fact ? factHtml(r.fact[0], r.fact[1], r.fact[2]) : '');
    ctl(Bt('hintB', 'Подсказка', 'hint') + Bt('rsB', 'Заново'));
    on('hintB', () => { if (L.hint()) say('warn', cfg.hintText || 'Стрелка показывает нужный ход.'); });
    on('rsB', () => { L.reset(); say(); });
    L = makeGraph(Object.assign({ showRef: cfg.showRef, eqText: cfg.eqText, wText: cfg.wText, badText: cfg.badText }, r.opts || {}, {
      task: r.task,
      onStep(k, san, pos) { const t = r.steps && r.steps[k - 1]; if (t) say('ok', typeof t === 'function' ? t(san) : t); else say(); },
      onDone(kind, st) {
        const e = st.mistakes + st.hints; errs += e; res[i] = e === 0;
        card.querySelector('.kicker b').innerHTML = pips(rounds.length, i, res);
        const d = r.done || {};
        say('ok', typeof d === 'function' ? d(kind, st) : (d[kind] || d.any || 'Браво!'));
        next();
      }
    }));
  }
  function finish() { card.innerHTML = head(cfg.kicker, '', cfg.doneTitle, '') + finishCard(ch, scoreBy(errs), cfg.doneLine); }
  return { enter() { i = 0; res = []; errs = 0; if (cfg.before) cfg.before(e => { errs = e; show(); }); else show(); } };
}

/* ---------- notes for the host ---------- */
const PLAN = [['Пролог: театр и анатомия связки', 8], ['Нитка к королю', 12], ['Длинная нитка', 10], ['Кто на ниточке?', 14], ['Нос Буратино', 12], ['Рваные нитки', 10], ['Ножницы', 10], ['Афиша ловушек', 10], ['Итоги и домашка', 4]];
const NOTES = [
  ['Завязка: в театре Карабаса-Барабаса куклы висят на нитках и шагу не могут ступить без хозяина. В шахматах это связка.', 'Анатомия: ученики по очереди называют кукловода, куклу и сокровище, ведущий нажимает на клетки. Потом кнопка «Дёрнуть за нитку».', 'Главная мысль дня: кукла не может уйти — значит, по ней можно бить.'],
  ['Три задачи на полную связку: за куклой стоит король.', 'Золотая нитка на доске — неполная связка, красная — полная (к королю). Нитки рисуются сами, как только связка возникает.', 'Звёзды: 3 за главу без ошибок и подсказок.'],
  ['Неполная связка: за куклой ферзь или ладья. Кукле ходить можно, но дорого.', 'Спросите: почему в задаче 2 точнее c4, а не e4? (поле f4 стережёт пешка e3).'],
  ['Сначала 6 карточек «Кто на ниточке?»: ученики голосуют в чате, ведущий отмечает кукол на доске и нажимает «Проверить».', 'Карточка 4 с подвохом: слон смотрит на коня, но за конём пешка d7 — связки нет.', 'Затем две задачи: кукла — плохой защитник.'],
  ['Сквозной удар — связка наоборот: впереди ценная фигура, за ней дешёвая.', 'Деревянный «нос» на доске показывает удар насквозь.', 'Задача 2 — важный трюк ладейного эндшпиля: королю защитника место только на g7 или h7.', 'Задача 3: превращение со сквозным шахом.'],
  ['Мнимая связка: кукла уходит, если её ход сильнее потери.', 'Обе задачи — за чёрных, доска перевернётся.', 'Слоновья ловушка — из ферзевого гамбита, гамбит Стаффорда — из русской партии. Мат во второй задаче похож на мат Легаля.'],
  ['Защита от связки. Ход за чёрных: ученик ищет, как разрезать нитку заранее.', 'Ошибка показывает удар белых прямо на доске.', 'Четыре ножницы: увести короля или ферзя с линии, закрыться, прогнать кукловода пешкой, не пустить его на нужное поле.'],
  ['Три дебютные ловушки за чёрных: гамбит Англунда, будапештский гамбит и ловушка Ласкера в контргамбите Альбина.', 'В ловушке Ласкера пешку надо превратить в коня — откроется окно выбора фигуры.'],
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
$('#soundBtn').addEventListener('click', () => { prefs.sound = !prefs.sound; store.set('sound', prefs.sound); $('#soundBtn').setAttribute('aria-pressed', String(prefs.sound)); if (prefs.sound) Sound.pluck(); });


/* ---------- the chapters ---------- */

/* ✦ — prologue: the anatomy of a pin */
IMPL[0] = (() => {
  const PARTS = [
    { sq: 'e1', cls: 'puppeteer', ic: 'icoCross', q: 'Кукловод: где он?', t: '<b>Кукловод — ладья e1.</b> Дальнобойная фигура держит нитку.' },
    { sq: 'e4', cls: 'doll', ic: 'icoDoll', q: 'Кукла: где она?', t: '<b>Кукла — конь e4.</b> Висит на нитке: сойти с линии нельзя.' },
    { sq: 'e8', cls: 'treasure', ic: 'icoCrown', q: 'Сокровище: где оно?', t: '<b>Сокровище — король e8.</b> Его и прикрывает кукла.' }
  ];
  let found, fired;
  const items = () => PARTS.map(p => `<li class="${p.cls}${found.has(p.sq) ? '' : ' dim'}"><i>${ico(p.ic)}</i><span>${found.has(p.sq) ? p.t : p.q}</span></li>`).join('');
  const list = () => `<ul class="parts" id="parts">${items()}</ul>`;
  function draw() {
    board.marks = {}; PARTS.forEach(p => { if (found.has(p.sq)) board.marks[p.sq] = p.cls; });
    SHOW_THREADS = found.size === PARTS.length;
    board.render();
  }
  function pull() {
    if (fired) return; fired = true; clearSeal();
    board.marks = {}; $('#board').classList.remove('clicky');
    demoLine(D.pro.fen, D.pro.demo, () => { seal('Связка!', '', 'кукла поймана'); Petals.burst(0.5); say('ok', 'Пешка f3 напала на куклу. Король отошёл — нитка оборвалась, но поздно: ход уже потрачен, и пешка съела коня.'); fired = false; }, { delay: 1000 });
  }
  return {
    enter() {
      found = new Set(); fired = false; SHOW_THREADS = false;
      board.set(new Position(D.pro.fen)); $('#board').classList.add('clicky');
      card.innerHTML = head('Пролог', '90 минут', 'Театр Карабаса',
        'В театре Карабаса-Барабаса куклы висят на нитках и шагу не могут ступить без хозяина. В шахматах такая нитка называется <b>связкой</b>. Сегодня научимся связывать, ловить кукол, рвать нитки — и протыкать холст, как Буратино своим длинным носом.') +
        `<div class="prog">${CH.slice(1, 8).map((c, i) => `<span><i>${i + 1}</i>${c.t}</span>`).join('')}</div>
        <p class="kicker"><span>Анатомия связки: найдите на доске трёх героев</span></p>${list()}
        <div class="fb" id="fb"></div>
        <div class="controls" id="ctl">${Bt('pullB', '▶ Дёрнуть за нитку')}<button type="button" class="btn primary big" data-next="1">Глава 1 →</button></div>` +
        factHtml('Сильнее меча', 'шутка шахматного писателя', 'Американский шахматный писатель Фред Рейнфелд пошутил: <b>«The pin is mightier than the sword»</b> — «Связка сильнее меча». Это игра слов: в пословице «перо сильнее меча» стоит <i>pen</i> — перо, а <i>pin</i> по-английски значит «булавка» и «связка».');
      $('#pullB').disabled = true; on('pullB', pull);
      draw();
    },
    onSquare(s) {
      if (fired) return;
      const n = sqName(s), part = PARTS.find(p => p.sq === n), pc = board.pos.board[s];
      if (part && !found.has(n)) {
        found.add(n); Sound.reveal(); draw(); $('#parts').innerHTML = items();
        if (found.size === PARTS.length) { say('ok', 'Вся труппа на сцене! Красная нитка тянется от кукловода через куклу к королю. Теперь нажмите «Дёрнуть за нитку».'); $('#pullB').disabled = false; Sound.pluck(); }
        else say('ok', `Найдено ${found.size} из ${PARTS.length}.`);
      } else if (pc && !part) { Sound.tick(); say('warn', 'Эта фигура в спектакле не участвует. Подсказка: всё происходит на линии «e».'); }
    }
  };
})();

/* 1 — a string to the king */
IMPL[1] = roundsChapter(1, [
  { title: 'Ферзь на нитке', task: D.g.a1,
    text: 'Ход белых. Ферзь d7 и король e8 стоят на одной диагонали, а пешка c5 далеко — закрыться ей нечем. Привяжите ферзя к королю!',
    steps: ['Сb5! Ферзь привязан к королю: уйти с диагонали нельзя.', 'С:d7 — ферзь взят!'],
    done: { any: 'Слон за ферзя — отличная сделка. Будь пешка на c7, чёрные закрылись бы ходом c6, а так нитку не разорвать.' },
    opts: { limitSeal: ['Связка!', '', 'ферзь пойман'] } },
  { title: 'Пешка бьёт куклу', task: D.g.a2,
    text: 'Ход белых. Конь c6 привязан слоном b5 к королю e8. Кукла не может сойти с места — так нападите на неё самой дешёвой фигурой!',
    steps: ['d5! Пешка напала на связанного коня.', 'd:c6 — кукла поймана!'],
    done: { any: 'Чёрные закрылись слоном d7, но было поздно: ход потрачен, и пешка съела коня. Связанную фигуру лучше всего атаковать пешкой.' },
    opts: { limitSeal: ['Связка!', '', 'конь пойман'], eqText: san => `${RUP(san)} — неплохо, но кукла ждёт: нападите на неё прямо сейчас!` } },
  { title: 'Ферзь-сторож', task: D.g.a3,
    text: 'Ход белых. Кто защищает пешку f7? Король… и ферзь e7. Но ферзь привязан ладьёй e1 к королю! <b>Мат в 1 ход.</b>',
    done: (kind, st) => `${st.sans[0].startsWith('Q') ? 'Ф:f7#' : 'С:f7#'} — мат! Ферзь e7 «стерёг» f7 только на вид: сойти с линии «e» он не может. ${st.sans[0].startsWith('Q') ? 'Мат ставил и С:f7#.' : 'Мат ставил и Ф:f7#.'}`,
    opts: { wText: san => `${RUP(san)} — сильно, но здесь мат в один ход. Кто на самом деле защищает f7?` },
    fact: ['Театральный факт', 'откуда нитки', 'Слово «марионетка» — французское: <i>marionnette</i>, уменьшительное от имени Марион (Мария). По одной из версий, так называли кукол, изображавших Деву Марию в средневековых представлениях.'] }
], { kicker: 'Глава 1 · нитка к королю', doneTitle: 'Кукла поймана',
  wText: san => `${RUP(san)} — сильно, но есть удар точнее. Где кукловод и где кукла?`,
  badText: (san, ref) => `${RUP(san)} — не то. ${ref ? `Ответ <b>${RUP(ref)}</b>, и связки нет. ` : ''}Ищите нитку!`,
  doneLine: 'Полная связка — за куклой стоит король. Кукла не может сделать ни шагу: такой ход запрещён правилами. Значит, по ней можно бить — лучше всего пешкой.' });

/* 2 — a long string */
IMPL[2] = roundsChapter(2, [
  { title: 'Конь и ферзь', task: D.g.b1,
    text: 'Ход белых. Слон g5 связал коня f6 с ферзём d8. Коню ходить можно — но тогда пропадёт ферзь. Нападите на куклу!',
    steps: ['e5! Пешка напала на коня.', 'd:e5 — линия открыта, и конь снова под ударом пешки.'],
    done: { any: 'Пешка гонится за куклой: убежит конь — пропадёт ферзь. Чёрные потеряют фигуру.' },
    opts: { limitSeal: ['Связка!', '', 'фигура выиграна'] } },
  { title: 'Нитка по вертикали', task: D.g.b2,
    text: 'Ход белых. Ладья d1 связала коня d5 с ферзём d8. Какой пешкой ударить по кукле?',
    steps: ['c4! Пешка напала на коня.', 'Л:d8 — конь ушёл, и ферзь остался без прикрытия!'],
    done: { any: 'Ладья за ферзя! Пешка e3 при этом стерегла поле f4, и коню некуда было прыгнуть с угрозой.' },
    opts: { limitSeal: ['Связка!', '', 'ферзь пойман'],
      eqText: san => san.startsWith('e4') ? 'e4 — тоже нападение на куклу! Но тогда конь прыгнет на f4 с ударом по ферзю: пешка e3 больше не стережёт это поле. Найдите ход точнее!' : `${RUP(san)} — тоже выигрывает, но ферзь d8 ждёт: заберите его!` } }
], { kicker: 'Глава 2 · длинная нитка', doneTitle: 'Нитка натянулась',
  wText: san => `${RUP(san)} — сильно, но есть удар точнее. Куда бить по кукле?`,
  badText: (san, ref) => `${RUP(san)} — не то. ${ref ? `Ответ <b>${RUP(ref)}</b>. ` : ''}Нападите на связанного коня!`,
  doneLine: 'Неполная связка — за куклой ферзь или ладья. Ходить кукле можно, но тогда пропадёт то, что за спиной. Бейте по кукле пешкой — соперник потеряет фигуру или ферзя.' });

/* 3 — who hangs on a string: quiz, then two tasks */
const NOM = { p: 'пешка', n: 'конь', b: 'слон', r: 'ладья', q: 'ферзь', k: 'король' };
const FEM = { p: 1, r: 1 };
const DAT = { k: 'королю', q: 'ферзю', r: 'ладье' };
const INS = { b: 'слоном', r: 'ладьёй', q: 'ферзём' };
function pinText(p, x) {
  const P = p.board[x.p], S = p.board[x.s].toLowerCase(), T = p.board[x.t].toLowerCase(), t = P.toLowerCase(), f = !!FEM[t];
  const col = colorOf(P) === 'w' ? (f ? 'Белая' : 'Белый') : (f ? 'Чёрная' : 'Чёрный');
  return `${col} ${NOM[t]} <b>${sqName(x.p)}</b> ${f ? 'привязана' : 'привязан'} ${INS[S]} ${sqName(x.s)} к ${DAT[T]} ${sqName(x.t)}${x.abs ? ' — полная связка' : ' — неполная связка'}.`;
}
let QZ = null;
const NOTE4 = 'Слон a4 смотрит на коня c6, но за конём стоит пешка d7, а не король. Нитки нет — кукол нет!';
function quizPhase(cb) {
  const Q = D.quiz; let i = 0, errs = 0, res = [], picked, none, checked;
  const DOLL = '<svg viewBox="0 0 16 16" style="color:var(--blue)"><use href="#icoDoll"/></svg>';
  function counter() { const el = $('#dolls'); if (el) el.innerHTML = `${DOLL}<div>${none ? 'Кукол нет' : `Отмечено кукол: ${picked.size}`}<span>нажимайте на фигуры на доске</span></div>`; }
  function marks() { board.marks = {}; picked.forEach(s => { board.marks[s] = 'pick'; }); board.render(); }
  function show() {
    picked = new Set(); none = false; checked = false; clearSeal(); NOSE = null; SHOW_THREADS = false;
    const p = new Position(Q[i]); board.setOrient('w'); board.set(p); board.marks = {}; board.render();
    $('#board').classList.add('clicky');
    card.innerHTML = head('Глава 3 · кто на ниточке?', pips(Q.length, i, res), 'Кто на ниточке?', 'Отметьте на доске <b>всех кукол</b> — связанные фигуры обоих цветов. Если кукол нет, нажмите «Кукол нет».') +
      `<div class="dolls" id="dolls"></div><div class="fb" id="fb"></div><div class="controls" id="ctl">${Bt('noneB', 'Кукол нет')}${Bt('chk', 'Проверить', 'primary')}</div>` +
      (i === 0 ? factHtml('Театральный факт', 'полная и неполная', 'Если за куклой стоит король — связка <b>полная</b>: ходить кукле запрещено правилами. Если ферзь или ладья — связка <b>неполная</b>: ходить можно, но дорого обойдётся.') : '');
    counter();
    on('noneB', () => { if (checked) return; none = !none; if (none) { picked.clear(); marks(); } $('#noneB').setAttribute('aria-pressed', String(none)); counter(); Sound.tick(); });
    on('chk', check);
    QZ = s => {
      if (checked) return;
      const pc = board.pos.board[s]; if (!pc) return;
      const n = sqName(s);
      if (pc.toLowerCase() === 'k') { Sound.tick(); say('warn', 'Король не бывает куклой: он сокровище. Ищите тех, кто его заслоняет.'); return; }
      if (picked.has(n)) picked.delete(n); else picked.add(n);
      none = false; $('#noneB').setAttribute('aria-pressed', 'false'); marks(); counter(); Sound.pluck(); say();
    };
  }
  function check() {
    if (checked) return;
    if (!picked.size && !none) { say('warn', 'Отметьте кукол на доске или нажмите «Кукол нет».'); return; }
    checked = true; QZ = null; $('#board').classList.remove('clicky');
    const p = board.pos, truth = new Set(D.quizDolls[i]);
    const ok = truth.size === picked.size && [...truth].every(s => picked.has(s));
    res[i] = ok; if (!ok) errs++;
    board.marks = {};
    truth.forEach(s => { board.marks[s] = picked.has(s) ? 'right' : 'missed'; });
    picked.forEach(s => { if (!truth.has(s)) board.marks[s] = 'wrong'; });
    SHOW_THREADS = true; board.render();
    $$('#ctl button').forEach(b => { b.disabled = true; });
    card.querySelector('.kicker b').innerHTML = pips(Q.length, i, res);
    const list = pinsOf(p);
    const why = list.length ? `<ul class="why">${list.map(x => `<li class="${x.abs ? '' : 'rel'}">${pinText(p, x)}</li>`).join('')}</ul>` : NOTE4;
    say(ok ? 'ok' : 'bad', `${ok ? 'Верно!' : 'Не совсем.'} ${why}`);
    if (ok) { Sound.ok(); if (list.length) Sound.pluck(); } else Sound.bad();
    const last = i === Q.length - 1;
    const c = $('#ctl'); c.innerHTML = Bt('nx', last ? 'К задачам →' : 'Следующая карточка →', 'primary');
    on('nx', () => { clearSeal(); if (last) { QZ = null; SHOW_THREADS = true; $('#board').classList.remove('clicky'); cb(errs); } else { i++; show(); } });
  }
  show();
}
IMPL[3] = roundsChapter(3, [
  { title: 'Пешка-сторож', task: D.g.c1,
    text: 'Ход белых. Пешка g7 привязана слоном b2 к королю h8 — значит, она никого не защищает! <b>Мат в 2 хода.</b>',
    steps: ['Ф:h6+!! Пешке g7 бить нельзя — она на нитке.', 'Ф:g7# — мат! Ферзя держит слон b2.'],
    done: { mate: 'Связанная пешка — плохой сторож: бить ей нельзя. Ферзь прошёл сквозь «защиту».' },
    opts: { wText: san => `${RUP(san)} — сильно, но здесь мат в 2 хода. Кто на самом деле стережёт h6?` } },
  { title: 'Двойная защита?', task: D.g.c2,
    text: 'Ход белых. Конь d5 защищён дважды: пешкой e6 и конём f6. Посчитайте ещё раз — одна из защитниц на нитке!',
    steps: ['С:d5! Если 1…К:d5, то 2.К:d5 — пешке e6 бить нельзя, её держит ладья e1.'],
    done: { any: 'Чёрные не стали брать: размен на d5 стоил бы им второго коня. Фигура выиграна!' },
    opts: { limitSeal: ['Связка!', '', 'фигура выиграна'] } }
], { kicker: 'Глава 3 · кто на ниточке?', doneTitle: 'Кукол видно издалека', before: quizPhase,
  badText: (san, ref) => `${RUP(san)} — не то. ${ref ? `Ответ <b>${RUP(ref)}</b>. ` : ''}Кто из защитников висит на нитке?`,
  doneLine: 'Кукла не может ни ходить, ни бить в сторону от своей нитки. Значит, и защитник из неё никудышный: считая защиту, связанных не считайте!' });
IMPL[3].onSquare = s => { if (QZ) QZ(s); };
IMPL[3].leave = () => { QZ = null; };

/* 4 — Buratino's nose: the skewer */
IMPL[4] = roundsChapter(4, [
  { title: 'Слон-шампур', task: D.g.s1,
    text: 'Буратино проткнул носом нарисованный очаг — а за холстом оказалась потайная дверца. <b>Сквозной удар</b> — это связка наоборот: впереди ценная фигура, за ней та, что подешевле. Ход белых: король d5 и ферзь a8 на одной диагонали!',
    steps: ['Сf3+! Шах — королю надо уходить с диагонали.', 'С:a8 — ферзь взят!'],
    done: { any: 'Король ушёл, и слон дотянулся до ферзя. По-английски такой удар зовут skewer — «шампур».' },
    opts: { limitSeal: ['Насквозь!', '', 'ферзь взят'], eqText: san => `${RUP(san)} — шах тоже силён, но нос уже проткнул холст: заберите ферзя a8!` } },
  { title: 'Трюк с ладьёй', task: D.g.s2,
    text: 'Ход белых. Пешка a7 почти ферзь, но ладья a1 сторожит поле a8 сзади, а ваша ладья загородила пешке дорогу. Как освободить путь?',
    steps: ['Лh8! Ладья ушла с дороги. Если 1…Л:a7…', 'Лh7+! Сквозной шах по 7-й горизонтали.', 'Л:a7 — ладья взята!'],
    done: { any: 'Запомните этот трюк: при пешке a7 и ладье a8 королю защитника можно стоять только на g7 или h7 — иначе Лh8! и сквозной шах.' },
    opts: { limitSeal: ['Насквозь!', '', 'ладья взята'] },
    fact: ['Театральный факт', 'нос Буратино', 'В сказке Алексея Толстого «Золотой ключик» Буратино проткнул носом холст с нарисованным очагом в каморке папы Карло. За холстом оказалась дверца, которую открывал золотой ключик.'] },
  { title: 'Превращение с шахом', task: D.g.s3,
    text: 'Ход белых. У чёрных уже есть ферзь h1, но и ваша пешка вот-вот станет ферзём. Превратитесь так, чтобы забрать чужого ферзя!',
    steps: ['a8=Ф+! Ферзь родился с шахом по большой диагонали.', 'Ф:h1 — нос проткнул всю доску!'],
    done: { any: 'Король ушёл с диагонали a8–h1, и новый ферзь забрал старого. В пешечных гонках ищите превращение с шахом!' },
    opts: { limitSeal: ['Насквозь!', '', 'ферзь взят'] } }
], { kicker: 'Глава 4 · нос Буратино', doneTitle: 'Холст проткнут',
  badText: (san, ref) => `${RUP(san)} — не то. ${ref ? `Ответ <b>${RUP(ref)}</b>. ` : ''}Ищите шах, за которым прячется добыча!`,
  doneLine: 'Сквозной удар: нападаем на ценную фигуру — чаще всего шахом, — а когда она уходит, бьём ту, что стояла за ней.' });

/* 5 — Buratino tears the strings: a false pin */
IMPL[5] = roundsChapter(5, [
  { title: 'Слоновья ловушка', task: D.g.m1,
    text: `Ферзевый гамбит: ${opening('elephant', { 10: '??' })} Ход чёрных. Белые уверены, что конь f6 привязан к ферзю d8. Порвите нитку!`,
    steps: ['К:d5!! Конь бросил ферзя — нитка порвана! Белые жадничают…', 'Сb4+! Шах — белым придётся закрыться ферзём.', 'С:d2+ — ферзь за ферзя.', 'Кр:d8 — и чёрные остались с лишней фигурой!'],
    done: { any: 'Белые взяли ферзя, но отдали своего и остались без коня. В английских книгах эту ловушку зовут Elephant Trap — «слоновья ловушка».' },
    opts: { limitSeal: ['Порвано!', '', 'лишняя фигура'], onReset() { openingTape('elephant'); }, eqText: san => `${RUP(san)} — тоже отлично! Но в ловушке чёрные сначала забирают ферзя с шахом.` } },
  { title: 'Гамбит Стаффорда', task: D.g.m2,
    text: `Русская партия: ${opening('stafford', { 10: '??' })} Ход чёрных. Белые связали коня f6 с ферзём. Но нитка гнилая!`,
    steps: ['К:e4!! Конь ушёл — пусть берут ферзя…', 'С:f2+! Короля выгоняют вперёд.', 'Сg4# — мат!'],
    done: { mate: 'Белые съели ферзя — и получили мат тремя лёгкими фигурами. Похоже на мат Легаля, только наоборот!' },
    opts: { mateSmall: 'нитка порвана', onReset() { openingTape('stafford'); }, wText: san => `${RUP(san)} — сильно, но есть ход красивее. Порвите нитку конём!` } }
], { kicker: 'Глава 5 · рваные нитки', doneTitle: 'Нитки порваны',
  badText: (san, ref) => `${RUP(san)} — не то. ${ref ? `Ответ <b>${RUP(ref)}</b>. ` : ''}Пусть кукла уходит — с ударом посильнее!`,
  doneLine: 'Мнимая связка: если кукла уходит с шахом, матом или выигрышем покрупнее — нитка не держит. Прежде чем ловить куклу, проверьте, не порвёт ли она нитку!' });

/* 6 — scissors: defence */
const CUT = {
  a6: 'a6! Пешка стережёт b5 — слону туда нельзя.', 'O-O': '0-0! Король ушёл с диагонали — привязывать ферзя не к чему.', 'O-O-O': '0-0-0! Король ушёл с диагонали.',
  c4: 'c4! Пешка прогнала кукловода.', Kf8: 'Крf8! Король ушёл с диагонали.',
  h6: 'h6! Спросите кукловода: слону g5 придётся решать, куда уйти.', Qe8: 'Фe8! Ферзь ушёл из-за спины коня — связки больше нет.', Qd7: 'Фd7! Ферзь ушёл из-за спины коня — связки больше нет.',
  e6: 'e6! Пешка стережёт d5 — ход d5 не пройдёт.', Bd7: 'Сd7! Слон закрыл линию — кукла отвязана.'
};
IMPL[6] = roundsChapter(6, [
  { title: 'Ферзь в опасности', task: D.g.e1,
    text: 'Ход чёрных. Позиция из главы 1, но теперь ходите вы! Белые грозят Сb5 — привязать ферзя к королю. Разрежьте нитку заранее!',
    done: (kind, st) => CUT[st.sans[0].replace(/[+#]/g, '')] || 'Нитка разрезана!' },
  { title: 'Конь на нитке', task: D.g.e2,
    text: 'Ход чёрных. Позиция из главы 2: белые грозят e5, и конь f6 погибнет. Что делать?',
    done: (kind, st) => CUT[st.sans[0].replace(/[+#]/g, '')] || 'Нитка разрезана!' },
  { title: 'Спасите коня', task: D.g.e3,
    text: 'Ход чёрных. Позиция из главы 1: конь c6 привязан к королю, и белые грозят d5. Как спасти куклу?',
    done: (kind, st) => CUT[st.sans[0].replace(/[+#]/g, '')] || 'Нитка разрезана!' }
], { kicker: 'Глава 6 · ножницы', doneTitle: 'Нитки разрезаны', showRef: 'play',
  badText: (san, ref) => `${RUP(san)}? ${ref ? `Ответ <b>${RUP(ref)}</b> — и связка срабатывает.` : 'Так не спастись.'}`,
  doneLine: 'Четыре ножницы против связки: уведите короля или ферзя с линии, закройтесь, прогоните кукловода пешкой — или не пускайте его на нужное поле заранее.' });

/* 7 — the playbill: opening traps */
IMPL[7] = roundsChapter(7, [
  { title: 'Гамбит Англунда', task: D.g.t1,
    text: `Гамбит Англунда: ${opening('englund', { 10: '?' })} Ход чёрных. Белые напали на ферзя b2. Привяжите слона c3 к королю!`,
    steps: ['Сb4! Слон c3 на нитке: за ним король e1, а нападают на него двое.', 'С:c3 — белым приходится брать ферзём.', 'Фc1# — мат!'],
    done: { mate: 'Мат на восьмом ходу! Гамбит назван в честь шведского шахматиста Фрица Англунда.' },
    opts: { onReset() { openingTape('englund'); } } },
  { title: 'Будапештский гамбит', task: D.g.t2,
    text: `Будапештский гамбит: ${opening('budapest', { 14: '??' })} Ход чёрных. Белые выиграли слона. <b>Мат в 1 ход!</b>`,
    done: { mate: 'Кd3# — пешка e2 не может взять коня: её привязал ферзь e7. Одна из самых известных ловушек будапештского гамбита.' },
    opts: { onReset() { openingTape('budapest'); } } },
  { title: 'Ловушка Ласкера', task: D.g.t3,
    text: `Контргамбит Альбина: ${opening('lasker', { 6: '?', 10: '??' })} Ход чёрных. Пешка f2 рвётся в ферзи — но в какую фигуру превратиться?`,
    steps: ['f:g1=К+!! Превращение в коня — с шахом!', 'Сg4+ — нос Буратино: король уйдёт, и ферзь d1 пропадёт.'],
    done: { any: 'Ловушка названа в честь Эмануила Ласкера. Превращение в коня уже на седьмом ходу! А на 8.Крe1 сильно 8…Фh4+.' },
    opts: { limitSeal: ['Аншлаг!', 'gold', 'ферзь пропадает'], onReset() { openingTape('lasker'); },
      badText: (san, ref) => /=Q/.test(san) ? `${RUP(san)}? Новый ферзь не даёт шаха, и белые успевают ответить <b>${RUP(ref)}</b>. Превратитесь с шахом!` : `${RUP(san)} — не то. ${ref ? `Ответ <b>${RUP(ref)}</b>. ` : ''}Подумайте о превращении!` } }
], { kicker: 'Глава 7 · афиша ловушек', doneTitle: 'Аншлаг!',
  badText: (san, ref) => `${RUP(san)} — не то. ${ref ? `Ответ <b>${RUP(ref)}</b>. ` : ''}Ищите нитку к королю!`,
  doneLine: 'Связка в дебюте ловит даже опытных: слон, конь или пешка оказываются привязаны к королю — и спектакль заканчивается в первом акте.' });

/* ★ — the golden key: summary */
IMPL[8] = (() => {
  const RANKS = [[19, 'Хранитель золотого ключика'], [14, 'Главный кукловод'], [8, 'Артист театра'], [0, 'Зритель первого ряда']];
  const DESC = { 'Хранитель золотого ключика': 'знает тайну потайной дверцы', 'Главный кукловод': 'держит все нитки в руках', 'Артист театра': 'связку видит издалека', 'Зритель первого ряда': 'всё ещё впереди' };
  return {
    enter() {
      const n = totalS(), rank = RANKS.find(r => n >= r[0])[1];
      board.set(new Position(D.pro.fen)); board.render();
      card.innerHTML = head('Золотой ключик', `${n} из ${MAXS}`, rank, `${DESC[rank][0].toUpperCase() + DESC[rank].slice(1)}.`) +
        `<div class="finale">${MINIKEY}<div class="starrow">${[0, 1, 2].map(k => starSvg(k < Math.round(n / MAXS * 3) ? '' : 'off')).join('')}</div></div>
        <ul class="recap">
          <li><i>✚</i><span><b>Связка</b> — кукловод, кукла и сокровище на одной линии.</span></li>
          <li><i>♚</i><span><b>Полная связка</b> — за куклой король: ходить ей запрещено.</span></li>
          <li><i>♛</i><span><b>Неполная</b> — за куклой ферзь или ладья: ходить можно, но дорого.</span></li>
          <li><i>♙</i><span><b>Бей по кукле</b> пешкой. Кукла — плохой защитник.</span></li>
          <li><i>➶</i><span><b>Сквозной удар</b> — нос Буратино: ценная впереди, добыча сзади.</span></li>
          <li><i>✂</i><span><b>Ножницы</b>: уйти с линии, закрыться, прогнать кукловода. И помните о мнимых связках!</span></li>
        </ul>
        <p class="kicker"><span>Домашнее задание</span></p>
        <div class="links">
          <a href="https://lichess.org/training/pin" target="_blank" rel="noopener">Задачи «Связка» на Lichess <span>решите 10 задач</span></a>
          <a href="https://lichess.org/training/skewer" target="_blank" rel="noopener">Задачи «Сквозной удар» на Lichess <span>решите 5 задач</span></a>
          <button type="button" id="pgnB">Скачать PGN урока <span>Lichess → Исследование → Импорт PGN</span></button>
          <button type="button" id="pgnC">Скопировать PGN <span>и вставить в Lichess</span></button>
        </div>
        <div class="fb" id="fb"></div>
        <div class="controls"><button type="button" class="btn" id="resetAll">Сбросить звёзды</button></div>`;
      Sound.bravo(); later(() => Petals.burst(1.2), 400);
      const PGN = window.TEATR_PGN, FILE = 'teatr-karabasa-lichess';
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
  setTimeout(() => Sound.bell(), 150);
  setTimeout(() => { c.classList.add('open'); Sound.curtain(); }, 1300);
  setTimeout(() => c.classList.add('gone'), 2500);
})();
})();
