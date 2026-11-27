# Od Země ke hvězdám

Interaktivní 3D atlas Země a vesmíru. Začal jako model pro pětiletého kluka, který se hodně ptá, jak funguje den a noc, Měsíc a planety. Dnes je to encyklopedie pro děti i dospělé: podrobná mapa světa, údaje o státech, články z Wikipedie, kvízy a živá data.

## Co umí

- **Země a Měsíc**: den a noc podle skutečného času, fáze Měsíce, zatmění Slunce a Měsíce, vesmírná stanice. Roční období jsou vrstva přímo na Zemi: rovník, obratníky, polární kruhy a místo, kde je Slunce v nadhlavníku.
- **Vrstvy**: tlačítko ☰ zapíná a vypíná, co je vidět. Na mapě jména států, města, regiony, řeky, hory a moře, na Zemi oblačnost a roční období, na obloze čáry a jména souhvězdí, v soustavě dráhy.
- **Mapa světa**: zeměkoule s politickou a přírodní mapou (přírodní zblízka ze satelitních snímků Sentinel-2 se stínovaným reliéfem, přiblížení až na desítky metrů), 255 území z dat 1:10 milionů, hranice tisíců krajů a regionů, přes 25 000 měst, řeky, jezera, moře, zálivy, ostrovy, pohoří a vrcholy s výškou. Jmenovek je přes 30 000 a přibývají s přiblížením.
- **Encyklopedie**: karta státu s vlajkou, hlavním městem, počtem obyvatel a rozlohou včetně pořadí na světě, hustotou zalidnění, měnou, jazyky, nejvyšší horou, nadějí dožití, sousedy a srovnáním s Českem. Ke státům, městům, horám, řekám, planetám i souhvězdím se načítá úvod článku a obrázek z české Wikipedie.
- **Hledání**: lupa nebo klávesa `/` hledá ve 30 000 jménech (státy, města, hory, řeky, planety, měsíce, souhvězdí) a doletí na místo.
- **Tematické mapy**: státy obarvené podle počtu obyvatel, hustoty zalidnění, naděje dožití, indexu lidského rozvoje, strany, po které se jezdí, přístupu k moři a členství v EU a NATO.
- **Zeměpisný kvíz**: najdi stát na mapě, poznej stát podle tvaru, poznej vlajku, hlavní města. Celý svět nebo jeden světadíl, deset otázek na kolo.
- **Živá Země**: zemětřesení za posledních 30 dní z USGS a hranice tektonických desek. Rekordy Země, od Mount Everestu po Marianský příkop.
- **Vrstvy Země**: řez od jádra přes plášť a kůru po pět vrstev atmosféry, s hloubkami a výškami a kartou ke každé vrstvě.
- **Obloha**: hvězdná obloha nad Českem ve zvoleném čase, všech 88 souhvězdí s českými jmény, Slunce, Měsíc a planety.
- **Sluneční soustava**: planety na skutečných místech, jejich měsíce, kometa, pás asteroidů, skutečné velikosti vedle sebe, rychlost světla, hra „Najdi planetu“.
- **Mléčná dráha a vesmír**: kde v galaxii je Slunce a kolik galaxií je kolem.
- U každého tělesa je krátké povídání a panel s fakty, povídání umí přečíst nahlas.
- Čas běží od skutečného času po „1 s = 1 rok“, datum a hodiny jsou pro Česko.

Živě běží na **https://vesmir.pages.dev**.

## Nasazení

Cloudflare Pages, projekt `vesmir`, napojený přímo na tohle repo. Každý push do větve `main` se nasadí sám, ostatní větve dostanou náhledovou adresu. Nic se nesestavuje, nasazuje se obsah repa tak, jak je.

## Spuštění

Nic se nesestavuje. Prohlížeč ale stránku neotevře přímo ze souboru, potřebuje místní server:

```
python -m http.server 8000
```

a pak otevřít `http://localhost:8000`.

## Struktura

