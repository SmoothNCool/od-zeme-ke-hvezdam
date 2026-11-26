# Podrobná mapa světa z dat 1:10 mil. Hranice zůstávají jako sdílené oblouky (topologie), takže sousední státy mají společnou čáru přesně stejnou.
import io, json, os, sys, urllib.request, urllib.parse, re, math, subprocess
sys.stdout.reconfigure(encoding='utf-8')
TOL = float(sys.argv[1]) if len(sys.argv) > 1 else 0.012   # tolerance zjednodušení ve stupních
MIN_AREA = 0.0006                                            # menší ostrůvky (ve čtverečních stupních) se vynechají
os.makedirs('geodata/flags', exist_ok=True)
UA = {'User-Agent': 'Mozilla/5.0 (educational-globe-build)'}
def get(url, path):
    if not os.path.exists(path) or os.path.getsize(path) == 0:
        open(path, 'wb').write(urllib.request.urlopen(urllib.request.Request(url, headers=UA), timeout=180).read())
    return open(path, 'rb').read()
def sparql(q, path):
    if not os.path.exists(path) or os.path.getsize(path) < 100:
        open('q.rq', 'w', encoding='utf-8').write(q)
        subprocess.run(['curl', '-sS', '-G', 'https://query.wikidata.org/sparql', '--data-urlencode', 'format=json', '--data-urlencode', 'query@q.rq',
                        '-A', 'EducationalGlobeBuild/1.0 (one-off data build; python-urllib)', '-o', path], check=True)
    return json.load(io.open(path, encoding='utf-8'))

topo = json.loads(get('https://cdn.jsdelivr.net/npm/world-atlas@2.0.2/countries-10m.json', 'geodata/atlas10.json'))
NE = 'https://raw.githubusercontent.com/nvkelso/natural-earth-vector/master/geojson/'
rivers = json.loads(get(NE + 'ne_10m_rivers_lake_centerlines.geojson', 'geodata/rivers10.json'))
lakes = json.loads(get(NE + 'ne_10m_lakes.geojson', 'geodata/lakes10.json'))
wd = json.load(io.open('geodata/wikidata2.json', encoding='utf-8'))
try:
    cities = sparql('''SELECT ?cityLabel ?coord ?pop WHERE { VALUES ?t { wd:Q515 wd:Q1549591 wd:Q1637706 wd:Q174844 wd:Q200250 } ?city wdt:P31 ?t; wdt:P1082 ?pop; wdt:P625 ?coord.
 FILTER(?pop > 1000000) ?city rdfs:label ?cityLabel FILTER(lang(?cityLabel)="cs") }''', 'geodata/cities.json')['results']['bindings']
except Exception as e:
    print('města z Wikidat se nepodařilo stáhnout:', e); cities = []

# ---------- údaje o státech (stejně jako dřív) ----------
rows = {}
for b in wd['results']['bindings']:
    num = b['num']['value'].zfill(3); v = lambda k: b[k]['value'] if k in b else ''
    r = rows.setdefault(num, {'a2': v('a2'), 'name': v('cLabel'), 'caps': {}, 'conts': [], 'pop': 0, 'area': 0})
    if v('capLabel'):
        m = re.match(r'Point\(([-\d.]+) ([-\d.]+)\)', v('coord'))
        r['caps'].setdefault(v('capLabel'), [round(float(m.group(1)), 2), round(float(m.group(2)), 2)] if m else None)
    if v('contLabel') and v('contLabel') not in r['conts']: r['conts'].append(v('contLabel'))
    if v('pop'): r['pop'] = max(r['pop'], float(v('pop')))
    if v('area'): r['area'] = max(r['area'], float(v('area')))
