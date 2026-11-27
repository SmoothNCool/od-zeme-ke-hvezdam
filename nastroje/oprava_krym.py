# Krym podle mezinárodně uznaných hranic patří Ukrajině; Natural Earth ho kreslí podle skutečné kontroly jako součást Ruska.
# Upraví ../data/geo.json na místě: polygon Krymu přesune od Ruska k Ukrajině, hranici Krym–pevninská Ukrajina označí jako vnitřní ('2', nekreslí se)
# a u měst a regionů na Krymu opraví stát. Spouštět po mapa_2_vrstvy.py; opakované spuštění nic nezmění.
import io, json, sys
sys.stdout.reconfigure(encoding='utf-8')
P = '../data/geo.json'
g = json.load(io.open(P, encoding='utf-8'))
names = [c[0] for c in g['c']]
ru, ua = names.index('Rusko'), names.index('Ukrajina')
def dec(a):
    out, x, y = [], 0, 0
    for i in range(0, len(a), 2): x += a[i]; y += a[i + 1]; out.append((x / 1000, y / 1000))
    return out
arcs = [dec(a) for a in g['arcs']]
ring_pts = lambda r: [p for i in r for p in arcs[~i if i < 0 else i]]
is_crimea = lambda poly: (lambda pts: 32 < min(p[0] for p in pts) < 33 and 36 < max(p[0] for p in pts) < 37 and 44 < min(p[1] for p in pts) < 45)(ring_pts(poly[0]))
moved = [poly for poly in g['c'][ru][7] if is_crimea(poly)]
if moved:
    g['c'][ru][7] = [poly for poly in g['c'][ru][7] if not is_crimea(poly)]
    g['c'][ua][7] += moved
crimea = next(poly for poly in g['c'][ua][7] if is_crimea(poly))
arc_ids = lambda polys: {~i if i < 0 else i for poly in polys for r in poly for i in r}
inner = arc_ids([crimea]) & arc_ids([p for p in g['c'][ua][7] if p is not crimea])
sh = list(g['shared'])
for i in inner: sh[i] = '2'
g['shared'] = ''.join(sh)
ring = ring_pts(crimea[0])
def inside(x, y):
    c = False
    for (xa, ya), (xb, yb) in zip(ring, ring[1:] + ring[:1]):
        if (ya > y) != (yb > y) and x < (xb - xa) * (y - ya) / (yb - ya) + xa: c = not c
    return c
fixed = 0
for r in g['regions']:
    if r[5] == 'Rusko' and inside(r[2], r[1]): r[5] = 'Ukrajina'; fixed += 1
for t in g['towns']:
    if t[4] == 'Rusko' and inside(t[2], t[1]): t[4] = 'Ukrajina'; fixed += 1
json.dump(g, io.open(P, 'w', encoding='utf-8'), ensure_ascii=False, separators=(',', ':'))
print('přesunuto polygonů:', len(moved), '| vnitřních úseků:', len(inner), '| opraveno měst a regionů:', fixed)
assert not any(is_crimea(p) for p in g['c'][ru][7]) and inner
