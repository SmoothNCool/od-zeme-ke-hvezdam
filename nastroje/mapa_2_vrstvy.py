# Rozšíření mapy: hranice krajů a regionů, tisíce měst, pohoří, ostrovy, moře, vrcholy, jezera. České názvy z Wikidat podle identifikátorů v datech Natural Earth.
import io, json, os, sys, urllib.request, urllib.parse, re, math, time, subprocess
sys.stdout.reconfigure(encoding='utf-8')
G = 'geodata/'
TOL1 = 0.02      # zjednodušení hranic regionů
UA = {'User-Agent': 'EducationalGlobeBuild/1.0 (one-off data build; python-urllib)'}
load = lambda f: [dict(p={k.lower(): v for k, v in x['properties'].items()}, g=x['geometry']) for x in json.load(io.open(G + f + '.json', encoding='utf-8'))['features']]
adm_lines, adm = load('ne_10m_admin_1_states_provinces_lines'), load('ne_10m_admin_1_states_provinces')
places, regs, marine, elev, lakes = load('ne_10m_populated_places'), load('ne_10m_geography_regions_polys'), load('ne_10m_geography_marine_polys'), load('ne_10m_geography_regions_elevation_points'), load('lakes10')
geo = json.load(io.open(G + 'geo.min.json', encoding='utf-8'))

# ---------- české názvy z Wikidat ----------
qid = lambda f: (f['p'].get('wikidataid') or '').strip()
ids = sorted({qid(f) for layer in (adm, places, regs, marine, elev, lakes) for f in layer if re.fullmatch(r'Q\d+', qid(f))})
cache_path = G + 'labels_cs.json'
cs = json.load(io.open(cache_path, encoding='utf-8')) if os.path.exists(cache_path) else {}
todo = [i for i in ids if i not in cs]
print('identifikátorů:', len(ids), '| zbývá stáhnout:', len(todo))
for k in range(0, len(todo), 50):
    chunk = todo[k:k + 50]
    url = 'https://www.wikidata.org/w/api.php?action=wbgetentities&format=json&props=labels&languages=cs&ids=' + '|'.join(chunk)
    for attempt in range(5):
        try:
            data = json.loads(subprocess.run(['curl', '-sS', '-A', 'EducationalGlobeBuild/1.0 (one-off educational data build)', url], capture_output=True, check=True, timeout=90).stdout.decode('utf-8'))
            if 'entities' not in data: raise RuntimeError(str(data)[:120])
            break
        except Exception as e:
            print('  chyba, čekám:', str(e)[:80]); time.sleep(20 * (attempt + 1)); data = None
    if not data: print('  dávku se nepodařilo stáhnout, končím stahování'); break
    for i in chunk:
        cs[i] = (data.get('entities', {}).get(i, {}).get('labels', {}).get('cs', {}) or {}).get('value', '')
    if k % 1000 == 0:
        io.open(cache_path, 'w', encoding='utf-8').write(json.dumps(cs, ensure_ascii=False)); print('  staženo', k + len(chunk))
    time.sleep(.3)
io.open(cache_path, 'w', encoding='utf-8').write(json.dumps(cs, ensure_ascii=False))
name = lambda f, fallback=True: cs.get(qid(f), '') or (f['p'].get('name') or '' if fallback else '')
print('s českým názvem:', sum(1 for i in ids if cs.get(i)), 'z', len(ids))

# česká města a obce nad 5 000 obyvatel
cz_path = G + 'cz_towns.json'
if not os.path.exists(cz_path) or os.path.getsize(cz_path) < 100:
    open('q.rq', 'w', encoding='utf-8').write('''SELECT ?tLabel ?coord (MAX(?p) AS ?pop) WHERE { ?t wdt:P17 wd:Q213; wdt:P31/wdt:P279* wd:Q5153359; wdt:P1082 ?p; wdt:P625 ?coord. FILTER(?p > 5000)
 ?t rdfs:label ?tLabel FILTER(lang(?tLabel)="cs") } GROUP BY ?tLabel ?coord''')
    subprocess.run(['curl', '-sS', '-G', 'https://query.wikidata.org/sparql', '--data-urlencode', 'format=json', '--data-urlencode', 'query@q.rq', '-A', UA['User-Agent'], '-o', cz_path], check=True)
