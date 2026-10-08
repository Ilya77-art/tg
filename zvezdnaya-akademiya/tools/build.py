#!/usr/bin/env python3
"""Звёздная академия v5 build: base.html (v4 page) + patches + Lichess module + case art → out/."""
import base64, os, shutil, subprocess, sys

W = '/home/claude/work'
SRC = f'{W}/src'
OUT = f'{W}/out/zvezdnaya-akademiya'
s = open(f'{SRC}/base.html', encoding='utf8').read()


def patch(old, new, count=1):
    global s
    n = s.count(old)
    if n != count:
        sys.exit(f'patch anchor found {n} times (want {count}):\n{old[:160]}')
    s = s.replace(old, new)


# 1. the daily-puzzle thumbnail on the hub: rows were sized by their content, so squares came out uneven
patch('.bthumb { display: grid; grid-template-columns: repeat(8, 1fr); width: 100%; height: 100%; }',
      '.bthumb { display: grid; grid-template-columns: repeat(8, minmax(0, 1fr)); grid-template-rows: repeat(8, minmax(0, 1fr)); width: 100%; height: 100%; aspect-ratio: 1; }')
patch('.bthumb i { display: grid; place-items: center; background: var(--sq-light); min-width: 0; min-height: 0; }',
      '.bthumb i { display: grid; place-items: center; background: var(--sq-light); min-width: 0; min-height: 0; overflow: hidden; }')

# 2. catalog: Lichess keys
patch("  const TASK_KEY = 'ZAD';\n",
      "  const TASK_KEY = 'ZAD';\n  /* Lichess puzzles: 1★ for every solved puzzle, at most LICHESS_CAP stars per lesson (one topic at one level) */\n  const LICHESS_KEY = 'LCH', LICHESS_CAP = 20;\n")
patch('GLYPH, QUEST_KEY, DAILY_REWARD, PATH, PROMO, CONTRACTS, CHEST, MEDALS, STARTER };',
      'GLYPH, QUEST_KEY, DAILY_REWARD, PATH, PROMO, CONTRACTS, CHEST, MEDALS, STARTER, LICHESS_KEY, LICHESS_CAP };')

# 3. data: Lichess stars count as earned stars (XP and balance)
patch('+ earnedIn(s, C.TASK_KEY) + earnedIn(s, C.QUEST_KEY);',
      '+ earnedIn(s, C.TASK_KEY) + earnedIn(s, C.QUEST_KEY) + earnedIn(s, C.LICHESS_KEY);')
patch("  const isTask = id => AD.tasks.tasks.some(t => t.id === id);\n",
      "  const isTask = id => AD.tasks.tasks.some(t => t.id === id);\n  /* weekly contracts also count Lichess puzzles (\"li:<id>\") */\n  const isSolved = id => isTask(id) || /^li:[A-Za-z0-9]{4,8}$/.test(id);\n")
patch('solved: cleanIds(q.solved, isTask), clean: cleanIds(q.clean, isTask)',
      'solved: cleanIds(q.solved, isSolved), clean: cleanIds(q.clean, isSolved)')
patch("    s.medals = s.medals && typeof s.medals === 'object' ? s.medals : null;\n",
      "    s.medals = s.medals && typeof s.medals === 'object' ? s.medals : null;\n"
      "    /* v5: Lichess puzzles this student has solved (each gives a star once) */\n"
      "    const lp = s.lp && typeof s.lp === 'object' ? s.lp : {}, seenLp = new Set(), okLp = [];\n"
      "    (Array.isArray(lp.ok) ? lp.ok : []).forEach(x => { if (typeof x === 'string' && /^[A-Za-z0-9]{4,8}$/.test(x) && !seenLp.has(x)) { seenLp.add(x); okLp.push(x); } });\n"
      "    s.lp = { ok: okLp.slice(-6000) };\n")
patch("  function track(id, ev) { return change(id, s => Prog.track(s, ev)); }\n",
      "  function track(id, ev) { return change(id, s => Prog.track(s, ev)); }\n"
      "  /* a solved Lichess puzzle: 1★ the first time, while the lesson has fewer than LICHESS_CAP; contracts count it — one write */\n"
      "  function solveLichess(id, les, pid, info) {\n"
      "    return change(id, s => {\n"
      "      const K = C.LICHESS_KEY, r = { got: 0, first: false, capped: false, done: [] };\n"
      "      s.earned[K] = s.earned[K] || {};\n"
      "      const have = +s.earned[K][les.id] || 0;\n"
      "      if (!s.lp.ok.includes(pid)) { s.lp.ok.push(pid); if (s.lp.ok.length > 6000) s.lp.ok = s.lp.ok.slice(-6000); r.first = true; }\n"
      "      if (r.first && have < C.LICHESS_CAP) { s.earned[K][les.id] = have + 1; r.got = 1; logE(s, 'earn', 1, 'Lichess · ' + les.title); }\n"
      "      else if (r.first) r.capped = true;\n"
      "      r.done = Prog.track(s, { ev: 'solve', id: 'li:' + pid, clean: !!(info && info.clean) });\n"
      "      if (r.got) r.done = r.done.concat(Prog.track(s, { ev: 'lesson', n: r.got }));\n"
      "      return r;\n"
      "    });\n"
      "  }\n")
