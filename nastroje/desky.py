# Hranice tektonických desek -> data/desky.json. Zdroj: Peter Bird (2003), převod Hugo Ahlenius, github.com/fraxen/tectonicplates (ODC-BY).
# Spouští se ze složky nastroje/: python desky.py. Čáry jsou uložené stejně jako v geo.json: rozdíly souřadnic v tisícinách stupně.
import io, json, os, subprocess
src = 'geodata/stazene/desky.json'
if not os.path.exists(src):
    os.makedirs('geodata/stazene', exist_ok=True)
    subprocess.run(['curl', '-sS', '-L', '-o', src, 'https://raw.githubusercontent.com/fraxen/tectonicplates/master/GeoJSON/PB2002_boundaries.json'], check=True)
out = []
for f in json.load(io.open(src, encoding='utf-8'))['features']:
    line, px, py = [], 0, 0
    for lon, lat in f['geometry']['coordinates']:
        x, y = round(lon * 1000), round(lat * 1000); line += [x - px, y - py]; px, py = x, y
    out.append(line)
json.dump(out, io.open('../data/desky.json', 'w', encoding='utf-8'), separators=(',', ':'))
print(len(out), 'čar,', os.path.getsize('../data/desky.json'), 'B')
