// Assembles window.MELNICA (positions + verified graphs) and window.MELNICA_PGN (a Lichess study) into out/data.js
const fs = require('fs'), path = require('path');
const C = require('./chesscore.js');
const T = require('./tasks.js');
const { Q } = require('./quiz.js');
const G = JSON.parse(fs.readFileSync(path.join(__dirname, 'out', 'graphs.json'), 'utf8'));

const PRO = 'r4rk1/pbpq1ppp/1p6/n2N4/8/8/PPP1QPPP/2BR1RK1 w - - 0 1';
const data = {
  start: C.START,
  pro: { fen: PRO, demo: ['Nf6+', 'gxf6', 'Rxd7'] },
  quiz: ['q1', 'q2', 'q3', 'q4', 'q5', 'q6'].map(k => Q[k]),
  g: {},
  mill: G.w1,
  torre: { moves: T.TORRE_GAME.split(' '), from: 48 },
  lasker: { moves: T.LASKER_GAME.split(' '), from: 20 }
};
['a1', 'a2', 'a3', 'b1', 'b2', 'b3', 'd1', 'd2', 'w2', 't1', 'e1', 'e2', 'e3', 'h1'].forEach(id => {
  if (!G[id]) throw new Error('missing graph ' + id);
  data.g[id] = G[id];
});

