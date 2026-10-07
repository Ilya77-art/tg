// validates every catalog puzzle through the page's own chess core and the LI module
const fs = require('fs');
const html = fs.readFileSync('out/zvezdnaya-akademiya/index.html', 'utf8');
const scripts = [...html.matchAll(/<script>([\s\S]*?)<\/script>/g)].map(m => m[1]);
global.window = global; global.document = undefined;
eval(scripts.find(s => s.includes('window.ACAD_LICHESS')));
{ const module = { exports: {} }; eval(scripts.find(s => s.includes('Mini chess core')).split('/* «Звёздная академия» v4')[0]); global.ChessCore = module.exports; }
const app = scripts.find(s => s.includes('const LI = (() =>'));
const liSrc = app.slice(app.indexOf('const LI = (() =>'), app.indexOf('/* ---------- the class library'));
const plural = (n, a, b, c) => { const m = Math.abs(n) % 10, h = Math.abs(n) % 100; return m === 1 && h !== 11 ? a : (m >= 2 && m <= 4 && (h < 12 || h > 14) ? b : c); };
const LI = eval(liSrc + '; LI');
let bad = 0, flips = 0, mates = 0, n = 0; const t0 = Date.now();
for (const [topic, levels] of Object.entries(ACAD_LICHESS.cells)) levels.forEach((cell, i) => cell.forEach(str => {
  n++; const p = LI.prep(str);
  if (!p) { bad++; console.log('BAD', topic, i + 1, str); return; }
  if (p.flip) flips++; if (p.mate) mates++;
  if (/^mate\d/.test(topic) && (!p.mate || p.n !== +topic[4])) { bad++; console.log('MATE?', topic, str, p.n); }
  // the solver is always white after the first move
  const pos = new ChessCore.Position(p.fen); pos.make(pos.findMove(p.line[0])); if (pos.turn !== 'w') { bad++; console.log('SIDE', str); }
}));
console.log({ n, bad, flips, mates, ms: Date.now() - t0 });
// CSV import path
const line = '00008,r6k/pp2r2p/4Rp1Q/3p4/8/1N1P2R1/PqP2bPP/7K b - - 0 24,f2g3 e6e7 b2b1 b3c1 b1c1 h6c1,1807,75,95,8585,crushing hangingPiece long middlegame,https://lichess.org/787zsVup/black#48,';
const x = LI.fromCSV(line); console.log(x, LI.prep(x.str) && LI.prep(x.str).line);
const y = LI.fromCSV('000Pw,6k1/5p1p/4p3/4q3/3nN3/2Q3P1/PP3P1P/6K1 w - - 2 37,e4d2 d4e2 g1f1 e2c3,1598,74,96,359,crushing endgame fork short,https://lichess.org/au2lCK5o#73,');
console.log(y, LI.prep(y.str));
