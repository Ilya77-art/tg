// usage: node run.js [id ...]  — builds the graphs (all, or the given ids) into out/graphs.json and logs a report
const fs = require('fs'), path = require('path');
const { Engine } = require('./sf.js');
const { build } = require('./graph.js');
const { buildMill } = require('./mill.js');
const T = require('./tasks.js');
(async () => {
  const want = process.argv.slice(2);
  const OUT = path.join(__dirname, 'out'); fs.mkdirSync(OUT, { recursive: true });
  const file = path.join(OUT, 'graphs.json');
  const all = fs.existsSync(file) ? JSON.parse(fs.readFileSync(file, 'utf8')) : {};
  const e = new Engine({ threads: 4, hash: 256 }); await e.init();
  const log = s => { console.log(s); fs.appendFileSync(path.join(OUT, 'report.txt'), s + '\n'); };
  for (const t of T.graphs) if (!want.length || want.includes(t.id)) { all[t.id] = await build(e, t, log); fs.writeFileSync(file, JSON.stringify(all)); }
  for (const t of T.mills) if (!want.length || want.includes(t.id)) { all[t.id] = await buildMill(e, t, log); fs.writeFileSync(file, JSON.stringify(all)); }
  e.quit();
})();