- `index.html`: kostra stránky, načítá vše ostatní.
- `css/app.css`: vzhled.
- `js/`: kód rozdělený podle témat (základ, hvězdy, Země, soustava, galaxie, mapa, průřez a obloha, aplikace, režimy, encyklopedie, kvíz, ovládání, vrstvy, smyčka). Soubory sdílejí jeden prostor jmen a načítají se v pořadí podle čísla.
- `data/sky.js`: katalog hvězd a souhvězdí, načítá se hned.
- `data/geo.json`: data mapy světa (4 MB), stahují se až při prvním otevření mapy nebo hledání. Spolu s nimi `data/staty.json` (údaje o státech).
- `data/desky.json`: hranice tektonických desek, stahují se se zemětřesením.
- `tex/`: textury a vlajky.
- `testy/test.mjs`: automatický test.
- `nastroje/`: skripty, kterými vznikla data mapy, států (`staty_encyklopedie.py`) a desek (`desky.py`).

## Testy

```
node testy/test.mjs
```

Spustí aplikaci v headless Chromu, projde všechny pohledy a režimy na počítači i v rozměru telefonu a hlídá chyby v konzoli. Nepotřebuje žádné balíčky, jen Node 22+ a Chrome (cesta jde změnit proměnnou `CHROME`). S přepínačem `--snimky` uloží obrázky do `testy/snimky/`.

## Ovládání

- Tažení otáčí, kolečko nebo dva prsty přibližují, pravé tlačítko myši nebo dva prsty posouvají.
- Přiblížení a oddálení na doraz přelétá mezi světy (Země, soustava, galaxie, vesmír).
- Klávesy `+` a `−` zoomují, `H` schová ovládání, `/` otevře hledání.
- Ozubené kolečko: datum a čas, volitelné výchozí místo (uloží se jen v prohlížeči), schování ovládání a zdroje.

## Zjednodušení

Údaje o státech pocházejí z otevřených databází a mohou být několik let staré, u naděje dožití a indexu lidského rozvoje je rok uveden. Vzdálenosti a velikosti ve vesmíru nejsou v měřítku (kromě režimu Skutečné velikosti). Planety obíhají po kružnicích podle střední polohy, takže poloha odpovídá skutečnosti jen přibližně. Povrchy Pluta a měsíců planet jsou kreslené, ne fotografické.

## Zdroje

- Textury planet, Měsíce, Slunce a mraků: [Solar System Scope](https://www.solarsystemscope.com/textures/), licence CC BY 4.0.
- Data zatmění 2027–2030: NASA, Fred Espenak, Eclipses 2021–2030.
- Hvězdy a čáry souhvězdí: [d3-celestial](https://github.com/ofrohn/d3-celestial), licence BSD-3-Clause.
- Hranice států, řeky a jezera: [Natural Earth](https://www.naturalearthdata.com/) přes world-atlas, volné dílo. Údaje o státech: [Wikidata](https://www.wikidata.org/), CC0. Vlajky: [Twemoji](https://github.com/twitter/twemoji), CC BY 4.0.
- Menší města: [GeoNames](https://www.geonames.org/), CC BY 4.0.
- Měny, jazyky, předvolby a domény států: [mledoze/countries](https://github.com/mledoze/countries), ODbL. Naděje dožití, index lidského rozvoje, nejvyšší hory a české názvy: Wikidata.
- Úvody článků a obrázky: [česká Wikipedie](https://cs.wikipedia.org/), CC BY-SA, načítají se za běhu a odkazují na celý článek.
- Satelitní snímky: [EOxCloudless](https://cloudless.eox.at) od EOX IT Services GmbH (obsahuje upravená data Copernicus Sentinel 2024), CC BY-NC-SA 4.0. Výškový model pro stínování: [Mapzen Terrain Tiles](https://github.com/tilezen/joerd/blob/master/docs/attribution.md) z AWS Open Data. Obojí se stahuje za běhu.
- Zemětřesení: [USGS](https://earthquake.usgs.gov/), volné dílo, načítají se za běhu. Hranice desek: Peter Bird (2003), převod [Hugo Ahlenius](https://github.com/fraxen/tectonicplates), ODC-BY.
- 3D knihovna: [three.js](https://threejs.org/) r128, licence MIT.
