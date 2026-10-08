// Every position of «Мельница Торре». FENs were composed by hand (mk.js) or reached by playing real games.
const C = require('./chesscore.js');
const after = (moves, fen) => { const p = new C.Position(fen); moves.split(' ').forEach(m => { if (!p.play(m)) throw new Error('illegal ' + m); }); return p.fen(); };

const TORRE_GAME = 'd4 Nf6 Nf3 e6 Bg5 c5 e3 cxd4 exd4 Be7 Nbd2 d6 c3 Nbd7 Bd3 b6 Nc4 Bb7 Qe2 Qc7 O-O O-O Rfe1 Rfe8 Rad1 Nf8 Bc1 Nd5 Ng5 b5 Na3 b4 cxb4 Nxb4 Qh5 Bxg5 Bxg5 Nxd3 Rxd3 Qa5 b4 Qf5 Rg3 h6 Nc4 Qd5 Ne3 Qb5 Bf6 Qxh5 Rxg7+ Kh8 Rxf7+ Kg8 Rg7+ Kh8 Rxb7+ Kg8 Rg7+ Kh8 Rg5+ Kh7 Rxh5 Kg6 Rh3 Kxf6 Rxh6+ Kg5 Rh3 Reb8 Rg3+ Kf6 Rf3+ Kg6 a3 a5 bxa5 Rxa5 Nc4 Rd5 Rf4 Nd7 Rxe6+ Kg5 g3';
const LASKER_GAME = 'd4 e6 Nf3 f5 Nc3 Nf6 Bg5 Be7 Bxf6 Bxf6 e4 fxe4 Nxe4 b6 Ne5 O-O Bd3 Bb7 Qh5 Qe7 Qxh7+ Kxh7 Nxf6+ Kh6 Neg4+ Kg5 h4+ Kf4 g3+ Kf3 Be2+ Kg2 Rh2+ Kg1 Kd2#';
const PETROFF = 'e4 e5 Nf3 Nf6 Nxe5 Nxe4 Qe2';
const CARO = 'e4 c6 d4 d5 Nc3 dxe4 Nxe4 Nd7 Qe2';
const S = C.START;
const torreAt = n => after(TORRE_GAME.split(' ').slice(0, n).join(' '), S);

const graphs = [
  // 1 — ambush: discovered attacks
  { id: 'a1', fen: 'r4rk1/pb3ppp/1pnqp3/2p5/8/2PB1N2/PP2QPPP/R2R2K1 w - - 0 1', side: 'w', lines: ['Bxh7+ Kxh7 Rxd6'], mode: 'win', margin: 120, wFloor: 200 },
  { id: 'a2', fen: 'r4rk1/ppp2ppp/2n1bq2/8/3P4/1P3N2/PB2QPPP/R4RK1 w - - 0 1', side: 'w', lines: ['d5 Qh6 dxe6', 'd5 Qh6 dxc6'], mode: 'win', margin: 120, wFloor: 200 },
  { id: 'a3', fen: '4r1k1/pbq2ppp/1p6/2p1n3/2P5/1PN5/PB1R1PPP/4Q1K1 b - - 0 1', side: 'b', lines: ['Nf3+ gxf3 Rxe1+'], mode: 'win', margin: 120, wFloor: 200 },
  // 2 — discovered check
  { id: 'b1', fen: after(PETROFF + ' Nf6', S), side: 'w', lines: ['Nc6+ Be7 Nxd8'], mode: 'win', margin: 120, wFloor: 150 },
  { id: 'b2', fen: 'r1b1k2r/ppqn1ppp/2p5/4B3/8/5N2/PPP2PPP/R2QR1K1 w - - 0 1', side: 'w', lines: ['Bxc7+ Kf8 Bd6+ Kg8 Re8+ Nf8 Rxf8#'], mode: 'mate', mateSlack: 4, wFloor: 300 },
  { id: 'b3', fen: after(CARO + ' Ngf6', S), side: 'w', lines: ['Nd6#'], mode: 'mate', mateSlack: 1, wFloor: 300 },
  // 3 — double check
  { id: 'd1', fen: 'r5rk/ppqb1p1p/2p5/4N3/2P5/1P1Q4/PB3PPP/R4RK1 w - - 0 1', side: 'w', lines: ['Ng6#', 'Nxf7#'], mode: 'mate', mateSlack: 1, wFloor: 300 },
  { id: 'd2', fen: 'r3rbk1/pbqn1ppp/1p5Q/2p1pP1N/8/8/PPP3P1/1K1R3R w - - 0 1', side: 'w', lines: ['Qxh7+ Kxh7 Nf6#'], mode: 'mate', mateSlack: 2, wFloor: 300 },
  // 4 — the windmill with a mate at the end
  { id: 'w2', fen: 'q1r2n1k/pp1pnpR1/7p/8/2P5/1P6/PB3PPP/4R1K1 w - - 0 1', side: 'w', lines: ['Rxf7+ Kg8 Rg7+ Kh8 Rg3+ Kh7 Rxe7#', 'Rxf7+ Kg8 Rg7+ Kh8 Rg4+ Kh7 Rxe7#', 'Rxf7+ Kg8 Rg7+ Kh8 Rg5+ Kh7 Rxe7#'], mode: 'mate', mateSlack: 4, wFloor: 300 },
  // 5 — Torre vs Lasker, Moscow 1925, from move 25
  { id: 't1', fen: torreAt(48), side: 'w', lines: ['Bf6 Qxh5 Rxg7+ Kh8 Rxf7+ Kg8 Rg7+ Kh8 Rxb7+ Kg8 Rg7+ Kh8 Rg5+ Kh7 Rxh5'], mode: 'win', margin: 60, wFloor: 150, depth: 18 },
  // 6 — someone else's ambush: defence
  { id: 'e1', fen: 'r4rk1/pb3ppp/1pnqp3/2p5/8/2PB1N2/PP2QPPP/R2R2K1 b - - 0 1', side: 'b', lines: [], autoG: 100, mode: 'hold', margin: 100 },
  { id: 'e2', fen: after(PETROFF, S), side: 'b', lines: ['Qe7 Qxe4 d6'], mode: 'hold', margin: 60 },
  { id: 'e3', fen: after(CARO, S), side: 'b', lines: ['Ndf6 Nf3'], mode: 'hold', margin: 150 },
  // 7 — Edward Lasker vs Thomas, London 1912, from move 11
  { id: 'h1', fen: after(LASKER_GAME.split(' ').slice(0, 20).join(' '), S), side: 'w', lines: [LASKER_GAME.split(' ').slice(20).join(' '), LASKER_GAME.split(' ').slice(20, 34).join(' ') + ' O-O-O#'], mode: 'mate', mateSlack: 99, wFloor: 300 }
];
const mills = [
  { id: 'w1', fen: '5n1k/pp1b1pR1/5B1p/7q/8/2P5/PP3PPP/6K1 w - - 0 1', side: 'w', floor: 600, depth: 16 }
];
module.exports = { graphs, mills, after, TORRE_GAME, LASKER_GAME, PETROFF, CARO, torreAt };
