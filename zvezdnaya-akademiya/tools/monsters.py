#!/usr/bin/env python3
"""Twelve cartoon opponents for «Путь чемпионов», one shared drawing language:
a navy outline of one weight, a cel shadow (the base drawn over a darker copy, shifted up-left),
a soft highlight, big eyes with two catchlights, chunky proportions, feet on one ground line (y≈210).

Usage: python3 tools/monsters.py monsters.json — writes {bot id: SVG}. The page keeps them in
window.ACAD_BOTART.chars (script#botArt in index.html) as data URIs, URL-encoded with '#' escaped."""
import json, sys

O = '#1d2448'   # outline
W = 3.4         # outline weight
uid = [0]


def nid(p='p'):
    uid[0] += 1
    return f'{p}{uid[0]}'


def part(d, base, shade, dx=-9, dy=-9, hi=None, stroke=True, extra=''):
    """A filled shape with a cel shadow on its lower right and an optional highlight."""
    c = nid('c')
    s = f'<clipPath id="{c}"><path d="{d}"/></clipPath><path d="{d}" fill="{shade}"/>'
    s += f'<g clip-path="url(#{c})"><path d="{d}" fill="{base}" transform="translate({dx} {dy})"/>'
    if hi:
        cx, cy, rx, ry = hi
        s += f'<ellipse cx="{cx}" cy="{cy}" rx="{rx}" ry="{ry}" fill="#fff" opacity=".32"/>'
    s += extra + '</g>'
    if stroke:
        s += f'<path d="{d}" fill="none" stroke="{O}" stroke-width="{W}" stroke-linejoin="round" stroke-linecap="round"/>'
    return s


def flat(d, fill, sw=None):
    return f'<path d="{d}" fill="{fill}" stroke="{O}" stroke-width="{sw or W}" stroke-linejoin="round" stroke-linecap="round"/>'


def line(d, sw=None, col=None):
    return f'<path d="{d}" fill="none" stroke="{col or O}" stroke-width="{sw or W}" stroke-linejoin="round" stroke-linecap="round"/>'


def eye(x, y, r, lx=0, ly=0, iris=None, lid=None):
    """White eye, pupil looking (lx, ly), two catchlights; lid: 'half' for a sly look."""
    s = f'<ellipse cx="{x}" cy="{y}" rx="{r}" ry="{r * 1.12:.1f}" fill="#fff" stroke="{O}" stroke-width="{W}"/>'
    if iris:
        s += f'<circle cx="{x + lx}" cy="{y + ly}" r="{r * .62:.1f}" fill="{iris}"/>'
    s += f'<circle cx="{x + lx}" cy="{y + ly}" r="{r * .42:.1f}" fill="{O}"/>'
    s += f'<circle cx="{x + lx + r * .2:.1f}" cy="{y + ly - r * .22:.1f}" r="{r * .17:.1f}" fill="#fff"/><circle cx="{x + lx - r * .18:.1f}" cy="{y + ly + r * .2:.1f}" r="{r * .08:.1f}" fill="#fff"/>'
    if lid == 'half':
        s += f'<path d="M{x - r - 1} {y - r * .1:.1f}A{r + 1} {r * 1.12 + 1:.1f} 0 0 1 {x + r + 1} {y - r * .1:.1f}Z" fill="{lid_col[0]}" stroke="{O}" stroke-width="{W}" stroke-linejoin="round"/>'
    return s


lid_col = ['#7cc05a']


def svg(body):
    return f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 220">{body}</svg>'


def foot(cx, cy, rx, ry, base, shade):
    return part(f'M{cx - rx} {cy}a{rx} {ry} 0 1 0 {2 * rx} 0a{rx} {ry} 0 1 0 {-2 * rx} 0Z', base, shade, dx=-3, dy=-4)


def pawn(x, y, s, fill='#fbf7ef'):
    """A small chess pawn held by a character (x, y = bottom centre, s = scale)."""
    d = 'M-8 0C-8-6-5-9-3-10-6-12-6-17-3-19-6-21-5-27 0-27S6-21 3-19C6-17 6-12 3-10 5-9 8-6 8 0Z'
    return f'<g transform="translate({x} {y}) scale({s})"><path d="{d}" fill="{fill}" stroke="{O}" stroke-width="{W / s:.2f}" stroke-linejoin="round"/></g>'


def knight(x, y, s, fill='#fbf7ef'):
    d = 'M-9 0C-9-5-4-8-2-12-6-11-10-9-12-11-13-14-8-17-6-22-5-26-1-28 2-28 8-27 11-20 11-12 11-6 9-3 9 0Z'
    return f'<g transform="translate({x} {y}) scale({s})"><path d="{d}" fill="{fill}" stroke="{O}" stroke-width="{W / s:.2f}" stroke-linejoin="round"/><circle cx="-2" cy="-21" r="1.6" fill="{O}"/></g>'


