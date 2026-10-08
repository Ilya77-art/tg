const Arena = (() => {
  const CC = window.ChessCore;
  /* four worlds of three opponents; a world multiplies the stars of its wins */
  const WORLDS = {
    meadow: { name: 'Солнечная долина', from: 0, mult: 1 },
    cove: { name: 'Пиратская бухта', from: 3, mult: 2 },
    peaks: { name: 'Ледяные вершины', from: 6, mult: 3 },
    citadel: { name: 'Огненная цитадель', from: 9, mult: 4 }
  };
  const WKEYS = Object.keys(WORLDS);
  const FULL = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1';
  /* who: the line under the name; hi: the greeting; lost: what the opponent says when the student wins; won: when the opponent wins.
     eng: depth, careless (chance of a softer move), margin (how much softer, cp), noise (cp), sees mate in one, avoids mate in one */
  const BOTS = [
    { id: 'b01', name: 'Квакша', world: 'meadow', who: 'Любит пруд и смелые первые ходы.', look: { m: 'c_P', skin: 'emerald' },
      fen: '4k3/pppppppp/8/8/8/8/PPPPPPPP/3QK3 w - - 0 1', mine: 'Король, ферзь и восемь пешек', theirs: 'Король и восемь пешек',
      hi: 'Ква! Сделаем первый ход вместе?', lost: 'Вот это прыжок! Ты меня переиграл.', won: 'Хорошая партия! Давай попробуем ещё.',
      eng: { depth: 1, careless: .6, margin: 900 } },
    { id: 'b02', name: 'Колючка', world: 'meadow', who: 'Терпеливый хранитель лесных троп.', look: { m: 'm_castle', skin: 'wood' },
      fen: 'r3k3/pppppppp/8/8/8/8/PPPPPPPP/R3K2R w KQq - 0 1', mine: 'Король, две ладьи и пешки', theirs: 'Король, одна ладья и пешки',
      hi: 'Мои иголки острые, а ходы добрые.', lost: 'Ты нашёл дорожку сквозь мои колючки!', won: 'Каждый ход помогает стать сильнее.',
      eng: { depth: 1, careless: .45, margin: 500 } },
    { id: 'b03', name: 'Шустрик', world: 'meadow', who: 'Любопытный енот, мастер сюрпризов.', look: { m: 'm_ninja', skin: 'slate' },
      fen: '2b1k1n1/pppppppp/8/8/8/8/PPPPPPPP/1NB1KBN1 w - - 0 1', mine: 'Король, два коня, два слона и пешки', theirs: 'Король, конь, слон и пешки',
      hi: 'Посмотрим, кто первым найдёт хитрый ход!', lost: 'Ты оказался ещё шустрее меня!', won: 'Моя хитрость сработала. В следующий раз получится у тебя.',
      eng: { depth: 2, careless: .35, margin: 400 } },
    { id: 'b04', name: 'Окто', world: 'cove', who: 'Восемь щупалец и восемь хороших планов.', look: { m: 'm_lighthouse', skin: 'ice' },
      fen: 'rnb1kbnr/pppppppp/8/8/8/8/PPPPPPPP/RNB1KBNR w KQkq - 0 1', mine: 'Все фигуры, кроме ферзя', theirs: 'Все фигуры, кроме ферзя',
      hi: 'На доске главное держать всё под контролем.', lost: 'Ты распутал все мои комбинации!', won: 'Изучи центр, и у тебя будет хороший план.',
      eng: { depth: 2, careless: .25, margin: 300, noise: 40 } },
    { id: 'b05', name: 'Капитан Кеша', world: 'cove', who: 'Весёлый капитан шахматного корабля.', look: { m: 'm_pirate', skin: 'tiger' },
      fen: 'rnb1kbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1', mine: 'Полный комплект', theirs: 'Полный комплект, но без ферзя',
      hi: 'Все фигуры на палубу! Начинаем партию.', lost: 'Сокровище победы твоё, юный капитан!', won: 'Ты смело играл. Поднимай паруса снова!',
      eng: { depth: 2, careless: .18, margin: 250, noise: 30, seesMate: true } },
    { id: 'b06', name: 'Тень', world: 'cove', who: 'Тихий кот с очень внимательным взглядом.', look: { m: 'm_cat', skin: 'carbon' },
      fen: FULL, mine: 'Полный комплект', theirs: 'Полный комплект',
      hi: 'Самый сильный ход иногда самый тихий.', lost: 'Ты заметил то, что я спрятал. Отлично.', won: 'Следи за угрозами, и тень отступит.',
      eng: { depth: 3, careless: .14, margin: 200, noise: 30, seesMate: true } },
    { id: 'b07', name: 'Снежок', world: 'peaks', who: 'Добрый йети с крепкой защитой.', look: { m: 'm_viking', skin: 'marble' },
      fen: FULL, mine: 'Полный комплект', theirs: 'Полный комплект',
      hi: 'Подумай спокойно. Здесь никто не торопится.', lost: 'Твоя комбинация растопила мой лёд!', won: 'Мы сыграли хорошую партию. Ещё одну?',
      eng: { depth: 3, careless: .1, margin: 150, noise: 25, seesMate: true, avoidMate: true } },
    { id: 'b08', name: 'Бип-Буп', world: 'peaks', who: 'Робот, который учится вместе с тобой.', look: { m: 'm_robot', skin: 'chrome' },
      fen: FULL, mine: 'Полный комплект', theirs: 'Полный комплект',
      hi: 'Бип! Шахматные системы готовы.', lost: 'Буп! Обнаружен будущий чемпион.', won: 'Расчёт завершён. Можно разобрать ходы.',
      eng: { depth: 3, careless: .06, margin: 120, noise: 15, seesMate: true, avoidMate: true } },
    { id: 'b09', name: 'Профессор Ух', world: 'peaks', who: 'Сова, изучающая звёзды и эндшпили.', look: { m: 'm_wizard', skin: 'galaxy' },
      fen: FULL, mine: 'Полный комплект', theirs: 'Полный комплект',
      hi: 'Каждая фигура похожа на звезду: ей нужно своё место.', lost: 'Великолепно! Ты увидел дальше меня.', won: 'Сначала проверь шахи и взятия. Потом ищи план.',
      eng: { depth: 4, careless: .04, margin: 90, noise: 10, seesMate: true, avoidMate: true } },
    { id: 'b10', name: 'Голем', world: 'citadel', who: 'Каменный страж ворот цитадели.', look: { m: 'c_R', skin: 'lava' },
      fen: FULL, mine: 'Полный комплект', theirs: 'Полный комплект',
      hi: 'Моя защита крепка. Найдёшь слабое место?', lost: 'Твой замысел оказался крепче камня.', won: 'Ты уже далеко дошёл. Продолжай тренироваться.',
      eng: { depth: 4, careless: .02, margin: 60, noise: 6, seesMate: true, avoidMate: true } },
    { id: 'b11', name: 'Искра', world: 'citadel', who: 'Маленький дракон с огненными комбинациями.', look: { m: 'm_dragon', skin: 'scale' },
      fen: FULL, mine: 'Полный комплект', theirs: 'Полный комплект',
      hi: 'Ищем красивые ходы, а не спешим!', lost: 'Вот это искра таланта!', won: 'Комбинации любят точный расчёт.',
      eng: { depth: 5, ms: 1400 } },
    { id: 'b12', name: 'Чёрный Король', world: 'citadel', who: 'Хозяин цитадели и последний экзамен.', look: { m: 'm_cosmic', skin: 'nebula' },
      fen: FULL, mine: 'Полный комплект', theirs: 'Полный комплект',
      hi: 'Добро пожаловать. Покажи всё, чему научился.', lost: 'Сегодня у академии появился новый чемпион.', won: 'Ты достойный соперник. Эта вершина тебе по силам.',
      eng: { depth: 7, ms: 2600 } }
  ];
  BOTS.forEach((b, i) => { b.i = i; b.mult = 1 + Math.floor(i / 3); });
  const ART = window.ACAD_BOTART || {};

  /* ---------- progress ---------- */
  const best = (s, b) => s ? Math.round((+((s.earned[C.BOT_KEY] || {})[b.id]) || 0) / b.mult) : 0;
  const unlocked = (s, i) => i === 0 || (s && best(s, BOTS[i - 1]) > 0);
  const won = s => BOTS.filter(b => best(s, b) > 0).length;
  const starsGot = s => BOTS.reduce((a, b) => a + best(s, b), 0);
  function next(s) { const k = BOTS.findIndex(b => !best(s, b)); return k < 0 ? BOTS.length - 1 : k; }
  const stars3 = n => [1, 2, 3].map(k => `<i class="${k <= n ? 'on' : ''}">${STAR}</i>`).join('');

  /* ---------- art: the opponent's portrait and landscape; without pictures, the bot's own piece character ---------- */
  function face(b) {
    const src = ART.chars && ART.chars[b.id];
    if (src) return `<img class="bot-img" src="${src}" alt="" draggable="false" decoding="async">`;
    return `<span class="bot-pc">${Art.model(b.look.m, b.look.skin)}</span>`;
  }
  function landscape(b) {
    const src = ART.bg && ART.bg[b.id];
    return src ? `<img class="bot-bg" src="${src}" alt="" draggable="false" decoding="async">` : '';
  }

  /* ---------- engine: a worker from the inline engine source, or the page itself ---------- */
  let worker = null, wid = 0;
  const waiting = {};
  function engine() {
    if (worker !== null) return worker;
    try {
      const src = document.getElementById('botEngine').textContent;
      worker = new Worker(URL.createObjectURL(new Blob([src], { type: 'text/javascript' })));
      worker.onmessage = e => { const w = waiting[e.data.id]; delete waiting[e.data.id]; if (w) w.res(e.data.res); };
      worker.onerror = () => {
        worker = false;
        Object.keys(waiting).forEach(k => { const w = waiting[k]; delete waiting[k]; w.res(window.BotEngine.think(w.fen, w.opts)); });
      };
    } catch (e) { worker = false; }
    return worker;
  }
  function think(fen, opts) {
    return new Promise(res => {
      const w = engine();
      if (w) { const id = ++wid; waiting[id] = { res, fen, opts }; w.postMessage({ id, fen, opts }); }
      else setTimeout(() => res(window.BotEngine.think(fen, opts)), 20);
    });
  }

  /* ---------- the map: the twelve landscapes one after another, a road through them, each opponent in their own place ---------- */
  /* wide screens travel left to right, tall phones top to bottom; layout() measures the map and places everything in pixels */
  function node(s, b, cur) {
    const i = b.i, st = best(s, b), open = unlocked(s, i), state = st ? 'won' : open ? 'open' : 'lock';
    const isCur = i === cur && open && !st;
    const label = `${i + 1}. ${b.name}, ${WORLDS[b.world].name}: ${st ? `побеждён, ${st} ${plural(st, 'звезда', 'звезды', 'звёзд')} из 3` : open ? 'можно играть' : 'закрыт, сначала победите предыдущего соперника'}`;
    return `<button type="button" class="anode s-${state}${isCur ? ' cur' : ''}" data-bot="${i}" aria-label="${esc(label)}">
        <span class="an-ped"></span><span class="an-char">${face(b)}</span>
        ${state === 'lock' ? `<span class="an-lock">${ICON.lock}</span>` : ''}${isCur ? '<span class="an-go">Играть</span>' : ''}
        <span class="an-tag"><span class="an-name"><b class="num">${i + 1}</b>${esc(b.name)}</span>${st ? `<span class="an-st" aria-hidden="true">${stars3(st)}</span>` : ''}</span>
      </button>`;
  }
  let mapRO = null, mapCur = 0;
  function renderMap() {
    const s = active(), cur = next(s), all = s && won(s) === BOTS.length;
    mapCur = cur;
    view.innerHTML = `<div class="amap-page">
      <div class="am-hud"><h1>Путь чемпионов</h1>
        <p>${s ? `Побеждено <b class="num">${won(s)}</b> из ${BOTS.length} · <b class="num">${starsGot(s)}</b> из ${BOTS.length * 3}${STAR}` : 'Выберите ученика, чтобы открывать новых соперников.'}</p>
        <button type="button" class="btn sm" id="amCur">${all ? 'Все побеждены · к цитадели' : `К сопернику: ${esc(BOTS[cur].name)}`}</button></div>
      <div class="amap" id="amap" aria-label="Карта соперников: двенадцать соперников в четырёх мирах"><div class="amap-in" id="amapIn">
        ${BOTS.map(b => `<div class="am-seg" data-seg="${b.i}">${landscape(b)}</div>`).join('')}
        <svg class="am-road" id="amRoad" aria-hidden="true"><path class="r0"/><path class="r1"/><path class="r2"/></svg>
        ${WKEYS.map(k => `<span class="am-world" data-wf="${WORLDS[k].from}"><b>${esc(WORLDS[k].name)}</b> · звёзды ×${WORLDS[k].mult}</span>`).join('')}
        ${BOTS.map(b => node(s, b, cur)).join('')}
      </div></div></div>`;
    const map = $('#amap');
    layout(); focusOn(cur, false);
    if (mapRO) mapRO.disconnect();
    if (window.ResizeObserver) { let w0 = map.clientWidth, h0 = map.clientHeight; mapRO = new ResizeObserver(() => { if (!map.isConnected) { mapRO.disconnect(); return; } if (map.clientWidth === w0 && map.clientHeight === h0) return; w0 = map.clientWidth; h0 = map.clientHeight; layout(); focusOn(mapCur, false); }); mapRO.observe(map); }
    $('#amCur').onclick = () => { Sound.click(); focusOn(mapCur, true); const n = map.querySelector(`[data-bot="${mapCur}"]`); if (n) n.focus({ preventScroll: true }); };
    /* mouse users drag the map, the wheel scrolls along the road; touch scrolls natively */
    let drag = null;
    map.addEventListener('pointerdown', e => { if (e.pointerType !== 'mouse' || e.button) return; drag = { x: e.clientX, y: e.clientY, l: map.scrollLeft, t: map.scrollTop, moved: false }; });
    map.addEventListener('pointermove', e => {
      if (!drag) return;
      const dx = e.clientX - drag.x, dy = e.clientY - drag.y;
      if (Math.hypot(dx, dy) > 5) drag.moved = true;
      if (drag.moved) { map.scrollLeft = drag.l - dx; map.scrollTop = drag.t - dy; map.classList.add('dragging'); }
    });
    const end = () => { setTimeout(() => map.classList.remove('dragging'), 0); if (drag && drag.moved) map.dataset.dragged = '1'; drag = null; };
    map.addEventListener('pointerup', end); map.addEventListener('pointerleave', end);
    map.addEventListener('wheel', e => { if (map.classList.contains('vert')) return; if (Math.abs(e.deltaY) > Math.abs(e.deltaX)) { map.scrollLeft += e.deltaY; e.preventDefault(); } }, { passive: false });
    map.addEventListener('click', e => {
      if (map.dataset.dragged) { delete map.dataset.dragged; return; }
      const n = e.target.closest('[data-bot]'); if (!n) return;
      const i = +n.dataset.bot;
      if (!unlocked(active(), i)) {
        Sound.bad(); toast(`<span class="tq-ic lk">${ICON.lock}</span><span>Сначала победите соперника <b>${esc(BOTS[i - 1].name)}</b></span>`);
        n.classList.remove('nope'); void n.offsetWidth; n.classList.add('nope');
        return;
      }
      Sound.click(); intro(i);
    });
  }
  /* sizes and places: the landscapes overlap and fade into each other, the road runs through the opponents' feet */
  function layout() {
    const map = $('#amap'), inn = $('#amapIn'); if (!map || !inn) return;
    const W = map.clientWidth, H = map.clientHeight; if (!W || !H) return;
    const vert = W < 720 && H > W * 1.15, N = BOTS.length;
    map.classList.toggle('vert', vert);
    /* seg: the distance between two opponents along the road; ov: how far a landscape fades over the one before it */
    const seg = vert ? Math.round(Math.min(W * .86, 480)) : Math.round(Math.max(420, Math.min(H * 1.1, W * .48)));
    const ov = Math.round(seg * .24), pad = Math.round(seg * .32), len = pad * 2 + seg * N;
    const nh = Math.round(vert ? Math.max(104, Math.min(seg * .46, 210)) : Math.max(130, Math.min(H * .3, 270)));
    inn.style.width = (vert ? W : len) + 'px'; inn.style.height = (vert ? len : H) + 'px';
    inn.style.setProperty('--nh', nh + 'px');
    const pts = [];
    BOTS.forEach((b, i) => {
      const a0 = i ? pad + i * seg - ov : 0, a1 = i === N - 1 ? len : pad + (i + 1) * seg;
      const el = inn.querySelector(`[data-seg="${i}"]`);
      el.style.cssText = vert ? `top:${a0}px;height:${a1 - a0}px;left:0;width:100%` : `left:${a0}px;width:${a1 - a0}px;top:0;height:100%`;
      el.style.setProperty('--ov', (i ? ov : 0) + 'px');
      const p = vert ? [W * (i % 2 ? .68 : .32), pad + i * seg + seg * .8] : [pad + i * seg + seg / 2, H * (i % 2 ? .83 : .73)];
      pts.push(p);
      const n = inn.querySelector(`[data-bot="${i}"]`);
      n.style.left = p[0] + 'px'; n.style.top = p[1] + 'px';
    });
    WKEYS.forEach(k => {
      const f = WORLDS[k].from, el = inn.querySelector(`[data-wf="${f}"]`);
      el.style.cssText = vert ? `left:12px;top:${(f ? pad + f * seg - ov / 2 : 0) + 12}px` : `left:${(f ? pad + f * seg - ov / 2 : 0) + 16}px;bottom:16px`;
    });
    /* the road: from the start of the map through every opponent to its end, smoothed */
    const all = [vert ? [W * .5, 0] : [0, H * .78]].concat(pts, [vert ? [W * .5, len] : [len, H * .78]]);
    let d = `M${all[0][0].toFixed(1)} ${all[0][1].toFixed(1)}`;
    for (let i = 0; i < all.length - 1; i++) {
      const a = all[Math.max(0, i - 1)], b = all[i], c = all[i + 1], e = all[Math.min(all.length - 1, i + 2)];
      const c1 = [b[0] + (c[0] - a[0]) / 6, b[1] + (c[1] - a[1]) / 6], c2 = [c[0] - (e[0] - b[0]) / 6, c[1] - (e[1] - b[1]) / 6];
      d += ` C${c1[0].toFixed(1)} ${c1[1].toFixed(1)} ${c2[0].toFixed(1)} ${c2[1].toFixed(1)} ${c[0].toFixed(1)} ${c[1].toFixed(1)}`;
    }
    const svg = $('#amRoad'), w = vert ? W : len, h = vert ? len : H, rw = Math.round(nh * .2);
    svg.setAttribute('width', w); svg.setAttribute('height', h); svg.setAttribute('viewBox', `0 0 ${w} ${h}`);
    $$('path', svg).forEach((el, k) => { el.setAttribute('d', d); el.setAttribute('stroke-width', [rw, Math.round(rw * .72), Math.max(2, Math.round(rw * .08))][k]); });
  }
  /* bring an opponent to the middle of the screen */
  function focusOn(i, smooth) {
    const map = $('#amap'), n = map && map.querySelector(`[data-bot="${i}"]`); if (!n) return;
    const vert = map.classList.contains('vert');
    const to = vert ? { top: n.offsetTop - map.clientHeight * .55 } : { left: n.offsetLeft - map.clientWidth / 2 };
    map.scrollTo(Object.assign({ behavior: smooth && !reduceMotion ? 'smooth' : 'auto' }, to));
  }

  /* ---------- the card before a game ---------- */
  function setupThumb(fen) {
    const pos = new CC.Position(fen), s = active(); let h = '';
    for (let row = 0; row < 8; row++) for (let col = 0; col < 8; col++) {
      const sq = (7 - row) * 8 + col, p = pos.board[sq];
      h += `<i class="${(row + col) % 2 ? 'd' : ''}">${p ? (p === p.toUpperCase() ? (s ? setPiece(s, p, { stickers: false }) : Art.model('c_' + p, 'plain')) : Art.opp(p.toUpperCase())) : ''}</i>`;
    }
    return `<div class="bthumb" aria-hidden="true">${h}</div>`;
  }
  function intro(i) {
    const b = BOTS[i], s = active(), st = best(s, b), w = WORLDS[b.world];
    const m = modal(`<div class="bi">
        <div class="bi-stage">${landscape(b)}${face(b)}</div>
        <div class="bi-info">
          <h2 class="h2">${esc(b.name)}</h2>
          <p class="bi-who">${esc(b.who)}</p>
          <p class="bi-say">«${esc(b.hi)}»</p>
          <div class="bi-meta">
            <div><span>Уровень</span><b class="num">${i + 1} из ${BOTS.length}</b></div>
            <div><span>Мир</span><b>${esc(w.name)}</b></div>
            <div><span>Награда</span><b class="num">до ${3 * b.mult}${STAR}</b></div>
          </div>
          <div class="bi-pow" aria-label="Сила соперника ${i + 1} из ${BOTS.length}">${BOTS.map((x, k) => `<i class="${k <= i ? 'on' : ''}"></i>`).join('')}</div>
          <div class="bi-set">${setupThumb(b.fen)}<dl><dt>Ваши фигуры</dt><dd>${esc(b.mine)}</dd><dt>У соперника</dt><dd>${esc(b.theirs)}</dd></dl></div>
          ${st ? `<p class="bi-best">Лучший результат: ${stars3(st)}</p>` : `<p class="bi-best muted">Победа без ходов назад и подсказок — три звезды.</p>`}
          <div class="row"><button type="button" class="btn lg" id="biGo">${st ? 'Сыграть ещё' : 'Играть'}</button></div>
        </div></div>`, { cls: 'botsheet' });
    $('#biGo', m.el).onclick = () => { m.close(); start(i); };
  }

  /* ---------- the game ---------- */
  const G = { i: 0, b: null, pos: null, sel: -1, last: null, lock: false, over: null, undo: 0, hints: 0, hint: null, fens: [], sans: [], flip: false, kb: -1, kbOn: false, token: 0, el: null, set: {} };
  /* the board can be turned around: a square's place on screen depends on the side at the bottom */
  const rowOf = sq => G.flip ? sq >> 3 : 7 - (sq >> 3), colOf = sq => G.flip ? 7 - (sq & 7) : sq & 7;
  const sqOf = (row, col) => G.flip ? row * 8 + 7 - col : (7 - row) * 8 + col;
  const tf = sq => `translate(${colOf(sq) * 100}%, ${rowOf(sq) * 100}%)`;
  const NAMES = { q: 'ферзя', r: 'ладью', b: 'слона', n: 'коня', p: 'пешку' };
  const OUCH = { q: 'Ой! Мой ферзь…', r: 'Эх, моя ладья…', b: 'Мой слон! Так нечестно.', n: 'Где мой конь?!' };
  const PNAME = { k: 'король', q: 'ферзь', r: 'ладья', b: 'слон', n: 'конь', p: 'пешка' };
  const VALUE = { p: 1, n: 3, b: 3, r: 5, q: 9, k: 0 };
  const pick1 = a => a[Math.floor(rand() * a.length)];
  const posKey = pos => pos.fen().split(' ').slice(0, 4).join(' ');
  function pieceSVG(p) { const L = p.toUpperCase(); return p === L ? G.set[L] : Art.opp(L); }
  function say(text, mood) {
    const el = $('#arSay'); if (!el) return;
    el.className = 'ar-say ' + (mood || '');
    el.innerHTML = text;
    el.animate && !reduceMotion && el.animate([{ opacity: 0, transform: 'translateY(4px) scale(.96)' }, { opacity: 1, transform: 'none' }], { duration: 180, easing: 'cubic-bezier(.23,1,.32,1)' });
  }
  /* one line under the board says whose move it is and what has just happened; screen readers hear it */
  function status(text, hot) { const el = $('#arStatus'); if (!el) return; el.textContent = text; el.classList.toggle('hot', !!hot); }
  function turnText() {
    if (G.pos.turn !== 'w') return { t: 'Ход соперника' };
    return G.pos.inCheck() ? { t: 'Шах твоему королю. Найди защиту.', hot: true } : { t: 'Твой ход · белые' };
  }
  function drawSquares() {
    const b = $('#aSq'); if (!b) return;
    const pos = G.pos, legal = G.sel >= 0 ? pos.moves().filter(m => m.from === G.sel) : [];
    const chk = pos.inCheck() ? pos.kingSq(pos.turn) : -1;
    let h = '';
    for (let row = 0; row < 8; row++) for (let col = 0; col < 8; col++) {
      const sq = sqOf(row, col), cls = [];
      if ((row + col) % 2) cls.push('d');
      if (G.last && (G.last.from === sq || G.last.to === sq)) cls.push('last');
      if (G.sel === sq) cls.push('sel');
      if (G.hint && (G.hint.from === sq || G.hint.to === sq)) cls.push(G.hint.from === sq ? 'hint' : 'hint2');
      if (chk === sq) cls.push('chk');
      if (G.kbOn && G.kb === sq) cls.push('kb');
      const mv = legal.find(m => m.to === sq); if (mv) cls.push(pos.board[sq] ? 'cap' : 'dot');
      h += `<i class="${cls.join(' ')}">${row === 7 ? `<b class="f">${'abcdefgh'[sq & 7]}</b>` : ''}${col === 0 ? `<b class="r">${(sq >> 3) + 1}</b>` : ''}</i>`;
    }
    b.innerHTML = h;
  }
  function drawPieces() {
    const pc = $('#aPc'); if (!pc) return;
    let h = '';
    G.pos.board.forEach((p, sq) => { if (p) h += `<div class="bp ${p === p.toUpperCase() ? 'mine' : ''}" data-sq="${sq}" style="transform:${tf(sq)}">${pieceSVG(p)}</div>`; });
    pc.innerHTML = h;
  }
  /* material that has left the board, from the starting position of this opponent */
  function captured() {
    const count = fen => { const c = {}; fen.split(' ')[0].replace(/[^a-zA-Z]/g, '').split('').forEach(p => { c[p] = (c[p] || 0) + 1; }); return c; };
    const a = count(G.b.fen), now = count(G.pos.fen()), out = { w: [], b: [] };
    'qrbnp'.split('').forEach(t => {
      for (let k = 0; k < Math.max(0, (a[t] || 0) - (now[t] || 0)); k++) out.w.push(t);
      for (let k = 0; k < Math.max(0, (a[t.toUpperCase()] || 0) - (now[t.toUpperCase()] || 0)); k++) out.b.push(t);
    });
    return out;
  }
  function drawSide() {
    const c = captured(), sc = arr => arr.reduce((x, t) => x + VALUE[t], 0), d = sc(c.w) - sc(c.b);
    const row = (arr, mine) => arr.map(t => `<span>${mine ? Art.opp(t.toUpperCase()) : G.set[t.toUpperCase()]}</span>`).join('');
    const me = $('#arCapMe'), bot = $('#arCapBot');
    if (me) me.innerHTML = row(c.w, true) + (d > 0 ? `<b class="num">+${d}</b>` : '');
    if (bot) bot.innerHTML = row(c.b, false) + (d < 0 ? `<b class="num">+${-d}</b>` : '');
    const off = G.lock || !!G.over;
    const u = $('#arUndo'); if (u) u.disabled = off || G.pos.hist.length < 1;
    const hb = $('#arHint'); if (hb) hb.disabled = off || G.pos.turn !== 'w';
    ['#arDraw', '#arResign'].forEach(k => { const x = $(k); if (x) x.disabled = !!G.over; });
    const mv = $('#arMoves');
    if (mv) {
      /* moves in pairs, one short line after another; the newest pair is marked and kept in view */
      let h = '';
      for (let k = 0; k < G.sans.length; k += 2) h += `<span class="mp${k + 2 >= G.sans.length ? ' last' : ''}"><i>${k / 2 + 1}.</i>${esc(G.sans[k])}${G.sans[k + 1] ? ' ' + esc(G.sans[k + 1]) : ''}</span>`;
      mv.innerHTML = h || '<span class="mv0">Ходов пока нет</span>';
      mv.scrollTop = mv.scrollHeight;
    }
  }
  function draw() { drawSquares(); drawPieces(); drawSide(); }
  function animate(m, after) {
    const pc = $('#aPc'); if (!pc) { after && after(); return; }
    const el = pc.querySelector(`[data-sq="${m.from}"]`), cap = pc.querySelector(`[data-sq="${m.to}"]`);
    if (cap && cap !== el) { cap.style.setProperty('--tf', cap.style.transform); cap.classList.add('gone'); }
    if (m.flags === 'e') { const ep = pc.querySelector(`[data-sq="${m.to + (m.piece === 'P' ? -8 : 8)}"]`); if (ep) { ep.style.setProperty('--tf', ep.style.transform); ep.classList.add('gone'); } }
    /* castling: the rook travels with the king */
    if (m.flags === 'k' || m.flags === 'q') {
      const w = m.piece === 'K', rf = m.flags === 'k' ? (w ? 7 : 63) : (w ? 0 : 56), rt = m.flags === 'k' ? (w ? 5 : 61) : (w ? 3 : 59);
      const r = pc.querySelector(`[data-sq="${rf}"]`); if (r) { r.style.transform = tf(rt); r.dataset.sq = rt; }
    }
    if (el) { el.classList.remove('drag'); el.style.transform = tf(m.to); el.dataset.sq = m.to; }
    if (m.captured) Sound.thock(); else Sound.click();
    setTimeout(() => { drawPieces(); after && after(); }, reduceMotion ? 0 : 240);
  }
  function apply(m) {
    const san = CC.sanToRu(G.pos.san(m));
    G.pos.make(m); G.last = { from: m.from, to: m.to }; G.sel = -1; G.hint = null;
    G.fens.push(posKey(G.pos)); G.sans.push(san);
    return san;
  }
  function insufficient(pos) {
    const left = pos.board.filter(Boolean).map(p => p.toLowerCase()).filter(p => p !== 'k');
    return !left.length || (left.length === 1 && (left[0] === 'b' || left[0] === 'n'));
  }
  function outcome() {
    const pos = G.pos, st = pos.status();
    if (st === 'mate') return pos.turn === 'w' ? { r: 'loss', why: 'Мат' } : { r: 'win', why: 'Мат' };
    if (st === 'stalemate') return { r: 'draw', why: 'Пат' };
    if (pos.half >= 100) return { r: 'draw', why: '50 ходов без взятий и ходов пешкой' };
    const k = posKey(pos); if (G.fens.filter(x => x === k).length >= 3) return { r: 'draw', why: 'Позиция повторилась три раза' };
    if (insufficient(pos)) return { r: 'draw', why: 'Мат поставить нечем' };
    return null;
  }
  function react(m, byBot) {
    const pos = G.pos;
    if (pos.inCheck()) { say(byBot ? pick1(['Шах!', 'Шах тебе!', 'А король-то под ударом!']) : pick1(['Ой, шах…', 'Мой король в опасности!', 'Шах? Ну ничего себе.']), byBot ? 'hot' : 'ouch'); return; }
    if (m.promotion) { say(byBot ? 'Пешка стала ферзём. Берегись!' : 'Ого, новый ферзь!', byBot ? 'hot' : 'ouch'); return; }
    if (m.captured && VALUE[m.captured.toLowerCase()] >= 3) { say(byBot ? pick1([`Ам! Спасибо за ${NAMES[m.captured.toLowerCase()]}.`, 'Попалась фигура!', 'Вкусный ход.']) : pick1([OUCH[m.captured.toLowerCase()], 'Ой-ой, минус фигура.', 'Ничего, у меня ещё есть.']), byBot ? 'hot' : 'ouch'); return; }
    if (byBot && rand() < .22) say(pick1(['Твой ход.', 'Хм, интересно…', 'Так-так.', 'А что ты на это скажешь?']));
  }
  function finish(o) {
    /* a pending reply of the engine is dropped: resigning or agreeing to a draw ends the game at once */
    G.over = o; G.lock = true; G.token++; G.sel = -1; G.kbOn = false;
    const stage = $('#arBot'); if (stage) stage.classList.remove('thinking');
    drawSquares(); drawSide();
    const s = active(), b = G.b, bd = $('#aBoard');
    let stars = 0, got = 0, first = false;
    if (o.r === 'win') {
      stars = G.undo + G.hints === 0 ? 3 : G.undo + G.hints <= 2 ? 2 : 1;
      if (s && !Data.readOnly()) { const r = Data.winBot(s.id, b, stars) || {}; got = r.got || 0; first = !!r.first; }
      if (bd) { if (o.why === 'Мат') Board.fx.mate(bd, G.pos.kingSq('b'), G.last ? (G.flip ? 63 - G.last.to : G.last.to) : 0); else bd.classList.add('won'); FX.at(bd, { n: 110, speed: 12, colors: ['#ffd66b', '#ffffff', '#7ad36b', '#5fb8ff'] }); }
      Sound.reveal(stars === 3 ? 'legendary' : 'epic');
      say(b.lost, 'ouch');
    } else {
      if (o.r === 'loss' && bd && o.why === 'Мат') Board.fx.mate(bd, G.pos.kingSq('w'), G.last ? (G.flip ? 63 - G.last.to : G.last.to) : 0);
      Sound.bad();
      say(o.r === 'draw' ? 'Ничья! Ещё партию?' : b.won, o.r === 'draw' ? '' : 'hot');
    }
    const nx = BOTS[G.i + 1];
    const res = $('#arRes');
    const title = o.r === 'win' ? 'Победа!' : o.r === 'draw' ? 'Ничья' : 'Поражение';
    status(`${title} · ${o.why}`);
    const sub = o.r === 'win'
      ? (s ? (got ? `+${got}${STAR} в профиль ${esc(s.name)}.` : `Лучший результат против ${esc(b.name)} уже засчитан.`) : 'Выберите ученика, чтобы получать звёзды.') + (first && nx ? ` Открыт новый соперник: <b>${esc(nx.name)}</b>.` : '')
      : o.r === 'draw' ? `${esc(o.why)}. Звёзды дают только за победу.` : `${esc(o.why)}. Попробуйте ещё раз, сила соперника не меняется.`;
    res.innerHTML = `<div class="ar-card ${o.r}" role="alertdialog" aria-label="${title}">
      ${o.r === 'win' ? `<div class="ar-stars">${[1, 2, 3].map(k => `<i class="${k <= stars ? 'on' : ''}" style="--k:${k}">${STAR}</i>`).join('')}</div>` : `<div class="ar-face">${landscape(b)}${face(b)}</div>`}
      <h2>${title}</h2><p>«${esc(o.r === 'win' ? b.lost : o.r === 'draw' ? 'Ничья! Ещё партию?' : b.won)}»</p><p>${sub}</p>
      ${o.r === 'win' && stars < 3 ? `<p class="ar-tip">Три звезды — за победу без ходов назад и подсказок.</p>` : ''}
      <div class="row c">${o.r === 'win' && nx ? `<button type="button" class="btn lg" id="arNext">Следующий соперник</button><button type="button" class="btn lg soft" id="arMap">К карте</button>` : `<button type="button" class="btn lg" id="arAgain">Ещё раз</button><button type="button" class="btn lg soft" id="arMap">К карте</button>`}</div></div>`;
    res.hidden = false;
    const again = $('#arAgain'), nxt = $('#arNext');
    if (again) again.onclick = () => { Sound.click(); restart(G.i); };
    if (nxt) nxt.onclick = () => { Sound.click(); close(); intro(G.i + 1); };
    $('#arMap').onclick = () => { Sound.click(); close(); };
    setTimeout(() => { const f = $('#arNext') || $('#arAgain'); if (f) f.focus({ preventScroll: true }); }, 60);
    if (got) setTimeout(() => Motion.starFly(res.querySelector('.ar-stars') || res, got), reduceMotion ? 0 : 500);
  }
  async function botMove() {
    const tok = G.token;
    G.lock = true; drawSide();
    status('Соперник думает…');
    const t0 = Date.now();
    $('#arBot').classList.add('thinking');
    const r = await think(G.pos.fen(), Object.assign({ history: G.fens.slice(-60).map(k => k + ' 0 1') }, G.b.eng));
    const wait = Math.max(0, (reduceMotion ? 200 : 520 + rand() * 380) - (Date.now() - t0));
    await new Promise(res => setTimeout(res, wait));
    if (tok !== G.token || !$('#aBoard')) return;
    $('#arBot').classList.remove('thinking');
    const m = r && r.uci ? G.pos.findMove(r.uci) : null;
    if (!m) { finish(outcome() || { r: 'draw', why: 'Нет ходов' }); return; }
    const san = apply(m); drawSquares();
    animate(m, () => {
      if (tok !== G.token) return;
      react(m, true);
      const o = outcome(); if (o) { finish(o); return; }
      G.lock = false; drawSide();
      const t = turnText(); status(`Соперник: ${san}. ${t.t}`, t.hot);
    });
  }
  function promoPick(from, to, done) {
    const bd = $('#aBoard');
    const box = document.createElement('div'); box.className = 'ar-promo' + (rowOf(to) === 7 ? ' low' : ''); box.style.left = (colOf(to) * 12.5) + '%';
    box.innerHTML = ['Q', 'R', 'B', 'N'].map(L => `<button type="button" data-p="${L.toLowerCase()}" aria-label="${{ Q: 'Ферзь', R: 'Ладья', B: 'Слон', N: 'Конь' }[L]}">${G.set[L]}</button>`).join('');
    bd.appendChild(box);
    const cancel = () => { box.remove(); document.removeEventListener('pointerdown', off, true); G.sel = -1; drawSquares(); };
    const off = e => { if (!box.contains(e.target)) cancel(); };
    box.onclick = e => { const b = e.target.closest('[data-p]'); if (!b) return; document.removeEventListener('pointerdown', off, true); box.remove(); done(b.dataset.p); bd.focus({ preventScroll: true }); };
    box.onkeydown = e => { if (e.key === 'Escape') { e.stopPropagation(); cancel(); bd.focus({ preventScroll: true }); } };
    setTimeout(() => { document.addEventListener('pointerdown', off, true); const f = box.querySelector('button'); if (f) f.focus({ preventScroll: true }); }, 0);
  }
  function tryMove(from, to) {
    if (G.lock || G.over || G.pos.turn !== 'w') return;
    const legal = G.pos.moves().filter(m => m.from === from && m.to === to);
    if (!legal.length) { G.sel = -1; drawSquares(); return; }
    const go = m => {
      const san = apply(m); drawSquares();
      G.lock = true;
      status(`Ты сыграл ${san}`);
      animate(m, () => {
        react(m, false);
        const o = outcome(); if (o) { finish(o); return; }
        botMove();
      });
    };
    if (legal[0].promotion) promoPick(from, to, p => go(legal.find(m => m.promotion === p)));
    else go(legal[0]);
  }
  const mine = p => p && p === p.toUpperCase();
  /* a tap or Enter on a square: pick one of your pieces, move the picked one, or let go */
  function press(sq) {
    if (G.lock || G.over) return;
    const p = G.pos.board[sq];
    if (G.sel >= 0 && G.sel !== sq && !mine(p)) { tryMove(G.sel, sq); return; }
    G.sel = mine(p) && G.sel !== sq ? sq : -1;
    drawSquares();
  }
  function sayKb() {
    const el = $('#arKb'); if (!el || G.kb < 0) return;
    const p = G.pos.board[G.kb];
    el.textContent = CC.sqName(G.kb) + (p ? `, ${mine(p) ? 'белый' : 'чёрный'} ${PNAME[p.toLowerCase()]}`.replace(/ый (ладья|пешка)$/, 'ая $1') : ', пусто');
  }
  function bindBoard() {
    const bd = $('#aBoard'); if (!bd) return;
    let drag = null;
    const sqAt = (x, y) => { const r = bd.getBoundingClientRect(); const c = Math.floor((x - r.left) / r.width * 8), rw = Math.floor((y - r.top) / r.height * 8); if (c < 0 || c > 7 || rw < 0 || rw > 7) return -1; return sqOf(rw, c); };
    bd.addEventListener('pointerdown', e => {
      if (G.lock || G.over || e.target.closest('.ar-promo')) return;
      const sq = sqAt(e.clientX, e.clientY); if (sq < 0) return;
      G.kb = sq; G.kbOn = false;
      const p = G.pos.board[sq];
      if (G.sel >= 0 && G.sel !== sq && !mine(p)) { tryMove(G.sel, sq); return; }
      if (!mine(p)) { G.sel = -1; drawSquares(); return; }
      e.preventDefault();
      G.sel = sq; drawSquares();
      drag = { sq, el: $(`#aPc [data-sq="${sq}"]`), x0: e.clientX, y0: e.clientY, moved: false };
      try { bd.setPointerCapture(e.pointerId); } catch (err) { /* capture unsupported */ }
    });
    bd.addEventListener('pointermove', e => {
      if (!drag || !drag.el) return;
      if (!drag.moved && Math.hypot(e.clientX - drag.x0, e.clientY - drag.y0) < 5) return;
      drag.moved = true;
      const r = bd.getBoundingClientRect(), cell = r.width / 8;
      drag.el.classList.add('drag');
      drag.el.style.transform = `translate(${e.clientX - r.left - cell / 2}px, ${e.clientY - r.top - cell / 2}px)`;
    });
    const up = e => {
      if (!drag) return;
      const d = drag; drag = null;
      if (!d.moved) return;
      const to = sqAt(e.clientX, e.clientY);
      if (to >= 0 && to !== d.sq && G.pos.moves().some(m => m.from === d.sq && m.to === to)) tryMove(d.sq, to);
      else if (d.el) { d.el.classList.remove('drag'); d.el.style.transform = tf(d.sq); }
    };
    bd.addEventListener('pointerup', up); bd.addEventListener('pointercancel', up);
    /* the keyboard: arrows walk over the squares as the board is shown, Enter or Space acts like a tap */
    bd.addEventListener('keydown', e => {
      if (e.target.closest('.ar-promo')) return;
      const d = { ArrowLeft: [0, -1], ArrowRight: [0, 1], ArrowUp: [-1, 0], ArrowDown: [1, 0] }[e.key];
      if (d) {
        e.preventDefault();
        if (G.kb < 0) G.kb = G.sel >= 0 ? G.sel : 12;
        else if (G.kbOn) G.kb = sqOf(Math.max(0, Math.min(7, rowOf(G.kb) + d[0])), Math.max(0, Math.min(7, colOf(G.kb) + d[1])));
        G.kbOn = true; drawSquares(); sayKb(); return;
      }
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        if (G.kb < 0 || !G.kbOn) { if (G.kb < 0) G.kb = 12; G.kbOn = true; drawSquares(); sayKb(); return; }
        press(G.kb); return;
      }
      if (e.key === 'Escape' && G.sel >= 0) { e.stopPropagation(); G.sel = -1; drawSquares(); }
    });
    bd.addEventListener('blur', () => { if (G.kbOn) { G.kbOn = false; drawSquares(); } });
  }
  function takeBack() {
    if (G.lock || G.over) return;
    /* the bot's reply and the student's move, so it is the student's turn again */
    let n = 0;
    if (G.pos.turn === 'w' && G.pos.hist.length >= 2) n = 2; else if (G.pos.turn === 'b' && G.pos.hist.length >= 1) n = 1;
    if (!n) return;
    for (let k = 0; k < n; k++) { G.pos.unmake(); G.fens.pop(); G.sans.pop(); }
    const h = G.pos.hist[G.pos.hist.length - 1];
    G.last = h ? { from: h.m.from, to: h.m.to } : null; G.sel = -1; G.hint = null;
    G.undo++; Sound.flip(); draw();
    status('Ход отменён. ' + turnText().t);
    say(pick1(['Передумал? Бывает.', 'Ладно, переходи.', 'Хорошо, пробуй ещё.']));
  }
  async function hint() {
    if (G.lock || G.over || G.pos.turn !== 'w') return;
    const tok = G.token;
    G.lock = true; drawSide();
    $('#arHint').classList.add('busy');
    const r = await think(G.pos.fen(), { depth: 4, ms: 900, history: G.fens.slice(-60).map(k => k + ' 0 1') });
    if (tok !== G.token || !$('#aBoard')) return;
    $('#arHint').classList.remove('busy');
    G.lock = false;
    const m = r && G.pos.findMove(r.uci);
    if (m) { G.hint = { from: m.from, to: m.to }; G.hints++; Sound.chime(); status(`Подсказка: попробуй ${CC.sanToRu(G.pos.san(m))}`); }
    draw();
  }
  function flip() {
    G.flip = !G.flip; G.sel = -1;
    const fb = $('#arFlip'); if (fb) fb.setAttribute('aria-pressed', G.flip);
    const bd = $('#aBoard'); if (bd) bd.setAttribute('aria-label', `Шахматная доска, вы играете белыми${G.flip ? ', белые сверху' : ''}. Стрелки выбирают поле, Enter делает ход.`);
    $$('#aBoard .ar-promo').forEach(x => x.remove());
    Sound.flip(); drawSquares(); drawPieces();
  }
  function close() {
    G.token++;
    const el = G.el; G.el = null;
    if (el) {
      if (reduceMotion || !el.animate) el.remove();
      else el.animate([{ opacity: 1 }, { opacity: 0, transform: 'scale(.985)' }], { duration: 180, easing: 'ease-out' }).onfinish = () => el.remove();
    }
    document.removeEventListener('keydown', onKey);
    if (UI.view === 'arena') { renderMap(); Celebrate.schedule(); } else render();
  }
  function onKey(e) { if (e.key === 'Escape' && G.el && !$('.ar-promo') && !$('.modal')) { if (G.over || !G.pos.hist.length) close(); } }
  function restart(i) { G.token++; if (G.el) G.el.remove(); G.el = null; document.removeEventListener('keydown', onKey); start(i); }
  function start(i) {
    const b = BOTS[i], s = active(), w = WORLDS[b.world];
    Object.assign(G, { i, b, pos: new CC.Position(b.fen), sel: -1, last: null, lock: false, over: null, undo: 0, hints: 0, hint: null, fens: [], sans: [], flip: false, kb: -1, kbOn: false });
    G.fens.push(posKey(G.pos)); G.token++;
    G.set = {}; 'KQRBNP'.split('').forEach(L => { G.set[L] = s ? setPiece(s, L, { stickers: false }) : Art.model('c_' + L, 'plain'); });
    const el = document.createElement('div');
    el.className = 'arena'; el.dataset.bot = b.id;
    el.setAttribute('role', 'dialog'); el.setAttribute('aria-modal', 'true'); el.setAttribute('aria-label', `Партия с соперником ${b.name}`);
    el.innerHTML = `${landscape(b).replace('class="bot-bg"', 'class="bot-bg ar-bg"')}<div class="ar-wrap">
        <header class="ar-top"><button type="button" class="btn ar-x" id="arX">${ICON.back}<span>К карте</span></button>
          <div class="ar-ttl"><h1>Соперник: ${esc(b.name)}</h1><p>${esc(w.name)} · сила ${i + 1} из ${BOTS.length} · награда до ${3 * b.mult}${STAR}</p></div>
          ${s ? `<span class="ar-me">${Art.avatar(s, 30)}<b>${esc(s.name)}</b><span>белые</span></span>` : ''}</header>
        <div class="ar-main">
          <div class="ar-bw"><div class="board" id="aBoard" tabindex="0" role="application" aria-label="Шахматная доска, вы играете белыми. Стрелки выбирают поле, Enter делает ход." aria-describedby="arStatus"><div class="sqs" id="aSq"></div><div class="pcs" id="aPc"></div></div></div>
          <aside class="ar-side">
            <div class="ar-stage" id="arBot"><div class="ar-say" id="arSay"></div><div class="ar-char">${face(b)}<span class="ar-dots" aria-hidden="true"><i></i><i></i><i></i></span></div><h2 class="ar-name">${esc(b.name)}</h2></div>
            <div class="ar-status" id="arStatus" role="status" aria-live="polite"></div>
            <div class="ar-tools"><button type="button" class="btn" id="arHint">${ICON.bulb}Подсказка</button><button type="button" class="btn" id="arUndo">${ICON.reset}Ход назад</button><button type="button" class="btn" id="arFlip" aria-pressed="false">${ICON.flip}Перевернуть</button><button type="button" class="btn" id="arDraw">Ничья</button><button type="button" class="btn" id="arResign">Сдаться</button></div>
            <div class="ar-log" title="Подсказка и ход назад отнимают звезду за победу. С клавиатуры: стрелки и Enter.">
              <div class="ar-lh"><b>Ходы</b><span class="ar-caps"><span class="ar-cap" id="arCapMe" aria-label="Ты взял"></span><span class="ar-cap lost" id="arCapBot" aria-label="${esc(b.name)} взял"></span></span></div>
              <div class="ar-moves" id="arMoves" aria-label="Записанные ходы"></div></div>
            <span class="ar-sr" id="arKb" aria-live="polite"></span>
          </aside>
        </div></div>
      <div class="ar-res" id="arRes" hidden></div>`;
    layer.appendChild(el); G.el = el;
    draw(); bindBoard();
    say(b.hi); status(turnText().t);
    const x = $('#arX'), idle = x.innerHTML; let armed = 0;
    x.onclick = () => {
      if (G.over || !G.pos.hist.length || armed) { clearTimeout(armed); Sound.click(); close(); return; }
      x.innerHTML = `${ICON.back}<span>Выйти без награды?</span>`; x.classList.add('armed');
      armed = setTimeout(() => { armed = 0; x.innerHTML = idle; x.classList.remove('armed'); }, 3500);
    };
    $('#arHint').onclick = hint;
    $('#arUndo').onclick = takeBack;
    $('#arFlip').onclick = flip;
    twoStep($('#arDraw'), 'Точно ничья?', () => { if (!G.over) finish({ r: 'draw', why: 'Ничья по соглашению' }); });
    twoStep($('#arResign'), 'Точно сдаться?', () => { if (!G.over) finish({ r: 'loss', why: 'Вы сдались' }); });
    document.addEventListener('keydown', onKey);
    if (!reduceMotion && el.animate) el.animate([{ opacity: 0 }, { opacity: 1 }], { duration: 220, easing: 'ease-out' });
    setTimeout(() => { const bd = $('#aBoard'); if (bd && G.el === el) bd.focus({ preventScroll: true }); }, 60);
  }

  /* ---------- the hub tile ---------- */
  function tile(s) {
    const i = next(s), b = BOTS[i], n = won(s), all = s && n === BOTS.length;
    return `<button type="button" class="tl tl-arena" data-go="arena" style="--i:1">
      ${landscape(b)}
      <span class="ta-label"><h3>Путь чемпионов</h3><span class="t-meta">${all ? 'Все соперники побеждены' : `Следующий соперник: ${esc(b.name)}`}</span></span>
      <span class="go">${ICON.arrow}</span>
      <span class="ta-char">${face(b)}</span>
      <span class="ta-foot"><span class="ta-road" aria-label="Пройдено ${n} из ${BOTS.length} соперников">${BOTS.map((x, k) => `<i class="${best(s, x) ? 'w' : k === i ? 'c' : ''}"></i>`).join('')}</span>
        <span class="btn ta-play">${all ? 'Сыграть ещё' : 'Играть'}</span><small class="ta-world">${esc(WORLDS[b.world].name)} · ${n} / ${BOTS.length}</small></span>
    </button>`;
  }
  return { renderMap, tile, start, intro, BOTS, best, won, isOpen: () => !!G.el };
})();
