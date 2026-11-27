# Skutečná časová pásma -> data/pasma.json. Zdroj: Natural Earth ne_10m_time_zones (volné dílo); hranice podle států a jejich pravidel, bez letního času.
# Spouští se ze složky nastroje/: python pasma.py. Výsledek: [[posun v hodinách, barva 1-8, [šířka, délka] jmenovky, [prstence jako rozdíly v tisícinách stupně]], ...]
import io, json, math, os, subprocess
src = 'geodata/stazene/tz.json'
if not os.path.exists(src):
    os.makedirs('geodata/stazene', exist_ok=True)
    subprocess.run(['curl', '-sS', '-L', '-o', src, 'https://raw.githubusercontent.com/nvkelso/natural-earth-vector/master/geojson/ne_10m_time_zones.geojson'], check=True)
TOL = .04
def dp(pts, tol):  # Douglas–Peucker
    if len(pts) < 4: return pts
    keep = [False] * len(pts); keep[0] = keep[-1] = True; stack = [(0, len(pts) - 1)]
    if pts[0] == pts[-1]:  # uzavřený prstenec: nejdřív rozpůlit v nejvzdálenějším bodě, jinak by zbyl jen začátek a konec
        far = max(range(len(pts)), key=lambda i: (pts[i][0] - pts[0][0]) ** 2 + (pts[i][1] - pts[0][1]) ** 2); keep[far] = True; stack = [(0, far), (far, len(pts) - 1)]
    while stack:
        a, b = stack.pop()
        (ax, ay), (bx, by) = pts[a], pts[b]; L = math.hypot(bx - ax, by - ay) or 1e-12; best, bi = 0, -1
        for i in range(a + 1, b):
            d = abs((bx - ax) * (ay - pts[i][1]) - (ax - pts[i][0]) * (by - ay)) / L
            if d > best: best, bi = d, i
        if best > tol: keep[bi] = True; stack += [(a, bi), (bi, b)]
    return [p for p, k in zip(pts, keep) if k]
def enc(ring):
    out, px, py = [], 0, 0
    for x, y in ring: X, Y = round(x * 1000), round(y * 1000); out += [X - px, Y - py]; px, py = X, Y
    return out
def inside(x, y, ring):
    c = False
    for (xa, ya), (xb, yb) in zip(ring, ring[1:] + ring[:1]):
        if (ya > y) != (yb > y) and x < (xb - xa) * (y - ya) / (yb - ya) + xa: c = not c
    return c
def label_points(rings):  # body uvnitř pásma po pruzích 25° šířky, v každém co nejdál od okraje; dlouhé pruhy přes celou Zemi tak mají popisek všude
    pts = []
    for lat0 in range(-75, 76, 25):
        best, bp = -1, None
        for ring in rings:
            xs = [c[0] for c in ring]; ys = [c[1] for c in ring]
            if max(ys) < lat0 or min(ys) > lat0 + 25: continue
            for i in range(1, 16):
                for j in range(1, 6):
                    x = min(xs) + (max(xs) - min(xs)) * i / 16; y = lat0 + 25 * j / 6
                    if not inside(x, y, ring): continue
                    d = min(min(abs(x - c[0]), abs(y - c[1])) if False else math.hypot(x - c[0], y - c[1]) for c in ring[::max(1, len(ring) // 150)])
                    if d > best: best, bp = d, [round(y, 2), round(x, 2)]
        if bp and best > 2: pts.append(bp)
    return pts
out = []
for f in json.load(io.open(src, encoding='utf-8'))['features']:
    p, g = f['properties'], f['geometry']
    polys = [g['coordinates']] if g['type'] == 'Polygon' else g['coordinates']
    rings = [dp([tuple(c) for c in r], TOL) for poly in polys for r in poly]
    rings = [r for r in rings if len(r) >= 4]
    if not rings: continue
    out.append([p['zone'], p['map_color8'], label_points(rings), [enc(r) for r in rings]])
json.dump(out, io.open('../data/pasma.json', 'w', encoding='utf-8'), separators=(',', ':'))
print(len(out), 'oblastí,', os.path.getsize('../data/pasma.json'), 'B')
assert any(z[0] == 1 and any(40 < la < 60 and -5 < lo < 30 for la, lo in z[2]) for z in out), 'střední Evropa má UTC+1'
print('jmenovek:', sum(len(z[2]) for z in out))
