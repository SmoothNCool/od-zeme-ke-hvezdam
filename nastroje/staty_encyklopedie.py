# Encyklopedické údaje o státech z Wikidat -> data/staty.json (pole ve stejném pořadí jako GEO.c v data/geo.json).
# Spouští se ze složky nastroje/: python staty_encyklopedie.py
# Odpovědi Wikidat si ukládá do geodata/enc_*.json; smazáním souboru se dotaz pustí znovu. Wikidata odmítají Python (429), proto curl.
import io, json, os, subprocess, sys, datetime
sys.stdout.reconfigure(encoding='utf-8')
os.makedirs('geodata', exist_ok=True)

def sparql(name, q):
    path = 'geodata/enc_%s.json' % name
    if not os.path.exists(path) or os.path.getsize(path) < 100:
        io.open('q.rq', 'w', encoding='utf-8').write(q)
        subprocess.run(['curl', '-sS', '-G', 'https://query.wikidata.org/sparql', '--data-urlencode', 'format=json', '--data-urlencode', 'query@q.rq',
                        '-A', 'EducationalGlobeBuild/1.0 (one-off data build)', '-o', path], check=True)
        os.remove('q.rq')
    return [{k: v['value'] for k, v in b.items()} for b in json.load(io.open(path, encoding='utf-8'))['results']['bindings']]

# území s kódem ISO 3166-1 (státy i závislá území)
BASE = '?c wdt:P297 ?a2. '
NOW = 'FILTER NOT EXISTS { ?s pq:P582 ?end } ?s wikibase:rank ?rank FILTER(?rank != wikibase:DeprecatedRank) '  # jen platné výroky
CS = '?v rdfs:label ?l FILTER(lang(?l) = "cs") '

base = sparql('base', 'SELECT ?c ?a2 ?name ?title WHERE { ' + BASE + '?c rdfs:label ?name FILTER(lang(?name) = "cs") '
              'OPTIONAL { ?art schema:about ?c; schema:isPartOf <https://cs.wikipedia.org/>; schema:name ?title } }')
def labels(name, prop):  # vlastnost s hodnotou-položkou -> české názvy
    return sparql(name, 'SELECT ?a2 ?l WHERE { ' + BASE + '?c p:%s ?s. ?s ps:%s ?v. ' % (prop, prop) + NOW + CS + '}')
def latest(name, prop):  # číselná vlastnost s datem -> nejnovější hodnota a rok
    rows = sparql(name, 'SELECT ?a2 ?val ?t WHERE { ' + BASE + '?c p:%s ?s. ?s ps:%s ?val. OPTIONAL { ?s pq:P585 ?t } ?s wikibase:rank ?rank FILTER(?rank != wikibase:DeprecatedRank) }' % (prop, prop))
    out = {}
    for r in rows:
        yr = int(r['t'][:4]) if r.get('t', '')[:4].isdigit() else 0  # neznámé datum je ve Wikidatech adresa, ne rok
        if r['a2'] not in out or yr > out[r['a2']][1]: out[r['a2']] = (float(r['val']), yr)
    return out
def multi(rows):
    out = {}
    for r in rows:
        if r['l'] not in out.setdefault(r['a2'], []): out[r['a2']].append(r['l'])
    return out

side = multi(labels('strana', 'P1622'))
top = {}
for r in sparql('vrchol', 'SELECT ?a2 ?l ?h WHERE { ' + BASE + '?c wdt:P610 ?v. ' + CS + 'OPTIONAL { ?v wdt:P2044 ?h } }'):
    h = float(r['h']) if r.get('h') else 0
    if r['a2'] not in top or h > top[r['a2']][1]: top[r['a2']] = (r['l'], h)
# měny, jazyky, předvolby a členství v OSN: github.com/mledoze/countries (ODbL), udržovaný seznam; Wikidata v nich mají zmatek
if not os.path.exists('geodata/stazene/countries.json'):
    os.makedirs('geodata/stazene', exist_ok=True)
    subprocess.run(['curl', '-sS', '-L', '-o', 'geodata/stazene/countries.json', 'https://raw.githubusercontent.com/mledoze/countries/master/countries.json'], check=True)
world = {c['cca2']: c for c in json.load(io.open('geodata/stazene/countries.json', encoding='utf-8'))}
# české názvy měn a jazyků podle mezinárodních kódů, jen pro kódy, které se v seznamu vyskytují
codes = lambda key: ' '.join('"%s"' % k for k in sorted({k for c in world.values() for k in c[key]}))
cur_cs = {r['code']: r['l'] for r in sparql('meny_cs', 'SELECT ?code ?l WHERE { VALUES ?code { ' + codes('currencies') + ' } ?v wdt:P498 ?code. ' + CS + '}')}
lang_cs = {r['code']: r['l'] for r in sparql('jazyky_cs', 'SELECT ?code ?l WHERE { VALUES ?code { ' + codes('languages') + ' } ?v wdt:P220 ?code. ' + CS + '}')}
lang_freq = {}
for c in world.values():
    for k in c['languages']: lang_freq[k] = lang_freq.get(k, 0) + 1
EU = set('AT BE BG HR CY CZ DK EE FI FR DE GR HU IE IT LV LT LU MT NL PL PT RO SK SI ES SE'.split())
NATO = set('AL BE BG CA HR CZ DK EE FI FR DE GR HU IS IT LV LT LU ME NL MK NO PL PT RO SK SI ES SE TR GB US'.split())  # stav od března 2024
assert len(EU) == 27 and len(NATO) == 32
TOPFIX = {'AU': ('Mount Kosciuszko', 2228), 'NL': ('Vaalserberg', 322)}  # Wikidata uvádějí vrchol na odlehlém ostrově (Heardův ostrov, Saba)
low = lambda t: t[0].lower() + t[1:] if t[1:2].islower() else t  # názvy měn a jazyků malým písmenem
def some(xs, n):  # nejvýš n položek, zbytek jen spočítat
    return xs if len(xs) <= n + 1 else xs[:n] + ['a %d další' % (len(xs) - n) + ('ch' if len(xs) - n > 4 else '')]
