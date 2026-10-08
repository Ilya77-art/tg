// node tools/test_bot_engine.js — move generation (perft), tactics and mating with the bot engine embedded in index.html
const E = require('./bot_engine.js');
const fs = require('fs'), path = require('path');
let fail = 0;
const ok = (c, msg) => { if (!c) { fail++; console.log('FAIL', msg); } };
/* the copy in index.html must be the same engine */
const html = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');
ok(html.includes(fs.readFileSync(path.join(__dirname, 'bot_engine.js'), 'utf8').trim().slice(0, 4000)), 'index.html embeds tools/bot_engine.js');
const PERFT = [
  ['rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1', [20, 400, 8902, 197281]],
  ['r3k2r/p1ppqpb1/bn2pnp1/3PN3/1p2P3/2N2Q1p/PPPBBPPP/R3K2R w KQkq - 0 1', [48, 2039, 97862]],
  ['8/2p5/3p4/KP5r/1R3p1k/8/4P1P1/8 w - - 0 1', [14, 191, 2812, 43238]],
  ['r3k2r/Pppp1ppp/1b3nbN/nP6/BBP1P3/q4N2/Pp1P2PP/R2Q1RK1 w kq - 0 1', [6, 264, 9467]],
  ['rnbq1k1r/pp1Pbppp/2p5/8/2B5/8/PPP1NnPP/RNBQK2R w KQ - 1 8', [44, 1486, 62379]]
];
for (const [fen, exp] of PERFT) { const b = new E.Board().load(fen); exp.forEach((n, i) => ok(b.perft(i + 1) === n, `perft ${i + 1} ${fen}`)); }
ok(E.think('6k1/5ppp/8/8/8/8/5PPP/3R2K1 w - - 0 1', { depth: 3 }).uci === 'd1d8', 'back-rank mate in one');
ok(E.think('r1bqkb1r/pppp1ppp/2n2n2/4p2Q/2B1P3/8/PPPP1PPP/RNB1K1NR w KQkq - 4 4', { depth: 3 }).uci === 'h5f7', 'scholar mate');
/* the engine mates a lone king with a queen and with a rook */
function mates(fen) {
  const b = new E.Board().load(fen);
  for (let ply = 0; ply < 120; ply++) {
    const legal = b.legal();
    if (!legal.length) return b.inCheck() && b.side < 0;
    const r = E.think(b.fen ? b.fen() : fenOf(b), { depth: b.side > 0 ? 4 : 2, ms: 300 });
    const m = legal.find(x => E.uci(x) === r.uci); if (!m) return false;
    b.make(m);
  }
  return false;
}
function fenOf(b) {
  const L = ['', 'p', 'n', 'b', 'r', 'q', 'k']; let s = '';
  for (let r = 7; r >= 0; r--) { let e = 0; for (let f = 0; f < 8; f++) { const p = b.b[r * 16 + f]; if (!p) e++; else { if (e) { s += e; e = 0; } s += p > 0 ? L[p].toUpperCase() : L[-p]; } } if (e) s += e; if (r) s += '/'; }
  return s + (b.side > 0 ? ' w' : ' b') + ' - - 0 1';
}
ok(mates('8/8/8/4k3/8/8/8/3QK3 w - - 0 1'), 'K+Q mates K');
ok(mates('8/8/8/4k3/8/8/8/R3K3 w - - 0 1'), 'K+R mates K');
console.log(fail ? `${fail} failed` : 'all passed');
process.exit(fail ? 1 : 0);