def rook(x, y, s, fill='#fbf7ef'):
    d = 'M-9 0V-4L-6-6V-17L-8-19V-26H-4V-23H-1.5V-26H1.5V-23H4V-26H8V-19L6-17V-6L9-4V0Z'
    return f'<g transform="translate({x} {y}) scale({s})"><path d="{d}" fill="{fill}" stroke="{O}" stroke-width="{W / s:.2f}" stroke-linejoin="round"/></g>'


M = {}

# ---------- 1. Квакша: a chubby frog in a straw hat ----------
G, GS, GL = '#7cc05a', '#4f9a3c', '#d9f5a8'
body = 'M36 152C30 112 44 72 100 70C156 72 170 112 164 152C160 190 134 206 100 206C66 206 40 190 36 152Z'
s = foot(70, 206, 24, 9, G, GS) + foot(130, 206, 24, 9, G, GS)
s += part(body, G, GS, hi=(76, 96, 26, 14), extra=f'<ellipse cx="100" cy="166" rx="42" ry="34" fill="{GL}"/>')
for ex in (64, 136):
    s += part(f'M{ex - 25} 76a25 24 0 1 1 50 0Z', G, GS, dx=-5, dy=-5)
s += eye(64, 66, 15, 3, 2) + eye(136, 66, 15, -2, 2)
s += f'<ellipse cx="58" cy="118" rx="10" ry="6" fill="#ff8fa3" opacity=".8"/><ellipse cx="142" cy="118" rx="10" ry="6" fill="#ff8fa3" opacity=".8"/>'
s += flat('M60 106Q100 142 140 106Q100 124 60 106Z', '#c4334a', 2.8) + '<path d="M86 121Q100 128 114 121Q108 116 100 117 92 116 86 121Z" fill="#ff7a8f"/>'
# straw hat between the eyes
s += part('M72 58Q100 48 128 58Q132 64 100 66 68 64 72 58Z', '#f2c14e', '#d19a2a', dx=-3, dy=-3)
s += part('M84 58C84 40 116 40 116 58Z', '#f2c14e', '#d19a2a', dx=-3, dy=-3)
s += f'<path d="M85 53Q100 57 115 53" stroke="#e8423c" stroke-width="4" fill="none"/>'
s += ''.join(f'<ellipse cx="{118 + 6 * c:.1f}" cy="{48 + 6 * sn:.1f}" rx="4" ry="2.4" fill="#fff" stroke="{O}" stroke-width="1.2" transform="rotate({a} {118 + 6 * c:.1f} {48 + 6 * sn:.1f})"/>' for a, c, sn in [(0, 1, 0), (72, .31, .95), (144, -.81, .59), (216, -.81, -.59), (288, .31, -.95)]) + f'<circle cx="118" cy="48" r="3.2" fill="#ffd60a" stroke="{O}" stroke-width="1.2"/>'
# arms; the right one holds a pawn
s += part('M44 150C30 154 26 170 36 176 46 180 56 168 58 158Z', G, GS, dx=-3, dy=-3)
s += part('M156 150C170 154 176 170 164 178 152 182 144 168 142 158Z', G, GS, dx=-3, dy=-3) + pawn(166, 168, 1.35)
M['b01'] = svg(s)

# ---------- 2. Колючка: a hedgehog with a red scarf, arms crossed ----------
SP, SPS, SK, SKS = '#7a4e2d', '#5a3519', '#f0c48a', '#d49a5a'
spikes = 'M24 150L14 124 34 116 18 92 42 88 34 62 60 66 62 40 84 54 100 30 116 54 138 40 140 66 166 62 158 88 182 92 166 116 186 124 176 150 160 170 40 170Z'
s = part(spikes, SP, SPS, dx=-6, dy=-6, hi=(80, 60, 30, 12))
s += foot(74, 206, 20, 8, SKS, '#a8733a') + foot(126, 206, 20, 8, SKS, '#a8733a')
s += part('M50 150C46 114 66 80 100 80C134 80 154 114 150 150C148 186 128 204 100 204C72 204 52 186 50 150Z', SK, SKS, hi=(80, 104, 20, 12))
s += eye(80, 116, 13, 2, 2) + eye(120, 116, 13, -2, 2)
s += f'<ellipse cx="100" cy="138" rx="9" ry="7" fill="{O}"/><circle cx="97" cy="135.5" r="2.4" fill="#fff" opacity=".7"/>'
s += line('M88 150Q100 158 112 150', 2.8)
s += f'<ellipse cx="68" cy="140" rx="8" ry="5" fill="#ff8a80" opacity=".7"/><ellipse cx="132" cy="140" rx="8" ry="5" fill="#ff8a80" opacity=".7"/>'
s += part('M58 160Q100 178 142 160L144 174Q100 192 56 174Z', '#e8423c', '#b82a28', dx=-4, dy=-4)
s += part('M120 174L128 200 140 196 132 170Z', '#e8423c', '#b82a28', dx=-3, dy=-3) + line('M124 180l10-3M127 188l10-3', 2, '#fff')
s += part('M58 182C78 172 112 176 136 186 138 196 128 198 112 192 92 186 74 192 62 196 54 194 54 188 58 182Z', SK, SKS, dx=-3, dy=-3)
M['b02'] = svg(s)

