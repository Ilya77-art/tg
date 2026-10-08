// robustness: rapid open clicks, skip spam, keyboard, «ещё раз» double press, edge-on 3D, reduced motion
const { chromium } = require('/home/claude/.npm-global/lib/node_modules/playwright');
const fs = require('fs'), http = require('http'), path = require('path');
const [W, H, theme] = [1280, 800, process.argv[2] || 'dark'];
function serve() { return new Promise(res => { const srv = http.createServer((q, r) => { const p = path.join('/home/claude', decodeURIComponent(q.url.split('?')[0])); fs.readFile(p, (e, d) => { if (e) { r.writeHead(404); r.end(); return; } r.writeHead(200, { 'Content-Type': p.endsWith('.html') ? 'text/html; charset=utf-8' : 'application/octet-stream' }); r.end(d); }); }); srv.listen(0, () => res(srv)); }); }
(async () => {
  const srv = await serve(), PORT = srv.address().port;
  const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome' });
  const run = async (rm) => {
    const ctx = await browser.newContext({ viewport: { width: W, height: H }, colorScheme: theme, reducedMotion: rm ? 'reduce' : 'no-preference' });
    const page = await ctx.newPage(); const errs = [];
    page.on('pageerror', e => errs.push('pageerror: ' + e.message)); page.on('console', m => { if (m.type() === 'error' && !/ERR_FAILED/.test(m.text())) errs.push('console: ' + m.text()); });
    await page.route('**/fonts.g*/**', r => r.abort());
    const seed = { 'students:v1': { s1: { id: 's1', name: 'Маша', piece: 'N', hue: 200, created: 1, v: 3, profile: { onboard: 2, path: { season: 1, base: 600, seen: 1, paid: 1, promos: [{ p: 'Q', t: 1, season: 1 }] } }, earned: {}, bonus: 600, inv: {}, decor: {}, medals: null } }, active: 's1', shop: 'skins', view3: 'shop' };
    await page.addInitScript(seed => { if (!localStorage.getItem('zvezdnaya-akademiya:seeded')) { for (const [k, v] of Object.entries(seed)) localStorage.setItem('zvezdnaya-akademiya:' + k, JSON.stringify(v)); localStorage.setItem('zvezdnaya-akademiya:seeded', '1'); } }, seed);
    await page.goto(`http://localhost:${PORT}/work/out/zvezdnaya-akademiya/index.html`); await page.waitForTimeout(2000);
    const st = () => page.evaluate(() => { const s = JSON.parse(localStorage.getItem('zvezdnaya-akademiya:students:v1')).s1; return { cases: s.log.filter(l => l.k === 'case').length, spent: s.spent, overlays: document.querySelectorAll('.opening').length, flash: document.querySelectorAll('.flash').length, insp: document.querySelectorAll('.insp').length, phase: document.querySelector('.opening') && document.querySelector('.opening').dataset.phase }; });
    const tag = rm ? 'RM' : 'full';
    // 1. rapid presses on «Открыть»
    await page.click('[data-cs="sk_basic"]'); await page.waitForTimeout(500);
    const ob = await page.locator('#csOpen').boundingBox();
    for (let i = 0; i < 6; i++) await page.mouse.click(ob.x + ob.width / 2, ob.y + ob.height / 2, { delay: 5 });
    await page.waitForTimeout(400); console.log(tag, 'after 6 presses:', JSON.stringify(await st()));
    // 2. skip spam + keyboard during the show
    for (let i = 0; i < 4; i++) { await page.click('#skipB', { timeout: 150 }).catch(() => {}); }
    await page.keyboard.press('Space'); await page.keyboard.press('Enter');
    await page.waitForTimeout(250); console.log(tag, 'after skip spam:', JSON.stringify(await st()));
    await page.waitForTimeout(700); await page.screenshot({ path: `/home/claude/work/shots/rb_${tag}_reveal.png` });
    // 3. «Ещё раз» pressed twice fast
    const ag = page.locator('#againB');
    if (await ag.count()) { const b = await ag.boundingBox(); await page.mouse.click(b.x + 20, b.y + 10); await page.mouse.click(b.x + 20, b.y + 10); }
    await page.waitForTimeout(300); console.log(tag, 'after double «ещё раз»:', JSON.stringify(await st()));
    await page.waitForTimeout(rm ? 800 : 1200); await page.screenshot({ path: `/home/claude/work/shots/rb_${tag}_again.png` });
    await page.keyboard.press('Escape'); await page.waitForTimeout(rm ? 600 : 9000);
    console.log(tag, 'waited:', JSON.stringify(await st()));
    await page.keyboard.press('Escape'); await page.waitForTimeout(400);
    console.log(tag, 'after Esc take:', JSON.stringify(await st()));
    if (!rm) {
      if (!(await page.locator('[data-cs="sk_basic"]').count())) { await page.evaluate(() => { localStorage.setItem('zvezdnaya-akademiya:view3', '"shop"'); }); await page.reload(); await page.waitForTimeout(1800); }
      // 4. edge-on: the full viewer, dragged to 90°, held
      await page.click('[data-cs="sk_basic"]'); await page.waitForTimeout(500);
      await page.click('#csPool [data-item]'); await page.waitForTimeout(2200);
      const stg = await page.locator('#ist').boundingBox(); const cx = stg.x + stg.width / 2, cy = stg.y + stg.height / 2;
      for (const [deg, name] of [[78, 'edge'], [40, 'three']]) {
        await page.mouse.move(cx, cy); await page.mouse.down();
        const dx = (deg + 12) / 0.5; await page.mouse.move(cx + dx, cy, { steps: 6 }); await page.waitForTimeout(250);
        await page.screenshot({ path: `/home/claude/work/shots/rb_${name}.png`, clip: { x: cx - 260, y: cy - 280, width: 520, height: 560 } });
        await page.mouse.up(); await page.waitForTimeout(1800);
      }
      await page.screenshot({ path: '/home/claude/work/shots/rb_rest.png', clip: { x: cx - 260, y: cy - 280, width: 520, height: 560 } });
    }
    if (errs.length) console.log(tag, errs.join('\n'));
    await ctx.close();
  };
  await run(false); await run(true);
  await browser.close(); srv.close();
})();
