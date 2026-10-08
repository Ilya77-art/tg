#!/usr/bin/env python3
"""«Путь чемпионов» из v9 в v7: портреты двенадцати соперников, их фоны и оформление страниц.
Фоны увеличиваются вдвое (нужен Pillow): на карте и в партии они занимают весь экран.

Собирает index.html из исходного index.html v7, index.html v9 (портреты берутся оттуда
без перекодирования, фоны — увеличенными) и модуля tools/arena.css + tools/arena.js:

  python3 tools/path_from_v9.py <v7 index.html> <v9 index.html> tools/arena.css tools/arena.js index.html

Заменяются три места v7: скрипт botArt (картинки), стили от «Путь чемпионов»: the map до хаба
и модуль const Arena целиком. Проверка: node tools/pw_path.js
"""
import base64, io, json, sys

v7_path, v9_path, css_path, js_path, out_path = sys.argv[1:6]
s = open(v7_path, encoding='utf8').read()
v9 = open(v9_path, encoding='utf8').read()
css = open(css_path, encoding='utf8').read()
js = open(js_path, encoding='utf8').read()


def cut(text, start, end):
    """the span from `start` (included) to `end` (excluded); both anchors must be unique"""
    for a in (start, end):
        n = text.count(a)
        if n != 1:
            sys.exit(f'anchor found {n} times (want 1): {a[:80]!r}')
    i = text.index(start)
    j = text.index(end, i)
    return i, j


# 1. art: the twelve portraits and the twelve landscapes of v9, as they are embedded there (WebP data URIs)
i = v9.index('<script>const ASSETS=') + len('<script>const ASSETS=')
j = v9.index('</script>', i)
A = json.loads(v9[i:j].strip().rstrip(';'))
portraits, backs = A['portraits'], A['botBackgrounds']
assert len(portraits) == 12 and len(backs) == 12 and len(set(backs)) == 12
for u in portraits + backs:
    assert u.startswith('data:image/webp;base64,'), u[:40]
ids = [f'b{k:02d}' for k in range(1, 13)]


def sharper(uri, scale=2):
    """the landscapes are 512×256 and now fill whole screens: twice the size, Lanczos and a light unsharp mask"""
    from PIL import Image, ImageFilter
    im = Image.open(io.BytesIO(base64.b64decode(uri.split(',', 1)[1]))).convert('RGB')
    im = im.resize((im.width * scale, im.height * scale), Image.LANCZOS).filter(ImageFilter.UnsharpMask(radius=1.2, percent=70, threshold=2))
    buf = io.BytesIO(); im.save(buf, 'WEBP', quality=86, method=6)
    return 'data:image/webp;base64,' + base64.b64encode(buf.getvalue()).decode()


backs = [sharper(u) for u in backs]
art = {'chars': dict(zip(ids, portraits)), 'bg': dict(zip(ids, backs))}
a, b = cut(s, '<script id="botArt">\n', '\n</script>\n<script>\n/* Mini chess core')
s = (s[:a] + '<script id="botArt">\n'
     + '/* «Путь чемпионов»: portraits (chars) and landscapes (bg) of the twelve opponents, b01…b12, WebP data URIs.\n'
     + '   An empty object means painted fallbacks: the bot\'s own piece character and a plain panel. */\n'
     + 'window.ACAD_BOTART = ' + json.dumps(art, separators=(',', ':')) + ';'
     + s[b:])

# 2. styles: the map, the card before a game, the game and the hub tile
a, b = cut(s, '/* ---------- «Путь чемпионов»: the map ---------- */',
           '/* ---------- the hub with the road: the game leads, today\'s puzzle and contracts on the side ---------- */')
s = s[:a] + css.rstrip() + '\n\n' + s[b:]

# 3. the module
a, b = cut(s, 'const Arena = (() => {', '/* ---------- start ---------- */')
s = s[:a] + js.rstrip() + '\n\n' + s[b:]

open(out_path, 'w', encoding='utf8').write(s)
print('ok', len(s))