# ---------- 3. Шустрик: a raccoon in a bandit mask and an orange vest ----------
R, RS, RL = '#9aa3b5', '#6f7890', '#eef1f6'
s = part('M150 190C182 186 196 156 184 130 178 144 166 160 146 166Z', R, RS, dx=-4, dy=-4, extra=f'<path d="M150 190L170 150M162 190L184 152M140 182L160 160" stroke="{O}" stroke-width="9" opacity=".75"/>')
s += foot(76, 206, 20, 8, '#4a4f60', '#33374a') + foot(124, 206, 20, 8, '#4a4f60', '#33374a')
s += part('M58 168C54 140 72 120 100 120 128 120 146 140 142 168 140 196 124 206 100 206 76 206 60 196 58 168Z', R, RS, hi=(80, 140, 16, 10))
s += part('M62 144C66 128 80 122 92 122L90 200C78 198 66 190 62 172Z', '#ff8a2a', '#d4651a', dx=-3, dy=-3) + part('M138 144C134 128 120 122 108 122L110 200C122 198 134 190 138 172Z', '#ff8a2a', '#d4651a', dx=-3, dy=-3)
s += f'<circle cx="86" cy="156" r="3" fill="{O}"/><circle cx="86" cy="176" r="3" fill="{O}"/>'
for ex, sg in ((56, -1), (144, 1)):
    s += part(f'M{ex - 20 * sg} 70L{ex - 4 * sg} 24L{ex + 22 * sg} 56Z' if sg > 0 else f'M{ex + 20} 70L{ex + 4} 24L{ex - 22} 56Z', R, RS, dx=-3, dy=-3)
s += part('M28 92C28 58 62 40 100 40 138 40 172 58 172 92 172 124 140 138 100 138 60 138 28 124 28 92Z', R, RS, hi=(70, 64, 26, 12))
s += f'<path d="M40 96C40 78 62 72 100 80 138 72 160 78 160 96 160 110 138 112 120 104 110 100 90 100 80 104 62 112 40 110 40 96Z" fill="#2b2e3a"/>'
s += part('M66 112C70 100 86 98 100 106 114 98 130 100 134 112 136 128 120 136 100 136 80 136 64 128 66 112Z', RL, '#cfd5e2', dx=-3, dy=-3)
s += eye(76, 92, 12, 4, 1, lid=None) + eye(124, 92, 12, -1, 1)
s += f'<path d="M62 88Q76 80 90 88" fill="none" stroke="#2b2e3a" stroke-width="5"/><path d="M110 88Q124 80 138 88" fill="none" stroke="#2b2e3a" stroke-width="5"/>'
s += f'<ellipse cx="100" cy="112" rx="8" ry="6" fill="{O}"/>' + line('M86 122Q100 132 116 120', 3) + f'<path d="M108 125l3 6 4-7Z" fill="#fff" stroke="{O}" stroke-width="1.5"/>'
s += part('M46 150C32 152 28 168 40 174 52 178 60 164 60 156Z', R, RS, dx=-3, dy=-3) + knight(38, 166, 1.45)
s += part('M154 150C168 154 172 168 160 174 148 178 140 164 140 156Z', R, RS, dx=-3, dy=-3)
M['b03'] = svg(s)

# ---------- 4. Окто: a teal octopus in a sailor cap ----------
T, TS, TL = '#3cc7c2', '#259a9a', '#bff3ef'
s = ''
tent = [('M70 150C50 170 30 170 18 190 30 200 44 186 60 178 70 172 76 164Z', None), ('M84 156C78 180 60 196 58 212 70 214 80 196 92 176Z', None),
        ('M100 158C100 182 96 200 104 214 116 212 112 190 112 160Z', None), ('M116 156C122 180 140 196 142 212 130 214 120 196 108 176Z', None),
        ('M130 150C150 170 170 170 182 190 170 200 156 186 140 178 130 172 124 164Z', None)]
for d, _ in tent:
    s += part(d, T, TS, dx=-3, dy=-3)
s += ''.join(f'<circle cx="{x}" cy="{y}" r="3" fill="{TL}" stroke="{O}" stroke-width="1.4"/>' for x, y in [(30, 188), (44, 180), (66, 204), (74, 192), (104, 204), (106, 190), (134, 204), (126, 192), (156, 180), (170, 188)])
s += part('M32 108C32 62 62 34 100 34 138 34 168 62 168 108 168 148 140 166 100 166 60 166 32 148 32 108Z', T, TS, hi=(72, 64, 26, 16))
s += f'<ellipse cx="62" cy="96" rx="7" ry="5" fill="{TS}" opacity=".6"/><ellipse cx="146" cy="76" rx="5" ry="4" fill="{TS}" opacity=".6"/><ellipse cx="138" cy="132" rx="6" ry="4" fill="{TS}" opacity=".6"/>'
s += eye(78, 104, 16, 3, 3) + eye(122, 104, 16, -2, 3)
s += flat('M82 132Q100 152 118 132Q100 142 82 132Z', '#c4334a', 2.6)
s += f'<ellipse cx="58" cy="128" rx="9" ry="5" fill="#ff8fa3" opacity=".7"/><ellipse cx="142" cy="128" rx="9" ry="5" fill="#ff8fa3" opacity=".7"/>'
# the sailor cap, tilted
s += f'<g transform="rotate(-10 100 40)">' + part('M58 44C58 24 142 24 142 44Z', '#ffffff', '#dfe6ef', dx=-4, dy=-4) + part('M56 42H144V52H56Z', '#24406e', '#1a2f52', dx=-2, dy=-2) + f'<circle cx="100" cy="22" r="6" fill="#e8423c" stroke="{O}" stroke-width="2.4"/></g>'
s += rook(28, 184, 1.1) + pawn(172, 184, 1.1)
M['b04'] = svg(s)

