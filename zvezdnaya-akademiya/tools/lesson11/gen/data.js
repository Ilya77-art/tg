// Assembles window.TEATR (positions + verified graphs) and window.TEATR_PGN (a Lichess study) into out/data.js
const fs = require('fs'), path = require('path');
const C = require('./chesscore.js');
const T = require('./tasks.js');
const { pins } = require('./pins.js');
const G = JSON.parse(fs.readFileSync(path.join(__dirname, 'out', 'graphs.json'), 'utf8'));

const IDS = ['a1', 'a2', 'a3', 'b1', 'b2', 'c1', 'c2', 's1', 's2', 's3', 'm1', 'm2', 'e1', 'e2', 'e3', 't1', 't2', 't3'];
const QK = ['q1', 'q2', 'q3', 'q4', 'q5', 'q6'];
const data = {
  start: C.START,
  pro: { fen: T.PRO, demo: T.PRO_DEMO },
  quiz: QK.map(k => T.QUIZ[k]),
  // the dolls of every quiz card, checked against the pin finder of the page (same rules)
  quizDolls: QK.map(k => pins(new C.Position(T.QUIZ[k])).map(x => C.sqName(x.p)).sort()),
  traps: {},
  g: {}
};
for (const [k, t] of Object.entries(T.TRAPS)) data.traps[k] = { moves: t.moves.split(' '), at: t.at };
IDS.forEach(id => { if (!G[id]) throw new Error('missing graph ' + id); data.g[id] = G[id]; });
const WANT = [['c6'], ['f6'], ['c3'], [], ['c3', 'f6'], ['e5', 'f2']];
WANT.forEach((w, i) => { if (w.join() !== data.quizDolls[i].join()) throw new Error(`quiz ${i + 1}: dolls ${data.quizDolls[i]} want ${w}`); });

// sanity: every reply in every graph is legal, every good move is legal
let nodes = 0;
for (const [id, t] of Object.entries(data.g)) {
  for (const [k, nd] of Object.entries(t.G)) {
    nodes++;
    const p = new C.Position(k + ' 0 1');
    for (const [u, rep] of Object.entries(nd.g)) {
      const m = p.findMove(u); if (!m) throw new Error(`${id}: illegal g ${u} at ${k}`);
      if (rep) { p.make(m); if (!p.findMove(rep)) throw new Error(`${id}: illegal reply ${rep} at ${k}`); p.unmake(); }
    }
    for (const [u, rep] of Object.entries(nd.b)) {
      const m = p.findMove(u); if (!m) throw new Error(`${id}: illegal b ${u} at ${k}`);
      if (rep) { p.make(m); if (!p.findMove(rep)) throw new Error(`${id}: illegal refutation ${rep} after ${u} at ${k}`); p.unmake(); }
    }
    (nd.e || []).concat(nd.w || []).forEach(u => { if (!p.findMove(u)) throw new Error(`${id}: illegal e/w ${u}`); });
  }
}
// the prologue demo is legal and wins the doll
{ const p = new C.Position(T.PRO); T.PRO_DEMO.forEach(s => { if (!p.play(s)) throw new Error('prologue ' + s); }); }