NAME = {'Čínská lidová republika': 'Čína', 'Spojené státy americké': 'Spojené státy americké (USA)', 'Konžská demokratická republika': 'Kongo (Kinshasa)', 'Konžská republika': 'Kongo (Brazzaville)',
        'Korejská lidově demokratická republika': 'Severní Korea', 'Korejská republika': 'Jižní Korea', 'Nizozemské království': 'Nizozemsko', 'Stát Palestina': 'Palestina',
        'Svazijsko': 'Svazijsko (Eswatini)', 'oblast Smlouvy o Antarktidě': 'Antarktida', 'Federativní státy Mikronésie': 'Mikronésie', 'Dánské království': 'Dánsko'}
CAPFIX = {'Norsko': ('Oslo', [10.75, 59.91]), 'Nigérie': ('Abuja', [7.49, 9.06])}
CONT = {'Eurasie': None, 'Ostrovní Oceánie': 'Oceánie', 'Australasie': 'Oceánie', 'Karibik': 'Severní Amerika', 'Střední Amerika': 'Severní Amerika', 'Amerika': None, 'Afro-Eurasie': None}
MANUAL = {'Jersey': ['Jersey', 'Saint Helier', [-2.1, 49.19], 'Evropa', 'JE'], 'Kosovo': ['Kosovo', 'Priština', [21.17, 42.66], 'Evropa', 'XK'], 'N. Cyprus': ['Severní Kypr', 'Severní Nikósie', [33.36, 35.19], 'Asie', ''],
          'Somaliland': ['Somaliland', 'Hargeysa', [44.06, 9.56], 'Afrika', ''], 'Siachen Glacier': ['Ledovec Siačen', '', None, 'Asie', ''], 'Indian Ocean Ter.': ['Australská území v Indickém oceánu', '', None, 'Asie', ''],
          'Ashmore and Cartier Is.': ['Ashmorův a Cartierův ostrov', '', None, 'Oceánie', ''], 'Coral Sea Is.': ['Ostrovy Korálového moře', '', None, 'Oceánie', ''], 'Clipperton I.': ['Clippertonův ostrov', '', None, 'Severní Amerika', ''],
          'Spratly Is.': ['Spratlyho ostrovy', '', None, 'Asie', ''], 'Scarborough Reef': ['Scarborough Shoal', '', None, 'Asie', ''], 'Bajo Nuevo Bank': ['Bajo Nuevo', '', None, 'Severní Amerika', ''], 'Serranilla Bank': ['Serranilla', '', None, 'Severní Amerika', ''],
          'USNB Guantanamo Bay': ['Základna Guantánamo', '', None, 'Severní Amerika', ''], 'Dhekelia': ['Dekelia (britská základna)', '', None, 'Asie', ''], 'Akrotiri': ['Akrotiri (britská základna)', '', None, 'Asie', ''],
          'Baikonur': ['Bajkonur', '', None, 'Asie', ''], 'Cyprus U.N. Buffer Zone': ['Nárazníková zóna OSN na Kypru', '', None, 'Asie', ''], 'Brazilian I.': ['Brazilský ostrov', '', None, 'Jižní Amerika', ''],
          'Bir Tawil': ['Bir Tawíl', '', None, 'Afrika', ''], 'Southern Patagonian Ice Field': ['Jižní patagonské ledovcové pole', '', None, 'Jižní Amerika', '']}

# ---------- oblouky: dekódování a zjednodušení (Douglas–Peucker) ----------
sx, sy = topo['transform']['scale']; tx, ty = topo['transform']['translate']
raw = []
for a in topo['arcs']:
    x = y = 0; pts = []
    for dx, dy in a:
        x += dx; y += dy; pts.append((x * sx + tx, y * sy + ty))
    raw.append(pts)
