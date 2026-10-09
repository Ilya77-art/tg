// Verified move graphs for the lesson (same format as «Ничья из шляпы»):
// G[key] = { g: {uci: replyUci | 0}, b: {uci: refutationUci | 0}, e: [uci] }, key = first 3 FEN fields.
// g — the moves of the given lines; e — other moves the engine rates as good (within a margin);
// b — the rest, each with the opponent's best answer (the second move of its PV).
const C = require('./chesscore.js');
const { val, fmt } = require('./sf.js');
const keyOf = p => p.fen().split(' ').slice(0, 3).join(' ');
const uciOf = m => C.sqName(m.from) + C.sqName(m.to) + (m.promotion || '');

async function build(eng, T, log) {
  const depth = T.depth || 16;
  const G = {};
  const nodes = new Map(); // key -> {fen, g:{}}
  for (const line of T.lines) {
    const p = new C.Position(T.fen);
    const sans = line.trim().split(/\s+/);
    for (let i = 0; i < sans.length; i++) {
      const m = p.findMove(sans[i]);
      if (!m) throw new Error(`${T.id}: illegal ${sans[i]} at ${i} in ${p.fen()}`);
      const studentTurn = p.turn === T.side;
      if (studentTurn) {
        const k = keyOf(p);
        if (!nodes.has(k)) nodes.set(k, { fen: p.fen(), g: {} });
        const nd = nodes.get(k), u = uciOf(m);
        const reply = sans[i + 1] ? (() => { const q = new C.Position(p.fen()); q.make(m); const r = q.findMove(sans[i + 1]); if (!r) throw new Error(`${T.id}: illegal reply ${sans[i + 1]}`); return uciOf(r); })() : 0;
        if (u in nd.g && nd.g[u] !== reply) throw new Error(`${T.id}: two replies to ${sans[i]}`);
        nd.g[u] = reply;
      }
      p.make(m);
    }
  }
  if (T.autoG) {
    const p0 = new C.Position(T.fen), r0 = await eng.analyse(T.fen, { depth, multipv: p0.moves().length });
    const top0 = val(r0[0]), k0 = keyOf(p0);
    if (!nodes.has(k0)) nodes.set(k0, { fen: p0.fen(), g: {} });
    r0.filter(x => val(x) >= top0 - T.autoG).forEach(x => { if (!(x.uci in nodes.get(k0).g)) nodes.get(k0).g[x.uci] = x.pv[1] || 0; });
  }
  const report = [];
  for (const [k, nd] of nodes) {
    const p = new C.Position(nd.fen), legal = p.moves();
    const res = await eng.analyse(nd.fen, { depth, multipv: legal.length });
    const by = {}; res.forEach(x => { by[x.uci] = x; });
    // moves the engine did not report (rare): search them alone
    for (const m of legal) { const u = uciOf(m); if (!by[u]) { const r = await eng.analyse(nd.fen, { depth, multipv: 1, moves: [u] }); by[u] = r[0]; } }
    const gv = Object.keys(nd.g).map(u => val(by[u]));
    const best = T.mode === 'hold' ? Math.max(...gv) : Math.min(...gv), top = Math.max(...res.map(val));
    const node = { g: nd.g, b: {}, e: [] };
    const lines = [];
    for (const m of legal) {
      const u = uciOf(m), x = by[u], v = val(x), san = p.san(m, legal);
      if (u in nd.g) { lines.push(`  G ${san.padEnd(8)} ${fmt(x)}`); continue; }
      const good = T.mode === 'hold' ? v >= best - (T.margin || 60)
        : T.mode === 'mate' ? (x.mate !== null && x.mate > 0 && x.mate <= (T.mateSlack || 99))
          : v >= Math.max(T.floor || 250, best - (T.margin || 150));
      const weaker = !good && T.mode !== 'hold' && T.wFloor !== undefined && v >= T.wFloor;
      if (good && !(T.noEq || []).includes(san)) { node.e.push(u); lines.push(`  e ${san.padEnd(8)} ${fmt(x)}`); }
      else if (weaker) { (node.w = node.w || []).push(u); lines.push(`  w ${san.padEnd(8)} ${fmt(x)}`); }
      else { node.b[u] = x.pv[1] || 0; lines.push(`  b ${san.padEnd(8)} ${fmt(x)}`); }
    }
    G[k] = node;
    const warn = top > best + 80 ? `  !! engine prefers ${fmt(res[0])} ${res[0].uci} over line ${gv.map(v => v).join('/')}` : '';
    report.push(`${nd.fen}${warn}\n` + lines.filter(l => l[2] !== 'b').join('\n') + `\n  b: ${Object.keys(node.b).length} moves, worst-best gap ${best - Math.max(-1e9, ...legal.filter(m => !(uciOf(m) in nd.g) && !node.e.includes(uciOf(m))).map(m => val(by[uciOf(m)])))}`);
  }
  // check main-line replies: are they the opponent's most stubborn answers?
  for (const line of T.lines) {
    const p = new C.Position(T.fen); const sans = line.trim().split(/\s+/);
    for (let i = 0; i < sans.length; i++) {
      if (p.turn !== T.side) {
        const r = await eng.analyse(p.fen(), { depth, multipv: 3 });
        const m = p.findMove(sans[i]); const u = uciOf(m);
        if (r[0].uci !== u) {
          const mine = (await eng.analyse(p.fen(), { depth, multipv: 1, moves: [u] }))[0];
          report.push(`  reply ${sans[i]} (${fmt(mine)}) vs engine ${r[0].uci} (${fmt(r[0])}) at ${p.fen()}`);
        }
      }
      p.play(sans[i]);
    }
    report.push(`  end of line: ${p.fen()} status ${p.status()}`);
  }
  if (log) log(`== ${T.id}\n` + report.join('\n'));
  return { fen: T.fen, side: T.side, G };
}
module.exports = { build, keyOf, uciOf };
