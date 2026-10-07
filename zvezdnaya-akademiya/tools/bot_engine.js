/* Bot engine: a 0x88 board, alpha-beta with iterative deepening, quiescence, a transposition table,
   killer and history ordering, check extensions; material + tapered piece-square tables + a mop-up term.
   Plays at a level: depth, time, score noise and the odds of a careless move. Works on the page or in a worker. */
(function (root) {
  'use strict';
  var P = 1, N = 2, B = 3, R = 4, Q = 5, K = 6;
  var VAL = [0, 100, 320, 330, 500, 900, 0];
  var PHASE = [0, 0, 1, 1, 2, 4, 0];
  var INF = 1e9, MATE = 1e6;
  var KN = [33, 31, 18, 14, -33, -31, -18, -14], KG = [1, -1, 16, -16, 15, 17, -15, -17];
  var BD = [15, 17, -15, -17], RD = [1, -1, 16, -16];
  /* tables from white's side, a8 first (Michniewski's simplified evaluation) */
  var T = {};
  T[P] = [0, 0, 0, 0, 0, 0, 0, 0, 50, 50, 50, 50, 50, 50, 50, 50, 10, 10, 20, 30, 30, 20, 10, 10, 5, 5, 10, 25, 25, 10, 5, 5, 0, 0, 0, 20, 20, 0, 0, 0, 5, -5, -10, 0, 0, -10, -5, 5, 5, 10, 10, -20, -20, 10, 10, 5, 0, 0, 0, 0, 0, 0, 0, 0];
  T[N] = [-50, -40, -30, -30, -30, -30, -40, -50, -40, -20, 0, 0, 0, 0, -20, -40, -30, 0, 10, 15, 15, 10, 0, -30, -30, 5, 15, 20, 20, 15, 5, -30, -30, 0, 15, 20, 20, 15, 0, -30, -30, 5, 10, 15, 15, 10, 5, -30, -40, -20, 0, 5, 5, 0, -20, -40, -50, -40, -30, -30, -30, -30, -40, -50];
  T[B] = [-20, -10, -10, -10, -10, -10, -10, -20, -10, 0, 0, 0, 0, 0, 0, -10, -10, 0, 5, 10, 10, 5, 0, -10, -10, 5, 5, 10, 10, 5, 5, -10, -10, 0, 10, 10, 10, 10, 0, -10, -10, 10, 10, 10, 10, 10, 10, -10, -10, 5, 0, 0, 0, 0, 5, -10, -20, -10, -10, -10, -10, -10, -10, -20];
  T[R] = [0, 0, 0, 0, 0, 0, 0, 0, 5, 10, 10, 10, 10, 10, 10, 5, -5, 0, 0, 0, 0, 0, 0, -5, -5, 0, 0, 0, 0, 0, 0, -5, -5, 0, 0, 0, 0, 0, 0, -5, -5, 0, 0, 0, 0, 0, 0, -5, -5, 0, 0, 0, 0, 0, 0, -5, 0, 0, 0, 5, 5, 0, 0, 0];
  T[Q] = [-20, -10, -10, -5, -5, -10, -10, -20, -10, 0, 0, 0, 0, 0, 0, -10, -10, 0, 5, 5, 5, 5, 0, -10, -5, 0, 5, 5, 5, 5, 0, -5, 0, 0, 5, 5, 5, 5, 0, -5, -10, 5, 5, 5, 5, 5, 0, -10, -10, 0, 5, 0, 0, 0, 0, -10, -20, -10, -10, -5, -5, -10, -10, -20];
  var KMG = [-30, -40, -40, -50, -50, -40, -40, -30, -30, -40, -40, -50, -50, -40, -40, -30, -30, -40, -40, -50, -50, -40, -40, -30, -30, -40, -40, -50, -50, -40, -40, -30, -20, -30, -30, -40, -40, -30, -30, -20, -10, -20, -20, -20, -20, -20, -20, -10, 20, 20, 0, 0, 0, 0, 20, 20, 20, 30, 10, 0, 0, 10, 30, 20];
  var KEG = [-50, -40, -30, -20, -20, -30, -40, -50, -30, -20, -10, 0, 0, -10, -20, -30, -30, -10, 20, 30, 30, 20, -10, -30, -30, -10, 30, 40, 40, 30, -10, -30, -30, -10, 30, 40, 40, 30, -10, -30, -30, -10, 20, 30, 30, 20, -10, -30, -30, -30, 0, 0, 0, 0, -30, -30, -50, -30, -30, -30, -30, -30, -30, -50];
  /* passed-pawn bonus by rank from the pawn's own side, endgame-weighted */
  var PASS = [0, 5, 10, 20, 35, 60, 100, 0];
  var LET = { p: P, n: N, b: B, r: R, q: Q, k: K };
  var CH = ['', 'p', 'n', 'b', 'r', 'q', 'k'];

  /* zobrist keys: two 32-bit halves */
  var seed = 0x2545f491;
  function rnd() { seed ^= seed << 13; seed ^= seed >>> 17; seed ^= seed << 5; return seed >>> 0; }
  var ZP = [], ZP2 = [];
  for (var i = 0; i < 13 * 128; i++) { ZP.push(rnd()); ZP2.push(rnd()); }
  var ZS = rnd(), ZS2 = rnd(), ZC = [], ZC2 = [], ZE = [], ZE2 = [];
  for (i = 0; i < 16; i++) { ZC.push(rnd()); ZC2.push(rnd()); }
  for (i = 0; i < 128; i++) { ZE.push(rnd()); ZE2.push(rnd()); }
  var pidx = function (p) { return p + 6; };

  function sq64(s) { return (s >> 4) * 8 + (s & 7); }
  function sqName(s) { return 'abcdefgh'[s & 7] + ((s >> 4) + 1); }
  function sqOf(n) { return (n.charCodeAt(0) - 97) + (n.charCodeAt(1) - 49) * 16; }

  function Board() { this.b = new Int8Array(128); this.stack = []; this.hist = []; }
  Board.prototype.load = function (fen) {
    var parts = fen.trim().split(/\s+/), rows = parts[0].split('/'), b = this.b;
    b.fill(0); this.kings = [0, 0];
    for (var r = 0; r < 8; r++) {
      var f = 0, row = rows[r];
      for (var k = 0; k < row.length; k++) {
        var c = row[k];
        if (c >= '1' && c <= '8') { f += +c; continue; }
        var t = LET[c.toLowerCase()], s = (7 - r) * 16 + f, v = c === c.toLowerCase() ? -t : t;
        b[s] = v; if (t === K) this.kings[v > 0 ? 0 : 1] = s; f++;
      }
    }
    this.side = parts[1] === 'b' ? -1 : 1;
    var cs = parts[2] || '-'; this.castle = (cs.indexOf('K') >= 0 ? 1 : 0) | (cs.indexOf('Q') >= 0 ? 2 : 0) | (cs.indexOf('k') >= 0 ? 4 : 0) | (cs.indexOf('q') >= 0 ? 8 : 0);
    this.ep = parts[3] && parts[3] !== '-' ? sqOf(parts[3]) : -1;
    this.half = parseInt(parts[4] || '0', 10);
    this.stack.length = 0; this.hist.length = 0;
    this.rehash();
    return this;
  };
  Board.prototype.rehash = function () {
    var h = 0, h2 = 0, b = this.b;
    for (var s = 0; s < 128; s++) { if (s & 0x88) { s += 7; continue; } if (b[s]) { h ^= ZP[pidx(b[s]) * 128 + s]; h2 ^= ZP2[pidx(b[s]) * 128 + s]; } }
    if (this.side < 0) { h ^= ZS; h2 ^= ZS2; }
    h ^= ZC[this.castle]; h2 ^= ZC2[this.castle];
    if (this.ep >= 0) { h ^= ZE[this.ep]; h2 ^= ZE2[this.ep]; }
    this.h = h >>> 0; this.h2 = h2 >>> 0;
  };
  Board.prototype.attacked = function (s, by) {
    var b = this.b, t, d, i, x;
    /* pawns of `by` attack s from behind */
    if (by > 0) { x = s - 15; if (!(x & 0x88) && b[x] === P) return true; x = s - 17; if (!(x & 0x88) && b[x] === P) return true; }
    else { x = s + 15; if (!(x & 0x88) && b[x] === -P) return true; x = s + 17; if (!(x & 0x88) && b[x] === -P) return true; }
    for (i = 0; i < 8; i++) {
      x = s + KN[i]; if (!(x & 0x88) && b[x] === by * N) return true;
      x = s + KG[i]; if (!(x & 0x88) && b[x] === by * K) return true;
    }
    for (i = 0; i < 4; i++) {
      d = RD[i]; x = s + d;
      while (!(x & 0x88)) { t = b[x]; if (t) { if (t === by * R || t === by * Q) return true; break; } x += d; }
      d = BD[i]; x = s + d;
      while (!(x & 0x88)) { t = b[x]; if (t) { if (t === by * B || t === by * Q) return true; break; } x += d; }
    }
    return false;
  };
  Board.prototype.inCheck = function (side) { side = side || this.side; return this.attacked(this.kings[side > 0 ? 0 : 1], -side); };
  /* moves are ints: from | to << 7 | promo << 14 | flag << 17 ; flags: 1 double push, 2 ep, 3 castle */
  Board.prototype.gen = function (out, capsOnly) {
    var b = this.b, us = this.side, s, p, t, x, d, i, n = 0;
    for (s = 0; s < 128; s++) {
      if (s & 0x88) { s += 7; continue; }
      p = b[s]; if (!p || (p > 0) !== (us > 0)) continue;
      t = p > 0 ? p : -p;
      if (t === P) {
        var fw = us > 0 ? 16 : -16, start = us > 0 ? 1 : 6, last = us > 0 ? 7 : 0, rank = s >> 4;
        x = s + fw;
        if (!(x & 0x88) && !b[x]) {
          if ((x >> 4) === last) { out[n++] = s | x << 7 | Q << 14; if (!capsOnly) { out[n++] = s | x << 7 | N << 14; out[n++] = s | x << 7 | R << 14; out[n++] = s | x << 7 | B << 14; } }
          else if (!capsOnly) { out[n++] = s | x << 7; if (rank === start && !b[x + fw]) out[n++] = s | (x + fw) << 7 | 1 << 17; }
        }
        for (i = -1; i <= 1; i += 2) {
          x = s + fw + i; if (x & 0x88) continue;
          if (b[x] && (b[x] > 0) !== (us > 0)) {
            if ((x >> 4) === last) { out[n++] = s | x << 7 | Q << 14; if (!capsOnly) { out[n++] = s | x << 7 | N << 14; out[n++] = s | x << 7 | R << 14; out[n++] = s | x << 7 | B << 14; } }
            else out[n++] = s | x << 7;
          } else if (x === this.ep) out[n++] = s | x << 7 | 2 << 17;
        }
      } else if (t === N || t === K) {
        var offs = t === N ? KN : KG;
        for (i = 0; i < 8; i++) {
          x = s + offs[i]; if (x & 0x88) continue;
          if (!b[x]) { if (!capsOnly) out[n++] = s | x << 7; }
          else if ((b[x] > 0) !== (us > 0)) out[n++] = s | x << 7;
        }
      } else {
        var dirs = t === B ? BD : t === R ? RD : KG;
        for (i = 0; i < dirs.length; i++) {
          d = dirs[i]; x = s + d;
          while (!(x & 0x88)) {
            if (!b[x]) { if (!capsOnly) out[n++] = s | x << 7; }
            else { if ((b[x] > 0) !== (us > 0)) out[n++] = s | x << 7; break; }
            x += d;
          }
        }
      }
    }
    if (!capsOnly) {
      if (us > 0) {
        if ((this.castle & 1) && b[4] === K && b[7] === R && !b[5] && !b[6] && !this.attacked(4, -1) && !this.attacked(5, -1) && !this.attacked(6, -1)) out[n++] = 4 | 6 << 7 | 3 << 17;
        if ((this.castle & 2) && b[4] === K && b[0] === R && !b[1] && !b[2] && !b[3] && !this.attacked(4, -1) && !this.attacked(3, -1) && !this.attacked(2, -1)) out[n++] = 4 | 2 << 7 | 3 << 17;
      } else {
        if ((this.castle & 4) && b[116] === -K && b[119] === -R && !b[117] && !b[118] && !this.attacked(116, 1) && !this.attacked(117, 1) && !this.attacked(118, 1)) out[n++] = 116 | 118 << 7 | 3 << 17;
        if ((this.castle & 8) && b[116] === -K && b[112] === -R && !b[113] && !b[114] && !b[115] && !this.attacked(116, 1) && !this.attacked(115, 1) && !this.attacked(114, 1)) out[n++] = 116 | 114 << 7 | 3 << 17;
      }
    }
    return n;
  };
  var CR = new Int8Array(128).fill(15);
  CR[0] = 13; CR[4] = 12; CR[7] = 14; CR[112] = 7; CR[116] = 3; CR[119] = 11;
  Board.prototype.xorp = function (p, s) { this.h = (this.h ^ ZP[pidx(p) * 128 + s]) >>> 0; this.h2 = (this.h2 ^ ZP2[pidx(p) * 128 + s]) >>> 0; };
  /* returns false (and undoes itself) when the move leaves its own king in check */
  Board.prototype.make = function (m) {
    var b = this.b, f = m & 127, t = (m >> 7) & 127, pr = (m >> 14) & 7, fl = m >> 17, us = this.side, p = b[f], cap = b[t];
    this.stack.push({ m: m, cap: cap, castle: this.castle, ep: this.ep, half: this.half, h: this.h, h2: this.h2 });
    this.hist.push(this.h);
    this.xorp(p, f); if (cap) this.xorp(cap, t);
    b[t] = pr ? us * pr : p; b[f] = 0; this.xorp(b[t], t);
    if (fl === 2) { var cs = t - (us > 0 ? 16 : -16); this.stack[this.stack.length - 1].epCap = b[cs]; this.xorp(b[cs], cs); b[cs] = 0; }
    else if (fl === 3) {
      var rf, rt; if (t === 6) { rf = 7; rt = 5; } else if (t === 2) { rf = 0; rt = 3; } else if (t === 118) { rf = 119; rt = 117; } else { rf = 112; rt = 115; }
      this.xorp(b[rf], rf); b[rt] = b[rf]; b[rf] = 0; this.xorp(b[rt], rt);
    }
    if (p === K) this.kings[0] = t; else if (p === -K) this.kings[1] = t;
    this.h = (this.h ^ ZC[this.castle]) >>> 0; this.h2 = (this.h2 ^ ZC2[this.castle]) >>> 0;
    this.castle &= CR[f] & CR[t];
    this.h = (this.h ^ ZC[this.castle]) >>> 0; this.h2 = (this.h2 ^ ZC2[this.castle]) >>> 0;
    if (this.ep >= 0) { this.h = (this.h ^ ZE[this.ep]) >>> 0; this.h2 = (this.h2 ^ ZE2[this.ep]) >>> 0; }
    this.ep = fl === 1 ? (f + t) >> 1 : -1;
    if (this.ep >= 0) { this.h = (this.h ^ ZE[this.ep]) >>> 0; this.h2 = (this.h2 ^ ZE2[this.ep]) >>> 0; }
    this.half = (p === P || p === -P || cap || fl === 2) ? 0 : this.half + 1;
    this.side = -us; this.h = (this.h ^ ZS) >>> 0; this.h2 = (this.h2 ^ ZS2) >>> 0;
    if (this.attacked(this.kings[us > 0 ? 0 : 1], -us)) { this.unmake(); return false; }
    return true;
  };
  Board.prototype.unmake = function () {
    var u = this.stack.pop(); this.hist.pop();
    var b = this.b, m = u.m, f = m & 127, t = (m >> 7) & 127, pr = (m >> 14) & 7, fl = m >> 17;
    this.side = -this.side; var us = this.side;
    var p = pr ? us * P : b[t];
    b[f] = p; b[t] = u.cap;
    if (fl === 2) b[t - (us > 0 ? 16 : -16)] = u.epCap;
    else if (fl === 3) {
      if (t === 6) { b[7] = b[5]; b[5] = 0; } else if (t === 2) { b[0] = b[3]; b[3] = 0; } else if (t === 118) { b[119] = b[117]; b[117] = 0; } else { b[112] = b[115]; b[115] = 0; }
    }
    if (p === K) this.kings[0] = f; else if (p === -K) this.kings[1] = f;
    this.castle = u.castle; this.ep = u.ep; this.half = u.half; this.h = u.h; this.h2 = u.h2;
  };
  Board.prototype.legal = function () {
    var buf = new Int32Array(256), n = this.gen(buf, false), out = [];
    for (var i = 0; i < n; i++) if (this.make(buf[i])) { this.unmake(); out.push(buf[i]); }
    return out;
  };
  Board.prototype.perft = function (d) {
    if (!d) return 1;
    var buf = new Int32Array(256), n = this.gen(buf, false), c = 0;
    for (var i = 0; i < n; i++) if (this.make(buf[i])) { c += this.perft(d - 1); this.unmake(); }
    return c;
  };
  function uci(m) { var pr = (m >> 14) & 7; return sqName(m & 127) + sqName((m >> 7) & 127) + (pr ? CH[pr] : ''); }

  /* ---------- evaluation, from the side to move ---------- */
  function evaluate(bd) {
    var b = bd.b, mg = 0, eg = 0, phase = 0, s, p, t, i64, mat = [0, 0], pawnFiles = [new Int8Array(8), new Int8Array(8)];
    var pawns = [];
    for (s = 0; s < 128; s++) {
      if (s & 0x88) { s += 7; continue; }
      p = b[s]; if (!p) continue;
      t = p > 0 ? p : -p;
      i64 = p > 0 ? (7 - (s >> 4)) * 8 + (s & 7) : (s >> 4) * 8 + (s & 7);
      var sg = p > 0 ? 1 : -1;
      phase += PHASE[t];
      if (t === K) { mg += sg * KMG[i64]; eg += sg * KEG[i64]; continue; }
      mat[p > 0 ? 0 : 1] += VAL[t];
      mg += sg * (VAL[t] + T[t][i64]);
      eg += sg * (VAL[t] + (t === P ? T[t][i64] >> 1 : T[t][i64]));
      if (t === P) { pawnFiles[p > 0 ? 0 : 1][s & 7]++; pawns.push(s); }
    }
    /* pawn structure: doubled and isolated pawns, passed pawns */
    for (var k = 0; k < pawns.length; k++) {
      s = pawns[k]; p = b[s]; var c = p > 0 ? 0 : 1, sgn = p > 0 ? 1 : -1, f = s & 7, r = s >> 4;
      if (pawnFiles[c][f] > 1) { mg -= sgn * 8; eg -= sgn * 14; }
      if ((f === 0 || !pawnFiles[c][f - 1]) && (f === 7 || !pawnFiles[c][f + 1])) { mg -= sgn * 10; eg -= sgn * 12; }
      var passed = true;
      for (var df = -1; df <= 1 && passed; df++) {
        var ff = f + df; if (ff < 0 || ff > 7) continue;
        for (var rr = r + sgn; rr >= 0 && rr <= 7; rr += sgn) { if (b[rr * 16 + ff] === -p) { passed = false; break; } }
      }
      if (passed) { var rel = p > 0 ? r : 7 - r; mg += sgn * (PASS[rel] >> 1); eg += sgn * PASS[rel] * 2; }
    }
    if (phase > 24) phase = 24;
    var sc = ((mg * phase) + (eg * (24 - phase))) / 24;
    /* mop-up: with a clear material edge in a thin position, drive the other king to the edge and come close */
    var diff = mat[0] - mat[1];
    if (phase <= 10 && Math.abs(diff) >= 300) {
      var win = diff > 0 ? 0 : 1, wk = bd.kings[win], lk = bd.kings[1 - win];
      var lf = lk & 7, lr = lk >> 4, cd = Math.max(3 - lf, lf - 4) + Math.max(3 - lr, lr - 4);
      var kd = Math.abs((wk & 7) - lf) + Math.abs((wk >> 4) - lr);
      var mop = cd * 12 + (14 - kd) * 5;
      sc += win === 0 ? mop : -mop;
    }
    return (sc | 0) * bd.side;
  }

  /* ---------- search ---------- */
  var TTSIZE = 1 << 18, TTM = TTSIZE - 1;
  var ttKey = new Int32Array(TTSIZE), ttMove = new Int32Array(TTSIZE), ttDepth = new Int8Array(TTSIZE), ttScore = new Int32Array(TTSIZE), ttFlag = new Int8Array(TTSIZE);
  var MAXPLY = 64;
  var killers = new Int32Array(MAXPLY * 2), histT = new Int32Array(128 * 128);
  var nodes = 0, stopAt = 0, stopped = false, rootHist = null;

  function mvvlva(b, m) {
    var t = (m >> 7) & 127, cap = b[t], fl = m >> 17, pr = (m >> 14) & 7;
    var v = cap ? Math.abs(cap) : (fl === 2 ? P : 0);
    return (v ? 1e6 + v * 100 - Math.abs(b[m & 127]) : 0) + (pr === Q ? 9e5 : 0);
  }
  function order(bd, buf, n, ply, ttm) {
    var sc = new Int32Array(n), b = bd.b;
    for (var i = 0; i < n; i++) {
      var m = buf[i];
      if (m === ttm) sc[i] = 2e9;
      else { var c = mvvlva(b, m); sc[i] = c ? c : (m === killers[ply * 2] ? 8e5 : m === killers[ply * 2 + 1] ? 7e5 : histT[(m & 127) * 128 + ((m >> 7) & 127)]); }
    }
    /* insertion sort, moves are few */
    for (i = 1; i < n; i++) { var x = buf[i], y = sc[i], j = i - 1; while (j >= 0 && sc[j] < y) { buf[j + 1] = buf[j]; sc[j + 1] = sc[j]; j--; } buf[j + 1] = x; sc[j + 1] = y; }
  }
  function repeated(bd) {
    var h = bd.h, lim = bd.half, hs = bd.hist;
    for (var i = hs.length - 2, k = 2; i >= 0 && k <= lim; i -= 2, k += 2) if (hs[i] === h) return true;
    if (rootHist) for (var j = rootHist.length - 1, c = 0; j >= 0 && c < lim; j--, c++) if (rootHist[j] === h) return true;
    return false;
  }
  function quiesce(bd, alpha, beta, ply) {
    nodes++;
    if ((nodes & 2047) === 0 && Date.now() > stopAt) stopped = true;
    if (stopped) return 0;
    var stand = evaluate(bd);
    if (stand >= beta) return stand;
    if (stand > alpha) alpha = stand;
    if (ply >= MAXPLY - 1) return stand;
    var buf = new Int32Array(64), n = bd.gen(buf, true);
    order(bd, buf, n, ply, 0);
    for (var i = 0; i < n; i++) {
      var m = buf[i], cap = bd.b[(m >> 7) & 127];
      if (cap && stand + VAL[Math.abs(cap)] + 200 < alpha && !((m >> 14) & 7)) continue;
      if (!bd.make(m)) continue;
      var s = -quiesce(bd, -beta, -alpha, ply + 1);
      bd.unmake();
      if (stopped) return 0;
      if (s >= beta) return s;
      if (s > alpha) alpha = s;
    }
    return alpha;
  }
  function absearch(bd, depth, alpha, beta, ply) {
    if (ply && (bd.half >= 100 || repeated(bd))) return 0;
    var chk = bd.inCheck();
    if (chk && ply < 20) depth++;
    if (depth <= 0) return quiesce(bd, alpha, beta, ply);
    nodes++;
    if ((nodes & 2047) === 0 && Date.now() > stopAt) stopped = true;
    if (stopped) return 0;
    var idx = bd.h & TTM, ttm = 0, a0 = alpha;
    if (ttKey[idx] === (bd.h2 | 0)) {
      ttm = ttMove[idx];
      if (ply && ttDepth[idx] >= depth) {
        var ts = ttScore[idx], fl = ttFlag[idx];
        if (fl === 0) return ts;
        if (fl === 1 && ts >= beta) return ts;
        if (fl === 2 && ts <= alpha) return ts;
      }
    }
    var buf = new Int32Array(256), n = bd.gen(buf, false);
    order(bd, buf, n, ply, ttm);
    var best = -INF, bestM = 0, legal = 0;
    for (var i = 0; i < n; i++) {
      var m = buf[i];
      if (!bd.make(m)) continue;
      legal++;
      var s;
      if (legal === 1) s = -absearch(bd, depth - 1, -beta, -alpha, ply + 1);
      else {
        s = -absearch(bd, depth - 1, -alpha - 1, -alpha, ply + 1);
        if (s > alpha && s < beta) s = -absearch(bd, depth - 1, -beta, -alpha, ply + 1);
      }
      bd.unmake();
      if (stopped) return 0;
      if (s > best) { best = s; bestM = m; }
      if (s > alpha) alpha = s;
      if (alpha >= beta) {
        if (!bd.b[(m >> 7) & 127] && !((m >> 14) & 7)) {
          if (killers[ply * 2] !== m) { killers[ply * 2 + 1] = killers[ply * 2]; killers[ply * 2] = m; }
          histT[(m & 127) * 128 + ((m >> 7) & 127)] += depth * depth;
        }
        break;
      }
    }
    if (!legal) return chk ? -MATE + ply : 0;
    ttKey[idx] = bd.h2 | 0; ttMove[idx] = bestM; ttDepth[idx] = depth; ttScore[idx] = best;
    ttFlag[idx] = best <= a0 ? 2 : best >= beta ? 1 : 0;
    return best;
  }

  /* root: every legal move with a score (full window), so a level can play a softer move on purpose */
  function rootScores(bd, depth) {
    var moves = bd.legal(), out = [];
    for (var i = 0; i < moves.length; i++) {
      bd.make(moves[i]);
      var s = -absearch(bd, depth - 1, -INF, INF, 1);
      bd.unmake();
      if (stopped) break;
      out.push({ m: moves[i], s: s });
    }
    return out;
  }
  function bestAt(bd, depth, prevBest) {
    var moves = bd.legal();
    if (prevBest) { var k = moves.indexOf(prevBest); if (k > 0) { moves.splice(k, 1); moves.unshift(prevBest); } }
    var alpha = -INF, best = moves[0], bs = -INF;
    for (var i = 0; i < moves.length; i++) {
      bd.make(moves[i]);
      var s = i === 0 ? -absearch(bd, depth - 1, -INF, -alpha, 1) : -absearch(bd, depth - 1, -alpha - 1, -alpha, 1);
      if (i && s > alpha && !stopped) s = -absearch(bd, depth - 1, -INF, -alpha, 1);
      bd.unmake();
      if (stopped) break;
      if (s > bs) { bs = s; best = moves[i]; }
      if (s > alpha) alpha = s;
    }
    return { m: best, s: bs };
  }
  function gauss() { var u = 1 - Math.random(), v = Math.random(); return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v); }

  /* opts: { depth, ms, noise (centipawns), careless (0..1 chance of a softer move), margin (how soft, cp), history: [fen...] } */
  function think(fen, opts) {
    opts = opts || {};
    var bd = new Board().load(fen), depth = opts.depth || 3, ms = opts.ms || 1200;
    nodes = 0; stopped = false; stopAt = Date.now() + ms;
    killers.fill(0); histT.fill(0);
    rootHist = (opts.history || []).map(function (f) { var x = new Board().load(f); return x.h; });
    var legal = bd.legal();
    if (!legal.length) return null;
    if (legal.length === 1) return { uci: uci(legal[0]), score: 0, depth: 0, nodes: 0 };
    var soft = (opts.noise || 0) > 0 || (opts.careless || 0) > 0;
    var result = null, d;
    if (!soft) {
      var prev = 0;
      for (d = 1; d <= depth; d++) {
        var r = bestAt(bd, d, prev);
        if (stopped && result) break;
        result = { m: r.m, s: r.s, d: d }; prev = r.m;
        if (Math.abs(r.s) > MATE - 100) break;
      }
      return { uci: uci(result.m), score: result.s, depth: result.d, nodes: nodes };
    }
    /* softer levels: score every root move, then choose like a person at that level would */
    var scored = null;
    for (d = 1; d <= depth; d++) {
      var sc = rootScores(bd, d);
      if (stopped && scored) break;
      if (sc.length === legal.length || !scored) scored = sc;
      if (stopped) break;
    }
    scored.sort(function (a, b) { return b.s - a.s; });
    var top = scored[0], pick = top;
    /* never miss a mate in one from level 3 up, never walk into a mate in one from level 5 up */
    var mateNow = top.s > MATE - 10;
    if (!(mateNow && opts.seesMate)) {
      if (Math.random() < (opts.careless || 0)) {
        var margin = opts.margin || 250, pool = scored.filter(function (x) { return x.s >= top.s - margin && (!opts.avoidMate || x.s > -MATE + 10); });
        if (pool.length) pick = pool[Math.floor(Math.random() * pool.length)];
      } else if (opts.noise) {
        var bestN = -INF;
        scored.forEach(function (x) { if (opts.avoidMate && x.s < -MATE + 10 && top.s > -MATE + 10) return; var v = x.s + gauss() * opts.noise; if (v > bestN) { bestN = v; pick = x; } });
      }
    }
    return { uci: uci(pick.m), score: pick.s, depth: d - 1, nodes: nodes };
  }

  var api = { think: think, Board: Board, uci: uci, evaluate: evaluate };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.BotEngine = api;
  /* inside a worker: answer {id, fen, opts} with {id, move} */
  if (typeof WorkerGlobalScope !== 'undefined' && root instanceof WorkerGlobalScope) {
    root.onmessage = function (e) { var d = e.data; var r = null; try { r = think(d.fen, d.opts); } catch (err) { r = { error: String(err) }; } root.postMessage({ id: d.id, res: r }); };
  }
})(typeof self !== 'undefined' ? self : this);