try: cz_towns = json.load(io.open(cz_path, encoding='utf-8'))['results']['bindings']
except Exception as e: print('česká města se nepodařilo stáhnout:', e); cz_towns = []

# ---------- pomocné ----------
def dp(pts, tol):
    n = len(pts)
    if n < 3: return pts[:]
    keep = [False] * n; keep[0] = keep[-1] = True; stack = [(0, n - 1)]
    while stack:
        a, b = stack.pop()
        if b - a < 2: continue
        ax, ay = pts[a]; bx, by = pts[b]; dx, dy = bx - ax, by - ay; L = math.hypot(dx, dy)
        best, bi = 0, -1
        for i in range(a + 1, b):
            d = abs(dy * (pts[i][0] - ax) - dx * (pts[i][1] - ay)) / L if L > 1e-11 else math.hypot(pts[i][0] - ax, pts[i][1] - ay)
            if d > best: best, bi = d, i
        if best > tol: keep[bi] = True; stack += [(a, bi), (bi, b)]
    return [p for p, k in zip(pts, keep) if k]
def enc(pts):
    out = []; px = py = 0
    for x, y in pts:
        qx, qy = round(x * 1000), round(y * 1000); out += [qx - px, qy - py]; px, py = qx, qy
    return out
def centroid(g):   # těžiště největšího mnohoúhelníku
    polys = g['coordinates'] if g['type'] == 'MultiPolygon' else [g['coordinates']]; best = (0, None)
    for poly in polys:
        r = poly[0]; a = cx = cy = 0
        for i in range(len(r) - 1):
            x0, y0 = r[i][:2]; x1, y1 = r[i + 1][:2]; c = x0 * y1 - x1 * y0; a += c; cx += (x0 + x1) * c; cy += (y0 + y1) * c
        if abs(a) > best[0] and a: best = (abs(a), (cx / (3 * a), cy / (3 * a)))
    return best[1]
r2 = lambda v: round(v, 2)

# ---------- hranice regionů ----------
import statistics, collections, zipfile
by_c = collections.defaultdict(list)
for f in adm: by_c[f['p'].get('adm0_a3')].append(f['p'].get('area_sqkm') or 0)
TOO_FINE = {'SVN', 'LVA', 'MKD', 'MLT'}   # státy, které data dělí na stovky malých obcí místo krajů
print('bez regionů (příliš drobné):', sorted(TOO_FINE))
adm1 = []
for f in adm_lines:
    g = f['g']
    if not g or f['p'].get('adm0_a3') in TOO_FINE: continue
    for ln in (g['coordinates'] if g['type'] == 'MultiLineString' else [g['coordinates']]):
        t = dp([tuple(q[:2]) for q in ln], TOL1)
        if len(t) >= 2: adm1.append(enc(t))

# ---------- regiony (jmenovky) ----------
wd = json.load(io.open(G + 'wikidata2.json', encoding='utf-8'))
a2name = {}
for b in wd['results']['bindings']: a2name.setdefault(b['a2']['value'], b['cLabel']['value'])
FIX = {'Čínská lidová republika': 'Čína', 'Spojené státy americké': 'USA', 'Nizozemské království': 'Nizozemsko', 'Dánské království': 'Dánsko', 'Korejská republika': 'Jižní Korea', 'Korejská lidově demokratická republika': 'Severní Korea'}
country = lambda a2: FIX.get(a2name.get(a2, ''), a2name.get(a2, ''))
TYPES = {'State': 'stát', 'Province': 'provincie', 'Region': 'region', 'Department': 'departement', 'County': 'hrabství', 'Prefecture': 'prefektura', 'District': 'okres', 'Oblast': 'oblast', 'Republic': 'republika',
         'Territory': 'teritorium', 'Canton': 'kanton', 'Governorate': 'guvernorát', 'Municipality': 'obec', 'Autonomous Region': 'autonomní oblast', 'Autonomous Community': 'autonomní společenství', 'Parish': 'farnost',
         'Emirate': 'emirát', 'Voivodeship': 'vojvodství', 'Federal State': 'spolková země', 'Krai': 'kraj', 'Autonomous Republic': 'autonomní republika', 'Division': 'divize', 'Island': 'ostrov', 'Commune': 'obec'}
