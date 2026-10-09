// The windmill graph: every checking move that keeps a decisive win is allowed (g, with the engine's reply),
// capturing the queen or mating ends the round (g = 0), everything else is a mistake (b, with the refutation).
// Built breadth-first over all positions the student can reach this way.
const C = require('./chesscore.js');
const { val, fmt } = require('./sf.js');
const { keyOf, uciOf } = require('./graph.js');

async function buildMill(eng, T, log) {
  const depth = T.depth || 14, G = {}, seen = new Set(), queue = [T.fen], fenOf = {};
  const out = [];
  while (queue.length) {
    const fen = queue.shift(), p = new C.Position(fen), k = keyOf(p);
    if (seen.has(k)) continue; seen.add(k);
    if (seen.size > (T.maxNodes || 400)) throw new Error('mill graph too big');
    const legal = p.moves(), res = await eng.analyse(fen, { depth, multipv: legal.length });
    const by = {}; res.forEach(x => { by[x.uci] = x; });
    const nd = { g: {}, b: {}, e: [] }; let ng = 0;
    for (const m of legal) {
      const u = uciOf(m), x = by[u] || (await eng.analyse(fen, { depth, multipv: 1, moves: [u] }))[0];
      p.make(m); const chk = p.inCheck(), st = p.status(); const q = p.fen(); p.unmake();
      const v = val(x);
      if (st === 'mate' || (m.captured === 'q' && v >= T.floor)) { nd.g[u] = 0; ng++; continue; }
      if (chk && v >= T.floor) {
        const rep = x.pv[1];
        const pq = new C.Position(q); const rm = pq.findMove(rep); if (!rm) throw new Error('bad reply ' + rep);
        nd.g[u] = rep; ng++; pq.make(rm); queue.push(pq.fen());
        continue;
      }
      nd.b[u] = x.pv[1] || 0;
    }
    G[k] = nd; fenOf[k] = fen;
    out.push(`${fen}  g:${ng} b:${Object.keys(nd.b).length}  top ${fmt(res[0])}`);
  }
  // a check that leads to a node with no way on is a mistake after all: prune until nothing changes
  const nextKey = (k, u, rep) => { const p = new C.Position(fenOf[k]); p.play(u); p.play(rep); return keyOf(p); };
  let changed = true;
  while (changed) {
    changed = false;
    for (const [k, nd] of Object.entries(G)) for (const [u, rep] of Object.entries(nd.g)) {
      if (!rep) continue;
      const nk = nextKey(k, u, rep), nn = G[nk];
      if (!nn || !Object.keys(nn.g).length) { delete nd.g[u]; nd.b[u] = rep; changed = true; out.push(`  pruned ${u} at ${fenOf[k]}`); }
    }
  }
  for (const [k, nd] of Object.entries(G)) if (!Object.keys(nd.g).length) out.push(`  dead node ${fenOf[k]}`);
  if (log) log(`== ${T.id} (${Object.keys(G).length} nodes)\n` + out.join('\n'));
  return { fen: T.fen, side: T.side, G };
}
module.exports = { buildMill };
