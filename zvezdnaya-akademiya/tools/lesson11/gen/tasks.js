// Every position of «Театр Карабаса». FENs were composed by hand (counted for equal material) or reached by playing the opening traps.
const C = require('./chesscore.js');
const after = (moves, fen) => { const p = new C.Position(fen); moves.split(' ').forEach(m => { if (!p.play(m)) throw new Error('illegal ' + m); }); return p.fen(); };
const S = C.START;

// opening traps: the full line and the number of plies before the student's first move
const TRAPS = {
  elephant: { moves: 'd4 d5 c4 e6 Nc3 Nf6 Bg5 Nbd7 cxd5 exd5 Nxd5 Nxd5 Bxd8 Bb4+ Qd2 Bxd2+ Kxd2 Kxd8', at: 11 },
  stafford: { moves: 'e4 e5 Nf3 Nf6 Nxe5 Nc6 Nxc6 dxc6 d3 Bc5 Bg5 Nxe4 Bxd8 Bxf2+ Ke2 Bg4#', at: 11 },
  englund: { moves: 'd4 e5 dxe5 Nc6 Nf3 Qe7 Bf4 Qb4+ Bd2 Qxb2 Bc3 Bb4 Qd2 Bxc3 Qxc3 Qc1#', at: 11 },
  budapest: { moves: 'd4 Nf6 c4 e5 dxe5 Ng4 Bf4 Nc6 Nf3 Bb4+ Nbd2 Qe7 a3 Ngxe5 axb4 Nd3#', at: 15 },
  lasker: { moves: 'd4 d5 c4 e5 dxe5 d4 e3 Bb4+ Bd2 dxe3 Bxb4 exf2+ Ke2 fxg1=N+ Rxg1 Bg4+', at: 13 }
};
const trapFen = k => after(TRAPS[k].moves.split(' ').slice(0, TRAPS[k].at).join(' '), S);
const trapLine = k => TRAPS[k].moves.split(' ').slice(TRAPS[k].at).join(' ');

const PRO = 'r2rk3/pp3ppp/2b5/8/4n3/2N5/PPPB1PPP/3RR1K1 w - - 0 1';
const QPIN = 'r3k2r/pp1qbppp/5n2/2p5/8/2NB4/PPP1QPPP/R4RK1 w - - 0 1';
const D5 = 'r1bqkb1r/1pp1pppp/2n3n1/pB6/P2P4/2N2N2/1PP2PPP/R1BQ1RK1 w - - 0 1';
const E5 = 'rnbq1rk1/ppp2pbp/3p1np1/6B1/3PP3/2NB1N2/PP3PPP/R2Q1RK1 w - - 0 1';
const C4 = 'r2q1rk1/pb2bppp/1p2p3/2pn4/8/1P2PN2/PBP1QPPP/2RR1BK1 w - - 0 1';
const black = (fen, castle) => fen.replace(' w - ', ` b ${castle || '-'} `);

const graphs = [
  // 1 — a string to the king (absolute pin)
  { id: 'a1', fen: QPIN, side: 'w', lines: ['Bb5 Kf8 Bxd7'], mode: 'win', margin: 150, wFloor: 500 },
  { id: 'a2', fen: D5, side: 'w', lines: ['d5 Bd7 dxc6'], mode: 'win', margin: 150, wFloor: 450 },
  { id: 'a3', fen: 'r2rkb2/pppnqppp/2n5/8/2B5/2N2Q2/PPP2PPP/R1B1R1K1 w - - 0 1', side: 'w', lines: ['Qxf7#', 'Bxf7#'], mode: 'mate', mateSlack: 1, wFloor: 500 },
  // 2 — a long string (relative pin)
  { id: 'b1', fen: E5, side: 'w', lines: ['e5 dxe5 dxe5'], mode: 'win', margin: 120, wFloor: 350 },
  { id: 'b2', fen: C4, side: 'w', lines: ['c4 Nf6 Rxd8'], mode: 'win', margin: 120, wFloor: 300 },
  // 3 — a doll does not defend
  { id: 'c1', fen: 'r1bq1r1k/pp1n1pp1/2p4p/8/8/1P3N2/PBPQ1PPP/R3R1K1 w - - 0 1', side: 'w', lines: ['Qxh6+ Kg8 Qxg7#'], mode: 'mate', mateSlack: 2, wFloor: 500 },
  { id: 'c2', fen: 'r3kb1r/ppqb1ppp/4pn2/3n4/2B5/2N2N2/PPP2PPP/R1BQR1K1 w - - 0 1', side: 'w', lines: ['Bxd5 h5'], mode: 'win', margin: 150, wFloor: 300 },
  // 4 — Buratino's nose (skewer)
  { id: 's1', fen: 'q7/p5pp/1p6/3k4/8/8/PPQ3PP/3B2K1 w - - 0 1', side: 'w', lines: ['Bf3+ Kd6 Bxa8'], mode: 'win', margin: 150, wFloor: 750 },
  { id: 's2', fen: 'R7/P4k2/8/8/8/6K1/8/r7 w - - 0 1', side: 'w', lines: ['Rh8 Rxa7 Rh7+ Ke6 Rxa7'], mode: 'win', margin: 100, wFloor: 200 },
  { id: 's3', fen: '8/P7/8/3k4/8/8/2K5/7q w - - 0 1', side: 'w', lines: ['a8=Q+ Ke5 Qxh1'], mode: 'win', margin: 100, wFloor: 200 },
  // 5 — Buratino cuts the strings (a false pin)
  { id: 'm1', fen: trapFen('elephant'), side: 'b', lines: [trapLine('elephant')], mode: 'win', margin: 150, wFloor: 200 },
  { id: 'm2', fen: trapFen('stafford'), side: 'b', lines: [trapLine('stafford')], mode: 'mate', mateSlack: 2, wFloor: 200 },
  // 6 — scissors: defence against a pin
  { id: 'e1', fen: black(QPIN, 'kq'), side: 'b', lines: [], autoG: 120, mode: 'hold', margin: 120 },
  { id: 'e2', fen: black(E5), side: 'b', lines: [], autoG: 120, mode: 'hold', margin: 120 },
  { id: 'e3', fen: black(D5, 'kq'), side: 'b', lines: [], autoG: 150, mode: 'hold', margin: 150 },
  // 7 — the playbill: opening traps
  { id: 't1', fen: trapFen('englund'), side: 'b', lines: [trapLine('englund')], mode: 'mate', mateSlack: 2, wFloor: 200 },
  { id: 't2', fen: trapFen('budapest'), side: 'b', lines: [trapLine('budapest')], mode: 'mate', mateSlack: 1, wFloor: 300 },
  { id: 't3', fen: trapFen('lasker'), side: 'b', lines: ['fxg1=N+ Rxg1 Bg4+'], mode: 'win', margin: 150, wFloor: 200 }
];
const QUIZ = {
  q1: after('e4 e5 Nf3 Nc6 Bb5 d6', S),
  q2: after('d4 d5 c4 e6 Nc3 Nf6 Bg5', S),
  q3: after('d4 Nf6 c4 e6 Nc3 Bb4', S),
  q4: after('e4 e5 Nf3 Nc6 Bb5 a6 Ba4 Nf6 O-O', S),
  q5: after('d4 d5 c4 e6 Nc3 Nf6 Nf3 Bb4 Bg5', S),
  q6: '4k3/pp3ppp/8/2b1n3/8/1B6/PP3PPP/4R1K1 w - - 0 1'
};
module.exports = { graphs, QUIZ, TRAPS, trapFen, trapLine, after, PRO, PRO_DEMO: ['f3', 'Kf8', 'fxe4'] };
