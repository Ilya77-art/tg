#!/usr/bin/env python3
"""Builds lessons/10-melnitsa-torre.html: the academy bridge, chess core and piece art of lesson 09,
plus this lesson's style, markup, data (gen/out/data.js) and code (src/).

  python3 tools/lesson10/build_lesson.py lessons/09-nichya-iz-shlyapy.html lessons/10-melnitsa-torre.html

The data is made in two steps (node, from tools/lesson10/gen):
  node run.js [id ...]   positions of tasks.js -> move graphs checked by Stockfish 17.1 (out/graphs.json, needs the engine, see sf.js)
  node data.js           graphs + quiz positions + games -> out/data.js and the Lichess study out/melnitsa-torre.pgn
"""
import os, re, subprocess, sys, tempfile

HERE = os.path.dirname(os.path.abspath(__file__))
L09 = sys.argv[1]
OUT = sys.argv[2]
src = open(L09, encoding='utf8').read()


def between(text, start, end):
    i = text.index(start)
    j = text.index(end, i)
    return text[i:j]


bridge = between(src, '<script>\n/* Academy bridge', '</script>\n<title>') + '</script>\n'
assert bridge.count("var L = 'L09';") == 1
bridge = bridge.replace("var L = 'L09';", "var L = 'L10';")
core = between(src, '<script>\n/* Mini chess core', '</script>') + '</script>\n'
line = re.search(r'^window\.PIECE_PATHS = .*$', src, re.M).group(0)
assert 'SHLYAPA' not in line
sprite = '<script>\n' + line + '\n</script>\n'

css = open(f'{HERE}/src/style.css', encoding='utf8').read()
body = open(f'{HERE}/src/body.html', encoding='utf8').read()
app = open(f'{HERE}/src/app.js', encoding='utf8').read()
data = open(f'{HERE}/gen/out/data.js', encoding='utf8').read()

html = f'''<!DOCTYPE html>
<html lang="ru">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
{bridge}<title>Мельница Торре</title>
<meta name="description" content="Шахматный урок на 90 минут о вскрытых ударах: засада, открытый шах, двойной шах и мельница. Партии Торре — Ласкер (1925) и Эдвард Ласкер — Томас (1912), ловушки в русской партии и защите Каро — Канн.">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Podkova:wght@500;700;800&family=Manrope:wght@400;600;700;800&display=swap" rel="stylesheet">
<style>[hidden]{{display:none!important}}</style>
</head>
<body>
<style>
{css}</style>
{body}
{core}{sprite}<script>
/* «Мельница Торре»: positions and move graphs verified with Stockfish 17.1; a Lichess study in PGN */
{data}</script>
<script>
{app}</script>

</body>
</html>
'''
open(OUT, 'w', encoding='utf8').write(html)
print(OUT, len(html.encode('utf8')) // 1024, 'KB')

# syntax check of every inline script
with tempfile.TemporaryDirectory() as tmp:
    for k, m in enumerate(re.finditer(r'<script>(.*?)</script>', html, re.S)):
        p = f'{tmp}/s{k}.js'
        open(p, 'w', encoding='utf8').write(m.group(1))
        r = subprocess.run(['node', '--check', p], capture_output=True, text=True)
        if r.returncode:
            sys.exit(f'syntax error in script {k}:\n{r.stderr[:2000]}')
print('scripts ok')