def dp(pts, tol):
    n = len(pts)
    if n < 3: return pts[:]
    keep = [False] * n; keep[0] = keep[-1] = True
    if pts[0] == pts[-1]:  # uzavřený oblouk (ostrov): nejdřív ho rozpůlit v nejvzdálenějším bodě
        far = max(range(n), key=lambda i: (pts[i][0] - pts[0][0]) ** 2 + (pts[i][1] - pts[0][1]) ** 2); keep[far] = True
        stack = [(0, far), (far, n - 1)]
    else: stack = [(0, n - 1)]
    while stack:
        a, b = stack.pop()
        if b - a < 2: continue
        ax, ay = pts[a]; bx, by = pts[b]; dx, dy = bx - ax, by - ay; L = math.hypot(dx, dy) or 1e-12
        best, bi = 0, -1
        for i in range(a + 1, b):
            d = abs(dy * (pts[i][0] - ax) - dx * (pts[i][1] - ay)) / L if L > 1e-11 else math.hypot(pts[i][0] - ax, pts[i][1] - ay)
            if d > best: best, bi = d, i
        if best > tol: keep[bi] = True; stack += [(a, bi), (bi, b)]
    return [p for p, k in zip(pts, keep) if k]
def ring_pts(idx, arcs):
    out = []
    for i in idx:
        pts = arcs[i] if i >= 0 else arcs[~i][::-1]
        out.extend(pts if not out else pts[1:])
    return out
def area_centroid(r):
    a = cx = cy = 0
    for i in range(len(r) - 1):
        x0, y0 = r[i]; x1, y1 = r[i + 1]
        if x1 - x0 > 180: x1 -= 360
        if x1 - x0 < -180: x1 += 360
        c = x0 * y1 - x1 * y0; a += c; cx += (x0 + x1) * c; cy += (y0 + y1) * c
    return (abs(a) / 2, (cx / (3 * a), cy / (3 * a))) if a else (0, r[0])

geoms = topo['objects']['countries']['geometries']
kept_polys, info, missing, owner = [], [], [], {}
for gi, ge in enumerate(geoms):
    polys = ge['arcs'] if ge['type'] == 'MultiPolygon' else [ge['arcs']]
    measured = [(area_centroid(ring_pts(poly[0], raw)), poly) for poly in polys]
    best = max(measured, key=lambda m: m[0][0])
    keep = [poly for (a, c), poly in measured if a >= MIN_AREA or poly is best[1]]
    kept_polys.append(keep)
    for poly in keep:
        for r in poly:
            for i in r: owner.setdefault(i if i >= 0 else ~i, set()).add(gi)
    num = str(ge['id']).zfill(3) if ge.get('id') is not None else ''; en = ge['properties']['name']
    lbl = [round(best[0][1][0], 1), round(best[0][1][1], 1)]
    if num in rows and num not in ('', '000'):
        r = rows[num]; name = NAME.get(r['name'], r['name'])
        caps = list(r['caps'].items()); capname = ' / '.join(k for k, _ in caps); cappos = next((p for _, p in caps if p), None)
        if name in CAPFIX: capname, cappos = CAPFIX[name]
        conts = []
        for c in r['conts']:
            c = CONT.get(c, c)
            if c and c not in conts: conts.append(c)
        info.append([name, capname, ' a '.join(conts), 0 if name == 'Antarktida' else round(r['pop']), round(r['area']), r['a2'], lbl, cappos])
    elif en in MANUAL:
        m = MANUAL[en]; info.append([m[0], m[1], m[3], 0, 0, m[4], lbl, m[2]])
    else:
        missing.append((num, en)); info.append([en, '', '', 0, 0, '', lbl, None])
print('území:', len(geoms), '| nespárováno:', missing)

used = sorted(owner)                      # jen oblouky, které po vynechání ostrůvků zůstaly
remap = {old: new for new, old in enumerate(used)}
simp = [dp(raw[i], TOL) for i in used]
Qn = 1000                                  # přesnost 0,001° (asi 100 m)
def enc(pts):
    out = []; px = py = 0
    for x, y in pts:
        qx, qy = round(x * Qn), round(y * Qn); out += [qx - px, qy - py]; px, py = qx, qy
    return out
arcs_out = [enc(p) for p in simp]
shared = ''.join('1' if len(owner[i]) > 1 else '0' for i in used)
polys_out = [[[[remap[i] if i >= 0 else ~remap[~i] for i in r] for r in poly] for poly in keep] for keep in kept_polys]
nb = [set() for _ in geoms]
for s in owner.values():
    for a in s:
        for b in s:
            if a != b: nb[a].add(b)
