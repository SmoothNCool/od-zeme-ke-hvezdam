# Sopky aktivní za posledních asi 12 000 let -> data/sopky.json. Zdroj: Smithsonian Institution, Global Volcanism Program, Volcanoes of the World (VOTW).
# Spouští se ze složky nastroje/: python sopky.py. Výsledek: [jméno, šířka, délka, výška m, typ česky, rok poslední erupce nebo null]
import io, json, os, subprocess
src = 'geodata/stazene/sopky.json'
if not os.path.exists(src):
    os.makedirs('geodata/stazene', exist_ok=True)
    subprocess.run(['curl', '-sS', '-o', src, 'https://webservices.volcano.si.edu/geoserver/GVP-VOTW/ows?service=WFS&version=2.0.0&request=GetFeature'
                    '&typeName=GVP-VOTW:Smithsonian_VOTW_Holocene_Volcanoes&outputFormat=application%2Fjson'], check=True)
TYPE = {'Stratovolcano': 'stratovulkán', 'Volcanic field': 'vulkanické pole', 'Shield': 'štítová sopka', 'Caldera': 'kaldera', 'Complex': 'složená sopka', 'Compound': 'složená sopka',
        'Fissure vent': 'puklinová sopka', 'Pyroclastic cone': 'sypaný kužel', 'Lava dome': 'lávový dóm', 'Maar': 'maar', 'Crater rows': 'řada kráterů', 'Tuff cone': 'tufový kužel',
        'Tuff ring': 'tufový prstenec', 'Cone': 'sopečný kužel', 'Lava cone': 'lávový kužel', 'Explosion crater': 'explozivní kráter'}
NAME = {'Vesuvius': 'Vesuv', 'Fujisan': 'Fudži', 'St. Helens': 'Mount St. Helens', 'Popocatepetl': 'Popocatépetl', 'Eyjafjallajokull': 'Eyjafjallajökull', 'Kilauea': 'Kīlauea', 'Erebus': 'Erebus'}
def cz(t):
    t = (t or '').replace('(es)', '').replace('(s)', '').replace('?', '').split('(')[0].strip()
    return TYPE.get(t, 'sopka')
out = []
for f in json.load(io.open(src, encoding='utf-8'))['features']:
    p = f['properties']; lon, lat = f['geometry']['coordinates'][:2]
    out.append([NAME.get(p['Volcano_Name'], p['Volcano_Name']), round(lat, 3), round(lon, 3), p['Elevation'], cz(p['Primary_Volcano_Type']), p['Last_Eruption_Year']])
out.sort(key=lambda r: -(r[5] if r[5] is not None else -99999))  # nejdřív ty, které soptily naposledy
json.dump(out, io.open('../data/sopky.json', 'w', encoding='utf-8'), ensure_ascii=False, separators=(',', ':'))
print(len(out), 'sopek,', os.path.getsize('../data/sopky.json'), 'B; soptily od roku 2000:', sum(1 for r in out if r[5] and r[5] >= 2000))
assert any(r[0] == 'Etna' and r[4] == 'stratovulkán' for r in out) and all(-90 <= r[1] <= 90 for r in out)
