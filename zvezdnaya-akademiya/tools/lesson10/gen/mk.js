// mk("w", "Kg1 Qd1 Nd5 a2 b2", "Kg8 Qd8 f7") -> FEN (pawns are bare squares)
const C = require('./chesscore.js');
function mk(turn, white, black, castling) {
  const b = new Array(64).fill('');
  const put = (list, up) => list.trim().split(/\s+/).filter(Boolean).forEach(t => {
    const m = /^([KQRBN]?)([a-h][1-8])$/.exec(t); if (!m) throw new Error('bad token ' + t);
    const i = C.sqIndex(m[2]); if (b[i]) throw new Error('twice ' + t);
    const p = m[1] || 'P'; b[i] = up ? p : p.toLowerCase();
  });
  put(white, true); put(black, false);
  let s = '';
  for (let r = 7; r >= 0; r--) { let e = 0; for (let f = 0; f < 8; f++) { const x = b[r * 8 + f]; if (!x) e++; else { if (e) { s += e; e = 0; } s += x; } } if (e) s += e; if (r) s += '/'; }
  const fen = `${s} ${turn} ${castling || '-'} - 0 1`;
  const p = new C.Position(fen);
  const them = turn === 'w' ? 'b' : 'w';
  if (p.kingSq('w') < 0 || p.kingSq('b') < 0) throw new Error('kings ' + fen);
  if (p.attacked(p.kingSq(them), turn)) throw new Error('side not to move is in check: ' + fen);
  return fen;
}
module.exports = { mk };
if (require.main === module) console.log(mk(...process.argv.slice(2)));
