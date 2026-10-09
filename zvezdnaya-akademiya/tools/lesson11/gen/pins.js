// Pins on a board: a long-range piece S, then a piece P of the other colour, then a piece T of P's colour on the same line.
// abs: T is the king; rel: T is worth more than P (and T is a queen or a rook), and S is cheaper than T or T is unprotected.
const C = require('./chesscore.js');
const VAL = { p: 1, n: 3, b: 3, r: 5, q: 9, k: 100 };
const DIRS = [[1, 0], [-1, 0], [0, 1], [0, -1], [1, 1], [1, -1], [-1, 1], [-1, -1]];
function pins(p) {
  const b = p.board, out = [];
  for (let s = 0; s < 64; s++) {
    const S = b[s]; if (!S) continue; const ts = S.toLowerCase(); if (!'qrb'.includes(ts)) continue;
    const mine = C.colorOf(S);
    for (const [df, dr] of DIRS) {
      const diag = df && dr; if (ts === 'r' && diag) continue; if (ts === 'b' && !diag) continue;
      let f = (s & 7) + df, r = (s >> 3) + dr, first = -1;
      while (f >= 0 && f < 8 && r >= 0 && r < 8) {
        const q = r * 8 + f, x = b[q];
        if (x) {
          if (first < 0) { if (C.colorOf(x) === mine || x.toLowerCase() === 'k') break; first = q; }
          else {
            if (C.colorOf(x) === mine) break;
            const P = b[first].toLowerCase(), T = x.toLowerCase();
            if (T === 'k') out.push({ s, p: first, t: q, abs: true });
            else if ((T === 'q' || T === 'r') && VAL[T] > VAL[P]) {
              const prot = p.attacked(q, C.colorOf(x));
              if (VAL[ts] < VAL[T] || !prot) out.push({ s, p: first, t: q, abs: false });
            }
            break;
          }
        }
        f += df; r += dr;
      }
    }
  }
  return out;
}
module.exports = { pins };
if (require.main === module) {
  const fen = process.argv.slice(2).join(' ');
  const p = new C.Position(fen);
  pins(p).forEach(x => console.log(C.sqName(x.s), '->', C.sqName(x.p), '->', C.sqName(x.t), x.abs ? 'ABS' : 'rel'));
}
