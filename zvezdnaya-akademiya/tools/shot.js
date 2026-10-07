// usage: node shot.js <dir> <outprefix> <w>x<h> [theme] [script...]
const { chromium } = require('/home/claude/.npm-global/lib/node_modules/playwright');
const fs = require('fs');
const http = require('http'), path = require('path');
const MIME = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.css': 'text/css', '.png': 'image/png', '.webp': 'image/webp' };
function serve() { return new Promise(res => { const srv = http.createServer((q, r) => { const p = path.join('/home/claude', decodeURIComponent(q.url.split('?')[0])); fs.readFile(p, (e, d) => { if (e) { r.writeHead(404); r.end(); return; } r.writeHead(200, { 'Content-Type': MIME[path.extname(p)] || 'application/octet-stream' }); r.end(d); }); }); srv.listen(0, () => res(srv)); }); }
(async () => {
  const srv = await serve(); const PORT = srv.address().port;
  const [dir, out, size, theme, ...steps] = process.argv.slice(2);
  const [w, h] = size.split('x').map(Number);
  const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome' });
  const ctx = await browser.newContext({ viewport: { width: w, height: h }, colorScheme: theme || 'light', deviceScaleFactor: 1 });
  const page = await ctx.newPage();
  const errs = [];
  page.on('pageerror', e => errs.push('pageerror: ' + e.message));
  page.on('console', m => { if (m.type() === 'error') errs.push('console: ' + m.text()); });
  const seed = JSON.parse(fs.readFileSync('/home/claude/work/seed.json', 'utf8'));
  await page.addInitScript(seed => {
    if (!localStorage.getItem('zvezdnaya-akademiya:seeded')) {
      for (const [k, v] of Object.entries(seed)) localStorage.setItem('zvezdnaya-akademiya:' + k, JSON.stringify(v));
      localStorage.setItem('zvezdnaya-akademiya:seeded', '1');
    }
  }, seed);
  await page.route('**/fonts.googleapis.com/**', r => r.abort());
  await page.route('**/fonts.gstatic.com/**', r => r.abort());
  await page.goto(`http://localhost:${PORT}/` + dir + '/index.html');
  await page.waitForTimeout(900);
  let i = 0;
  for (const st of steps) {
    if (st.startsWith('click:')) { await page.click(st.slice(6)); await page.waitForTimeout(700); }
    else if (st.startsWith('eval:')) { const r = await page.evaluate(st.slice(5)); if (r !== undefined) console.log('eval>', JSON.stringify(r).slice(0, 2000)); await page.waitForTimeout(500); }
    else if (st.startsWith('wait:')) await page.waitForTimeout(+st.slice(5));
    else if (st.startsWith('shot')) { await page.screenshot({ path: `/home/claude/work/shots/${out}${st.slice(4) || i}.png` }); i++; }
    else if (st.startsWith('el:')) { const [sel, name] = st.slice(3).split('|'); await page.locator(sel).first().screenshot({ path: `/home/claude/work/shots/${out}${name}.png` }); }
  }
  if (!steps.some(s => s.startsWith('shot') || s.startsWith('el:'))) await page.screenshot({ path: `/home/claude/work/shots/${out}.png` });
  if (errs.length) console.log(errs.join('\n'));
  await browser.close(); srv.close();
})();
