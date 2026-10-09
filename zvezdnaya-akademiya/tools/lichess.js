/* ---------- Lichess: real puzzles from the open lichess.org database, sorted by topic and level ---------- */
/* a lesson is one topic at one level; every solved puzzle gives 1★ once, a lesson gives at most C.LICHESS_CAP stars */
const LI = (() => {
  const CC = window.ChessCore, CAT = window.ACAD_LICHESS || { cells: {}, size: 0 };
  /* levels are named after the pieces, from the pawn up; the range is the Lichess puzzle rating */
  const LEVELS = [
    { n: 1, p: 'P', name: 'Пешка', lab: 'до 900', lo: 0, hi: 900 },
    { n: 2, p: 'N', name: 'Конь', lab: '900–1200', lo: 900, hi: 1200 },
    { n: 3, p: 'B', name: 'Слон', lab: '1200–1500', lo: 1200, hi: 1500 },
    { n: 4, p: 'R', name: 'Ладья', lab: '1500–1800', lo: 1500, hi: 1800 },
    { n: 5, p: 'Q', name: 'Ферзь', lab: '1800+', lo: 1800, hi: 99999 }
  ];
  const GROUPS = [{ id: 'mate', name: 'Маты' }, { id: 'tac', name: 'Тактика' }, { id: 'end', name: 'Пешки и эндшпиль' }];
  /* th: the Lichess theme tag the topic is taken from */
  const TOPICS = [
    { id: 'mate1', g: 'mate', th: 'mateIn1', name: 'Мат в 1 ход', hint: 'Проверьте все шахи. После нужного королю некуда уйти, нечем закрыться и некем побить.' },
    { id: 'mate2', g: 'mate', th: 'mateIn2', name: 'Мат в 2 хода', hint: 'Первый ход почти всегда шах, жертва или ход, который отнимает у короля последнее поле.' },
    { id: 'mate3', g: 'mate', th: 'mateIn3', name: 'Мат в 3 хода', hint: 'Гоните короля шахами туда, где его запрут собственные фигуры.' },
    { id: 'backRank', g: 'mate', th: 'backRankMate', name: 'Мат по последней горизонтали', short: 'Последняя горизонталь', hint: 'Король заперт своими пешками. Ворвитесь ладьёй или ферзём на последнюю горизонталь.' },
    { id: 'smothered', g: 'mate', th: 'smotheredMate', name: 'Спёртый мат', hint: 'Король окружён своими фигурами. Мат может поставить конь.' },
    { id: 'fork', g: 'tac', th: 'fork', name: 'Вилка', hint: 'Найдите ход, который нападает сразу на две цели.' },
    { id: 'pin', g: 'tac', th: 'pin', name: 'Связка', hint: 'Фигура не может уйти: за ней стоит более ценная. Нападите на связанную фигуру ещё раз.' },
    { id: 'skewer', g: 'tac', th: 'skewer', name: 'Сквозной удар', hint: 'Нападите на ценную фигуру так, чтобы после её ухода открылась другая.' },
    { id: 'discovered', g: 'tac', th: 'discoveredAttack', name: 'Вскрытое нападение', hint: 'Уведите фигуру с линии: откроется удар той, что стоит за ней.' },
    { id: 'doubleCheck', g: 'tac', th: 'doubleCheck', name: 'Двойной шах', hint: 'Шах сразу двумя фигурами: закрыться и побить нельзя, королю придётся бежать.' },
    { id: 'hanging', g: 'tac', th: 'hangingPiece', name: 'Незащищённая фигура', hint: 'Посмотрите, какая фигура соперника стоит без защиты.' },
    { id: 'trapped', g: 'tac', th: 'trappedPiece', name: 'Ловля фигуры', hint: 'Фигуре соперника некуда отступить. Нападите на неё.' },
    { id: 'deflection', g: 'tac', th: 'deflection', name: 'Отвлечение', hint: 'Защитник держит важное поле или фигуру. Заставьте его уйти.' },
    { id: 'attraction', g: 'tac', th: 'attraction', name: 'Завлечение', hint: 'Жертвой заманите короля или фигуру на поле, где их ждёт удар.' },
    { id: 'defender', g: 'tac', th: 'capturingDefender', name: 'Уничтожение защиты', hint: 'Побейте фигуру, которая защищает главную цель.' },
    { id: 'intermezzo', g: 'tac', th: 'intermezzo', name: 'Промежуточный ход', hint: 'Не спешите отвечать на угрозу: сначала сделайте ход ещё сильнее.' },
    { id: 'promotion', g: 'end', th: 'promotion', name: 'Превращение пешки', hint: 'Расчистите пешке дорогу к последней горизонтали.' },
    { id: 'pawnEndgame', g: 'end', th: 'pawnEndgame', name: 'Пешечный эндшпиль', hint: 'Считайте ходы: правило квадрата, оппозиция и прорыв.' }
  ];
  const MAXL = 60;
  const TP = id => TOPICS.find(t => t.id === id) || null;
  const LV = n => LEVELS.find(l => l.n === +n) || null;
  const levelOf = r => LEVELS.find(l => r >= l.lo && r < l.hi) || null;
  const lid = (t, n) => `${t}-${n}`;
  const split = id => { const m = /^([A-Za-z0-9]+)-([1-5])$/.exec(String(id)); return m && TP(m[1]) ? { topic: TP(m[1]), level: LV(m[2]) } : null; };
  const title = id => { const x = split(id); return x ? `${x.topic.short || x.topic.name} · ${x.level.name}` : 'Lichess'; };
  const rank = id => { const x = split(id); return x ? TOPICS.indexOf(x.topic) * 10 + x.level.n : 999; };
  const rawId = str => String(str).trim().split(/\s+/)[0];
  const catalog = (t, n) => ((CAT.cells[t] || [])[n - 1]) || [];

  /* a stored puzzle: "id board side castling ep move1 move2 … rating", the moves as in the Lichess database:
     the first one is the opponent's, then the solver and the opponent alternate, the solver moves last */
  function parse(str) {
    const t = String(str).trim().split(/\s+/); if (t.length < 8) return null;
    const id = t[0], rating = +t[t.length - 1], moves = t.slice(5, -1);
    if (!/^[A-Za-z0-9]{4,8}$/.test(id) || !isFinite(rating) || moves.length < 2 || !/^[wb]$/.test(t[2])) return null;
    if (!moves.every(m => /^[a-h][1-8][a-h][1-8][qrbn]?$/.test(m))) return null;
    return { id, fen: t.slice(1, 5).join(' '), moves, rating };
  }
  /* the student always plays their own (white) set: a puzzle for black is mirrored, which keeps every idea intact */
  const flipSq = s => s[0] + (9 - +s[1]);
  const flipUci = u => flipSq(u.slice(0, 2)) + flipSq(u.slice(2, 4)) + u.slice(4);
  const swapCase = ch => ch === ch.toUpperCase() ? ch.toLowerCase() : ch.toUpperCase();
  function flipFen(fen) {
    const [b, side, cas, ep] = fen.split(' ');
    const board = b.split('/').reverse().map(r => r.replace(/[a-zA-Z]/g, swapCase)).join('/');
    const c2 = !cas || cas === '-' ? '-' : cas.split('').map(swapCase).sort((x, y) => 'KQkq'.indexOf(x) - 'KQkq'.indexOf(y)).join('');
    return `${board} ${side === 'w' ? 'b' : 'w'} ${c2} ${!ep || ep === '-' ? '-' : flipSq(ep)}`;
  }
  const cache = new Map();
  function prep(str) {
    if (cache.has(str)) return cache.get(str);
    const p = parse(str); let out = null;
    if (p) {
      try {
        const flip = p.fen.split(' ')[1] === 'w';
        const fen = (flip ? flipFen(p.fen) : p.fen) + ' 0 1', line = flip ? p.moves.map(flipUci) : p.moves.slice();
        const pos = new CC.Position(fen); let ok = true;
        for (const u of line) { const m = pos.findMove(u); if (!m) { ok = false; break; } pos.make(m); }
        if (ok && line.length >= 2) out = { id: p.id, fen, line, rating: p.rating, flip, mate: pos.status() === 'mate', n: Math.floor(line.length / 2) };
      } catch (e) { out = null; }
    }
    cache.set(str, out); return out;
  }
  /* one CSV line of the Lichess puzzle database → a stored puzzle and the topics it belongs to */
  function fromCSV(line) {
    const f = line.split(','); if (f.length < 8 || f[0] === 'PuzzleId') return null;
    const id = f[0].trim(), fen = f[1].trim().split(/\s+/), moves = f[2].trim().split(/\s+/), r = Math.round(+f[3]), ths = f[7].trim().split(/\s+/);
    if (!/^[A-Za-z0-9]{4,8}$/.test(id) || fen.length < 4 || !isFinite(r) || moves.length < 2 || ths.includes('underPromotion')) return null;
    const lv = levelOf(r); if (!lv) return null;
    return { str: [id, ...fen.slice(0, 4), ...moves, r].join(' '), level: lv.n, topics: TOPICS.filter(t => ths.includes(t.th)).map(t => t.id) };
  }
  return { LEVELS, GROUPS, TOPICS, MAXL, TP, LV, lid, split, title, rank, rawId, catalog, prep, fromCSV, size: CAT.size || 0 };
})();

