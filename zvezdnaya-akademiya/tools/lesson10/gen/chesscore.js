/* Mini chess core: legal moves, SAN (EN/RU), FEN. Written for this lesson page. */
(function (root) {
  'use strict';
  var FILES = 'abcdefgh';
  var START = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1';
  var KN = [[1,2],[2,1],[2,-1],[1,-2],[-1,-2],[-2,-1],[-2,1],[-1,2]];
  var KG = [[1,0],[1,1],[0,1],[-1,1],[-1,0],[-1,-1],[0,-1],[1,-1]];
  var BD = [[1,1],[1,-1],[-1,1],[-1,-1]];
  var RD = [[1,0],[-1,0],[0,1],[0,-1]];
  function sqName(i) { return FILES[i & 7] + ((i >> 3) + 1); }
  function sqIndex(s) { return (s.charCodeAt(0) - 97) + (parseInt(s[1], 10) - 1) * 8; }
  function colorOf(p) { return p ? (p === p.toUpperCase() ? 'w' : 'b') : null; }
  function on(f, r) { return f >= 0 && f < 8 && r >= 0 && r < 8; }

  function Position(fen) { this.load(fen || START); }
  Position.prototype.load = function (fen) {
    var parts = fen.trim().split(/\s+/);
    var rows = parts[0].split('/');
    if (rows.length !== 8) throw new Error('Bad FEN: ' + fen);
    this.board = new Array(64).fill('');
    for (var r = 0; r < 8; r++) {
      var f = 0;
      for (var k = 0; k < rows[r].length; k++) {
        var ch = rows[r][k];
        if (ch >= '1' && ch <= '8') f += +ch;
        else { this.board[(7 - r) * 8 + f] = ch; f++; }
      }
      if (f !== 8) throw new Error('Bad FEN row: ' + rows[r]);
    }
    this.turn = parts[1] || 'w';
    this.castling = parts[2] && parts[2] !== '-' ? parts[2] : '';
    this.ep = parts[3] && parts[3] !== '-' ? sqIndex(parts[3]) : -1;
    this.half = parseInt(parts[4] || '0', 10);
    this.full = parseInt(parts[5] || '1', 10);
    this.hist = [];
    return this;
  };
  Position.prototype.clone = function () { return new Position(this.fen()); };
  Position.prototype.fen = function () {
    var s = '';
    for (var r = 7; r >= 0; r--) {
      var e = 0;
      for (var f = 0; f < 8; f++) {
        var p = this.board[r * 8 + f];
        if (!p) e++; else { if (e) { s += e; e = 0; } s += p; }
      }
      if (e) s += e;
      if (r) s += '/';
    }
    return s + ' ' + this.turn + ' ' + (this.castling || '-') + ' ' + (this.ep >= 0 ? sqName(this.ep) : '-') + ' ' + this.half + ' ' + this.full;
  };
  Position.prototype.get = function (sq) { return this.board[typeof sq === 'string' ? sqIndex(sq) : sq]; };
  Position.prototype.kingSq = function (c) {
    var k = c === 'w' ? 'K' : 'k';
    for (var i = 0; i < 64; i++) if (this.board[i] === k) return i;
    return -1;
  };
  Position.prototype.attacked = function (sq, by) {
    var b = this.board, f = sq & 7, r = sq >> 3, i, d, ff, rr, p;
    var W = by === 'w';
    // pawns
    var pr = W ? r - 1 : r + 1, pp = W ? 'P' : 'p';
    if (on(f - 1, pr) && b[pr * 8 + f - 1] === pp) return true;
    if (on(f + 1, pr) && b[pr * 8 + f + 1] === pp) return true;
    var n = W ? 'N' : 'n', kk = W ? 'K' : 'k';
    for (i = 0; i < 8; i++) {
      ff = f + KN[i][0]; rr = r + KN[i][1];
      if (on(ff, rr) && b[rr * 8 + ff] === n) return true;
      ff = f + KG[i][0]; rr = r + KG[i][1];
      if (on(ff, rr) && b[rr * 8 + ff] === kk) return true;
    }
    var q = W ? 'Q' : 'q', rk = W ? 'R' : 'r', bs = W ? 'B' : 'b';
    for (i = 0; i < 4; i++) {
      d = RD[i]; ff = f + d[0]; rr = r + d[1];
      while (on(ff, rr)) { p = b[rr * 8 + ff]; if (p) { if (p === q || p === rk) return true; break; } ff += d[0]; rr += d[1]; }
      d = BD[i]; ff = f + d[0]; rr = r + d[1];
      while (on(ff, rr)) { p = b[rr * 8 + ff]; if (p) { if (p === q || p === bs) return true; break; } ff += d[0]; rr += d[1]; }
    }
    return false;
  };
  Position.prototype.inCheck = function (c) {
    c = c || this.turn;
    var k = this.kingSq(c);
    return k >= 0 && this.attacked(k, c === 'w' ? 'b' : 'w');
  };
  Position.prototype.pseudo = function () {
    var mv = [], b = this.board, us = this.turn, them = us === 'w' ? 'b' : 'w';
    var s, p, t, f, r, i, d, ff, rr, to, q;
    function pawnAdd(from, to, pc, cap) {
      if ((to >> 3) === 7 || (to >> 3) === 0) {
        ['q', 'r', 'b', 'n'].forEach(function (pr) { mv.push({ from: from, to: to, piece: pc, captured: cap || '', promotion: pr, flags: cap ? 'cp' : 'p' }); });
      } else mv.push({ from: from, to: to, piece: pc, captured: cap || '', flags: cap ? 'c' : 'n' });
    }
    for (s = 0; s < 64; s++) {
      p = b[s]; if (!p || colorOf(p) !== us) continue;
      t = p.toLowerCase(); f = s & 7; r = s >> 3;
      if (t === 'p') {
        var dir = us === 'w' ? 1 : -1, r1 = r + dir;
        if (r1 < 0 || r1 > 7) continue;
        to = r1 * 8 + f;
        if (!b[to]) {
          pawnAdd(s, to, p, '');
          if (r === (us === 'w' ? 1 : 6) && !b[(r + 2 * dir) * 8 + f]) mv.push({ from: s, to: (r + 2 * dir) * 8 + f, piece: p, captured: '', flags: 'b' });
        }
        for (var df = -1; df <= 1; df += 2) {
          ff = f + df; if (ff < 0 || ff > 7) continue;
          to = r1 * 8 + ff; q = b[to];
          if (q && colorOf(q) === them) pawnAdd(s, to, p, q);
          else if (!q && to === this.ep) mv.push({ from: s, to: to, piece: p, captured: us === 'w' ? 'p' : 'P', flags: 'e' });
        }
      } else if (t === 'n' || t === 'k') {
        var offs = t === 'n' ? KN : KG;
        for (i = 0; i < 8; i++) {
          ff = f + offs[i][0]; rr = r + offs[i][1];
          if (!on(ff, rr)) continue;
          to = rr * 8 + ff; q = b[to];
          if (!q) mv.push({ from: s, to: to, piece: p, captured: '', flags: 'n' });
          else if (colorOf(q) === them) mv.push({ from: s, to: to, piece: p, captured: q, flags: 'c' });
        }
      } else {
        var dirs = t === 'b' ? BD : t === 'r' ? RD : BD.concat(RD);
        for (i = 0; i < dirs.length; i++) {
          d = dirs[i]; ff = f + d[0]; rr = r + d[1];
          while (on(ff, rr)) {
            to = rr * 8 + ff; q = b[to];
            if (!q) mv.push({ from: s, to: to, piece: p, captured: '', flags: 'n' });
            else { if (colorOf(q) === them) mv.push({ from: s, to: to, piece: p, captured: q, flags: 'c' }); break; }
            ff += d[0]; rr += d[1];
          }
        }
      }
    }
    // castling
    var c = this.castling;
    if (us === 'w') {
      if (c.indexOf('K') >= 0 && b[4] === 'K' && b[7] === 'R' && !b[5] && !b[6] && !this.attacked(4, 'b') && !this.attacked(5, 'b') && !this.attacked(6, 'b'))
        mv.push({ from: 4, to: 6, piece: 'K', captured: '', flags: 'k' });
      if (c.indexOf('Q') >= 0 && b[4] === 'K' && b[0] === 'R' && !b[1] && !b[2] && !b[3] && !this.attacked(4, 'b') && !this.attacked(3, 'b') && !this.attacked(2, 'b'))
        mv.push({ from: 4, to: 2, piece: 'K', captured: '', flags: 'q' });
    } else {
      if (c.indexOf('k') >= 0 && b[60] === 'k' && b[63] === 'r' && !b[61] && !b[62] && !this.attacked(60, 'w') && !this.attacked(61, 'w') && !this.attacked(62, 'w'))
        mv.push({ from: 60, to: 62, piece: 'k', captured: '', flags: 'k' });
      if (c.indexOf('q') >= 0 && b[60] === 'k' && b[56] === 'r' && !b[57] && !b[58] && !b[59] && !this.attacked(60, 'w') && !this.attacked(59, 'w') && !this.attacked(58, 'w'))
        mv.push({ from: 60, to: 58, piece: 'k', captured: '', flags: 'q' });
    }
    return mv;
  };
  Position.prototype.make = function (m) {
    var b = this.board, us = this.turn;
    var u = { m: m, castling: this.castling, ep: this.ep, half: this.half, full: this.full, cap: b[m.to], epSq: -1 };
    b[m.to] = m.promotion ? (us === 'w' ? m.promotion.toUpperCase() : m.promotion) : b[m.from];
    b[m.from] = '';
    if (m.flags === 'e') { u.epSq = m.to + (us === 'w' ? -8 : 8); b[u.epSq] = ''; }
    if (m.flags === 'k') { if (us === 'w') { b[5] = b[7]; b[7] = ''; } else { b[61] = b[63]; b[63] = ''; } }
    if (m.flags === 'q') { if (us === 'w') { b[3] = b[0]; b[0] = ''; } else { b[59] = b[56]; b[56] = ''; } }
    var c = this.castling;
    if (m.piece === 'K') c = c.replace('K', '').replace('Q', '');
    if (m.piece === 'k') c = c.replace('k', '').replace('q', '');
    [m.from, m.to].forEach(function (sq) {
      if (sq === 0) c = c.replace('Q', ''); if (sq === 7) c = c.replace('K', '');
      if (sq === 56) c = c.replace('q', ''); if (sq === 63) c = c.replace('k', '');
    });
    this.castling = c;
    this.ep = m.flags === 'b' ? (m.from + m.to) >> 1 : -1;
    this.half = (m.piece === 'P' || m.piece === 'p' || u.cap || m.flags === 'e') ? 0 : this.half + 1;
    if (us === 'b') this.full++;
    this.turn = us === 'w' ? 'b' : 'w';
    this.hist.push(u);
  };
  Position.prototype.unmake = function () {
    var u = this.hist.pop(); if (!u) return null;
    var m = u.m, b = this.board;
    this.turn = this.turn === 'w' ? 'b' : 'w';
    var us = this.turn;
    b[m.from] = m.piece; b[m.to] = u.cap;
    if (m.flags === 'e') b[u.epSq] = us === 'w' ? 'p' : 'P';
    if (m.flags === 'k') { if (us === 'w') { b[7] = b[5]; b[5] = ''; } else { b[63] = b[61]; b[61] = ''; } }
    if (m.flags === 'q') { if (us === 'w') { b[0] = b[3]; b[3] = ''; } else { b[56] = b[59]; b[59] = ''; } }
    this.castling = u.castling; this.ep = u.ep; this.half = u.half; this.full = u.full;
    return m;
  };
  Position.prototype.moves = function () {
    var us = this.turn, them = us === 'w' ? 'b' : 'w', out = [], ps = this.pseudo();
    for (var i = 0; i < ps.length; i++) {
      this.make(ps[i]);
      var k = this.kingSq(us);
      if (k >= 0 && !this.attacked(k, them)) out.push(ps[i]);
      this.unmake();
    }
    return out;
  };
  Position.prototype.status = function () {
    var n = this.moves().length, chk = this.inCheck();
    if (n === 0) return chk ? 'mate' : 'stalemate';
    return chk ? 'check' : 'normal';
  };
  Position.prototype.san = function (m, legal) {
    legal = legal || this.moves();
    var s;
    if (m.flags === 'k') s = 'O-O';
    else if (m.flags === 'q') s = 'O-O-O';
    else {
      var T = m.piece.toUpperCase();
      if (T === 'P') {
        s = (m.captured ? FILES[m.from & 7] + 'x' : '') + sqName(m.to);
        if (m.promotion) s += '=' + m.promotion.toUpperCase();
      } else {
        var others = legal.filter(function (o) { return o.piece === m.piece && o.to === m.to && o.from !== m.from; });
        var dis = '';
        if (others.length) {
          var sameFile = others.some(function (o) { return (o.from & 7) === (m.from & 7); });
          var sameRank = others.some(function (o) { return (o.from >> 3) === (m.from >> 3); });
          if (!sameFile) dis = FILES[m.from & 7];
          else if (!sameRank) dis = String((m.from >> 3) + 1);
          else dis = sqName(m.from);
        }
        s = T + dis + (m.captured ? 'x' : '') + sqName(m.to);
      }
    }
    this.make(m);
    var st = this.status();
    this.unmake();
    if (st === 'mate') s += '#'; else if (st === 'check') s += '+';
    return s;
  };
  function normSan(s) {
    return String(s).replace(/[+#!?\s]/g, '').replace(/0/g, 'O').replace(/^([a-h][18])([QRBN])$/, '$1=$2').replace(/^([a-h]x[a-h][18])([QRBN])$/, '$1=$2');
  }
  Position.prototype.findMove = function (x) {
    var legal = this.moves(), i;
    if (typeof x === 'object') {
      for (i = 0; i < legal.length; i++) {
        var m = legal[i];
        if (m.from === x.from && m.to === x.to && (m.promotion || '') === (x.promotion || '')) return m;
      }
      return null;
    }
    var str = String(x).trim();
    if (/^[a-h][1-8][a-h][1-8][qrbn]?$/.test(str)) {
      return this.findMove({ from: sqIndex(str.slice(0, 2)), to: sqIndex(str.slice(2, 4)), promotion: str[4] || '' });
    }
    var want = normSan(str);
    for (i = 0; i < legal.length; i++) if (normSan(this.san(legal[i], legal)) === want) return legal[i];
    return null;
  };
  Position.prototype.play = function (x) {
    var m = this.findMove(x);
    if (!m) return null;
    var s = this.san(m);
    this.make(m);
    return { from: m.from, to: m.to, piece: m.piece, captured: m.captured, promotion: m.promotion || '', flags: m.flags, san: s, uci: sqName(m.from) + sqName(m.to) + (m.promotion || '') };
  };
  Position.prototype.perft = function (d) {
    if (d === 0) return 1;
    var ms = this.moves(), n = 0;
    if (d === 1) return ms.length;
    for (var i = 0; i < ms.length; i++) { this.make(ms[i]); n += this.perft(d - 1); this.unmake(); }
    return n;
  };
  var RU = { K: 'Кр', Q: 'Ф', R: 'Л', B: 'С', N: 'К' };
  function sanToRu(s) {
    if (!s) return s;
    if (s.indexOf('O-O') === 0) return s.replace(/O/g, '0');
    return s.replace(/^([KQRBN])/, function (a) { return RU[a]; })
            .replace('x', ':')
            .replace(/=([QRBN])/, function (a, p) { return RU[p]; });
  }
  var api = { Position: Position, sqName: sqName, sqIndex: sqIndex, colorOf: colorOf, sanToRu: sanToRu, START: START };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.ChessCore = api;
})(this);