regions = []
for f in adm:
    p = f['p']
    if p.get('latitude') is None or p.get('longitude') is None or p.get('adm0_a3') in TOO_FINE: continue
    n = name(f)
    if p.get('iso_a2') == 'CZ': n = {'Plzeňský': 'Plzeňský kraj', 'Zlínský': 'Zlínský kraj', 'Prague': 'Praha'}.get(p.get('name'), n)   # u dvou krajů vede identifikátor v datech na okres
    if not n: continue
    kind = 'kraj' if p.get('iso_a2') == 'CZ' else TYPES.get(p.get('type_en') or '', '')
    regions.append([n, r2(p['latitude']), r2(p['longitude']), p.get('scalerank') or 9, kind, country(p.get('iso_a2') or '')])

# ---------- města ----------
caps = [c[9] for c in geo['c'] if c[9]]
near_cap = lambda lo, la: any(abs(lo - c[0]) < .12 and abs(la - c[1]) < .12 for c in caps)
towns = []
for f in places:
    p = f['p']; lo, la = p.get('longitude'), p.get('latitude')
    if lo is None or p.get('adm0cap') == 1 or near_cap(lo, la): continue
    n = name(f)
    if n: towns.append([n, r2(la), r2(lo), int(p.get('pop_max') or 0), country(p.get('iso_a2') or '')])
have = lambda lo, la: any(abs(lo - t[2]) < .06 and abs(la - t[1]) < .06 for t in towns if t[4] == 'Česko')
added = 0
for b in cz_towns:
    m = re.match(r'Point\(([-\d.]+) ([-\d.]+)\)', b['coord']['value'])
    if not m: continue
    lo, la = float(m.group(1)), float(m.group(2))
    if near_cap(lo, la) or have(lo, la): continue
    towns.append([b['tLabel']['value'], r2(la), r2(lo), int(float(b['pop']['value'])), 'Česko']); added += 1
grid = collections.defaultdict(list)
for t in towns: grid[(round(t[2] * 10), round(t[1] * 10))].append(t)
for c in caps: grid[(round(c[0] * 10), round(c[1] * 10))].append([None, c[1], c[0]])
def taken(lo, la):
    gx, gy = round(lo * 10), round(la * 10)
    return any(abs(lo - t[2]) < .08 and abs(la - t[1]) < .08 for dx in (-1, 0, 1) for dy in (-1, 0, 1) for t in grid.get((gx + dx, gy + dy), ()))
gn = 0
with zipfile.ZipFile(G + 'cities15000.zip') as z:
    for line in z.read('cities15000.txt').decode('utf-8').split(chr(10)):
        c = line.split(chr(9))
        if len(c) < 15: continue
        la, lo, pop = float(c[4]), float(c[5]), int(c[14] or 0)
        if pop < 15000 or taken(lo, la): continue
        t = [c[1], r2(la), r2(lo), pop, country(c[8])]; towns.append(t); grid[(round(lo * 10), round(la * 10))].append(t); gn += 1
print('měst doplněno z GeoNames:', gn)
towns.sort(key=lambda t: -t[3])