# ---------- 5. Капитан Кеша: a parrot pirate ----------
P1, P1S = '#e8423c', '#b82a28'
s = part('M84 176L70 212 84 210 92 182ZM116 176L130 212 116 210 108 182Z', '#3a8dde', '#2a6db0', dx=-2, dy=-2)
s += foot(84, 206, 16, 6, '#ff9f2a', '#d4741a') + foot(116, 206, 16, 6, '#ff9f2a', '#d4741a')
s += part('M52 128C48 84 72 56 100 56 128 56 152 84 148 128 146 168 126 192 100 192 74 192 54 168 52 128Z', P1, P1S, hi=(78, 84, 18, 14), extra='<ellipse cx="100" cy="150" rx="28" ry="34" fill="#ffcf5a"/>')
s += part('M52 120C34 128 30 160 46 178 56 168 62 150 62 134Z', '#3fb34f', '#2a8a3a', dx=-3, dy=-3)
s += part('M148 120C166 128 170 160 154 178 144 168 138 150 138 134Z', '#3fb34f', '#2a8a3a', dx=3, dy=-3)
s += line('M44 150l10 6M46 162l9 4', 2.2) + line('M156 150l-10 6M154 162l-9 4', 2.2)
s += eye(118, 96, 13, -2, 2)
s += f'<path d="M64 88L104 86" stroke="{O}" stroke-width="3"/><ellipse cx="84" cy="98" rx="14" ry="13" fill="#1d2133" stroke="{O}" stroke-width="2.4"/><path d="M98 86L138 72" stroke="{O}" stroke-width="3"/>'
s += part('M88 112C96 104 118 104 124 114 126 128 112 142 100 140 104 132 100 124 88 120Z', '#ffd23f', '#e0a91a', dx=-3, dy=-3) + line('M92 118Q104 116 112 126', 2.4)
# tricorn hat
s += part('M38 66C60 48 140 48 162 66 150 72 130 70 100 76 70 70 50 72 38 66Z', '#2b2e3a', '#16182a', dx=-3, dy=-4)
s += part('M62 60C62 30 138 30 138 60 120 56 80 56 62 60Z', '#2b2e3a', '#16182a', dx=-3, dy=-4)
s += line('M60 64Q100 52 140 64', 3, '#ffd23f') + f'<circle cx="100" cy="46" r="7" fill="#fff" stroke="{O}" stroke-width="2"/><path d="M96 46h8M100 42v8" stroke="{O}" stroke-width="2"/>'
# cutlass in the right wing
s += f'<path d="M166 120C178 100 184 78 182 58 172 76 162 96 156 118Z" fill="#dfe6ef" stroke="{O}" stroke-width="2.8" stroke-linejoin="round"/>' + flat('M150 116H170V124H150Z', '#ffd23f', 2.4) + flat('M156 124H164V140H156Z', '#7a4e2d', 2.4)
M['b05'] = svg(s)