/* ---------- the class library of Lichess lessons: shared in the page's database, otherwise in this browser ---------- */
const Lib = (() => {
  const LSK = 'lichess:v1';
  let mode = 'loading', db = null, L = {}, synced = false;
  const subs = new Set(), writing = {}, dirty = {};
  const emit = () => subs.forEach(f => { try { f(); } catch (e) { console.error(e); } });
  function clean(id, d) {
    const x = LI.split(id); if (!x || !d || typeof d !== 'object') return null;
    const seen = new Set();
    const list = (Array.isArray(d.list) ? d.list : []).filter(s => { if (typeof s !== 'string' || s.length > 220) return false; const k = LI.rawId(s); if (seen.has(k)) return false; seen.add(k); return true; }).slice(0, LI.MAXL);
    return list.length ? { topic: x.topic.id, level: x.level.n, list, at: +d.at || 0 } : null;
  }
  const fromLocal = () => { const o = local.get(LSK, {}) || {}, r = {}; Object.keys(o).forEach(id => { const c = clean(id, o[id]); if (c) r[id] = c; }); return r; };
  function goLocal() { mode = 'local'; L = fromLocal(); synced = true; emit(); }
  async function init() {
    const framed = !!(window.claude && typeof window.claude.use === 'function');
    if (framed) {
      let d = null; try { d = await window.claude.use('db'); } catch (e) { d = null; }
      if (d) {
        db = d; mode = 'db'; let first = true;
        try {
          db.collection('lichess').onSnapshot(snap => {
            const next = {}; snap.docs.forEach(doc => { if (doc.exists) { const c = clean(doc.id, doc.data()); if (c) next[doc.id] = c; } });
            Object.keys(writing).forEach(id => { if (!writing[id]) return; if (L[id]) next[id] = L[id]; else delete next[id]; });
            L = next; first = false; synced = true; emit();
          }, () => goLocal());
        } catch (e) { goLocal(); return; }
        setTimeout(() => { if (first) { synced = true; emit(); } }, 2500);
        return;
      }
    }
    goLocal();
  }
  function persist(id) {
    if (mode !== 'db') { local.set(LSK, L); return; }
    if (writing[id]) { dirty[id] = true; return; }
    writing[id] = true;
    const ref = db.doc('lichess/' + id);
    (L[id] ? ref.set(JSON.parse(JSON.stringify(L[id]))) : ref.delete()).catch(e => {
      if (e && e.code === 'invalid_argument') toast('Урок не сохранился: у вас доступ только для просмотра.', 6000);
      else if (e && e.code === 'quota_exceeded') toast('База заполнена: уберите старые уроки Lichess или учеников.', 6000);
      else toast('Не удалось сохранить урок (' + esc(e && e.code) + ').', 5000);
    }).finally(() => { writing[id] = false; if (dirty[id]) { dirty[id] = false; persist(id); } });
  }
  /* adds puzzles to a lesson (creating it); returns how many were new */
  function add(id, strs) {
    const x = LI.split(id); if (!x) return 0;
    const cur = L[id] || { topic: x.topic.id, level: x.level.n, list: [], at: 0 };
    const have = new Set(cur.list.map(LI.rawId)), list = cur.list.slice(); let n = 0;
    strs.forEach(s => { const k = LI.rawId(s); if (list.length < LI.MAXL && !have.has(k)) { have.add(k); list.push(s); n++; } });
    if (!n) return 0;
    L[id] = { topic: cur.topic, level: cur.level, list, at: Date.now() };
    persist(id); emit(); return n;
  }
  function remove(id) { if (!L[id]) return; delete L[id]; persist(id); emit(); }
  function importAll(o) { let n = 0; Object.keys(o || {}).forEach(id => { const c = clean(id, o[id]); if (c && add(id, c.list)) n++; }); return n; }
  return {
    init, on: f => subs.add(f), ready: () => synced, mode: () => mode, get: id => L[id] || null,
    ids: () => Object.keys(L).sort((a, b) => LI.rank(a) - LI.rank(b)), add, remove, importAll, exportAll: () => JSON.parse(JSON.stringify(L))
  };
})();