// sanity: every reply in every graph is legal, every good move is legal
let nodes = 0;
for (const [id, t] of Object.entries(Object.assign({ w1: G.w1 }, data.g))) {
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

// ---------- PGN: one Lichess study chapter per position ----------
const ru = s => C.sanToRu(s);
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
function chapter(name, fen, sans, intro, comments, extra) {
  const custom = fen !== C.START;
  const side = new C.Position(fen).turn;
  return [`[Event "Мельница Торре · ${name}"]`, '[Site "Онлайн-урок"]', '[Result "*"]', `[ChapterName "${name}"]`, `[Orientation "${side === 'w' ? 'white' : 'black'}"]`]
    .concat(extra || []).concat(custom ? ['[SetUp "1"]', `[FEN "${fen}"]`] : [])
    .join('\n') + `\n\n{ ${intro} } ${pgnMoves(fen, sans, comments)} *\n`;
}
const firstLine = id => T.graphs.find(t => t.id === id).lines[0].split(' ');
const ch = [];
ch.push(chapter('Анатомия засады', PRO, data.pro.demo, 'Пушка — ладья d1, ширма — конь d5, мишень — ферзь d7. Ширма уходит с шахом, пушка стреляет.'));
ch.push(chapter('Засада 1: слон-ширма', data.g.a1.fen, firstLine('a1'), 'Ход белых. Ладья d1 смотрит на ферзя d6 сквозь слона d3.', ['Ширма уходит с шахом.', null, 'Пушка стреляет: ферзь выигран.']));
ch.push(chapter('Засада 2: пешка-ширма', data.g.a2.fen, firstLine('a2'), 'Ход белых. Слон b2 спрятан за пешкой d4.', ['Три угрозы сразу: на коня c6, слона e6 и ферзя f6.']));
ch.push(chapter('Засада 3: конь-ширма', data.g.a3.fen, firstLine('a3'), 'Ход чёрных. Ладья e8 смотрит на ферзя e1 сквозь коня e5.', ['Шах — белым не до ферзя.', null, 'Ферзь взят с шахом.']));
ch.push(chapter('Открытый шах: русская партия', C.START, T.PETROFF.split(' ').concat(['Nf6', 'Nc6+', 'Be7', 'Nxd8']), 'Ловушка в русской партии. Правильно 4...Фe7!', [null, null, null, null, null, 'Ошибка. Нужно 3...d6.', 'Ферзь e2 смотрит на короля e8.', 'Грубая ошибка. Правильно 4...Фe7!', 'Открытый шах, и конь нападает на ферзя d8.']));
ch.push(chapter('Открытый шах: слон под боем', data.g.b2.fen, firstLine('b2'), 'Ход белых. Ферзь c7 напал на слона e5. Мат в 4 хода.', ['Открытый шах, ферзь взят.']));
ch.push(chapter('Вскрытая связка: Каро — Канн', C.START, T.CARO.split(' ').concat(['Ngf6', 'Nd6#']), 'Ловушка в защите Каро — Канн. Правильно 5...Кdf6!', [null, null, null, null, null, null, null, null, 'Ферзь e2 смотрит на линию «e».', 'Ошибка! Правильно 5...Кdf6.', 'Мат: пешка e7 связана ферзём e2.']));
['q1', 'q2', 'q3', 'q4', 'q5', 'q6'].forEach((k, i) => ch.push(chapter(`Три ответа на шах ${i + 1}`, Q[k], [], 'Чем можно ответить на шах: уйти королём, взять шахующую фигуру, закрыться?')));
ch.push(chapter('Двойной шах: мат в 1', data.g.d1.fen, firstLine('d1'), 'Ход белых. Слон b2 спрятан за конём e5.', ['Двойной шах и мат. Есть и второй мат: К:f7#.']));
ch.push(chapter('Двойной шах: мат в 2', data.g.d2.fen, firstLine('d2'), 'Ход белых. Ладья h1 спрятана за конём h5.', ['Заманивание на линию «h».', null, 'Двойной шах конём и ладьёй — мат.']));
ch.push(chapter('Жернова: намели муки', data.mill.fen, ['Rxf7+', 'Kg8', 'Rg7+', 'Kh8', 'Rxd7+', 'Kg8', 'Rg7+', 'Kh8', 'Rxb7+', 'Kg8', 'Rg7+', 'Kh8', 'Rxa7+', 'Kg8', 'Rg7+', 'Kh8', 'Rg5+', 'Kh7', 'Rxh5'], 'Ход белых. Мельница: ладья уходит с открытым шахом и берёт, затем возвращается с шахом.', [null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, 'Вся мука в мешке: 15 очков.']));
ch.push(chapter('Жернова: мат в 4', data.g.w2.fen, firstLine('w2'), 'Ход белых. Мельница расчищает дорогу второй ладье.', [null, null, null, null, null, null, 'Мат.']));
ch.push([
  '[Event "Москва"]', '[Site "Москва"]', '[Date "1925.??.??"]', '[White "Торре, Карлос"]', '[Black "Ласкер, Эмануил"]', '[Result "1-0"]', '[ChapterName "Торре — Ласкер, Москва 1925"]', '[Orientation "white"]'
].join('\n') + '\n\n{ Атака Торре и знаменитая мельница. } ' + pgnMoves(C.START, T.TORRE_GAME.split(' '), Object.assign([], { 48: 'Сf6!! Ферзь отдан: мельница запущена.', 52: 'Открытый шах.', 56: 'Слон b7 в мешке.', 62: 'Ферзь вернулся. Белые с лишним материалом.' })) + ' 1-0\n');
ch.push(chapter('Защита: уберите мишень', data.g.e1.fen, ['Qc7'], 'Ход чёрных. Белые грозят С:h7+ и Л:d6. Ферзь уходит с линии «d».'));
ch.push(chapter('Защита: русская партия', data.g.e2.fen, firstLine('e2'), 'Ход чёрных. Закройте линию «e» сами.', ['Ферзь закрывает линию и связывает коня e5.', null, 'Связанный конь погибнет.']));
ch.push(chapter('Защита: каким конём?', data.g.e3.fen, firstLine('e3'), 'Ход чёрных. На 5...Кgf6?? последует 6.Кd6#.', ['Правильный конь.']));
ch.push([
  '[Event "Лондон"]', '[Site "Лондон"]', '[Date "1912.??.??"]', '[White "Ласкер, Эдвард"]', '[Black "Томас, Джордж"]', '[Result "1-0"]', '[ChapterName "Эд. Ласкер — Томас, Лондон 1912"]', '[Orientation "white"]'
].join('\n') + '\n\n{ Королевская охота: двойной шах и мат ходом короля. } ' + pgnMoves(C.START, T.LASKER_GAME.split(' '), Object.assign([], { 20: 'Ферзь отдан!', 22: 'Двойной шах.', 34: 'Мат вскрытым шахом. Мат давала и рокировка 18.0-0-0#.' })) + ' 1-0\n');
const PGN = ch.join('\n');

const js = `window.MELNICA = ${JSON.stringify(data)};\nwindow.MELNICA_PGN = ${JSON.stringify(PGN)};\n`;
fs.writeFileSync(path.join(__dirname, 'out', 'data.js'), js);
fs.writeFileSync(path.join(__dirname, 'out', 'melnitsa-torre.pgn'), PGN);
console.log('graph nodes', nodes, '| data.js', (js.length / 1024).toFixed(0), 'KB | pgn chapters', ch.length);