# ---------- 6. Тень: a black ninja cat with a wooden sword ----------
C1, C1S, C1L = '#3a3f55', '#24283a', '#5a6182'
s = part('M140 196C176 196 190 168 176 140 172 158 162 172 144 176Z', C1, C1S, dx=-3, dy=-3)
s += foot(78, 206, 20, 8, C1, C1S) + foot(122, 206, 20, 8, C1, C1S)
s += part('M60 168C56 140 74 120 100 120 126 120 144 140 140 168 138 196 122 206 100 206 78 206 62 196 60 168Z', C1, C1S, hi=(82, 140, 14, 8), extra=f'<ellipse cx="100" cy="176" rx="22" ry="20" fill="{C1L}"/>')
s += part('M38 74L44 24 78 52Z', C1, C1S, dx=-3, dy=-3) + part('M162 74L156 24 122 52Z', C1, C1S, dx=3, dy=-3)
s += f'<path d="M48 64L50 38 66 54Z" fill="#ff8fa3"/><path d="M152 64L150 38 134 54Z" fill="#ff8fa3"/>'
s += part('M30 96C30 62 62 44 100 44 138 44 170 62 170 96 170 128 138 140 100 140 62 140 30 128 30 96Z', C1, C1S, hi=(72, 66, 24, 10))
s += part('M30 76Q100 58 170 76L168 90Q100 74 32 90Z', '#e8423c', '#b82a28', dx=-2, dy=-3)
s += part('M164 80C184 74 194 84 198 96 184 92 176 90 166 92Z', '#e8423c', '#b82a28', dx=-2, dy=-2) + part('M164 86C182 92 186 106 184 118 176 106 170 100 162 96Z', '#e8423c', '#b82a28', dx=-2, dy=-2)
s += eye(78, 106, 13, 3, 1, iris='#ffd23f') + eye(122, 106, 13, -1, 1, iris='#ffd23f')
s += f'<path d="M62 94L92 100M138 94L108 100" stroke="{O}" stroke-width="4" stroke-linecap="round"/>'
s += f'<path d="M96 120L100 125 104 120Z" fill="#ff8fa3" stroke="{O}" stroke-width="1.6"/>' + line('M92 128Q100 134 108 128', 2.6) + line('M44 116h-22M44 124l-20 6M156 116h22M156 124l20 6', 2)
s += f'<path d="M34 196L150 120" stroke="{O}" stroke-width="12" stroke-linecap="round"/><path d="M34 196L150 120" stroke="#c98a4a" stroke-width="7" stroke-linecap="round"/><path d="M58 184l12-8" stroke="{O}" stroke-width="14" stroke-linecap="round"/><path d="M58 184l12-8" stroke="#2b2e3a" stroke-width="9" stroke-linecap="round"/>'
s += part('M52 150C40 156 40 172 52 176 62 178 70 166 68 156Z', C1, C1S, dx=-3, dy=-3) + part('M148 150C160 156 160 172 148 176 138 178 130 166 132 156Z', C1, C1S, dx=-3, dy=-3)
M['b06'] = svg(s)

# ---------- 7. Снежок: a fluffy yeti with blue earmuffs ----------
Y, YS, YF = '#f6f9ff', '#bcd2ee', '#8fb2de'
fur = 'M40 186C26 176 26 150 36 136 22 124 26 96 44 88 40 64 62 44 84 50 92 34 112 34 120 48 142 42 162 62 156 86 176 96 178 124 164 136 176 152 172 178 160 188 150 200 120 210 100 206 78 210 50 200 40 186Z'
s = foot(74, 206, 22, 9, YS, YF) + foot(126, 206, 22, 9, YS, YF)
s += part(fur, Y, YS, dx=-10, dy=-10, hi=(80, 80, 30, 18))
s += part('M64 118C64 92 80 82 100 82 120 82 136 92 136 118 136 140 120 150 100 150 80 150 64 140 64 118Z', '#c9dcf2', '#a8c2e4', dx=-3, dy=-3)
s += eye(84, 110, 11, 2, 2) + eye(116, 110, 11, -2, 2)
s += f'<ellipse cx="100" cy="124" rx="7" ry="5" fill="{O}"/>' + flat('M84 134Q100 146 116 134Q100 140 84 134Z', '#c4334a', 2.4) + f'<path d="M90 136l3 5 3-4ZM104 136l3 4 3-5Z" fill="#fff" stroke="{O}" stroke-width="1.2"/>'
s += line('M44 60Q100 10 156 60', 7, O) + line('M44 60Q100 10 156 60', 3.6, '#3a8dde')
s += part('M28 64a18 20 0 1 0 36 0a18 20 0 1 0-36 0Z', '#3a8dde', '#2a6db0', dx=-3, dy=-3, hi=(40, 56, 6, 5)) + part('M136 64a18 20 0 1 0 36 0a18 20 0 1 0-36 0Z', '#3a8dde', '#2a6db0', dx=-3, dy=-3, hi=(148, 56, 6, 5))
# arms flexing
s += part('M40 120C20 112 10 92 18 78 30 76 34 92 46 100Z', Y, YS, dx=-4, dy=-4) + part('M160 120C180 112 190 92 182 78 170 76 166 92 154 100Z', Y, YS, dx=-4, dy=-4)
s += part('M10 78a12 12 0 1 1 24 0a12 12 0 1 1-24 0Z', '#c9dcf2', '#a8c2e4', dx=-2, dy=-2) + part('M166 78a12 12 0 1 1 24 0a12 12 0 1 1-24 0Z', '#c9dcf2', '#a8c2e4', dx=-2, dy=-2)
M['b07'] = svg(s)

