// node tools/pw_path.js [screenshot-prefix] — «Путь чемпионов» end to end in Chromium (needs playwright):
// a student, the page and its world tabs, a locked opponent, moves by mouse and keyboard, a turned board, a take-back,
// a won game (stars, the next opponent opens), a draw by agreement, resigning while the opponent thinks, leaving a game.
// It runs on a copy of index.html in the temp folder with three hooks into the module (the page itself keeps them private).
const { chromium } = require('playwright');
const assert = require('assert/strict');
const fs = require('fs'), os = require('os'), path = require('path');
const out = process.argv[2] || '';
const src = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');
const hook = (s, anchor, add) => { if (s.split(anchor).length !== 2) throw new Error('hook anchor not found once: ' + anchor.slice(0, 60)); return s.replace(anchor, anchor + add); };
let t = hook(src, '  function draw() { drawSquares(); drawPieces(); drawSide(); }\n', '  window.__G = G; window.__draw = draw;\n');
t = hook(t, '  return { renderMap, tile, start, intro, BOTS, best, won, isOpen: () => !!G.el };\n})();\n', 'window.__Arena = Arena; window.__Data = Data; window.__active = active;\n');
const html = path.join(os.tmpdir(), 'zvezdnaya-akademiya-path-test.html');
fs.writeFileSync(html, t);
(async () => {
  const b = await chromium.launch();
  const p = await b.newPage({ viewport: { width: 1440, height: 900 } });
  const errs = [];
  p.on('pageerror', e => errs.push('pageerror: ' + e.message));
  p.on('console', m => { if (m.type() === 'error') errs.push('console: ' + m.text()); });
  await p.goto('file://' + html);
  await p.waitForTimeout(800);
  const log = (...a) => console.log(...a);

  // a student
  const id = await p.evaluate(() => { const id = __Data.add('Маша', 'N', 212); return id; });
  await p.evaluate(id => { localStorage.setItem('zvezdnaya-akademiya:active', JSON.stringify(id)); }, id);
  await p.reload(); await p.waitForTimeout(900);
  // close onboarding if it shows
  for (let k = 0; k < 3; k++) { const onb = await p.$('.onb'); if (!onb) break; await p.keyboard.press('Escape'); await p.waitForTimeout(300); const x = await p.$('.onb [data-close], .onb .x, .onb button'); if (x) await x.click().catch(() => {}); await p.waitForTimeout(400); }
  log('onboarding present:', !!(await p.$('.onb')));
  await p.evaluate(() => document.querySelectorAll('.onb').forEach(x => x.remove()));
  if (out) await p.screenshot({ path: out + '-home-student.png' });

  // the page
  await p.click('.tl-arena'); await p.waitForTimeout(900);
  const pg = await p.evaluate(() => ({
    tabs: [...document.querySelectorAll('.wtabs [data-w]')].map(b => b.textContent.trim() + ':' + b.getAttribute('aria-pressed')),
    stops: document.querySelectorAll('.apstop').length, locked: document.querySelectorAll('.apstop.s-lock').length,
    cards: [...document.querySelectorAll('.apcard h3')].map(h => h.textContent), sum: document.querySelector('.ap-sum')?.textContent,
    imgs: [...document.images].filter(i => !i.complete || !i.naturalWidth).length
  }));
  log('page', JSON.stringify(pg));
  assert.equal(pg.stops, 12); assert.equal(pg.locked, 11); assert.equal(pg.imgs, 0);
  // switch the world tab: cards change, scroll stays
  await p.click('.wtabs [data-w="peaks"]'); await p.waitForTimeout(400);
  const peaks = await p.evaluate(() => [...document.querySelectorAll('.apcard h3')].map(h => h.textContent));
  log('peaks cards', peaks); assert.deepEqual(peaks, ['Снежок', 'Бип-Буп', 'Профессор Ух']);
  // a locked stop: toast, the world follows
  await p.click('.apstop[data-bot="10"]'); await p.waitForTimeout(400);
  const lockState = await p.evaluate(() => ({ toast: document.querySelector('.toast')?.textContent, cards: [...document.querySelectorAll('.apcard h3')].map(h => h.textContent), modal: !!document.querySelector('.modal') }));
  log('locked click', JSON.stringify(lockState)); assert.equal(lockState.modal, false);
  if (out) await p.screenshot({ path: out + '-path-citadel.png' });

  // the first opponent
  await p.click('.apstop[data-bot="0"]'); await p.waitForTimeout(700);
  assert.ok(await p.$('.botsheet'));
  await p.click('#biGo'); await p.waitForTimeout(900);
  const sq = async (name) => { // centre of a square on screen, honouring the flip
    return p.evaluate(n => {
      const f = n.charCodeAt(0) - 97, r = +n[1] - 1, flip = __G.flip, bd = document.querySelector('#aBoard').getBoundingClientRect(), c = bd.width / 8;
      const col = flip ? 7 - f : f, row = flip ? r : 7 - r;
      return { x: bd.left + c * (col + .5), y: bd.top + c * (row + .5) };
    }, name);
  };
  const click = async n => { const q = await sq(n); await p.mouse.click(q.x, q.y); await p.waitForTimeout(120); };
  await click('e2'); await click('e4');
  await p.waitForFunction(() => __G.sans.length === 2 && !__G.lock, null, { timeout: 15000 });
  let st = await p.evaluate(() => ({ sans: __G.sans, status: document.querySelector('#arStatus').textContent, moves: document.querySelector('#arMoves').textContent }));
  log('after e4', JSON.stringify(st));
  assert.equal(st.sans[0], 'e4');
  // flip and move with the board turned
  await p.click('#arFlip'); await p.waitForTimeout(300);
  const flipped = await p.evaluate(() => ({ flip: __G.flip, pressed: document.querySelector('#arFlip').getAttribute('aria-pressed'), firstFile: document.querySelector('#aSq i:nth-child(57) b.f')?.textContent, firstRank: document.querySelector('#aSq i:nth-child(1) b.r')?.textContent }));
  log('flipped', JSON.stringify(flipped)); assert.equal(flipped.firstFile, 'h'); assert.equal(flipped.firstRank, '1');
  if (out) await p.screenshot({ path: out + '-game-flipped.png' });
  await click('d1'); await click('h5');
  await p.waitForFunction(() => __G.sans.length === 4 && !__G.lock || !!__G.over, null, { timeout: 15000 });
  st = await p.evaluate(() => ({ sans: __G.sans, over: __G.over }));
  log('after Qh5', JSON.stringify(st)); assert.ok(st.sans[2].startsWith('Фh5'));
  // undo
  await p.click('#arUndo'); await p.waitForTimeout(400);
  st = await p.evaluate(() => ({ sans: __G.sans, undo: __G.undo, status: document.querySelector('#arStatus').textContent }));
  log('after undo', JSON.stringify(st)); assert.equal(st.sans.length, 2); assert.equal(st.undo, 1);
  await p.click('#arFlip'); await p.waitForTimeout(200);
  // keyboard: arrows from e2 cursor; walk to d2 then d3
  await p.evaluate(() => { __G.kb = -1; });
  await p.focus('#aBoard');
  await p.keyboard.press('ArrowLeft'); // shows the cursor on e2
  await p.keyboard.press('ArrowLeft'); // d2
  await p.keyboard.press('Enter'); // pick d2
  await p.keyboard.press('ArrowUp'); // d3
  await p.keyboard.press('Enter'); // move
  await p.waitForFunction(() => __G.sans.length === 4 && !__G.lock || !!__G.over, null, { timeout: 15000 });
  st = await p.evaluate(() => ({ sans: __G.sans, kb: document.querySelector('#arKb').textContent }));
  log('after keyboard d3', JSON.stringify(st)); assert.equal(st.sans[2], 'd3');
  if (out) await p.screenshot({ path: out + '-game-moves.png' });

  // a forced win: mate in one on the board
  await p.evaluate(() => { const CC = window.ChessCore; __G.pos = new CC.Position('6k1/5ppp/8/8/8/8/5PPP/3Q2K1 w - - 0 1'); __G.fens = []; __G.last = null; __G.sel = -1; __draw(); });
  await click('d1'); await click('d8');
  await p.waitForSelector('#arRes:not([hidden])', { timeout: 5000 });
  await p.waitForTimeout(1200);
  const res = await p.evaluate(() => ({ title: document.querySelector('.ar-card h2').textContent, text: document.querySelector('.ar-card').innerText, stars: document.querySelectorAll('.ar-stars i.on').length, status: document.querySelector('#arStatus').textContent, said: document.querySelector('#arSay').textContent }));
  log('result', JSON.stringify(res)); assert.equal(res.title, 'Победа!'); assert.equal(res.stars, 2);
  if (out) await p.screenshot({ path: out + '-win.png' });
  await p.click('#arNext'); await p.waitForTimeout(900);
  const nx = await p.evaluate(() => ({ modal: document.querySelector('.botsheet h2')?.textContent, unlocked: document.querySelectorAll('.apstop:not(.s-lock)').length, won: document.querySelectorAll('.apstop.s-won').length, sum: document.querySelector('.ap-sum')?.textContent }));
  log('next', JSON.stringify(nx)); assert.equal(nx.modal, 'Колючка'); assert.equal(nx.won, 1);
  if (out) await p.screenshot({ path: out + '-next-intro.png' });
  await p.keyboard.press('Escape'); await p.waitForTimeout(300);
  if (out) await p.screenshot({ path: out + '-path-after-win.png' });

  // the second opponent: draw by agreement, resign
  await p.click('.apcard [data-meet="1"]'); await p.waitForTimeout(600);
  await p.click('#biGo'); await p.waitForTimeout(900);
  if (out) await p.screenshot({ path: out + '-game2.png' });
  await p.click('#arDraw'); await p.click('#arDraw');
  await p.waitForSelector('#arRes:not([hidden])', { timeout: 3000 });
  const dr = await p.evaluate(() => document.querySelector('.ar-card h2').textContent); log('draw', dr); assert.equal(dr, 'Ничья');
  await p.click('#arAgain'); await p.waitForTimeout(800);
  await click('e2'); await click('e4');
  await p.waitForTimeout(150);
  await p.click('#arResign'); await p.click('#arResign');
  await p.waitForSelector('#arRes:not([hidden])', { timeout: 3000 });
  await p.waitForTimeout(1500); // a pending reply must not land after the result
  const rs = await p.evaluate(() => ({ t: document.querySelector('.ar-card h2').textContent, sans: __G.sans.length }));
  log('resign', JSON.stringify(rs)); assert.equal(rs.t, 'Поражение'); assert.equal(rs.sans, 1);
  await p.click('#arMap'); await p.waitForTimeout(700);
  // leaving a game in progress asks first
  await p.click('.apcard [data-meet="1"]'); await p.waitForTimeout(600); await p.click('#biGo'); await p.waitForTimeout(800);
  await click('e2'); await click('e4'); await p.waitForTimeout(200);
  await p.click('#arX'); await p.waitForTimeout(150);
  const armed = await p.evaluate(() => ({ text: document.querySelector('#arX')?.textContent, open: !!document.querySelector('.arena') }));
  log('leave armed', JSON.stringify(armed)); assert.equal(armed.open, true);
  await p.click('#arX'); await p.waitForTimeout(500);
  assert.equal(await p.evaluate(() => !!document.querySelector('.arena')), false);
  await p.click('.crumb, [data-go="home"]').catch(() => {});
  await p.evaluate(() => document.querySelector('.logo')?.click()); await p.waitForTimeout(900);
  if (out) await p.screenshot({ path: out + '-home-after.png' });
  const tile = await p.evaluate(() => document.querySelector('.tl-arena')?.innerText);
  log('tile', JSON.stringify(tile));
  assert.equal(errs.length, 0, errs.join('\n'));
  console.log('PASS «Путь чемпионов»: page, 12 opponents, game, win, draw, resign');
  await b.close();
})().catch(e => { console.error('FAIL', e); process.exit(1); });
