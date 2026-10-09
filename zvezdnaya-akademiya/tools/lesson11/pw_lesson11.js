// usage: node tools/lesson11/pw_lesson11.js <outdir> [w h scheme]  — plays through lesson 11 standalone, screenshots every chapter
// PLAYWRIGHT: path of the playwright package; CHROMIUM: the browser executable (optional)
const { chromium } = require(process.env.PLAYWRIGHT || 'playwright');
const http = require('http'), fs = require('fs'), path = require('path');
const ROOT = path.join(__dirname, '..', '..', '..');
const MIME = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.css': 'text/css', '.png': 'image/png', '.webp': 'image/webp', '.mp4': 'video/mp4' };
const serve = () => new Promise(res => { const s = http.createServer((q, r) => { const p = path.join(ROOT, decodeURIComponent(q.url.split('?')[0])); fs.readFile(p, (e, d) => { if (e) { r.writeHead(404); r.end(); return; } r.writeHead(200, { 'Content-Type': MIME[path.extname(p)] || 'application/octet-stream' }); r.end(d); }); }); s.listen(0, () => res(s)); });
(async () => {
  const [out, w = '1440', h = '900', scheme = 'light'] = process.argv.slice(2);
  fs.mkdirSync(out, { recursive: true });
  const srv = await serve(), port = srv.address().port;
  const browser = await chromium.launch(process.env.CHROMIUM ? { executablePath: process.env.CHROMIUM } : {});
  const ctx = await browser.newContext({ viewport: { width: +w, height: +h }, colorScheme: scheme, deviceScaleFactor: 1 });
  const page = await ctx.newPage();
  const errs = [];
  page.on('pageerror', e => errs.push('pageerror: ' + e.message));
  page.on('console', m => { if (m.type() === 'error' && !/ERR_FAILED/.test(m.text())) errs.push('console: ' + m.text()); }); // fonts are blocked on purpose
  await page.route('**/fonts.googleapis.com/**', r => r.abort());
  await page.route('**/fonts.gstatic.com/**', r => r.abort());
  await page.goto(`http://localhost:${port}/zvezdnaya-akademiya/lessons/11-teatr-karabasa.html`);
  await page.waitForTimeout(700);
  await page.screenshot({ path: `${out}/00-intro.png` });
  await page.waitForTimeout(2200);
  const shot = async n => page.screenshot({ path: `${out}/${n}.png` });
  const fb = async () => (await page.locator('#fb').innerText().catch(() => '')).replace(/\s+/g, ' ');
  const mv = async (a, b, wait = 1300) => { await page.click(`#board [data-sq="${a}"]`); await page.waitForTimeout(120); await page.click(`#board [data-sq="${b}"]`); await page.waitForTimeout(wait); };
  const promo = async (k, wait = 1300) => { await page.locator('.promo-box button').nth(k).click(); await page.waitForTimeout(wait); };
  const tab = async i => { await page.click(`#tabs [data-c="${i}"]`); await page.waitForTimeout(700); };
  const next = async () => { await page.click('#nx'); await page.waitForTimeout(700); };
  const click = async s => { await page.click(`#board [data-sq="${s}"]`); await page.waitForTimeout(150); };
  const log = (...a) => console.log(...a);

  // prologue
  await shot('01-prologue');
  for (const s of ['e1', 'h2', 'e4', 'e8']) await click(s);
  log('prologue:', await fb());
  await shot('02-prologue-found');
  await page.click('#pullB'); await page.waitForTimeout(3800);
  log('prologue pull:', await fb());
  await shot('03-prologue-pull');

  // chapter 1: one wrong move, then the right ones
  await tab(1);
  await mv('h2', 'h3', 2400); log('1 wrong:', await fb());
  await mv('d3', 'b5'); await shot('10-ch1-pin'); await mv('b5', 'd7'); log('1a:', await fb()); await shot('11-ch1-done'); await next();
  await mv('h2', 'h4', 2200); log('1b eq:', await fb());
  await mv('d4', 'd5'); await mv('d5', 'c6'); log('1b:', await fb()); await next();
  await shot('12-ch1-queen');
  await mv('f3', 'f7'); log('1c:', await fb()); await shot('13-ch1-mate'); await next();
  log('1 finish:', (await page.locator('#card').innerText()).replace(/\s+/g, ' ').slice(0, 220)); await shot('14-ch1-finish');

  // chapter 2
  await tab(2);
  await mv('e4', 'e5'); await mv('d4', 'e5'); log('2a:', await fb()); await shot('20-ch2-a'); await next();
  await mv('e3', 'e4', 2300); log('2b eq:', await fb());
  await mv('c2', 'c4'); await mv('d1', 'd8'); log('2b:', await fb()); await shot('21-ch2-b'); await next();
  await shot('22-ch2-finish');

  // chapter 3: quiz (one mistake on card 4), then two tasks
  await tab(3);
  await shot('30-ch3-quiz');
  const answers = [['c6'], ['f6'], ['c3'], ['c6'], ['c3', 'f6'], ['e5', 'f2']];
  for (let i = 0; i < answers.length; i++) {
    for (const s of answers[i]) await click(s);
    if (i === 0) await shot('31-ch3-picked');
    await page.click('#chk'); await page.waitForTimeout(500);
    log(`3 quiz ${i + 1}:`, await fb());
    if (i === 4) await shot('32-ch3-two');
    if (i === 3) await shot('33-ch3-nopin');
    await next();
  }
  await mv('d2', 'h6'); await mv('h6', 'g7'); log('3a:', await fb()); await shot('34-ch3-mate'); await next();
  await mv('c4', 'd5'); log('3b:', await fb()); await next();
  await shot('35-ch3-finish');

  // chapter 4: skewers
  await tab(4);
  await mv('d1', 'f3', 300); await shot('40-ch4-nose'); await page.waitForTimeout(1000);
  await mv('f3', 'a8'); log('4a:', await fb()); await next();
  await mv('a8', 'h8'); await mv('h8', 'h7', 300); await shot('41-ch4-rook'); await page.waitForTimeout(1000); await mv('h7', 'a7'); log('4b:', await fb()); await next();
  await click('a7'); await click('a8'); await page.waitForTimeout(300); await shot('42-ch4-promo'); await promo(0, 300); await shot('43-ch4-promo-nose'); await page.waitForTimeout(1000);
  await mv('a8', 'h1'); log('4c:', await fb()); await next();
  await shot('44-ch4-finish');

  // chapter 5: false pins (black)
  await tab(5);
  await shot('50-ch5-elephant');
  await mv('f6', 'd5'); await mv('f8', 'b4'); await mv('b4', 'd2'); await mv('e8', 'd8'); log('5a:', await fb()); await shot('51-ch5-elephant-done'); await next();
  await mv('f6', 'e4'); await mv('c5', 'f2'); await mv('c8', 'g4'); log('5b:', await fb()); await shot('52-ch5-stafford'); await next();
  await shot('53-ch5-finish');

  // chapter 6: defence (one mistake first)
  await tab(6);
  await mv('h7', 'h6', 3400); log('6 wrong:', await fb()); await shot('60-ch6-refuted');
  await mv('a7', 'a6'); log('6a:', await fb()); await next();
  await mv('h7', 'h6'); log('6b:', await fb()); await next();
  await mv('e7', 'e6'); log('6c:', await fb()); await next();
  await shot('61-ch6-finish');

  // chapter 7: traps (black); a queen promotion first in the Lasker trap
  await tab(7);
  await mv('f8', 'b4'); await mv('b4', 'c3'); await mv('b2', 'c1'); log('7a:', await fb()); await shot('70-ch7-englund'); await next();
  await mv('e5', 'd3'); log('7b:', await fb()); await shot('71-ch7-budapest'); await next();
  await click('f2'); await click('g1'); await promo(0, 2600); log('7c wrong:', await fb());
  await click('f2'); await click('g1'); await promo(3); await mv('c8', 'g4', 400); await shot('72-ch7-lasker'); await page.waitForTimeout(900); log('7c:', await fb()); await next();
  await shot('73-ch7-finish');

  // final
  await tab(8); await page.waitForTimeout(800);
  log('final:', (await page.locator('#card').innerText()).replace(/\s+/g, ' ').slice(0, 200));
  await shot('80-final');
  await page.click('#notesBtn'); await page.waitForTimeout(400); await shot('81-notes');
  log('stars:', (await page.locator('#stars').innerText()).replace(/\s+/g, ''));
  log(errs.length ? 'ERRORS:\n' + errs.join('\n') : 'no errors');
  await browser.close(); srv.close();
})();