life, hdi, pop = latest('zivot', 'P2250'), latest('hdi', 'P1081'), latest('obyvatel', 'P1082')
# stejné přejmenování jako v mapa_1_staty.py, aby šlo párovat podle českého názvu
NAME = {'Čínská lidová republika': 'Čína', 'Spojené státy americké': 'Spojené státy americké (USA)', 'Konžská demokratická republika': 'Kongo (Kinshasa)', 'Konžská republika': 'Kongo (Brazzaville)',
        'Korejská lidově demokratická republika': 'Severní Korea', 'Korejská republika': 'Jižní Korea', 'Nizozemské království': 'Nizozemsko', 'Stát Palestina': 'Palestina',
        'Svazijsko': 'Svazijsko (Eswatini)', 'oblast Smlouvy o Antarktidě': 'Antarktida', 'Federativní státy Mikronésie': 'Mikronésie', 'Dánské království': 'Dánsko'}
by_name = {}
for r in base: by_name.setdefault(r['name'], r)                  # přesný název má přednost (Nizozemsko před Nizozemským královstvím)
for r in base: by_name.setdefault(NAME.get(r['name'], r['name']), r)

geo = json.load(io.open('../data/geo.json', encoding='utf-8'))
year = datetime.date.today().year
cut = lambda xs, n=4: xs[:n]
out, missing = [], []
for c in geo['c']:
    r = by_name.get(c[0])
    if not r:
        out.append(None)
        if c[3]: missing.append(c[0])
        continue
    a = r['a2']; o = {'q': r['c'].rsplit('/', 1)[1], 'a2': a}
    if a == 'NL': o.update(q='Q55'); r = dict(r, title='Nizozemsko'); pop.pop('NL', None)  # kód má ve Wikidatech jen celé království i s Karibikem
    if r.get('title'): o['w'] = r['title']
    w = world.get(a)
    if w:
        if w['translations'].get('ces', {}).get('official'): o['cele'] = w['translations']['ces']['official']
        cur = sorted(w['currencies'], key=lambda k: (not k.startswith(a), k))  # vlastní měna první
        cur = [low(cur_cs.get(k, w['currencies'][k]['name'])) for k in cur]
        if cur: o['mena'] = some(cur, 2)
        lg = ['ces'] if a == 'CZ' else list(w['languages'])  # zdroj u Česka uvádí i slovenštinu, úřední jazyk je jen čeština
        if len(lg) > 4: lg.sort(key=lambda k: (-lang_freq[k], k))  # u dlouhého seznamu nejrozšířenější jazyky první
        lg = list(dict.fromkeys(low({'gsw': 'němčina'}.get(k) or lang_cs[k]) for k in lg if k in lang_cs))
        if lg: o['jazyk'] = some(lg, 3)
        if w['tld']: o['tld'] = w['tld'][0]
        if w['idd'].get('root'): o['tel'] = w['idd']['root'] + (w['idd']['suffixes'][0] if len(w['idd']['suffixes']) == 1 else '')
        if w['landlocked']: o['bezmore'] = 1
        clen = [n for n, ok in [('OSN', w.get('unMember')), ('EU', a in EU), ('NATO', a in NATO)] if ok]
        if clen: o['clen'] = clen
        if w.get('independent') is False: o['zavisle'] = 1
    if a in side: o['jizda'] = side[a][0]
    t = TOPFIX.get(a) or top.get(a)
    if t and t[1]: o['vrchol'] = [t[0], round(t[1])]
    # staré údaje radši vynechat než ukazovat jako současné
    if a in life and life[a][1] >= year - 8: o['zivot'] = [round(life[a][0], 1), life[a][1]]
    if a in hdi and hdi[a][1] >= year - 8: o['hdi'] = [round(hdi[a][0], 3), hdi[a][1]]
    if a in pop and pop[a][1]: o['rok'] = pop[a][1]
    out.append(o)

json.dump(out, io.open('../data/staty.json', 'w', encoding='utf-8'), ensure_ascii=False, separators=(',', ':'))
print('států s údaji:', sum(1 for o in out if o), 'z', len(out), '| velikost:', os.path.getsize('../data/staty.json'), 'B')
print('obydlená území bez údajů:', missing)
for k in ['w', 'cele', 'mena', 'jazyk', 'jizda', 'tld', 'tel', 'vrchol', 'zivot', 'hdi', 'clen', 'bezmore', 'zavisle']: print(' ', k, sum(1 for o in out if o and k in o))
names = [c[0] for c in geo['c']]
cz = out[names.index('Česko')]
assert cz['a2'] == 'CZ' and cz['mena'] == ['koruna česká'] and cz['jazyk'] == ['čeština'] and cz['vrchol'][0] == 'Sněžka' and cz['clen'] == ['OSN', 'EU', 'NATO'] and cz['bezmore'], cz
assert out[names.index('Bulharsko')]['mena'] == ['euro'] and out[names.index('Nizozemsko')]['q'] == 'Q55'
for n in ['Česko', 'Zimbabwe', 'Spojené státy americké (USA)', 'Švýcarsko', 'Indie', 'Grónsko', 'Dánsko']: print(n, json.dumps(out[names.index(n)], ensure_ascii=False))