# ---------- 8. Бип-Буп: a retro robot with a screen face ----------
RO, ROS, MT, MTS = '#ff9f2a', '#d4741a', '#c9d2e0', '#98a4b8'
s = part('M70 186H92V206H70ZM108 186H130V206H108Z', MT, MTS, dx=-2, dy=-2) + part('M60 202H98V212H60ZM102 202H140V212H102Z', '#4a4f60', '#33374a', dx=-2, dy=-2)
s += part('M52 128H148V188H52Z', MT, MTS, hi=(76, 136, 16, 6))
s += f'<rect x="78" y="140" width="44" height="34" rx="4" fill="#24283a" stroke="{O}" stroke-width="2.6"/>' + ''.join(f'<rect x="{82 + 12 * c}" y="{144 + 10 * r}" width="10" height="8" rx="1.5" fill="{["#ffd23f", "#3cc7c2", "#e8423c"][(r + c) % 3]}"/>' for r in range(3) for c in range(3))
s += part('M38 136C22 140 18 160 26 170 34 172 40 160 50 150Z', MT, MTS, dx=-3, dy=-3) + part('M162 136C178 140 182 160 174 170 166 172 160 160 150 150Z', MT, MTS, dx=-3, dy=-3)
s += flat('M18 168L26 182 34 170Z', '#4a4f60', 2.6) + flat('M182 168L174 182 166 170Z', '#4a4f60', 2.6)
s += f'<path d="M100 28V12" stroke="{O}" stroke-width="4"/><circle cx="100" cy="10" r="7" fill="#e8423c" stroke="{O}" stroke-width="2.6"/><circle cx="97.5" cy="7.5" r="2.2" fill="#fff" opacity=".8"/>'
s += part('M34 50C34 36 44 28 58 28H142C156 28 166 36 166 50V108C166 122 156 130 142 130H58C44 130 34 122 34 108Z', RO, ROS, hi=(66, 40, 24, 8))
s += f'<rect x="52" y="44" width="96" height="68" rx="12" fill="#1d2133" stroke="{O}" stroke-width="3"/>'
s += f'<rect x="66" y="62" width="18" height="18" rx="3" fill="#3cc7c2"/><rect x="116" y="62" width="18" height="18" rx="3" fill="#3cc7c2"/><rect x="70" y="66" width="6" height="6" fill="#bff3ef"/><rect x="120" y="66" width="6" height="6" fill="#bff3ef"/>'
s += f'<path d="M78 92H86V96H114V92H122V100H78Z" fill="#3cc7c2"/>'
s += f'<circle cx="28" cy="80" r="8" fill="{MT}" stroke="{O}" stroke-width="2.6"/><circle cx="172" cy="80" r="8" fill="{MT}" stroke="{O}" stroke-width="2.6"/>'
M['b08'] = svg(s)

# ---------- 9. Профессор Ух: an owl wizard with glasses and a staff ----------
OW, OWS, OWL = '#a8743f', '#7c5228', '#f3dcb4'
s = f'<path d="M168 210L156 74" stroke="{O}" stroke-width="10" stroke-linecap="round"/><path d="M168 210L156 74" stroke="#8a5a2b" stroke-width="5" stroke-linecap="round"/>'
s += f'<circle cx="155" cy="64" r="14" fill="#9be7ff" stroke="{O}" stroke-width="3"/><circle cx="150" cy="59" r="4.5" fill="#fff" opacity=".9"/>'
s += foot(82, 208, 14, 6, '#ff9f2a', '#d4741a') + foot(118, 208, 14, 6, '#ff9f2a', '#d4741a')
s += part('M46 140C42 98 66 72 100 72 134 72 158 98 154 140 152 182 130 206 100 206 70 206 48 182 46 140Z', OW, OWS, hi=(76, 96, 20, 12),
          extra='<path d="M66 132C66 116 80 110 100 110 120 110 134 116 134 132 134 174 120 196 100 196 80 196 66 174 66 132Z" fill="#f3dcb4"/>' + ''.join(f'<path d="M{x - 7} {y}q7 7 14 0" fill="none" stroke="#c99a62" stroke-width="2.2"/>' for x, y in [(86, 140), (100, 150), (114, 140), (86, 160), (100, 170), (114, 160), (100, 186)]))
s += part('M46 110C30 130 30 164 52 180 58 160 58 140 58 120Z', '#3a5bb5', '#2a4290', dx=-3, dy=-3) + part('M154 110C170 130 170 164 148 180 142 160 142 140 142 120Z', '#3a5bb5', '#2a4290', dx=3, dy=-3)
s += eye(80, 108, 15, 2, 2, iris='#ffb02a') + eye(120, 108, 15, -2, 2, iris='#ffb02a')
s += f'<circle cx="80" cy="108" r="19" fill="none" stroke="#ffd23f" stroke-width="3.4"/><circle cx="120" cy="108" r="19" fill="none" stroke="#ffd23f" stroke-width="3.4"/><path d="M99 106h2" stroke="#ffd23f" stroke-width="3.4"/>'
s += part('M92 124L108 124 100 140Z', '#ff9f2a', '#d4741a', dx=-2, dy=-2)
# wizard hat
s += part('M42 82C64 70 136 70 158 82 150 92 50 92 42 82Z', '#3a5bb5', '#2a4290', dx=-3, dy=-3)
s += part('M62 80C76 52 96 24 132 12 122 30 124 56 138 80 112 74 86 74 62 80Z', '#3a5bb5', '#2a4290', dx=-4, dy=-3)
s += ''.join(f'<path d="M{x} {y - 5}l1.6 3.4 3.6.4-2.7 2.4.8 3.6-3.3-1.8-3.3 1.8.8-3.6-2.7-2.4 3.6-.4z" fill="#ffd23f"/>' for x, y in [(92, 56), (114, 36), (110, 66)])
s += f'<path d="M64 80Q100 72 136 80" stroke="#ffd23f" stroke-width="4" fill="none"/>'
s += part('M150 120C164 116 172 128 164 138 156 142 148 134 146 126Z', OW, OWS, dx=-2, dy=-2)
M['b09'] = svg(s)