patch('    openStarter, solve, track, claimChest,', '    openStarter, solve, solveLichess, track, claimChest,')
patch("exported: new Date().toISOString(), students: S }, null, 1); }",
      "exported: new Date().toISOString(), students: S, lichess: Lib.exportAll() }, null, 1); }")
patch("    ids.forEach(id => { S[id] = fix(clone(o.students[id])); S[id].id = id; persist(id); });\n",
      "    ids.forEach(id => { S[id] = fix(clone(o.students[id])); S[id].id = id; persist(id); });\n"
      "    if (o.lichess && typeof o.lichess === 'object') Lib.importAll(o.lichess);\n")

# 4. case art: the three skin cases use the new pictures
patch("  function caseArt(c) {\n",
      "  function caseArt(c) {\n"
      "    const img = (window.ACAD_CASEART || {})[c.look];\n"
      "    if (img) return `<img class=\"case-img\" src=\"${img}\" alt=\"\" draggable=\"false\" decoding=\"async\">`;\n")

# 5. routing: the Lichess page
patch("const VIEWS = ['home', 'students', 'lessons', 'tasks', 'shop', 'profile', 'studio', 'journal'];",
      "const VIEWS = ['home', 'students', 'lessons', 'tasks', 'lichess', 'shop', 'profile', 'studio', 'journal'];")
patch("tasks: 'Задачи', shop: 'Лавка',", "tasks: 'Задачи', lichess: 'Lichess', shop: 'Лавка',")
patch("  if (v === 'tasks') return Board.render();\n",
      "  if (v === 'tasks') return Board.render();\n  if (v === 'lichess') return LiUI.render();\n")
patch('${TS.series.map(x => `<button type="button" data-ser="${x.n}" aria-pressed="${!ST.daily && x.n === ST.series}">${esc(x.title)}</button>`).join(\'\')}</div>',
      '${TS.series.map(x => `<button type="button" data-ser="${x.n}" aria-pressed="${!ST.daily && x.n === ST.series}">${esc(x.title)}</button>`).join(\'\')}<button type="button" class="litab" data-go="lichess" aria-pressed="false">${LiUI.glyph(\'N\')}Lichess</button></div>')

# 6. hub, journal, profile mention Lichess
patch('<span class="t-ey">${T.length} задач · 4 серии</span>',
      '<span class="t-ey">${T.length} ${plural(T.length, \'задача\', \'задачи\', \'задач\')} · 4 серии · ${LiUI.lessonCount() ? `${LiUI.lessonCount()} ${plural(LiUI.lessonCount(), \'урок\', \'урока\', \'уроков\')} Lichess` : \'Lichess\'}</span>')
patch('<th>Задачи</th><th>Квесты</th>', '<th>Задачи</th><th>Lichess</th><th>Квесты</th>')
patch("<td>${Data.earnedIn(s, C.TASK_KEY) || '·'}</td><td>${Data.earnedIn(s, C.QUEST_KEY) || '·'}</td>",
      "<td>${Data.earnedIn(s, C.TASK_KEY) || '·'}</td><td>${Data.earnedIn(s, C.LICHESS_KEY) || '·'}</td><td>${Data.earnedIn(s, C.QUEST_KEY) || '·'}</td>")
patch("    const rows = C.LESSONS.map((L, i) => ({ L, i })).concat(AD.tasks.series.map(se => ({ se })));\n    Pager.mount(pb, rows, x => {\n",
      "    const rows = C.LESSONS.map((L, i) => ({ L, i })).concat(AD.tasks.series.map(se => ({ se }))).concat(Lib.ids().length || Data.earnedIn(s, C.LICHESS_KEY) ? [{ li: true }] : []);\n"
      "    Pager.mount(pb, rows, x => {\n"
      "      if (x.li) {\n"
      "        const e = Data.earnedIn(s, C.LICHESS_KEY), per = Object.entries((s.earned || {})[C.LICHESS_KEY] || {}).filter(([, v]) => v > 0).sort((a, b) => LI.rank(a[0]) - LI.rank(b[0]));\n"
      "        return `<div class=\"prow\"><b>Задачи Lichess</b><b class=\"num\">${e} ${STAR}</b><div class=\"chs\">${per.length ? per.map(([k, v]) => `<span>${esc(LI.title(k))}: ${v}★</span>`).join('') : '<span>пока нет звёзд</span>'}</div></div>`;\n"
      "      }\n")


