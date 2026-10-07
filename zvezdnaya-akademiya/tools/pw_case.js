// case opening: frames through the whole sequence → contact sheet
const { chromium } = require('/home/claude/.npm-global/lib/node_modules/playwright');
const fs = require('fs'), http = require('http'), path = require('path');
const [dir, prefix, size, theme, caseId, ...flags] = process.argv.slice(2);
const [W, H] = (size || '1280x800').split('x').map(Number);
function serve() { return new Promise(res => { const srv = http.createServer((q, r) => { const p = path.join('/home/claude', decodeURIComponent(q.url.split('?')[0])); fs.readFile(p, (e, d) => { if (e) { r.writeHead(404); r.end(); return; } r.writeHead(200, { 'Content-Type': p.endsWith('.html') ? 'text/html; charset=utf-8' : 'application/octet-stream' }); r.end(d); }); }); srv.listen(0, () => res(srv)); }); }
(async () => {
  const srv = await serve(), PORT = srv.address().port;
  const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome' });
  const ctx = await browser.newContext({ viewport: { width: W, height: H }, colorScheme: theme || 'dark', recordVideo: flags.includes('video') ? { dir: '/home/claude/work/vid', size: { width: W, height: H } } : undefined, reducedMotion: flags.includes('rm') ? 'reduce' : 'no-preference' });
  const page = await ctx.newPage(); const tPage = Date.now();
  const errs = []; page.on('pageerror', e => errs.push('pageerror: ' + e.message)); page.on('console', m => { if (m.type() === 'error' && !/ERR_FAILED/.test(m.text())) errs.push('console: ' + m.text()); });
  await page.route('**/fonts.g*/**', r => r.abort());
  const seed = { 'students:v1': { s1: { id: 's1', name: 'Маша', piece: 'N', hue: 200, created: 1, v: 3, profile: { onboard: 2, path: { season: 1, base: 600, seen: 1, paid: 1, promos: [{ p: 'Q', t: 1, season: 1 }] } }, earned: {}, bonus: 600, inv: {}, decor: {}, medals: null } }, active: 's1', shop: caseId === 'stickers' || caseId === 'portal' || caseId.startsWith('it_') ? 'items' : 'skins', view3: 'shop' };
  await page.addInitScript(seed => { if (!localStorage.getItem('zvezdnaya-akademiya:seeded')) { for (const [k, v] of Object.entries(seed)) localStorage.setItem('zvezdnaya-akademiya:' + k, JSON.stringify(v)); localStorage.setItem('zvezdnaya-akademiya:seeded', '1'); } }, seed);
  const tStart = Date.now();
  await page.goto(`http://localhost:${PORT}/${dir}/index.html`);
  await page.waitForTimeout(2200);
  const frames = [];
  const snap = async (label) => { const f = `/home/claude/work/shots/_f${frames.length}.png`; await page.screenshot({ path: f }); frames.push({ f, label }); };
  if (flags.includes('pre')) { await snap('shop'); }
  await page.click(`[data-cs="${caseId}"]`); await page.waitForTimeout(700);
  if (flags.includes('pre')) { await snap('sheet'); }
  const t0 = Date.now();
  if (flags.includes('rapid')) { for (let i = 0; i < 5; i++) { await page.click('#csOpen', { force: true, noWaitAfter: true, timeout: 500 }).catch(() => {}); } }
  else await page.click('#csOpen');
  const marks = flags.includes('skip') ? [150, 600, 'SKIP', 900, 1400, 2400] : flags.includes('few') ? [200, 1000, 1700, 2300, 'SKIP', 1600] : [120, 350, 700, 1000, 1300, 1600, 2000, 3000, 4500, 6000, 7000, 7400, 7800, 8300, 9000, 10500];
  for (const m of marks) {
    if (m === 'SKIP') { await page.click('#skipB'); await page.waitForTimeout(60); await page.click('#skipB').catch(() => {}); continue; }
    const wait = m - (Date.now() - t0); if (wait > 0) await page.waitForTimeout(wait);
    await snap(String(Date.now() - t0));
    if (flags.includes('probe')) console.log('probe', Date.now() - t0, JSON.stringify(await page.evaluate(() => { const o = document.querySelector('.opening'), v = document.querySelector('.cr-v'); return o && { phase: o.dataset.phase, vid: !!v, rs: v && v.readyState, t: v && +v.currentTime.toFixed(2), src: v && v.dataset.src, failed: v && v.dataset.failed, op: v && getComputedStyle(v).opacity, dvid: o.dataset.vid }; })));
  }
  const info = await page.evaluate(() => ({ overlays: document.querySelectorAll('.opening').length, bal: document.querySelector('#balN') && document.querySelector('#balN').textContent, log: JSON.parse(localStorage.getItem('zvezdnaya-akademiya:students:v1')).s1.log.filter(l => l.k === 'case').length }));
  console.log(JSON.stringify(info));
  fs.writeFileSync('/home/claude/work/shots/_frames.json', JSON.stringify(frames));
  if (errs.length) console.log(errs.join('\n'));
  const vp = flags.includes('video') ? await page.video().path() : null;
  await ctx.close(); await browser.close(); srv.close();
  if (vp) fs.writeFileSync('/home/claude/work/vid/last.txt', vp + '\n' + (t0 - tPage));
  require('child_process').execSync(`python3 /home/claude/work/sheet.py ${prefix}`);
})();