# ---------- 10. Голем: a stone guardian with glowing runes ----------
ST, STS = '#8f97aa', '#646c82'
glow = '#ff9a2a'
s = part('M60 180H92V210H60ZM108 180H140V210H108Z', ST, STS, dx=-3, dy=-3)
s += part('M40 112C40 96 52 88 70 88H130C148 88 160 96 160 112V176C160 188 152 194 140 194H60C48 194 40 188 40 176Z', ST, STS, hi=(70, 104, 20, 8),
          extra=f'<path d="M72 120L86 136 78 152M126 116L114 134 124 150M98 160V182" stroke="{glow}" stroke-width="4" fill="none" stroke-linecap="round"/>')
s += part('M18 108C12 96 18 84 34 82 48 82 56 92 54 106L52 142C50 152 42 156 32 154 20 152 16 142 18 132Z', ST, STS, dx=-4, dy=-4) + part('M182 108C188 96 182 84 166 82 152 82 144 92 146 106L148 142C150 152 158 156 168 154 180 152 184 142 182 132Z', ST, STS, dx=-4, dy=-4)
s += part('M8 150C6 140 14 132 26 132H40C52 132 58 140 56 152L54 166C52 176 44 180 34 180H24C12 180 6 172 8 162Z', ST, STS, dx=-3, dy=-3) + part('M192 150C194 140 186 132 174 132H160C148 132 142 140 144 152L146 166C148 176 156 180 166 180H176C188 180 194 172 192 162Z', ST, STS, dx=-3, dy=-3)
s += part('M56 52C56 34 72 24 100 24 128 24 144 34 144 52V82C144 94 136 100 124 100H76C64 100 56 94 56 82Z', ST, STS, hi=(78, 36, 20, 7))
s += f'<path d="M64 60H136V72H64Z" fill="#3a3f55"/><rect x="74" y="62" width="16" height="8" rx="3" fill="{glow}"/><rect x="110" y="62" width="16" height="8" rx="3" fill="{glow}"/><rect x="78" y="63" width="5" height="3" fill="#fff3c4"/><rect x="114" y="63" width="5" height="3" fill="#fff3c4"/>'
s += line('M82 86Q100 80 118 86', 3.4)
s += f'<path d="M56 40C64 24 84 20 96 26 110 18 132 22 140 36 130 34 118 38 108 34 96 40 80 36 70 42Z" fill="#5fb447" stroke="{O}" stroke-width="2.4" stroke-linejoin="round"/><path d="M20 86C26 76 40 74 50 82 40 84 32 90 24 92Z" fill="#5fb447" stroke="{O}" stroke-width="2.2"/><path d="M178 88C172 78 158 76 148 84 158 86 166 92 174 94Z" fill="#5fb447" stroke="{O}" stroke-width="2.2"/>'
M['b10'] = svg(s)

# ---------- 11. Искра: a young red dragon ----------
D, DS, DB = '#e8423c', '#b82a28', '#ffcf5a'
s = part('M140 180C170 190 186 176 190 156 194 170 196 186 184 196 168 208 146 202 132 192Z', D, DS, dx=-3, dy=-3) + flat('M184 150L198 140 196 158Z', '#ffd23f', 2.6)
s += part('M58 100C30 84 10 92 4 112 18 108 28 114 30 124 40 118 50 122 54 132Z', '#9a2a40', '#701a2c', dx=-3, dy=-3) + part('M142 100C170 84 190 92 196 112 182 108 172 114 170 124 160 118 150 122 146 132Z', '#9a2a40', '#701a2c', dx=3, dy=-3)
s += foot(78, 206, 20, 8, D, DS) + foot(122, 206, 20, 8, D, DS)
s += part('M56 156C52 124 72 104 100 104 128 104 148 124 144 156 142 190 124 206 100 206 76 206 58 190 56 156Z', D, DS, hi=(80, 120, 14, 8),
          extra='<path d="M78 130C78 120 88 116 100 116 112 116 122 120 122 130V176C122 190 112 198 100 198 88 198 78 190 78 176Z" fill="#ffcf5a"/>' + ''.join(f'<path d="M80 {y}H120" stroke="#e0a91a" stroke-width="2.4"/>' for y in (134, 150, 166, 182)))