# 11. the 3D viewer: solid edges (dense masked layers), a resting three-quarter angle, a spring intro
patch("""    const d = sp.depth, n = sp.n;
    let layers = '';
    for (let i = 0; i < n; i++) {
      const z = d / 2 - i * d / (n - 1), f = 0.62 + 0.38 * Math.abs(i / (n - 1) * 2 - 1), col = shade(sp.edge, f);
      layers += `<div class="lyr" style="transform:translateZ(${z.toFixed(2)}px)">${sp.layer ? sp.layer(col) : `<div style="position:absolute;inset:0;border-radius:${sp.round};background:${col}"></div>`}</div>`;
    }
    const mask = sp.mask || 'linear-gradient(#000,#000)';
    return `<div class="i-obj" style="--w:${sp.w.toFixed(0)}px;--h:${sp.h.toFixed(0)}px;--hd:${(d / 2 + 0.6).toFixed(2)}px">${layers}""",
"""    /* the edge is a stack of silhouettes; under a pixel apart they read as one solid side, never as a barcode */
    const d = sp.depth, n = Math.max(sp.n, Math.min(44, Math.ceil(d / 0.8) + 1));
    let layers = '';
    for (let i = 0; i < n; i++) {
      const z = d / 2 - i * d / (n - 1), f = 0.62 + 0.38 * Math.abs(i / (n - 1) * 2 - 1), col = shade(sp.edge, f);
      layers += sp.mask ? `<div class="lyr ml" style="transform:translateZ(${z.toFixed(2)}px);background:${col}"></div>` : `<div class="lyr" style="transform:translateZ(${z.toFixed(2)}px)"><div style="position:absolute;inset:0;border-radius:${sp.round};background:${col}"></div></div>`;
    }
    const mask = sp.mask || 'linear-gradient(#000,#000)';
    return `<div class="i-obj" style="--w:${sp.w.toFixed(0)}px;--h:${sp.h.toFixed(0)}px;--hd:${(d / 2 + 0.6).toFixed(2)}px;--mask:${mask}">${layers}""")
patch("return { w: S, h: S, depth: S * 0.085, n: 14, front,", "return { w: S, h: S, depth: S * 0.09, n: 14, rest: -12, front,")
patch("""    const S = { rx: 8, ry: 0, vx: 0, vy: 0, z: 1, auto: !!opts.auto, drag: null, t0: performance.now(), intro: !reduceMotion && opts.intro !== false, idle: performance.now(), flipTo: null, dead: false };
""", """    const S = { rx: 8, ry: 0, vx: 0, vy: 0, z: 1, auto: !!opts.auto, drag: null, t0: performance.now(), intro: !reduceMotion && opts.intro !== false, idle: performance.now(), flipTo: null, dead: false };
    /* REST: the angle the object settles at (a slight three-quarter view shows its thickness); FROM: where the intro starts */
    const REST = opts.rest || 0, FROM = opts.from == null ? -200 : opts.from;
    S.ry = S.intro ? FROM : REST; if (S.intro) S.rx = 26;
""")
patch("""        const t = Math.min(1, (now - S.t0) / 1300), e = 1 - Math.pow(1 - t, 3);
        S.ry = -540 * (1 - e); S.rx = 28 * (1 - e) + 8 * e; if (t >= 1) { S.intro = false; S.idle = now; }""",
"""        /* an underdamped spring: the object turns to face you, swings a little past and settles */
        const t = (now - S.t0) / 1000, z = 0.62, w = 8.5, k = Math.sqrt(1 - z * z);
        const e = 1 - Math.exp(-z * w * t) * (Math.cos(w * k * t) + z / k * Math.sin(w * k * t));
        S.ry = REST + (FROM - REST) * (1 - e); S.rx = 26 + (8 - 26) * e;
        if (t > 1.6) { S.intro = false; S.ry = REST; S.rx = 8; S.idle = now; }""")
patch("if (Math.abs(S.vy) < 0.05 && now - S.idle > 1400 && !reduceMotion) { const base = Math.round(S.ry / 180) * 180;",
      "if (Math.abs(S.vy) < 0.05 && now - S.idle > 1400 && !reduceMotion) { const base = Math.round((S.ry - REST) / 180) * 180 + REST;")
patch("reset() { S.intro = false; S.flipTo = Math.round(S.ry / 360) * 360;", "reset() { S.intro = false; S.flipTo = Math.round((S.ry - REST) / 360) * 360 + REST;")
patch("    return control(box, { intro: true, zoom: false });", "    return control(box, { intro: true, zoom: false, floor: opts.floor, rest: opts.rest != null ? opts.rest : 0, from: opts.from });")
patch("const ctl = control($('#ist', el), { zoom: true, floor: $('.i-floor', el), intro: true });", "const ctl = control($('#ist', el), { zoom: true, floor: $('.i-floor', el), intro: true, rest: sp.rest || 0 });")