# ---------- příroda: pohoří, pouště, ostrovy, moře, vrcholy, jezera (jen s českým názvem, ať tam nejsou anglické) ----------
LAND = {'Range/mtn': 'pohoří', 'Desert': 'poušť', 'Plateau': 'náhorní plošina', 'Plain': 'nížina', 'Basin': 'pánev', 'Tundra': 'tundra', 'Lowland': 'nížina', 'Valley': 'údolí', 'Wetlands': 'mokřady', 'Delta': 'delta', 'Foothills': 'podhůří', 'Geoarea': 'oblast', 'Gorge': 'soutěska'}
ISL = {'Island': 'ostrov', 'Island group': 'souostroví', 'Peninsula': 'poloostrov', 'Isthmus': 'šíje', 'Coast': 'pobřeží', 'Pen/cape': 'mys'}
phys, isles = [], []
for f in regs:
    p = f['p']; cl = p.get('featurecla') or ''; n = name(f, False)
    if not n or not f['g'] or cl not in LAND and cl not in ISL: continue
    c = centroid(f['g'])
    if c: (phys if cl in LAND else isles).append([n, r2(c[1]), r2(c[0]), p.get('scalerank') or 9, LAND.get(cl) or ISL[cl]])
SEA = {'sea': 'moře', 'gulf': 'záliv', 'bay': 'záliv', 'strait': 'průliv', 'sound': 'průliv', 'channel': 'průliv', 'lagoon': 'laguna', 'fjord': 'fjord', 'inlet': 'zátoka', 'reef': 'útes', 'river': 'ústí řeky', 'generic': 'vodní plocha'}
seas = []
for f in marine:
    p = f['p']; cl = p.get('featurecla') or ''; n = name(f, False)
    if not n or cl == 'ocean' or not f['g']: continue
    c = centroid(f['g'])
    if c: seas.append([n, r2(c[1]), r2(c[0]), p.get('scalerank') or 9, SEA.get(cl, '')])
peaks = []
for f in elev:
    p = f['p']; n = name(f)
    if not n or p.get('featurecla') not in ('mountain', 'spot elevation') or not p.get('elevation'): continue
    peaks.append([n, r2(p['lat_y']), r2(p['long_x']), int(p['elevation']), p.get('scalerank') or 9])
lake_names = []
for f in lakes:
    p = f['p']; n = name(f, False)
    if not n or (p.get('scalerank') or 9) > 6 or not f['g']: continue
    c = centroid(f['g'])
    if c: lake_names.append([n, r2(c[1]), r2(c[0]), p.get('scalerank') or 9])

geo.pop('cities', None)
geo.update(adm1=adm1, regions=regions, towns=towns, phys=phys, isles=isles, seas=seas, peaks=peaks, lakeNames=lake_names)
s = json.dumps(geo, ensure_ascii=False, separators=(',', ':'))
io.open(G + 'geo.full.json', 'w', encoding='utf-8').write(s)
print('hranice regionů: úseků', len(adm1), 'bodů', sum(len(a) // 2 for a in adm1))
print('regionů:', len(regions), '| měst:', len(towns), '(z toho českých doplněno', added, ') | pohoří apod.:', len(phys), '| ostrovů apod.:', len(isles), '| moří apod.:', len(seas), '| vrcholů:', len(peaks), '| jezer:', len(lake_names))
print('geo.full.json:', len(s) // 1024, 'kB')
print('kraje ČR:', [r[0] for r in regions if r[5] == 'Česko'])
print('česká města (největší):', [t[0] for t in towns if t[4] == 'Česko'][:25], '… celkem', sum(1 for t in towns if t[4] == 'Česko'))
print('pohoří (ukázka):', [x[0] for x in sorted(phys, key=lambda x: x[3])[:25]])
print('moře (ukázka):', [x[0] for x in sorted(seas, key=lambda x: x[3])[:25]])
print('vrcholy (ukázka):', [(x[0], x[3]) for x in sorted(peaks, key=lambda x: -x[3])[:10]])
print('města světa (ukázka):', [t[0] for t in towns[:30]])
