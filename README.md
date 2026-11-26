# Od Země ke hvězdám

Interaktivní 3D model vesmíru pro děti. Vznikl pro pětiletého kluka, který se hodně ptá, jak funguje den a noc, Měsíc a planety.

## Co umí

- **Země a Měsíc**: den a noc podle skutečného času, fáze Měsíce, zatmění Slunce a Měsíce, roční období, vesmírná stanice.
- **Mapa světa**: zeměkoule s politickou a přírodní mapou, 255 území z dat 1:10 milionů, hranice tisíců krajů a regionů, přes 25 000 měst, řeky, jezera, moře, zálivy, ostrovy, pohoří a vrcholy s výškou. Jmenovek je přes 30 000 a přibývají s přiblížením. Po ťuknutí na stát název, hlavní město, světadíl, počet obyvatel a vlajka.
- **Uvnitř Země**: průřez zeměkoulí s kůrou, pláštěm a jádrem.
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
- `js/`: kód rozdělený podle témat (základ, hvězdy, Země, soustava, galaxie, mapa, průřez a obloha, aplikace, režimy, ovládání, smyčka). Soubory sdílejí jeden prostor jmen a načítají se v pořadí podle čísla.
- `data/sky.js`: katalog hvězd a souhvězdí, načítá se hned.
- `data/geo.json`: data mapy světa (4 MB), stahují se až při prvním otevření mapy.
- `tex/`: textury a vlajky.

## Ovládání

- Tažení otáčí, kolečko nebo dva prsty přibližují, pravé tlačítko myši nebo dva prsty posouvají.
- Přiblížení a oddálení na doraz přelétá mezi světy (Země, soustava, galaxie, vesmír).
- Klávesy `+` a `−` zoomují, `H` schová ovládání.

## Zjednodušení

Vzdálenosti a velikosti nejsou v měřítku (kromě režimu Skutečné velikosti). Planety obíhají po kružnicích podle střední polohy, takže poloha odpovídá skutečnosti jen přibližně. Povrchy Pluta a měsíců planet jsou kreslené, ne fotografické.

## Zdroje

- Textury planet, Měsíce, Slunce a mraků: [Solar System Scope](https://www.solarsystemscope.com/textures/), licence CC BY 4.0.
- Data zatmění 2027–2030: NASA, Fred Espenak, Eclipses 2021–2030.
- Hvězdy a čáry souhvězdí: [d3-celestial](https://github.com/ofrohn/d3-celestial), licence BSD-3-Clause.
- Hranice států, řeky a jezera: [Natural Earth](https://www.naturalearthdata.com/) přes world-atlas, volné dílo. Údaje o státech: [Wikidata](https://www.wikidata.org/), CC0. Vlajky: [Twemoji](https://github.com/twitter/twemoji), CC BY 4.0.
- Menší města: [GeoNames](https://www.geonames.org/), CC BY 4.0.
- 3D knihovna: [three.js](https://threejs.org/) r128, licence MIT.