# 12. sound: the rising charge before a case opens
patch("    thock() {", "    charge(d) { tone(150, d, { type: 'sine', gain: 0.05, slide: 2.8 }); tone(300, d, { type: 'triangle', gain: 0.012, slide: 2.8 }); },\n    thock() {")

# 13. the case flies from the sheet it was opened in
patch("const ob = $('#csOpen', m.el); if (ob) ob.onclick = () => { m.close(); Cases.open(c.id); };",
      "const ob = $('#csOpen', m.el); if (ob) ob.onclick = () => { const a = $('.chead .case-art', m.el), r = a ? a.getBoundingClientRect() : null; m.close(); Cases.open(c.id, { from: r }); };")

# 14. the opening itself: the old module is replaced by a session controller
i0 = s.index('const Cases = (() => {'); i1 = s.index("return { open, play, busy: () => busy };\n})();", i0) + len("return { open, play, busy: () => busy };\n})();")
s = s[:i0] + open(f'{SRC}/opening.js', encoding='utf8').read().rstrip() + s[i1:]

# 7. start: the library loads next to the students
patch("render();\nData.init();\n})();",
      "Lib.on(() => { if (['lichess', 'home', 'profile', 'tasks'].includes(UI.view)) render(); });\nrender();\nData.init();\nLib.init();\n})();")

# 8. the Lichess module goes in before start
mod = open(f'{SRC}/lichess.js', encoding='utf8').read()
patch('/* ---------- start ---------- */', mod + '\n/* ---------- start ---------- */')

# 9. styles
css = open(f'{SRC}/lichess.css', encoding='utf8').read() + open(f'{SRC}/opening.css', encoding='utf8').read()
i = s.index('</style>', s.index(':root { --stars'))
s = s[:i] + css + s[i:]

# 10. data scripts: the Lichess catalog and the case pictures
import json
art = {}
LOOKS = ('spray', 'case', 'prism', 'capsule', 'gallery', 'chest', 'casket', 'portal')
for look in LOOKS:
    b = open(f'/home/claude/art/v2_{look}.webp', 'rb').read()
    art[look] = 'data:image/webp;base64,' + base64.b64encode(b).decode()
meta = json.load(open('/home/claude/art/v2_meta.json'))
vid_js = open(f'{SRC}/casevid.js', encoding='utf8').read()
art_js = vid_js + 'window.ACAD_CASEART = {' + ','.join(f'"{k}":"{v}"' for k, v in art.items()) + '};\n/* where each picture can be cut into parts for the opening, as fractions of the square */\nwindow.ACAD_CASEMETA = ' + json.dumps(meta, separators=(',', ':')) + ';'
cat_js = open(f'{SRC}/lichess_catalog.js', encoding='utf8').read()
anchor = '<script>\n/* Mini chess core'
if s.count(anchor) != 1:
    sys.exit('script anchor')
s = s.replace(anchor, f'<script>\n/* Lichess puzzles (lichess.org puzzle database, CC0), sorted by topic and level */\n{cat_js}</script>\n<script>\n/* case pictures */\n{art_js}\n</script>\n' + anchor)

patch('<meta name="description" content="Шахматная академия: путь пешки, контракты недели, задача дня, медали, честные кейсы со скинами и наклейками, 3D-осмотр призов.">',
      '<meta name="description" content="Шахматная академия: путь пешки, контракты недели, задача дня, задачи Lichess по темам и уровням, медали, честные кейсы со скинами и наклейками, 3D-осмотр призов.">')

os.makedirs(OUT, exist_ok=True)
open(f'{OUT}/index.html', 'w', encoding='utf8').write(s)
if os.path.exists(f'{OUT}/lessons'):
    shutil.rmtree(f'{OUT}/lessons')
shutil.copytree(f'{SRC}/lessons', f'{OUT}/lessons')
print('index.html', len(s.encode('utf8')) // 1024, 'KB')

# syntax check of every inline script
import re
tmp = f'{W}/out/_chk'
os.makedirs(tmp, exist_ok=True)
for k, m in enumerate(re.finditer(r'<script>(.*?)</script>', s, re.S)):
    p = f'{tmp}/s{k}.js'
    open(p, 'w', encoding='utf8').write(m.group(1))
    r = subprocess.run(['node', '--check', p], capture_output=True, text=True)
    if r.returncode:
        sys.exit(f'syntax error in script {k}:\n{r.stderr[:2000]}')
print('scripts ok')
