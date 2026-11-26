# Sestavení dat mapy

Skripty, kterými vznikl soubor `data/geo.json`. Jsou tu tak, jak se použily, pro případ, že bude potřeba data přestavět nebo rozšířit. Běžný provoz aplikace je nepotřebuje.

Spouští se ze složky `nastroje/`, pracovní soubory si stahují do `nastroje/geodata/` (ta je kromě české cache názvů mimo git):

```
python mapa_1_staty.py 0.012     # státy, hranice jako sdílené úseky, řeky, jezera, vlajky -> geodata/geo.min.json a geodata/flags.png
python mapa_2_vrstvy.py          # regiony, města, pohoří, moře, vrcholy, české názvy -> geodata/geo.full.json
```

Výsledek se pak zkopíruje: `geodata/geo.full.json` do `data/geo.json` a `geodata/flags.png` do `tex/flags.png`.

Co je dobré vědět:

- První skript potřebuje `pillow` (skládá vlajky do jedné mřížky) a soubor `geodata/wikidata2.json` s údaji o státech. Ten vznikl dotazem na Wikidata, jehož znění je ve skriptu u funkce `sparql`. Pokud soubor chybí, je potřeba dotaz pustit znovu přes `curl`.
- Wikidata odmítají dotazy z Pythonu (odpověď 429), proto skripty volají `curl`.
- `geodata/labels_cs.json` je cache českých názvů pro 13 600 položek. Jejich stažení trvá asi čtvrt hodiny, proto je v repu.
- Zdroje: Natural Earth (přes world-atlas a GitHub `nvkelso/natural-earth-vector`), Wikidata, GeoNames `cities15000`, Twemoji.
