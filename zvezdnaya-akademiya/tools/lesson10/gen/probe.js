// usage: node probe.js depth multipv fen [fen...]  — prints the top moves (SAN, eval, PV) of each position
const C = require('./chesscore.js');
const { Engine, fmt } = require('./sf.js');
function sanLine(fen, pv, n) {
  const p = new C.Position(fen), out = [];
  for (const u of pv.slice(0, n)) { const r = p.play(u); if (!r) break; out.push(r.san); }
  return out.join(' ');
}
(async () => {
  const [depth, mpv, ...fens] = process.argv.slice(2);
  const e = new Engine(); await e.init();
  for (const fen of fens) {
    const p = new C.Position(fen);
    console.log('\n#', fen, '| status', p.status(), '| legal', p.moves().length);
    const r = await e.analyse(fen, { depth: +depth, multipv: Math.min(+mpv, p.moves().length) });
    r.forEach(x => console.log(fmt(x).padStart(7), sanLine(fen, x.pv, 9)));
  }
  e.quit();
})();
