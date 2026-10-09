// usage: node tools/lesson10/pw_lesson10.js <outdir> [w h scheme]  — plays through lesson 10 standalone, screenshots every chapter
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
  await page.goto(`http://localhost:${port}/zvezdnaya-akademiya/lessons/10-melnitsa-torre.html`);
  await page.waitForTimeout(700);
  await page.screenshot({ path: `${out}/00-intro.png` });
  await page.waitForTimeout(1800);
  const shot = async n => page.screenshot({ path: `${out}/${n}.png` });
  const fb = async () => (await page.locator('#fb').innerText().catch(() => '')).replace(/\s+/g, ' ');
  const mv = async (a, b, wait = 1300) => { await page.click(`#board [data-sq="${a}"]`); await page.waitForTimeout(120); await page.click(`#board [data-sq="${b}"]`); await page.waitForTimeout(wait); };
  const tab = async i => { await page.click(`#tabs [data-c="${i}"]`); await page.waitForTimeout(700); };
  const next = async () => { await page.click('#nx'); await page.waitForTimeout(700); };
  const log = (...a) => console.log(...a);

  // prologue
  await shot('01-prologue');
  for (const s of ['h8', 'd1', 'd5', 'd7']) { await page.click(`#board [data-sq="${s}"]`); await page.waitForTimeout(250); }
  log('prologue:', await fb());
  await shot('02-prologue-found');
  await page.click('#shotB'); await page.waitForTimeout(3800);
  log('prologue shot:', await fb());
  await shot('03-prologue-shot');

  // chapter 1: one wrong move, then the right ones
  await tab(1);
  await mv('e2', 'e4', 2400); log('1 wrong:', await fb());
  await mv('d3', 'h7', 300); await shot('10-ch1-beam'); await page.waitForTimeout(1100);
  await mv('d1', 'd6'); log('1a:', await fb()); await shot('11-ch1-done'); await next();
  await mv('d4', 'd5'); await mv('d5', 'e6'); log('1b:', await fb()); await next();
  await mv('e5', 'f3'); await mv('e8', 'e1'); log('1c:', await fb()); await shot('12-ch1-black'); await next();
  log('1 finish:', (await page.locator('#card').innerText()).replace(/\s+/g, ' ').slice(0, 200)); await shot('13-ch1-finish');

  // chapter 2
  await tab(2);
  await mv('e5', 'c6'); await mv('c6', 'd8'); log('2a:', await fb()); await next();
  await mv('e5', 'c7'); await mv('c7', 'd6'); await mv('e1', 'e8'); await mv('e8', 'f8'); log('2b:', await fb()); await shot('20-ch2-mate'); await next();
  await mv('e4', 'd6'); log('2c:', await fb()); await next();
  await shot('21-ch2-finish');

  // chapter 3: quiz (answers) then two mates
  await tab(3);
  await shot('30-ch3-quiz');
  const answers = [['run', 'take', 'block'], ['run', 'take'], ['run'], ['none'], ['take', 'block'], ['block']];
  for (let i = 0; i < answers.length; i++) {
    for (const a of answers[i]) { await page.click(`#ways [data-w="${a}"]`); await page.waitForTimeout(80); }
    await page.click('#chk'); await page.waitForTimeout(500);
    log(`3 quiz ${i + 1}:`, await fb());
    if (i === 2) await shot('31-ch3-double');
    await next();
  }
  await mv('e5', 'g6'); log('3a:', await fb()); await shot('32-ch3-mate'); await next();
  await mv('h6', 'h7'); await mv('h5', 'f6'); log('3b:', await fb()); await next();
  await shot('33-ch3-finish');

  // chapter 4: the mill — grind everything, then the queen
  await tab(4);
  await shot('40-ch4-mill');
  const grind = [['g7', 'f7'], ['f7', 'g7'], ['g7', 'd7'], ['d7', 'g7'], ['g7', 'b7'], ['b7', 'g7'], ['g7', 'a7'], ['a7', 'g7'], ['g7', 'g5'], ['g5', 'h5']];
  for (const [a, b] of grind) { await mv(a, b, 1000); }
  log('4 mill:', await fb(), '|', await page.locator('#sackN').innerText());
  await shot('41-ch4-sack'); await next();
  await mv('g7', 'f7'); await mv('f7', 'g7'); await mv('g7', 'g3'); await mv('e1', 'e7'); log('4b:', await fb()); await next();
  await shot('42-ch4-finish');

  // chapter 5: Torre
  await tab(5);
  await shot('50-ch5-torre');
  const torre = [['g5', 'f6'], ['g3', 'g7'], ['g7', 'f7'], ['f7', 'g7'], ['g7', 'b7'], ['b7', 'g7'], ['g7', 'g5'], ['g5', 'h5']];
  for (const [a, b] of torre) await mv(a, b, 1300);
  log('5:', await fb()); await shot('51-ch5-done');
  await next(); await shot('52-ch5-finish');

  // chapter 6: defence (one mistake first)
  await tab(6);
  await mv('f8', 'd8', 3300); log('6 wrong:', await fb()); await shot('60-ch6-refuted');
  await mv('d6', 'c7'); log('6a:', await fb()); await next();
  await mv('d8', 'e7'); await mv('d7', 'd6'); log('6b:', await fb()); await next();
  await mv('d7', 'f6'); log('6c:', await fb()); await next();
  await shot('61-ch6-finish');

  // chapter 7: Lasker hunt
  await tab(7);
  const hunt = [['h5', 'h7'], ['e4', 'f6'], ['e5', 'g4'], ['h2', 'h4'], ['g2', 'g3'], ['d3', 'e2'], ['h1', 'h2'], ['e1', 'd2']];
  for (const [a, b] of hunt) await mv(a, b, 1400);
  log('7:', await fb()); await shot('70-ch7-mate');
  await next(); await shot('71-ch7-finish');

  // final
  await tab(8); await page.waitForTimeout(800);
  log('final:', (await page.locator('#card').innerText()).replace(/\s+/g, ' ').slice(0, 160));
  await shot('80-final');
  await page.click('#notesBtn'); await page.waitForTimeout(400); await shot('81-notes');
  log('stars:', await page.locator('#stars').innerText());
  log(errs.length ? 'ERRORS:\n' + errs.join('\n') : 'no errors');
  await browser.close(); srv.close();
})();
