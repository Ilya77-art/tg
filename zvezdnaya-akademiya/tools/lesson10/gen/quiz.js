const C = require('./chesscore.js'); const { mk } = require('./mk.js'); const T = require('./tasks.js');
function defenses(fen) {
  const p = new C.Position(fen), k = p.kingSq(p.turn), them = p.turn === 'w' ? 'b' : 'w';
  const checkers = [];
  for (let s = 0; s < 64; s++) { const x = p.board[s]; if (!x || C.colorOf(x) !== them) continue; const save = p.board[s];
    // does the piece on s attack the king? test by removing every other enemy piece is overkill: use attacked() on a board with only this piece of theirs
    const b2 = p.board.slice(); for (let t = 0; t < 64; t++) if (t !== s && p.board[t] && C.colorOf(p.board[t]) === them && p.board[t].toLowerCase() !== 'k') p.board[t] = '';
    const att = p.attacked(k, them); p.board = b2; if (att && save.toLowerCase() !== 'k') checkers.push(C.sqName(s)); }
  const r = { run: [], take: [], block: [] };
  p.moves().forEach(m => { const san = p.san(m); if (m.from === k) r.run.push(san); else if (checkers.includes(C.sqName(m.to)) || m.flags === 'e') r.take.push(san); else r.block.push(san); });
  return { checkers, status: p.status(), ...r };
}
const Q = {
  q1: mk('w', 'Ke1 Qd1 Ra1 Rh1 Bc1 Bf1 Nb1 Ng1 a3 b2 c2 e4 f2 g2 h2', 'Kg8 Qd8 Bb4 Ra8 Rf8 Nc6 Bc8 a7 b7 c7 e5 f7 g7 h7'),
  q2: mk('w', 'Ke1 Qd1 Ra1 Rh1 Bc1 Bf1 Ng1 a2 b2 c2 e4 f2 g2 h2', 'Kg8 Qd8 Nd3 Ra8 Rf8 Bc8 a7 b7 c7 f7 g7 h7'),
  q3: mk('b', 'Kg1 Re1 Nd6 Qd1 a2 b2 c2 f2 g2 h2', 'Ke8 Qd8 Bc8 Ra8 Rh8 Nb8 a7 b7 c7 d7 f7 g7 h7'),
  q4: mk('b', 'Kg1 Re1 Nd6 Qd1 a2 b2 c2 f2 g2 h2', 'Ke8 Qd8 Bf8 Bc8 Ra8 Rh8 Nb8 a7 b7 c7 d7 f7 g7 h7'),
  q5: mk('b', 'Kg1 Re1 Re8 Qd1 a2 b2 c2 f2 g2 h2', 'Kg8 Qd6 Ra8 Bb7 a7 b6 c5 f7 g7 h7'),
  q6: T.after(T.PETROFF + ' Nf6 Nc6+', C.START)
};
if (require.main === module) for (const [k, f] of Object.entries(Q)) { const d = defenses(f); console.log(k, f, '\n   checkers', d.checkers.join(','), d.status, '| run', d.run.join(' '), '| take', d.take.join(' '), '| block', d.block.join(' ')); }
module.exports = { Q, defenses };