color = [-1] * len(geoms)
for gi in sorted(range(len(geoms)), key=lambda i: -len(nb[i])):
    usedc = {color[n] for n in nb[gi]}
    color[gi] = next(c for c in [(gi + k) % 6 for k in range(6)] if c not in usedc)

RIV = {'Nile': 'Nil', 'Amazonas': 'Amazonka', 'Amazon': 'Amazonka', 'Chang Jiang': 'Jang-c’-ťiang', 'Yangtze': 'Jang-c’-ťiang', 'Mississippi': 'Mississippi', 'Missouri': 'Missouri', 'Yenisey': 'Jenisej', 'Huang He': 'Žlutá řeka', 'Ob': 'Ob', 'Congo': 'Kongo',
       'Amur': 'Amur', 'Lena': 'Lena', 'Mekong': 'Mekong', 'Niger': 'Niger', 'Volga': 'Volha', 'Donau': 'Dunaj', 'Danube': 'Dunaj', 'Ganges': 'Ganga', 'Indus': 'Indus', 'Rhein': 'Rýn', 'Rhine': 'Rýn', 'Elbe': 'Labe',
       'Dnipro': 'Dněpr', 'Dnieper': 'Dněpr', 'Don': 'Don', 'Murray': 'Murray', 'Zambezi': 'Zambezi', 'Paraná': 'Paraná', 'Orinoco': 'Orinoko', 'Euphrates': 'Eufrat', 'Tigris': 'Tigris', 'Brahmaputra': 'Brahmaputra',
       'Colorado': 'Colorado', 'Yukon': 'Yukon', 'Mackenzie': 'Mackenzie', 'St. Lawrence': 'Řeka svatého Vavřince', 'Irtysh': 'Irtyš', 'Vistula': 'Visla', 'Wisła': 'Visla', 'Oder': 'Odra', 'Odra': 'Odra', 'Loire': 'Loira',
       'Seine': 'Seina', 'Thames': 'Temže', 'Tajo': 'Tajo', 'Po': 'Pád', 'Orange': 'Oranžská řeka', 'Darling': 'Darling', 'Columbia': 'Columbia', 'Rio Grande': 'Rio Grande', 'São Francisco': 'São Francisco',
       'Vltava': 'Vltava', 'Morava': 'Morava', 'Rhône': 'Rhôna', 'Ebro': 'Ebro', 'Tisza': 'Tisa', 'Sava': 'Sáva', 'Drava': 'Dráva', 'Inn': 'Inn', 'Main': 'Mohan', 'Weser': 'Vezera', 'Neman': 'Němen', 'Dniester': 'Dněstr',
       'Ural': 'Ural', 'Syr Darya': 'Syrdarja', 'Amu Darya': 'Amudarja', 'Irrawaddy': 'Iravadi', 'Salween': 'Salwin', 'Xi Jiang': 'Perlová řeka', 'Limpopo': 'Limpopo', 'Senegal': 'Senegal', 'Ohio': 'Ohio', 'Snake': 'Snake'}
out_riv, seen = [], {}
for f in rivers['features']:
    pr = f['properties']; rank = pr.get('scalerank', 9); g = f['geometry']
    if rank is None or rank > 7 or not g: continue
    cz = RIV.get(pr.get('name') or '', '') or RIV.get(pr.get('name_en') or '', '')
    for ln in (g['coordinates'] if g['type'] == 'MultiLineString' else [g['coordinates']]):
        t = dp([tuple(q[:2]) for q in ln], TOL)
        if len(t) < 2: continue
        if cz and len(t) > seen.get(cz, (0, 0))[0]: seen[cz] = (len(t), len(out_riv))
        out_riv.append([cz, rank, enc(t)])
labeled = {idx for _, idx in seen.values()}
for i, r in enumerate(out_riv):
    if i not in labeled: r[0] = ''