s += part('M26 72C26 42 58 24 100 24 142 24 174 42 174 72 174 104 142 118 100 118 58 118 26 104 26 72Z', D, DS, hi=(70, 42, 24, 10))
s += part('M58 30L48 4 76 22Z', '#ffd23f', '#e0a91a', dx=-2, dy=-2) + part('M142 30L152 4 124 22Z', '#ffd23f', '#e0a91a', dx=2, dy=-2)
s += ''.join(flat(f'M{x - 6} {y + 4}L{x} {y - 8}L{x + 6} {y + 4}Z', '#ffd23f', 2.2) for x, y in [(88, 24), (100, 20), (112, 24)])
s += eye(76, 66, 14, 3, 2, iris='#6fd36b') + eye(124, 66, 14, -2, 2, iris='#6fd36b')
s += f'<path d="M56 50L90 58M144 50L110 58" stroke="{O}" stroke-width="4" stroke-linecap="round"/>'
s += part('M62 94C70 110 130 110 138 94 132 104 116 108 100 106 84 108 68 104 62 94Z', '#ff8070', DS, dx=-2, dy=-2)
s += f'<circle cx="90" cy="88" r="2.6" fill="{O}"/><circle cx="110" cy="88" r="2.6" fill="{O}"/><path d="M84 102l4 6 4-6ZM108 102l4 6 4-6Z" fill="#fff" stroke="{O}" stroke-width="1.4"/>'
s += f'<path d="M150 92C162 82 176 86 182 96 174 96 172 104 178 110 166 110 158 104 150 100Z" fill="#ff9a2a" stroke="{O}" stroke-width="2.4" stroke-linejoin="round"/><path d="M156 96C164 92 170 94 172 100 166 100 164 104 166 106 160 104 156 102 154 100Z" fill="#ffe08a"/>'
s += part('M56 140C42 144 40 162 50 168 60 170 66 158 70 150Z', D, DS, dx=-3, dy=-3) + part('M144 140C158 144 160 162 150 168 140 170 134 158 130 150Z', D, DS, dx=-3, dy=-3)
M['b11'] = svg(s)

# ---------- 12. Чёрный Король: the armoured lord of the citadel ----------
A, AS, AG, CAPE = '#3a4064', '#252a46', '#ffc93a', '#4a2f8a'
s = part('M42 92C24 130 22 176 34 210H166C178 176 176 130 158 92Z', CAPE, '#2f1c62', dx=6, dy=-6, extra=f'<path d="M60 210L74 120M140 210L126 120" stroke="#2f1c62" stroke-width="6"/>')
s += part('M70 176H94V210H70ZM106 176H130V210H106Z', A, AS, dx=-2, dy=-2) + part('M64 202H96V212H64ZM104 202H136V212H104Z', '#252a46', '#161a30', dx=-2, dy=-2)
s += part('M52 116C52 100 64 92 80 92H120C136 92 148 100 148 116V170C148 182 140 188 128 188H72C60 188 52 182 52 170Z', A, AS, hi=(74, 104, 18, 8))
s += part('M86 116H114V156C114 164 108 168 100 170 92 168 86 164 86 156Z', AG, '#d4a020', dx=-2, dy=-2)
s += f'<path d="M89 148L90 128 95 136 100 124 105 136 110 128 111 148Z" fill="#fff3c4" stroke="{O}" stroke-width="2.4" stroke-linejoin="round"/>'
s += part('M32 104C20 96 22 80 36 76 50 74 58 84 58 96V138C58 148 50 154 40 152 30 150 26 142 28 132Z', A, AS, dx=-3, dy=-3) + part('M168 104C180 96 178 80 164 76 150 74 142 84 142 96V138C142 148 150 154 160 152 170 150 174 142 172 132Z', A, AS, dx=-3, dy=-3)
s += f'<path d="M176 196L166 60" stroke="{O}" stroke-width="9" stroke-linecap="round"/><path d="M176 196L166 60" stroke="{AG}" stroke-width="4.5" stroke-linecap="round"/>' + part('M158 50L166 34 174 50 166 58Z', '#3cc7c2', '#259a9a', dx=-2, dy=-2)
s += part('M152 140C164 136 174 146 168 158 160 164 150 156 150 148Z', A, AS, dx=-2, dy=-2)
s += part('M58 62C58 38 76 26 100 26 124 26 142 38 142 62V90C142 100 134 106 124 106H76C66 106 58 100 58 90Z', A, AS, hi=(78, 40, 18, 8))
s += f'<path d="M70 62H130V76H70Z" fill="#141829"/><ellipse cx="86" cy="69" rx="8" ry="4.6" fill="#5ff3ff"/><ellipse cx="114" cy="69" rx="8" ry="4.6" fill="#5ff3ff"/><ellipse cx="86" cy="69" rx="3" ry="2" fill="#fff"/><ellipse cx="114" cy="69" rx="3" ry="2" fill="#fff"/>'
s += line('M100 78V100', 3) + line('M76 88h12M112 88h12', 3)
s += part('M56 34L64 4 80 22 100 0 120 22 136 4 144 34Z', AG, '#d4a020', dx=-3, dy=-3) + f'<circle cx="100" cy="22" r="5" fill="#e8423c" stroke="{O}" stroke-width="2"/><circle cx="74" cy="26" r="3.6" fill="#3cc7c2" stroke="{O}" stroke-width="1.6"/><circle cx="126" cy="26" r="3.6" fill="#3cc7c2" stroke="{O}" stroke-width="1.6"/>'
M['b12'] = svg(s)

json.dump(M, open(sys.argv[1] if len(sys.argv) > 1 else 'monsters.json', 'w'), ensure_ascii=False)
print({k: len(v) for k, v in M.items()})
