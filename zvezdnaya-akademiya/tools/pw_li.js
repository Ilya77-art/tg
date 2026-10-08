// Lichess flow: open tasks → Lichess tab → load a lesson → solve puzzles by clicking → screenshots
const { chromium } = require('/home/claude/.npm-global/lib/node_modules/playwright');
const fs = require('fs'), http = require('http'), path = require('path');
const LI = require('./li_node.js');
const [size, theme, prefix, mode] = process.argv.slice(2);
const [W, H] = (size || '1440x900').split('x').map(Number);
function serve() { return new Promise(res => { const srv = http.createServer((q, r) => { const p = path.join('/home/claude', decodeURIComponent(q.url.split('?')[0])); fs.readFile(p, (e, d) => { if (e) { r.writeHead(404); r.end(); return; } r.writeHead(200, { 'Content-Type': p.endsWith('.html') ? 'text/html; charset=utf-8' : 'application/octet-stream' }); r.end(d); }); }); srv.listen(0, () => res(srv)); }); }
(async () => {
  const srv = await serve(), PORT = srv.address().port;
  const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome' });
  const ctx = await browser.newContext({ viewport: { width: W, height: H }, colorScheme: theme || 'light' });
  const page = await ctx.newPage();
  const errs = []; page.on('pageerror', e => errs.push('pageerror: ' + e.message)); page.on('console', m => { if (m.type() === 'error' && !/ERR_FAILED/.test(m.text())) errs.push('console: ' + m.text()); });
  await page.route('**/fonts.g*/**', r => r.abort());
  const seed = JSON.parse(fs.readFileSync('/home/claude/work/seed.json', 'utf8'));
  await page.addInitScript(seed => { if (!localStorage.getItem('zvezdnaya-akademiya:seeded')) { for (const [k, v] of Object.entries(seed)) localStorage.setItem('zvezdnaya-akademiya:' + k, JSON.stringify(v)); localStorage.setItem('zvezdnaya-akademiya:seeded', '1'); } }, seed);
  await page.goto(`http://localhost:${PORT}/work/out/zvezdnaya-akademiya/index.html`);
  await page.waitForTimeout(1500);
  const shot = async n => page.screenshot({ path: `/home/claude/work/shots/${prefix}_${n}.png` });
  await page.click('[data-go="tasks"]'); await page.waitForTimeout(900); await shot('1tasks');
  await page.click('.litab'); await page.waitForTimeout(900); await shot('2lib');
  await page.click('[data-add="fork-2"]'); await page.waitForTimeout(600); if (mode === 'cap') { await page.click('[data-c="30"]'); await page.waitForTimeout(200); } await shot('3loader');
  await page.click('#lgo'); await page.waitForTimeout(1800); await shot('4lesson');
  // solve the shown puzzles
  const lib = await page.evaluate(() => JSON.parse(localStorage.getItem('zvezdnaya-akademiya:lichess:v1')));
  const list = lib['fork-2'].list.map(LI.prep);
  const clickSq = async (sq) => { const b = await page.locator('#lboard').boundingBox(); const f = sq.charCodeAt(0) - 97, r = +sq[1]; await page.mouse.click(b.x + (f + 0.5) * b.width / 8, b.y + (8 - r + 0.5) * b.height / 8); await page.waitForTimeout(120); };
  const solveCur = async (wrongFirst) => {
    const name = await page.locator('.tname').innerText(); const i = +name.match(/Задача (\d+)/)[1] - 1; const pz = list[i];
    if (wrongFirst) { // a wrong but legal move first
      const ChessCore = global.ChessCore; const pos = new ChessCore.Position(pz.fen); pos.make(pos.findMove(pz.line[0]));
      const bad = pos.moves().find(m => ChessCore.sqName(m.from) + ChessCore.sqName(m.to) !== pz.line[1].slice(0, 4) && (pos.make(m), (() => { const st = pos.status(); pos.unmake(); return st !== 'mate'; })()));
      await clickSq(ChessCore.sqName(bad.from)); await clickSq(ChessCore.sqName(bad.to)); await page.waitForTimeout(250); await shot('5wrong'); await page.waitForTimeout(900);
    }
    for (let k = 1; k < pz.line.length; k += 2) { await clickSq(pz.line[k].slice(0, 2)); await clickSq(pz.line[k].slice(2, 4)); await page.waitForTimeout(1100); }
    return pz;
  };
  await solveCur(true); await page.waitForTimeout(600); await shot('6solved');
  const r1 = await page.evaluate(() => JSON.parse(localStorage.getItem('zvezdnaya-akademiya:students:v1')).s1);
  console.log('after 1:', JSON.stringify(r1.earned.LCH), r1.lp.ok.length, JSON.stringify(r1.q.solved));
  if (mode === 'cap') {
    for (let n = 0; n < 20; n++) { await page.click('#lNext'); await page.waitForTimeout(1300); await solveCur(false); await page.waitForTimeout(400); }
    await shot('7capped');
    const r2 = await page.evaluate(() => JSON.parse(localStorage.getItem('zvezdnaya-akademiya:students:v1')).s1);
    console.log('after 21:', JSON.stringify(r2.earned.LCH), r2.lp.ok.length, 'msg:', await page.locator('#lmsg').innerText());
  }
  await page.click('#lBack'); await page.waitForTimeout(700); await shot('8lib');
  await page.click('[data-go="journal"]').catch(() => {}); 
  if (errs.length) console.log(errs.join('\n'));
  await browser.close(); srv.close();
})();