// ---------- PGN: one Lichess study chapter per position ----------
function pgnMoves(fen, sans, comments) {
  const p = new C.Position(fen); let out = '', n = p.full, t = p.turn;
  sans.forEach((s, i) => {
    const r = p.play(s); if (!r) throw new Error('pgn illegal ' + s);
    if (t === 'w') out += `${n}. `; else if (i === 0) out += `${n}... `;
    out += r.san + ' ';
    if (comments && comments[i]) out += `{ ${comments[i]} } `;
    if (t === 'b') n++; t = t === 'w' ? 'b' : 'w';
  });
  return out.trim();
}
function chapter(name, fen, sans, intro, comments) {
  const custom = fen !== C.START;
  const side = new C.Position(fen).turn;
  return [`[Event "Театр Карабаса · ${name}"]`, '[Site "Онлайн-урок"]', '[Result "*"]', `[ChapterName "${name}"]`, `[Orientation "${side === 'w' ? 'white' : 'black'}"]`]
    .concat(custom ? ['[SetUp "1"]', `[FEN "${fen}"]`] : [])
    .join('\n') + `\n\n{ ${intro} } ${pgnMoves(fen, sans, comments)} *\n`;
}
const line = id => T.graphs.find(t => t.id === id).lines[0].split(' ');
const trap = (k, name, intro, notes) => chapter(name, C.START, T.TRAPS[k].moves.split(' '), intro, notes);
const ch = [];
ch.push(chapter('Анатомия связки', T.PRO, T.PRO_DEMO, 'Кукловод — ладья e1, кукла — конь e4, сокровище — король e8. Кукла не может сойти с места, а пешка f3 нападает на неё.', [null, 'Король ушёл — нитка оборвалась, но поздно.', 'Кукла поймана.']));
ch.push(chapter('Нитка к королю 1: ферзь на нитке', data.g.a1.fen, line('a1'), 'Ход белых. Ферзь d7 и король e8 на одной диагонали.', ['Ферзь привязан к королю.', null, 'Слон за ферзя.']));
ch.push(chapter('Нитка к королю 2: пешка бьёт куклу', data.g.a2.fen, line('a2'), 'Ход белых. Конь c6 привязан слоном b5 к королю e8.', ['Пешка напала на связанного коня.', null, 'Кукла поймана.']));
ch.push(chapter('Нитка к королю 3: ферзь-защитник', data.g.a3.fen, line('a3'), 'Ход белых. Ферзь e7 привязан ладьёй e1 к королю. Мат в 1 ход.', ['Ферзь e7 не может взять: он связан. Мат ставит и 1.С:f7#.']));
ch.push(chapter('Длинная нитка 1: пешка e5', data.g.b1.fen, line('b1'), 'Ход белых. Конь f6 связан с ферзём d8.', ['Пешка напала на коня.', null, 'Конь снова под ударом.']));
ch.push(chapter('Длинная нитка 2: нитка по вертикали', data.g.b2.fen, line('b2'), 'Ход белых. Ладья d1 связала коня d5 с ферзём d8.', ['Пешка напала на коня.', 'Конь ушёл.', 'Ладья за ферзя.']));
QK.forEach((k, i) => ch.push(chapter(`Кто на ниточке? ${i + 1}`, T.QUIZ[k], [], 'Найдите все связанные фигуры обоих цветов.')));
ch.push(chapter('Кукла не защищает 1', data.g.c1.fen, line('c1'), 'Ход белых. Мат в 2 хода: пешка g7 привязана к королю h8.', ['Пешке g7 бить нельзя.', null, 'Мат.']));
ch.push(chapter('Кукла не защищает 2', data.g.c2.fen, line('c2'), 'Ход белых. Конь d5 защищён дважды: пешкой e6 и конём f6. Но пешка e6 связана!', ['Если 1...К:d5, то 2.К:d5, и пешке e6 бить нельзя.']));
ch.push(chapter('Нос Буратино 1: слон', data.g.s1.fen, line('s1'), 'Ход белых. Король d5 и ферзь a8 на одной диагонали.', ['Сквозной шах.', null, 'Ферзь взят.']));
ch.push(chapter('Нос Буратино 2: трюк с ладьёй', data.g.s2.fen, line('s2'), 'Ход белых. Пешка a7, ладья a8: королю чёрных место только на g7 или h7.', ['Ладья уходит с дороги пешки.', null, 'Сквозной шах по 7-й горизонтали.', null, 'Ладья взята.']));
ch.push(chapter('Нос Буратино 3: превращение', data.g.s3.fen, line('s3'), 'Ход белых. Превратитесь с шахом.', ['Шах по большой диагонали.', null, 'Ферзь взят.']));
ch.push(trap('elephant', 'Рваные нитки: слоновья ловушка', 'Ферзевый гамбит. Ловушка, которую в английских книгах зовут Elephant Trap.', Object.assign([], { 10: 'Грубая ошибка: конь f6 только кажется связанным.', 11: 'Нитка порвана!', 13: 'Шах — ферзь белых под ударом.', 17: 'Чёрные с лишней фигурой.' })));
ch.push(trap('stafford', 'Рваные нитки: гамбит Стаффорда', 'Мнимая связка: конь f6 уходит, бросив ферзя.', Object.assign([], { 10: 'Ошибка: связка мнимая.', 11: 'Нитка порвана!', 15: 'Мат тремя лёгкими фигурами.' })));
ch.push(chapter('Ножницы 1', data.g.e1.fen, [], 'Ход чёрных. Белые грозят Сb5. Подходят a6, 0-0, 0-0-0, c4 и Крf8.'));
ch.push(chapter('Ножницы 2', data.g.e2.fen, [], 'Ход чёрных. Белые грозят e5. Подходят h6, Фd7 и Фe8.'));
ch.push(chapter('Ножницы 3', data.g.e3.fen, [], 'Ход чёрных. Белые грозят d5. Подходят e6 и Сd7.'));
ch.push(trap('englund', 'Афиша: гамбит Англунда', 'Слон c3 привязан к королю e1.', Object.assign([], { 10: 'Ошибка.', 11: 'Связка!', 15: 'Мат.' })));
ch.push(trap('budapest', 'Афиша: будапештский гамбит', 'Пешка e2 привязана ферзём e7 к королю.', Object.assign([], { 14: 'Грубая ошибка.', 15: 'Мат: пешке e2 бить нельзя.' })));
ch.push(trap('lasker', 'Афиша: ловушка Ласкера', 'Контргамбит Альбина. На 8.Крe1 сильно 8...Фh4+.', Object.assign([], { 10: 'Ошибка. Правильно 6.f:e3.', 13: 'Превращение в коня с шахом!', 15: 'Сквозной удар: король уйдёт, ферзь d1 пропадёт.' })));
const PGN = ch.join('\n');

const js = `window.TEATR = ${JSON.stringify(data)};\nwindow.TEATR_PGN = ${JSON.stringify(PGN)};\n`;
fs.writeFileSync(path.join(__dirname, 'out', 'data.js'), js);
fs.writeFileSync(path.join(__dirname, 'out', 'teatr-karabasa.pgn'), PGN);
console.log('graph nodes', nodes, '| data.js', (js.length / 1024).toFixed(0), 'KB | pgn chapters', ch.length, '| quiz dolls', JSON.stringify(data.quizDolls));
