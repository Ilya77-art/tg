const fs = require('fs');
const html = fs.readFileSync('/home/claude/work/out/zvezdnaya-akademiya/index.html', 'utf8');
const scripts = [...html.matchAll(/<script>([\s\S]*?)<\/script>/g)].map(m => m[1]);
global.window = global;
eval(scripts.find(s => s.includes('window.ACAD_LICHESS')));
{ const module = { exports: {} }; eval(scripts.find(s => s.includes('Mini chess core')).split('/* «Звёздная академия» v4')[0]); global.ChessCore = module.exports; }
const app = scripts.find(s => s.includes('const LI = (() =>'));
const plural = (n, a, b, c) => { const m = Math.abs(n) % 10, h = Math.abs(n) % 100; return m === 1 && h !== 11 ? a : (m >= 2 && m <= 4 && (h < 12 || h > 14) ? b : c); };
module.exports = eval(app.slice(app.indexOf('const LI = (() =>'), app.indexOf('/* ---------- the class library')) + '; LI');