/* ---------- the Lichess page: a topic × level board of lessons, and the puzzle board ---------- */
const LiUI = (() => {
  const CC = window.ChessCore, CAP = C.LICHESS_CAP, K = C.LICHESS_KEY;
  const ST = { lid: null, idx: local.get('li-idx', {}), key: null, pz: null, pos: null, step: 0, sel: -1, last: null, opp: null, lock: false, done: false, msg: null, miss: 0, hints: 0, hintSq: -1, it: 0 };
  const glyph = (p, cls) => `<svg class="${cls || 'lig'}" viewBox="0 0 45 45" aria-hidden="true"><use href="#pc-w${p}"/></svg>`;
  const starsIn = (s, id) => s ? +(((s.earned || {})[K] || {})[id]) || 0 : 0;
  const solvedSet = s => new Set(s && s.lp ? s.lp.ok : []);
  const puzzles = id => { const L = Lib.get(id); return L ? L.list.map(LI.prep).filter(Boolean) : []; };
  const word = n => plural(n, 'задача', 'задачи', 'задач');
  const moves = n => plural(n, 'ход', 'хода', 'ходов');
  const setIdx = (id, i) => { ST.idx[id] = i; local.set('li-idx', ST.idx); };
  let SET = {};

  /* shared tabs with the task page */
  function tabs() {
    const s = active();
    return `<div class="seg" role="tablist"><button type="button" data-lt="daily" class="dailytab">${ICON.sparkle}Задача дня${Prog.solvedToday(s) ? ' ✓' : ''}</button>${AD.tasks.series.map(x => `<button type="button" data-lt="${x.n}">${esc(x.title)}</button>`).join('')}<button type="button" class="litab" aria-pressed="true">${glyph('N')}Lichess</button></div>`;
  }
  function bindTabs() {
    $$('[data-lt]').forEach(b => b.onclick = () => { if (b.dataset.lt === 'daily') Board.openDaily(); else Board.openSeries(+b.dataset.lt); });
  }

  /* ----- library ----- */
  function cell(s, t, lv, k) {
    const id = LI.lid(t.id, lv.n), L = Lib.get(id), dark = k % 2 ? ' d' : '';
    const name = `${t.name}, уровень «${lv.name}»`;
    if (!L) return `<td><button type="button" class="lc add${dark}" data-add="${id}" aria-label="Загрузить задачи: ${esc(name)}"><span aria-hidden="true">+</span></button></td>`;
    const ps = puzzles(id), ok = solvedSet(s), got = starsIn(s, id), done = ps.filter(p => ok.has(p.id)).length;
    const pct = Math.round(Math.min(1, got / CAP) * 100), full = got >= CAP, all = ps.length && done === ps.length;
    const label = s ? `${name}: ${got} из ${CAP} звёзд, решено ${done} из ${ps.length}` : `${name}: ${ps.length} ${word(ps.length)}`;
    return `<td><button type="button" class="lc on${dark}${full ? ' full' : ''}${all ? ' all' : ''}" data-open="${id}" style="--p:${pct}%" aria-label="${esc(label)}">
      ${s ? `<b class="num">${got}</b><small>${all ? ICON.check : `/${CAP}`}</small>` : `<b class="num">${ps.length}</b><small>${word(ps.length)}</small>`}</button></td>`;
  }
  function renderLib() {
    const s = active(), ids = Lib.ids(), total = ids.reduce((a, id) => a + Lib.get(id).list.length, 0);
    const acts = tabs() + (s ? `<span class="pillbal" title="Звёзды за задачи Lichess">${Data.earnedIn(s, K)} ${STAR}</span>` : '');
    const pb = page(phead('Задачи Lichess', `Настоящие задачи с lichess.org по темам и уровням. 1★ за задачу, не больше ${CAP}★ за урок.`, acts));
    let k = 0;
    const rows = LI.GROUPS.map(g => `<tr class="grp"><th colspan="6" scope="rowgroup">${esc(g.name)}</th></tr>` + LI.TOPICS.filter(t => t.g === g.id).map(t => {
      const r = `<tr><th scope="row" class="tp"><span>${esc(t.short || t.name)}</span></th>${LI.LEVELS.map((lv, j) => cell(s, t, lv, k + j)).join('')}</tr>`;
      k++; return r;
    }).join('')).join('');
    pb.innerHTML = `<div class="lib">
      <div class="lib-bar"><p class="lib-note">${ids.length ? `В библиотеке ${ids.length} ${plural(ids.length, 'урок', 'урока', 'уроков')}, ${total} ${word(total)}.${s ? ` Звёзды получает ${esc(s.name)}.` : ' Выберите ученика, чтобы получать звёзды.'}` : 'Уроков пока нет. Нажмите на клетку с плюсом: тема — строка, уровень — столбец.'}</p>
        <button type="button" class="btn sm" id="liLoad">${ICON.plus}Загрузить задачи</button></div>
      <div class="lib-wrap"><table class="lgrid"><thead><tr><th scope="col" class="tp">Тема</th>${LI.LEVELS.map(lv => `<th scope="col"><span class="lvh">${glyph(lv.p)}<b>${lv.name}</b><small>${lv.lab}</small></span></th>`).join('')}</tr></thead><tbody>${rows}</tbody></table></div>
    </div>`;
    bindTabs();
    $('#liLoad').onclick = () => openLoader();
    $('.lgrid', pb).addEventListener('click', e => {
      const o = e.target.closest('[data-open]'), a = e.target.closest('[data-add]');
      if (o) { open(o.dataset.open); return; }
      if (a) { const x = LI.split(a.dataset.add); openLoader({ topic: x.topic.id, level: x.level.n }); }
    });
  }
  function open(id) {
    if (!Lib.get(id)) return;
    ST.lid = id; ST.pz = null; ST.key = null; Sound.click();
    if (UI.view === 'lichess') render(); else go('lichess');
  }

  /* ----- the board (same look and feel as the task board) ----- */
  const rowOf = sq => 7 - (sq >> 3), colOf = sq => sq & 7;
  const tf = sq => `translate(${colOf(sq) * 100}%, ${rowOf(sq) * 100}%)`;
  const pieceSVG = p => { const L = p.toUpperCase(); return p === L ? SET[L] : Art.opp(L); };
  function drawSquares() {
    const b = $('#lsq'); if (!b || !ST.pos) return;
    const pos = ST.pos, legal = ST.sel >= 0 ? pos.moves().filter(m => m.from === ST.sel) : [];
    const chk = pos.inCheck() ? pos.kingSq(pos.turn) : -1;
    let h = '';
    for (let row = 0; row < 8; row++) for (let col = 0; col < 8; col++) {
      const sq = (7 - row) * 8 + col, cls = [];
      if ((row + col) % 2) cls.push('d');
      if (ST.last && (ST.last.from === sq || ST.last.to === sq)) cls.push('last');
      if (ST.sel === sq) cls.push('sel');
      if (ST.hintSq === sq) cls.push('hint');
      if (chk === sq) cls.push('chk');
      if (legal.some(m => m.to === sq)) cls.push(pos.board[sq] ? 'cap' : 'dot');
      h += `<i class="${cls.join(' ')}">${row === 7 ? `<b class="f">${'abcdefgh'[col]}</b>` : ''}${col === 0 ? `<b class="r">${8 - row}</b>` : ''}</i>`;
    }
    b.innerHTML = h;
  }
  function drawPieces() {
    const pc = $('#lpcs'); if (!pc || !ST.pos) return;
    let h = '';
    ST.pos.board.forEach((p, sq) => { if (p) h += `<div class="bp ${p === p.toUpperCase() ? 'mine' : ''}" data-sq="${sq}" style="transform:${tf(sq)}">${pieceSVG(p)}</div>`; });
    pc.innerHTML = h;
  }
  const draw = () => { drawSquares(); drawPieces(); };
  function animate(m, after) {
    const pc = $('#lpcs'); if (!pc) { if (after) after(); return; }
    const el = pc.querySelector(`[data-sq="${m.from}"]`), cap = pc.querySelector(`[data-sq="${m.to}"]`);
    if (cap && cap !== el) { cap.style.setProperty('--tf', cap.style.transform); cap.classList.add('gone'); }
    if (el) { el.classList.remove('drag'); el.style.transform = tf(m.to); el.dataset.sq = m.to; }
    Sound.click();
    setTimeout(() => { drawPieces(); if (after) after(); }, reduceMotion ? 0 : 330);
  }
  function play(m, after) {
    ST.pos.make(m); ST.last = { from: m.from, to: m.to }; ST.sel = -1; ST.hintSq = -1;
    drawSquares(); animate(m, after);
  }
  function message(html, cls) { ST.msg = { html, cls }; const m = $('#lmsg'); if (m) { m.className = 'msg ' + (cls || ''); m.innerHTML = html; } }
  const ruSan = (pos, m) => CC.sanToRu(pos.san(m));

  function load(pz) {
    clearTimeout(ST.it); ST.it = 0;
    Object.assign(ST, { key: pz.id, pz, pos: new CC.Position(pz.fen), step: 0, sel: -1, last: null, opp: null, lock: true, done: false, msg: null, miss: 0, hints: 0, hintSq: -1 });
  }
  /* the opponent's move that sets the puzzle, as on lichess.org */
  function intro() {
    if (ST.it || !ST.pz || ST.step !== 0) return;
    message('Соперник делает ход…');
    ST.it = setTimeout(() => {
      ST.it = 0;
      if (UI.view !== 'lichess' || !ST.pz || ST.step !== 0) return;
      const m = ST.pos.findMove(ST.pz.line[0]); if (!m) return;
      const san = ruSan(ST.pos, m), key = ST.key;
      play(m, () => { if (ST.key !== key) return; ST.step = 1; ST.lock = false; ST.opp = { last: ST.last, san }; defaultMsg(); });
    }, reduceMotion ? 80 : 700);
  }
  function defaultMsg() {
    if (!ST.opp || ST.done) return;
    message(`Соперник сыграл <b>${esc(ST.opp.san)}</b>. Ваш ход: нажмите на фигуру и на поле или перетащите её.${active() ? '' : ' Звёзды получит только выбранный ученик.'}`);
  }
  function goalText(pz) {
    if (pz.mate) return `Белые: мат в ${pz.n} ${moves(pz.n)}`;
    return pz.n === 1 ? 'Белые: найдите сильнейший ход' : `Белые: комбинация в ${pz.n} ${moves(pz.n)}`;
  }
  function tryMove(from, to) {
    if (ST.lock || ST.done || ST.step < 1) return;
    const pz = ST.pz, want = pz.line[ST.step] || '';
    const legal = ST.pos.moves().filter(m => m.from === from && m.to === to);
    if (!legal.length) { ST.sel = -1; drawSquares(); return; }
    const sameSq = want.slice(0, 2) === CC.sqName(from) && want.slice(2, 4) === CC.sqName(to);
    const m = legal.find(x => (x.promotion || '') === (sameSq ? (want[4] || '') : (x.promotion ? 'q' : ''))) || legal[0];
    const uci = CC.sqName(m.from) + CC.sqName(m.to) + (m.promotion || '');
    ST.lock = true;
    play(m, () => {
      const mate = ST.pos.status() === 'mate';
      if (uci !== want && !mate) { mistake(m); return; }
      if (mate || ST.step >= pz.line.length - 1) { success(); return; }
      const r = ST.pos.findMove(pz.line[ST.step + 1]); if (!r) { success(); return; }
      const san = ruSan(ST.pos, r), key = ST.key;
      message('Верно! Соперник думает…', 'tip');
      setTimeout(() => {
        if (ST.key !== key) return;
        play(r, () => { if (ST.key !== key) return; ST.step += 2; ST.lock = false; ST.opp = { last: ST.last, san }; message(`Верно! Соперник ответил <b>${esc(san)}</b>. Продолжайте.`, 'tip'); });
      }, reduceMotion ? 0 : 380);
    });
  }
  function mistake(m) {
    ST.miss++; Sound.bad();
    message(ST.pos.inCheck() ? 'Шах есть, но это не самый сильный ход. Поищите ещё.' : 'Этот ход не решает задачу. Попробуйте найти сильнее.', 'bad');
    const bd = $('#lboard'); if (bd) Board.fx.wrong(bd, m.to);
    const key = ST.key;
    setTimeout(() => {
      if (ST.key !== key) return;
      ST.pos.unmake(); ST.last = ST.opp ? ST.opp.last : null; ST.lock = false; draw();
      const el = $(`#lpcs [data-sq="${m.from}"]`); if (el) el.classList.add('shake');
    }, reduceMotion ? 300 : 800);
  }
  function success() {
    ST.done = true; ST.lock = false;
    const s = active(), id = ST.lid;
    let r = null;
    if (s && Lib.get(id) && !Data.readOnly()) r = Data.solveLichess(s.id, { id, title: LI.title(id) }, ST.pz.id, { clean: !ST.miss && !ST.hints });
    const cur = s && Data.get(s.id), have = starsIn(cur, id);
    let tip = 'Выберите ученика вверху справа, чтобы получать звёзды.';
    if (s && r && r.got) tip = `<b>+1★</b> в профиль ${esc(s.name)}. За этот урок: ${have} из ${CAP}★.`;
    else if (s && r && r.capped) tip = `Звёзды этого урока уже собраны: ${CAP} из ${CAP}★. Дальше задачи для тренировки, без звёзд.`;
    else if (s && r) tip = 'Звезда за эту задачу уже получена раньше.';
    else if (s) tip = 'Режим просмотра: звёзды не начисляются.';
    message(`<span class="stars3"><i class="${r && r.got ? 'on' : ''}" style="--k:1">★</i></span><br><b>Решено!</b> ${tip}`, 'ok');
    const bd = $('#lboard');
    if (bd) {
      const pos = ST.pos;
      if (pos.status() === 'mate') Board.fx.mate(bd, pos.kingSq(pos.turn), ST.last ? ST.last.to : 0); else bd.classList.add('won');
      FX.at(bd, { n: 70, speed: 10, colors: ['#ffd66b', '#ffffff', '#6d86ff', '#3ddc97'] });
      if (r && r.got) Motion.starFly(bd, 1);
    }
    Sound.reveal(r && r.got ? 'rare' : 'uncommon');
    renderSide();
    const nx = $('#lNext'); if (nx) nx.classList.remove('soft');
  }
  function hint() {
    if (ST.done || ST.lock || ST.step < 1) return;
    ST.hints++; Sound.click();
    if (ST.hints === 1) { message(`<b>Подсказка.</b> ${esc(LI.split(ST.lid).topic.hint)}`, 'tip'); return; }
    ST.hintSq = CC.sqIndex(ST.pz.line[ST.step].slice(0, 2)); drawSquares();
    message('<b>Подсказка.</b> Ходит фигура на подсвеченном поле.', 'tip');
  }
  function pick(i) {
    const list = puzzles(ST.lid); if (!list.length) return;
    i = (i + list.length) % list.length; setIdx(ST.lid, i); load(list[i]); Sound.click(); render();
  }
  function next() {
    const list = puzzles(ST.lid); if (!list.length) return;
    const ok = solvedSet(active()), i = Math.max(0, list.findIndex(p => p.id === ST.key));
    for (let k = 1; k <= list.length; k++) { const c = (i + k) % list.length; if (!ok.has(list[c].id)) { pick(c); return; } }
    pick(i + 1);
  }
  function bindBoard() {
    const bd = $('#lboard'); if (!bd) return;
    let drag = null;
    const sqAt = (x, y) => { const r = bd.getBoundingClientRect(); const c = Math.floor((x - r.left) / r.width * 8), rw = Math.floor((y - r.top) / r.height * 8); if (c < 0 || c > 7 || rw < 0 || rw > 7) return -1; return (7 - rw) * 8 + c; };
    bd.addEventListener('pointerdown', e => {
      if (ST.lock || ST.done || ST.step < 1) return;
      const sq = sqAt(e.clientX, e.clientY); if (sq < 0) return;
      const p = ST.pos.board[sq];
      if (ST.sel >= 0 && ST.sel !== sq && !(p && p === p.toUpperCase())) { tryMove(ST.sel, sq); return; }
      if (!p || p !== p.toUpperCase()) { ST.sel = -1; drawSquares(); return; }
      e.preventDefault();
      ST.sel = sq; drawSquares();
      drag = { sq, el: $(`#lpcs [data-sq="${sq}"]`), x0: e.clientX, y0: e.clientY, moved: false };
      try { bd.setPointerCapture(e.pointerId); } catch (err) { /* capture unsupported */ }
    });
    bd.addEventListener('pointermove', e => {
      if (!drag || !drag.el) return;
      if (!drag.moved && Math.hypot(e.clientX - drag.x0, e.clientY - drag.y0) < 5) return;
      drag.moved = true;
      const r = bd.getBoundingClientRect(), cellW = r.width / 8;
      drag.el.classList.add('drag');
      drag.el.style.transform = `translate(${e.clientX - r.left - cellW / 2}px, ${e.clientY - r.top - cellW / 2}px)`;
    });
    const up = e => {
      if (!drag) return;
      const d = drag; drag = null;
      if (!d.moved) return;
      const to = sqAt(e.clientX, e.clientY);
      if (to >= 0 && to !== d.sq && ST.pos.moves().some(m => m.from === d.sq && m.to === to)) tryMove(d.sq, to);
      else if (d.el) { d.el.classList.remove('drag'); d.el.style.transform = tf(d.sq); }
    };
    bd.addEventListener('pointerup', up); bd.addEventListener('pointercancel', up);
  }
  /* the stars meter and the puzzle grid of the lesson */
  function renderSide() {
    const box = $('#lside'); if (!box) return;
    const s = active(), list = puzzles(ST.lid), ok = solvedSet(s), have = starsIn(s, ST.lid), ci = list.findIndex(p => p.id === ST.key);
    const done = list.filter(p => ok.has(p.id)).length;
    box.innerHTML = `<div class="licap ${have >= CAP ? 'full' : ''}"><div class="spread"><span>Звёзды урока${s ? ` · ${esc(s.name)}` : ''}</span><b class="num">${have} из ${CAP} ${STAR}</b></div><div class="meter"><i style="width:${Math.round(Math.min(1, have / CAP) * 100)}%"></i></div>
        <span class="small muted">Решено ${done} из ${list.length}. ${have >= CAP ? 'Звёзды урока собраны, остальные задачи для тренировки.' : `За каждую новую задачу 1★.`}</span></div>
      <div class="lidots" role="list">${list.map((p, i) => `<button type="button" data-pi="${i}" aria-current="${i === ci}" class="${ok.has(p.id) ? 'ok' : ''}" title="Задача ${i + 1}, рейтинг ${p.rating}">${ok.has(p.id) ? '✓' : i + 1}</button>`).join('')}</div>`;
  }
  function renderPlay(id) {
    const s = active(), list = puzzles(id), x = LI.split(id);
    if (!list.length || !x) { ST.lid = null; renderLib(); return; }
    let i = list.findIndex(p => p.id === ST.key);
    if (i < 0) { i = Math.max(0, Math.min(list.length - 1, ST.idx[id] || 0)); load(list[i]); }
    const pz = ST.pz;
    SET = {}; 'KQRBNP'.split('').forEach(L => { SET[L] = s ? setPiece(s, L) : Art.model('c_' + L, 'plain'); });
    const acts = tabs() + (s ? `<span class="pillbal" title="Звёзды за задачи Lichess">${Data.earnedIn(s, K)} ${STAR}</span>` : '');
    const pb = page(phead(esc(x.topic.name), `Lichess · уровень «${x.level.name}», рейтинг задач ${x.level.lab}. ${esc(x.topic.hint)}`, acts));
    pb.innerHTML = `<div class="tasks li-play">
      <div class="bwrap"><div class="board ${ST.done ? 'won' : ''}" id="lboard" role="application" aria-label="Шахматная доска, ход белых"><div class="sqs" id="lsq"></div><div class="pcs" id="lpcs"></div></div></div>
      <div class="tpanel">
        <div class="tcard"><span class="eyebrow li-ey"><button type="button" class="libk" id="lBack">${ICON.chevL}Все уроки</button><span>${esc(LI.title(id))}</span></span><span class="tname">Задача ${i + 1} из ${list.length}</span><span class="goal"><i></i>${goalText(pz)}</span>
          <span class="small muted">Рейтинг ${pz.rating} · <a href="https://lichess.org/training/${esc(pz.id)}" target="_blank" rel="noopener">задача ${esc(pz.id)} на lichess.org</a>${pz.flip ? ' · в оригинале за чёрных' : ''}</span></div>
        <div class="row"><button type="button" class="btn sm soft" id="lHint">${ICON.bulb}Подсказка</button><button type="button" class="btn sm soft" id="lReset">${ICON.reset}Заново</button><button type="button" class="btn sm ${ST.done ? '' : 'soft'}" id="lNext">Дальше${ICON.chev}</button></div>
        <div class="msg" id="lmsg"></div>
        <div class="liside" id="lside"></div>
        <button type="button" class="libdel" id="lDel">${ICON.trash}Убрать урок из библиотеки</button>
      </div></div>`;
    bindTabs();
    $('#lBack').onclick = () => { ST.lid = null; Sound.click(); render(); };
    $('#lHint').onclick = hint;
    $('#lReset').onclick = () => { load(ST.pz); render(); };
    $('#lNext').onclick = next;
    $('#lside').addEventListener('click', e => { const b = e.target.closest('[data-pi]'); if (b) pick(+b.dataset.pi); });
    twoStep($('#lDel'), 'Точно убрать? Звёзды учеников останутся', () => { Lib.remove(id); ST.lid = null; toast(`Урок «${esc(LI.title(id))}» убран из библиотеки`); render(); });
    draw(); renderSide(); bindBoard();
    if (ST.msg) message(ST.msg.html, ST.msg.cls); else defaultMsg();
    if (ST.step === 0) intro();
  }
  function render() {
    if (!Lib.ready() || !Data.ready()) { page(phead('Задачи Lichess', 'Загружаю библиотеку…')); return; }
    if (ST.lid && Lib.get(ST.lid)) { renderPlay(ST.lid); return; }
    ST.lid = null; renderLib();
  }

  /* ----- loading puzzles: from the built-in Lichess catalog or from a Lichess database file ----- */
  const last = { topic: local.get('li-topic', 'mate1'), level: local.get('li-level', 1), count: local.get('li-count', 20) };
  async function scanFile(f, acc, onProg, alive) {
    let stream = f.stream();
    if (/\.gz$/i.test(f.name)) stream = stream.pipeThrough(new DecompressionStream('gzip'));
    const rd = stream.pipeThrough(new TextDecoderStream()).getReader();
    let buf = '', seen = 0, tick = 0;
    for (;;) {
      const { value, done } = await rd.read(); if (done) break;
      if (!alive()) { try { rd.cancel(); } catch (e) { /* already closed */ } return false; }
      buf += value; seen += value.length;
      const lines = buf.split('\n'); buf = lines.pop();
      lines.forEach(l => scanLine(l, acc));
      if (++tick % 24 === 0) { onProg(Math.min(1, seen / (f.size || 1))); await new Promise(r => setTimeout(r, 0)); }
    }
    if (buf) scanLine(buf, acc);
    return true;
  }
  const KEEP = 90;
  function scanLine(line, acc) {
    if (!line || line.length < 20) return;
    const x = LI.fromCSV(line.replace(/\r$/, ''));
    if (!x) { if (!/^PuzzleId/.test(line)) acc.bad++; return; }
    acc.total++;
    x.topics.forEach(t => {
      const k = LI.lid(t, x.level), c = acc.cells[k] || (acc.cells[k] = { n: 0, sample: [] });
      c.n++;
      if (c.sample.length < KEEP) c.sample.push(x.str); else { const j = Math.floor(Math.random() * c.n); if (j < KEEP) c.sample[j] = x.str; }
    });
  }
  function shuffle(a) { for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(rand() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; }
  function openLoader(pre = {}) {
    let src = 'cat', topic = pre.topic || last.topic, level = pre.level || last.level, count = last.count, file = null, busy = false, alive = true;
    if (!LI.TP(topic)) topic = 'mate1';
    const chip = (attr, v, cur, html, lab) => `<button type="button" class="chip" data-${attr}="${v}" aria-pressed="${v === cur}"${lab ? ` aria-label="${esc(lab)}"` : ''}>${html}</button>`;
    const m = modal(`<p class="eyebrow">Lichess</p><h2 class="h2">Загрузить задачи</h2>
      <div class="seg" id="lsrc"><button type="button" data-src="cat" aria-pressed="true">Каталог Академии</button><button type="button" data-src="file" aria-pressed="false">Файл с lichess.org</button></div>
      <p class="small muted" id="lcat">${LI.size.toLocaleString('ru-RU')} задач из открытой базы lichess.org, уже разложенных по темам и уровням. Загрузка работает без интернета.</p>
      <div class="lfile" id="lfile" hidden>
        <p class="small muted">Скачайте базу задач на <a href="https://database.lichess.org/#puzzles" target="_blank" rel="noopener">database.lichess.org</a>, распакуйте архив .zst (например, 7-Zip) и выберите lichess_db_puzzle.csv. Подойдёт и кусок файла.</p>
        <div class="row"><label class="btn sm soft" for="lfin" style="cursor:pointer">Выбрать файл</label><input type="file" id="lfin" accept=".csv,.txt,.gz,text/csv,text/plain" hidden><span class="small muted clip1" id="lfname"></span></div>
        <div class="lprog" id="lprog" hidden><i></i></div>
        <textarea id="lpaste" rows="3" spellcheck="false" placeholder="Или вставьте строки из файла: PuzzleId,FEN,Moves,Rating,…"></textarea>
      </div>
      <div class="field"><label>Тема</label><div class="chips" id="ltop">${LI.TOPICS.map(t => chip('t', t.id, topic, esc(t.short || t.name))).join('')}</div></div>
      <div class="field"><label>Уровень</label><div class="chips lvchips" id="llev">${LI.LEVELS.map(lv => chip('l', lv.n, level, `${glyph(lv.p)}${lv.name} <small>${lv.lab}</small>`, `${lv.name}, рейтинг ${lv.lab}`)).join('')}</div></div>
      <div class="field"><label>Сколько задач</label><div class="chips" id="lcnt">${[10, 20, 30].map(n => chip('c', n, count, String(n))).join('')}</div></div>
      <p class="lstat" id="lstat" aria-live="polite"></p>
      <div class="row"><button type="button" class="btn" id="lgo">Загрузить</button></div>`, { cls: 'lload', onClose: () => { alive = false; } });
    const el = m.el;
    const pool = () => {
      const id = LI.lid(topic, level), L = Lib.get(id), have = new Set(L ? L.list.map(LI.rawId) : []);
      const all = src === 'cat' ? LI.catalog(topic, level) : (file && file.cells[id] ? file.cells[id].sample : []);
      return { id, L, room: LI.MAXL - (L ? L.list.length : 0), fresh: all.filter(s => !have.has(LI.rawId(s))), found: src === 'cat' ? all.length : (file && file.cells[id] ? file.cells[id].n : 0) };
    };
    const upd = () => {
      $$('#lsrc [data-src]', el).forEach(b => b.setAttribute('aria-pressed', b.dataset.src === src));
      $('#lfile', el).hidden = src !== 'file'; $('#lcat', el).hidden = src !== 'cat';
      $$('#ltop [data-t]', el).forEach(b => b.setAttribute('aria-pressed', b.dataset.t === topic));
      $$('#llev [data-l]', el).forEach(b => b.setAttribute('aria-pressed', +b.dataset.l === level));
      $$('#lcnt [data-c]', el).forEach(b => b.setAttribute('aria-pressed', +b.dataset.c === count));
      const p = pool(), n = Math.min(count, p.fresh.length, Math.max(0, p.room)), t = LI.TP(topic), lv = LI.LV(level), go = $('#lgo', el);
      let txt;
      if (src === 'file' && !file) txt = busy ? 'Читаю файл…' : 'Выберите файл или вставьте строки.';
      else if (src === 'file' && !p.found) txt = `В файле ${file.total.toLocaleString('ru-RU')} ${word(file.total)}, но для темы «${esc(t.name)}» уровня «${lv.name}» подходящих нет.`;
      else if (p.room <= 0) txt = `В уроке «${esc(LI.title(p.id))}» уже ${LI.MAXL} ${word(LI.MAXL)}: это максимум.`;
      else if (!p.fresh.length) txt = src === 'cat' ? 'Все задачи каталога этой темы и уровня уже в уроке. Ещё задачи можно взять из файла с lichess.org.' : 'Все найденные задачи этой темы и уровня уже в уроке.';
      else txt = `${src === 'file' ? `В файле подходят ${p.found.toLocaleString('ru-RU')} ${word(p.found)}. ` : ''}${p.L ? `В уроке уже ${p.L.list.length} ${word(p.L.list.length)}, добавятся новые.` : `Получится новый урок «${esc(LI.title(p.id))}».`} За урок можно заработать не больше ${CAP}★.`;
      $('#lstat', el).innerHTML = txt;
      go.disabled = busy || !n || Data.readOnly();
      go.textContent = n ? `Загрузить ${n} ${plural(n, 'задачу', 'задачи', 'задач')}` : 'Загрузить';
    };
    el.addEventListener('click', e => {
      const b = e.target.closest('[data-src],[data-t],[data-l],[data-c]'); if (!b) return;
      if (b.dataset.src) src = b.dataset.src;
      if (b.dataset.t) topic = b.dataset.t;
      if (b.dataset.l) level = +b.dataset.l;
      if (b.dataset.c) count = +b.dataset.c;
      Sound.click(); upd();
    });
    const prog = v => { const p = $('#lprog', el); p.hidden = v == null; if (v != null) $('i', p).style.width = Math.round(v * 100) + '%'; };
    $('#lfin', el).onchange = async e => {
      const f = e.target.files && e.target.files[0]; e.target.value = ''; if (!f) return;
      $('#lfname', el).textContent = f.name;
      if (/\.zst$/i.test(f.name)) { file = null; $('#lstat', el).innerHTML = 'Это сжатый архив .zst. Распакуйте его (например, 7-Zip) и выберите получившийся файл .csv.'; return; }
      const acc = { total: 0, bad: 0, cells: {} };
      busy = true; file = null; prog(0); upd();
      try {
        if (typeof f.stream === 'function' && typeof TextDecoderStream === 'function') { if (!(await scanFile(f, acc, prog, () => alive))) return; }
        else String(await f.text()).split('\n').forEach(l => scanLine(l, acc));
      } catch (err) { busy = false; prog(null); $('#lstat', el).innerHTML = 'Файл не читается. Нужен распакованный CSV из базы задач Lichess.'; return; }
      busy = false; prog(null);
      if (!acc.total) { $('#lstat', el).innerHTML = 'В файле нет задач Lichess. Нужен CSV с колонками PuzzleId, FEN, Moves, Rating, …, Themes.'; return; }
      file = acc; upd();
    };
    let pt = 0;
    $('#lpaste', el).addEventListener('input', e => {
      clearTimeout(pt);
      pt = setTimeout(() => {
        const acc = { total: 0, bad: 0, cells: {} };
        String(e.target.value).split('\n').forEach(l => scanLine(l.trim(), acc));
        file = acc.total ? acc : null; $('#lfname', el).textContent = acc.total ? `Вставлено: ${acc.total} ${word(acc.total)}` : '';
        if (e.target.value.trim() && !acc.total) $('#lstat', el).innerHTML = 'Строки не похожи на базу задач Lichess. Нужен формат PuzzleId,FEN,Moves,Rating,…,Themes.';
        else upd();
      }, 250);
    });
    $('#lgo', el).onclick = () => {
      const p = pool(), want = Math.min(count, Math.max(0, p.room)), take = [];
      for (const s of shuffle(p.fresh.slice())) { if (take.length >= want) break; if (LI.prep(s)) take.push(s); }
      if (!take.length) { toast('Не нашлось задач, которые можно загрузить.'); return; }
      take.sort((a, b) => +a.split(' ').pop() - +b.split(' ').pop());
      const n = Lib.add(p.id, take);
      Object.assign(last, { topic, level, count }); local.set('li-topic', topic); local.set('li-level', level); local.set('li-count', count);
      m.close(); Sound.star();
      toast(`Урок «${esc(LI.title(p.id))}»: +${n} ${word(n)}`);
      open(p.id);
    };
    upd();
  }
  return { render, open, openLoader, glyph, lessonCount: () => Lib.ids().length };
})();