out_lak = []
for f in lakes['features']:
    if (f['properties'].get('scalerank') or 9) > 5 or not f['geometry']: continue
    g = f['geometry']
    for poly in (g['coordinates'] if g['type'] == 'MultiPolygon' else [g['coordinates']]):
        t = dp([tuple(q[:2]) for q in poly[0]], TOL)
        if len(t) >= 4: out_lak.append(enc(t))

CZ_CITIES = [['Brno', 49.2, 16.61], ['Ostrava', 49.84, 18.29], ['Plzeň', 49.75, 13.38], ['Liberec', 50.77, 15.06], ['Olomouc', 49.59, 17.25], ['České Budějovice', 48.97, 14.47], ['Hradec Králové', 50.21, 15.83], ['Písek', 49.31, 14.15]]
caps_pos = [r[7] for r in info if r[7]]
out_cit, seen_c = [[n, la, lo, 0] for n, la, lo in CZ_CITIES], set(n for n, _, _ in CZ_CITIES)
for b in sorted(cities, key=lambda b: -float(b['pop']['value'])):
    m = re.match(r'Point\(([-\d.]+) ([-\d.]+)\)', b['coord']['value']); name = b['cityLabel']['value']
    if not m or name in seen_c: continue
    lo, la = float(m.group(1)), float(m.group(2))
    if any(abs(lo - c[0]) < .3 and abs(la - c[1]) < .3 for c in caps_pos): continue   # hlavní města už na mapě jsou
    if any(abs(lo - c[2]) < .4 and abs(la - c[1]) < .4 for c in out_cit): continue      # dvojí záznam téhož města
    if len(out_cit) >= 208: break   # 8 českých + 200 největších
    seen_c.add(name); out_cit.append([{'Newyorská metropolitní oblast': 'New York'}.get(name, name), round(la, 2), round(lo, 2), round(float(b['pop']['value']))])

from PIL import Image
codes = sorted({r[5] for r in info if r[5]}); COLS, CELL = 16, 72
sheet = Image.new('RGBA', (COLS * CELL, ((len(codes) + COLS - 1) // COLS) * CELL)); ok = {}
for a2 in codes:
    try:
        get('https://cdn.jsdelivr.net/gh/twitter/twemoji@14.0.2/assets/72x72/%s.png' % '-'.join('%x' % (0x1F1E6 + ord(ch) - 65) for ch in a2), 'geodata/flags/%s.png' % a2)
        k = len(ok); sheet.paste(Image.open('geodata/flags/%s.png' % a2).convert('RGBA'), ((k % COLS) * CELL, (k // COLS) * CELL)); ok[a2] = k
    except Exception as e: print('vlajka chybí:', a2)
sheet.crop((0, 0, COLS * CELL, ((len(ok) + COLS - 1) // COLS) * CELL)).save('geodata/flags.png', optimize=True)
out = {'arcs': arcs_out, 'shared': shared, 'c': [info[i][:5] + [ok.get(info[i][5], -1), color[i], polys_out[i], info[i][6], info[i][7]] for i in range(len(geoms))],
       'rivers': out_riv, 'lakes': out_lak, 'cities': out_cit}
s = json.dumps(out, ensure_ascii=False, separators=(',', ':'))
io.open('geodata/geo.min.json', 'w', encoding='utf-8').write(s)
print('TOL', TOL, '| oblouků:', len(arcs_out), '| bodů hranic:', sum(len(a) // 2 for a in arcs_out), '(původně', sum(len(raw[i]) for i in used), ') | mnohoúhelníků:', sum(len(k) for k in kept_polys), 'z', sum(len(ge['arcs']) if ge['type'] == 'MultiPolygon' else 1 for ge in geoms))
print('řek:', len(out_riv), 'bodů', sum(len(r[2]) // 2 for r in out_riv), '| pojmenovaných:', len(seen), '| jezer:', len(out_lak), '| měst:', len(out_cit), '| vlajek:', len(ok), '| geo.min.json:', len(s) // 1024, 'kB')
print('ukázka měst:', [c[0] for c in out_cit[:40]])
