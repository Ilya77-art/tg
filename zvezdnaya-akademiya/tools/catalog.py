import pickle, random, json, chess, collections
rows = pickle.load(open('rows.pkl', 'rb'))
TOPICS = [
  ('mate1', 'mateIn1'), ('mate2', 'mateIn2'), ('mate3', 'mateIn3'), ('backRank', 'backRankMate'), ('smothered', 'smotheredMate'),
  ('fork', 'fork'), ('pin', 'pin'), ('skewer', 'skewer'), ('discovered', 'discoveredAttack'), ('doubleCheck', 'doubleCheck'),
  ('hanging', 'hangingPiece'), ('trapped', 'trappedPiece'), ('deflection', 'deflection'), ('attraction', 'attraction'),
  ('defender', 'capturingDefender'), ('intermezzo', 'intermezzo'), ('promotion', 'promotion'), ('pawnEndgame', 'pawnEndgame'),
]
LEVELS = [(400, 900), (900, 1200), (1200, 1500), (1500, 1800), (1800, 2200)]
K = 30
def ok(r, strict):
    pid, fen, moves, rating, rd, pop, nb, th = r
    ths = th.split()
    if 'underPromotion' in ths: return False
    if strict: return pop >= 85 and nb >= 300 and rd <= 85
    return pop >= 70 and nb >= 80 and rd <= 110
def valid(r):
    fen, moves = r[1], r[2].split()
    b = chess.Board(fen)
    for i, u in enumerate(moves):
        m = chess.Move.from_uci(u)
        if m not in b.legal_moves: return False
        b.push(m)
    if 'mate' in r[7].split() and not b.is_checkmate(): return False
    return True
idx = collections.defaultdict(list)
for r in rows:
    for t in set(r[7].split()): idx[t].append(r)
used = set(); cells = {}; report = []
rnd = random.Random(20261006)
for key, theme in TOPICS:
    cells[key] = []
    for lo, hi in LEVELS:
        cand = [r for r in idx[theme] if lo <= r[3] < hi and r[0] not in used]
        pick = []
        for strict in (True, False):
            pool = [r for r in cand if ok(r, strict) and r[0] not in {p[0] for p in pick}]
            rnd.shuffle(pool)
            for r in pool:
                if len(pick) >= K: break
                if valid(r): pick.append(r)
            if len(pick) >= K: break
        pick.sort(key=lambda r: r[3])
        for r in pick: used.add(r[0])
        f = r[1].split() if pick else []
        cells[key].append([' '.join([p[0]] + p[1].split()[:4] + p[2].split() + [str(p[3])]) for p in pick])
        report.append((key, lo, len(pick)))
out = {'src': 'lichess.org puzzle database (CC0)', 'size': sum(len(c) for v in cells.values() for c in v), 'cells': cells}
s = json.dumps(out, ensure_ascii=False, separators=(',', ':'))
open('/home/claude/work/src/lichess_catalog.js', 'w').write('window.ACAD_LICHESS = ' + s + ';\n')
print(len(s), out['size'])
for k in TOPICS:
    print(k[0], [n for (kk, lo, n) in report if kk == k[0]])
