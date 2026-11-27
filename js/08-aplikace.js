// Zastávky, texty a fakta, karta, přelety mezi světy. Soubory v js/ sdílejí jeden prostor jmen a načítají se v pořadí podle čísla.
/* ---------- zastávky; anchor = místo ve scéně, odkud jsme přiletěli z menšího světa ---------- */
const LV = [
  { id: 'zeme', ico: '🌍', name: 'Den a noc', group: gE, cam: [1.3, 1.1, 4.4], min: 1.6, max: 14, def: 2, anchor: gE,
    txt: 'Země se otočí kolem své osy jednou za 24 hodin. Na straně přivrácené ke Slunci je den, na odvrácené noc. Hranice světla a stínu přejde přes Česko dvakrát denně, při východu a při západu Slunce. Červená tečka ukazuje místo, pro které se den a noc počítá. Bez nastavení je to střed Česka.',
    note: 'Bílá čára je zemská osa. Je nakloněná o 23,4°, proto se během roku mění délka dne. Kolem Země obíhá Mezinárodní vesmírná stanice, jeden oblet jí trvá asi 92 minut.' },
  { id: 'mesic', ico: '🌙', name: 'Země a Měsíc', tab: 'Měsíc', group: gE, cam: [0, 7, 15], min: 1.6, max: 30, def: 2, anchor: gE,
    txt: 'Měsíc oběhne Zemi jednou za 27 dní. Sám nesvítí, jen odráží sluneční světlo. Podle toho, z jakého úhlu se díváme na jeho osvětlenou polovinu, vidíme nov, srpek, čtvrť nebo úplněk.',
    note: 'Pomůcka: vypadá jako D, dorůstá. Vypadá jako C, couvá. V modelu je Měsíc blíž, než odpovídá měřítku. Ve skutečnosti by se mezi něj a Zemi vešlo třicet Zemí vedle sebe.' },
  { id: 'rok', ico: '🍂', name: 'Roční období', hidden: true, group: gY, cam: [0, 20, 42], min: 6, max: 90, def: 6, anchor: yHolder,
    txt: 'Země oběhne Slunce za jeden rok. Její osa je nakloněná a míří pořád stejným směrem. Když je severní polokoule přikloněná ke Slunci, dopadá na ni světlo strměji a déle a máme léto. O půl roku později je odkloněná a je zima.',
    note: 'Roční období nezpůsobuje vzdálenost od Slunce. Země je mu nejblíž začátkem ledna, kdy je u nás zima. Při rychlém čase model otáčení Země přibrzdí, jinak by z ní byla jen šmouha.' },
  { id: 'rez', ico: '🌍', name: 'Vrstvy Země', group: gC, cam: [0, 0, 14], min: 1.5, max: 40, def: 0, anchor: gC,
    txt: 'Řez Zemí od středu až na okraj atmosféry. Uprostřed je jádro ze železa a niklu, vnitřní pevné a vnější tekuté. Nad ním je horký plášť, který se pomalu přelévá a hýbe kontinenty, a tenká kůra, po které chodíme. Nad povrchem je pět vrstev atmosféry. Ťukni na vrstvu a dozvíš se víc.',
    note: 'Výseč není v měřítku. Kůra a atmosféra by ve skutečném poměru nebyly vidět, proto jsou roztažené. Skutečné hloubky a výšky jsou na jmenovkách. Tažením se posouváš, kolečkem přibližuješ. Tak hluboko se nikdo nedostal, nejhlubší vrt měří 12 km. O nitru víme hlavně z toho, jak jím procházejí vlny zemětřesení.' },
  { id: 'mapa', ico: '🌍', name: 'Mapa světa', group: gM, cam: latLon(47, 15).multiplyScalar(3.1).toArray(), min: 1.02, max: 9, def: 1, anchor: gM,
    txt: 'Podrobná mapa světa na zeměkouli. Ťukni na stát, město, horu nebo moře a otevře se karta s údaji a článkem z Wikipedie. Státy jdou obarvit podle počtu obyvatel, naděje dožití a dalších údajů. Zeměpis si vyzkoušíš v kvízu.',
    note: 'Čím víc se přiblížíš, tím víc jmen se objeví. Velké bílé tečky jsou hlavní města, čárkované čáry uvnitř států hranice krajů a regionů, modré čáry řeky. Lupa vpravo hledá ve 30 000 jménech. Přírodní mapa jde přiblížit až na desítky metrů, satelitní snímky a stínovaný reliéf se stahují po kouscích.' },
  { id: 'obloha', ico: '🌍', name: 'Obloha', group: gO, cam: [0, -.031, -.095], min: .1, max: .1, def: 2, anchor: gO, noChain: true,
    txt: 'Obloha nad Českem v čase, který si nastavíš. Hvězdy jsou na ní i ve dne, jen je přesvítí Slunce. Během noci se obloha otáčí kolem Polárky, protože se otáčí Země. A během roku se mění, protože noční strana Země míří při oběhu kolem Slunce pokaždé jinam.',
    note: 'Tažením se rozhlížíš, kolečkem přibližuješ. Zkus čas 1 s = 1 den a sleduj, jak se noční obloha za rok promění. Ťukni na souhvězdí a dozvíš se, kdy je vidět.' },
  { id: 'soustava', ico: '☀️', name: 'Sluneční soustava', group: gS, cam: [0, 40, 66], min: 3, max: 240, def: 4, anchor: planets[2].holder,
    txt: 'Kolem Slunce obíhá osm planet, trpasličí planety, komety a pás asteroidů. Pluto se od roku 2006 řadí mezi trpasličí planety, proto má čárkovanou dráhu. Ťukni na planetu nebo měsíc a přiletíme k nim.',
    note: 'Vzdálenosti a velikosti nejsou v měřítku, jinak by planety nebyly vidět. Polohy planet odpovídají nastavenému datu, dráhy mají skutečný sklon a tvar. Při rychlém čase model otáčení planet přibrzdí, aby nebyly rozmazané.' },
  { id: 'galaxie', ico: '🌌', name: 'Mléčná dráha', group: gG, cam: [0, 48, 78], min: 15, max: 200, def: 0, anchor: ourSun,
    txt: 'Slunce je jedna ze stovek miliard hvězd Mléčné dráhy. Je to spirální galaxie s příčkou. Slunce obíhá kolem jejího středu a jeden oběh mu trvá 230 milionů let.',
    note: 'Zvenku ji nikdo nevyfotil, žijeme uvnitř. Model ukazuje, jak si ji astronomové složili z měření.' },
  { id: 'vesmir', ico: '✨', name: 'Vesmír', group: gU, cam: [0, 50, 330], min: 40, max: 700, def: 0, anchor: ourGalaxy,
    txt: 'Každý obláček je celá galaxie s miliardami hvězd. V pozorovatelném vesmíru jich jsou stovky miliard. Vesmír se rozpíná, vzdálené galaxie se od nás vzdalují.',
    note: 'Naše galaxie je jedna z nich. Rozmístění galaxií je v modelu jen ilustrační.' },
];
// fakta do informačního panelu; „autem“ = nepřetržitě stovkou, k planetám v době, kdy jsou Zemi nejblíž; „sondou“ = jak dlouho letěla skutečná sonda
const FACTS = {
  mapa: [['Států na světě', 'skoro 200'], ['Světadílů', '7'], ['Oceánů', '5'], ['Největší stát', 'Rusko'], ['Nejvíc lidí', 'Indie a Čína'], ['Nejdelší řeky', 'Nil a Amazonka, kolem 6 500 km'], ['Nejvyšší hora', 'Mount Everest, 8 849 m'], ['Největší horká poušť', 'Sahara']],
  rez: [['Poloměr Země', '6 371 km'], ['Hranice vesmíru', '100 km nad zemí'], ['Kůra', '5 až 70 km, pevný kámen'], ['Plášť', '2 900 km, horký kámen'], ['Vnější jádro', '2 200 km, tekuté železo'], ['Vnitřní jádro', 'koule 1 220 km, pevné železo'], ['Nejhlubší vrt', '12 km']],
  obloha: [['Souhvězdí na celé obloze', '88'], ['Hvězd vidět očima', 'asi 3 000 najednou'], ['Nejjasnější hvězda noci', 'Sirius'], ['Nejbližší hvězda po Slunci', 'Proxima Centauri, 4,2 světelného roku'], ['Polárka', 'ukazuje sever'], ['Planety poznáš', 'neblikají']],
  zeme: [['Průměr Země', '12 742 km'], ['Jedno otočení', '24 hodin'], ['Rychlost na rovníku', '1 670 km/h'], ['Průměrná teplota', '15 °C'], ['Vesmírná stanice letí', '400 km nad zemí, 28 000 km/h'], ['Osa míří', 'k hvězdě Polárce']],
  mesic: [['Průměr Měsíce', '3 474 km'], ['Daleko od Země', '384 400 km'], ['Jeden oběh', '27 dní'], ['Od úplňku k úplňku', '29 a půl dne'], ['Teplota', '−170 až 120 °C'], ['Autem', '160 dní'], ['Raketou (Apollo)', '3 dny'], ['Lidí, kteří tam chodili', '12']],
  rok: [['Jeden oběh', '365 dní a 6 hodin'], ['Rychlost Země', '107 000 km/h'], ['Délka dráhy', '940 milionů km'], ['Sklon osy', '23,4°'], ['Daleko od Slunce', '150 milionů km'], ['Na jižní polokouli', 'roční období obráceně']],
  soustava: [['Stáří', '4,6 miliardy let'], ['Planet', '8'], ['Trpasličích planet', '5 uznaných, Pluto je jedna z nich'], ['Největší planeta', 'Jupiter'], ['Nejmenší planeta', 'Merkur'], ['Nejteplejší planeta', 'Venuše']],
  galaxie: [['Průměr', '100 000 světelných let'], ['Hvězd', '100 až 400 miliard'], ['Slunce od středu', '26 000 světelných let'], ['Jeden oběh Slunce', '230 milionů let'], ['Světelný rok', 'vzdálenost, kterou světlo uletí za rok'], ['Uprostřed', 'obří černá díra']],
  vesmir: [['Stáří', '13,8 miliardy let'], ['Galaxií', 'stovky miliard, možná i 2 biliony'], ['Nejbližší velká galaxie', 'Andromeda'], ['Daleko k Andromedě', '2,5 milionu světelných let'], ['Vesmír', 'se pořád rozpíná']],
  Slunce: [['Průměr', '1 392 000 km (109 Zemí vedle sebe)'], ['Teplota povrchu', '5 500 °C'], ['Teplota uprostřed', '15 milionů °C'], ['Stáří', '4,6 miliardy let'], ['Daleko od Země', '150 milionů km'], ['Světlo k nám letí', '8 minut'], ['Autem', '171 let'], ['Sondou (Parker)', '3 měsíce']],
  Merkur: [['Průměr', '4 879 km'], ['Daleko od Slunce', '58 milionů km'], ['Jedno otočení', '59 dní'], ['Rok', '88 dní'], ['Teplota', '−180 až 430 °C'], ['Měsíců', '0'], ['Autem', '88 let'], ['Sondou (Messenger)', '6 a půl roku']],
  'Venuše': [['Průměr', '12 104 km'], ['Daleko od Slunce', '108 milionů km'], ['Jedno otočení', '243 dní, pozpátku'], ['Rok', '225 dní'], ['Teplota', '465 °C'], ['Měsíců', '0'], ['Autem', '43 let'], ['Sondou', 'asi 4 měsíce']],
  'Země': [['Průměr', '12 742 km'], ['Daleko od Slunce', '150 milionů km'], ['Jedno otočení', '24 hodin'], ['Rok', '365 dní'], ['Průměrná teplota', '15 °C'], ['Měsíců', '1']],
  Mars: [['Průměr', '6 779 km'], ['Daleko od Slunce', '228 milionů km'], ['Jedno otočení', '24 hodin 37 minut'], ['Rok', '687 dní'], ['Průměrná teplota', '−63 °C'], ['Měsíců', '2'], ['Autem', '63 let'], ['Sondou', 'asi 7 měsíců']],
  Jupiter: [['Průměr', '139 820 km (11 Zemí vedle sebe)'], ['Daleko od Slunce', '778 milionů km'], ['Jedno otočení', 'necelých 10 hodin'], ['Rok', '12 našich let'], ['Teplota v mracích', '−110 °C'], ['Měsíců', 'přes 110'], ['Autem', '670 let'], ['Sondou (Juno)', '5 let']],
  Saturn: [['Průměr', '116 460 km (9 Zemí vedle sebe)'], ['Daleko od Slunce', '1,4 miliardy km'], ['Jedno otočení', 'necelých 11 hodin'], ['Rok', '29 našich let'], ['Teplota v mracích', '−140 °C'], ['Měsíců', 'skoro 300'], ['Autem', '1 400 let'], ['Sondou (Cassini)', '7 let']],
  Uran: [['Průměr', '50 724 km (4 Země vedle sebe)'], ['Daleko od Slunce', '2,9 miliardy km'], ['Jedno otočení', '17 hodin, pozpátku'], ['Rok', '84 našich let'], ['Teplota v mracích', '−195 °C'], ['Měsíců', 'skoro 30'], ['Autem', '3 000 let'], ['Sondou (Voyager 2)', '8 a půl roku']],
  Neptun: [['Průměr', '49 244 km (skoro 4 Země vedle sebe)'], ['Daleko od Slunce', '4,5 miliardy km'], ['Jedno otočení', '16 hodin'], ['Rok', '165 našich let'], ['Teplota v mracích', '−200 °C'], ['Měsíců', '16'], ['Autem', '4 900 let'], ['Sondou (Voyager 2)', '12 let']],
  Pluto: [['Co to je', 'trpasličí planeta'], ['Planetou bylo', 'do roku 2006'], ['Průměr', '2 377 km'], ['Daleko od Slunce', '5,9 miliardy km'], ['Jedno otočení', '6 dní, pozpátku'], ['Rok', '248 našich let'], ['Teplota', '−230 °C'], ['Měsíců', '5'], ['Autem', '4 900 let'], ['Sondou (New Horizons)', '9 a půl roku']],
  Kometa: [['Jádro', 'jen pár kilometrů'], ['Ohon', 'i miliony kilometrů'], ['Z čeho je', 'led, prach a kamení'], ['Nejznámější', 'Halleyova, vrací se za 76 let']],
};
[SUN, comet, ...planets].forEach(o => o.facts = FACTS[o.name]);
LV.forEach(l => l.facts = FACTS[l.id]);
planets.forEach(p => p.facts.push(['Sklon dráhy', p.inc ? String(p.inc).replace('.', ',') + '°' : '0°, podle Země se měří']));
// prvky, ke kterým se nelétá, ale po ťuknutí na jmenovku ukážou kartu
const INFO = {
  Kura: { name: 'Zemská kůra', txt: 'Tenká pevná slupka, po které chodíme. Jsou na ní hory, moře i města. V poměru k Zemi je tenčí než slupka na jablku.', note: '', facts: [['Tloušťka', '5 až 70 km'], ['Z čeho je', 'pevný kámen'], ['Pod mořem', 'je nejtenčí']] },
  Plast: { name: 'Zemský plášť', txt: 'Nejtlustší vrstva. Je to horký kámen, který se pomaličku hýbe jako hodně hustý med. Kvůli tomu se posouvají světadíly a soptí sopky.', note: '', facts: [['Tloušťka', '2 900 km'], ['Teplota', '1 000 až 3 700 °C']] },
  Jadro2: { name: 'Vnější jádro', txt: 'Roztavené železo a nikl. Jak se přelévá, dělá ze Země obrovský magnet. Díky tomu funguje kompas.', note: '', facts: [['Tloušťka', '2 200 km'], ['Teplota', '4 000 až 5 000 °C'], ['Skupenství', 'tekuté']] },
  Jadro1: { name: 'Vnitřní jádro', txt: 'Koule ze železa uprostřed Země. Je horká jako povrch Slunce, ale tlačí na ni tolik kamení, že zůstává pevná.', note: '', facts: [['Poloměr', '1 220 km'], ['Teplota', 'asi 5 400 °C'], ['Skupenství', 'pevné']] },
  ISS: { name: 'Vesmírná stanice ISS', txt: 'Laboratoř na oběžné dráze a největší stavba, jakou lidé ve vesmíru postavili. Posádka v ní žije ve stavu beztíže, spí ve spacácích přivázaných ke stěně a jídlo se jí vznáší.', note: 'V modelu letí dál od Země, než doopravdy je, jinak by nebyla vidět.',
    facts: [['Výška nad zemí', '400 km'], ['Rychlost', '28 000 km/h'], ['Jeden oblet Země', '92 minut'], ['Délka', '109 m, jako fotbalové hřiště'], ['Posádka', 'obvykle 7 lidí'], ['Lidé tam žijí', 'bez přestávky od roku 2000']] },
  Mesic: { name: 'Měsíc', txt: 'Náš nejbližší soused ve vesmíru. Je to velká kamenná koule plná kráterů. Vzduch tam není a voda jen jako led ukrytý v kráterech u pólů.', note: 'K Zemi je otočený pořád stejnou stranou.', facts: FACTS.mesic },
  Doma: { name: 'Výchozí místo', txt: 'Červená tečka je místo, pro které se počítá den a noc i obloha. Když je na osvětlené straně Země, je tam den. Když se Země otočí a tečka zajede do stínu, je tam noc.', note: 'Místo si vybereš v nastavení (ozubené kolečko vpravo). Bez nastavení je to střed Česka.', facts: [] },
  Pas: { name: 'Pás asteroidů', txt: 'Spousta kamenů a balvanů, které obíhají kolem Slunce mezi Marsem a Jupiterem. Jsou to zbytky ze stavby planet.', note: 'V modelu jsou kameny hodně zvětšené. Ve skutečnosti jsou od sebe tak daleko, že mezi nimi sondy proletí bez úhony.',
    facts: [['Kde je', 'mezi Marsem a Jupiterem'], ['Těles větších než 1 km', 'přes milion'], ['Největší', 'Ceres, 940 km'], ['Všechny dohromady', 'váží míň než Měsíc']] },
  Phobos: { name: 'Phobos', txt: 'Větší z dvou měsíců Marsu. Vypadá jako hrbolatá brambora.', note: '', facts: [['Průměr', '22 km'], ['Jeden oběh', 'necelých 8 hodin'], ['Zvláštnost', 'obíhá rychleji, než se Mars otáčí']] },
  Deimos: { name: 'Deimos', txt: 'Menší měsíc Marsu. Je tak malý, že by se na něm dalo oběhnout dokola za jedno odpoledne.', note: '', facts: [['Průměr', '12 km'], ['Jeden oběh', '30 hodin']] },
  Io: { name: 'Io', txt: 'Měsíc plný sopek. Pořád z něj něco soptí, proto je žlutý a oranžový od síry.', note: '', facts: [['Průměr', '3 643 km'], ['Jeden oběh', 'necelé 2 dny'], ['Sopek', 'přes 400 činných, nejvíc v celé soustavě']] },
  Europa: { name: 'Europa', txt: 'Měsíc pokrytý ledem. Pod ledem je oceán, ve kterém je víc vody než ve všech mořích na Zemi.', note: '', facts: [['Průměr', '3 122 km'], ['Jeden oběh', '3 a půl dne'], ['Povrch', 'popraskaný led']] },
  Ganymed: { name: 'Ganymed', txt: 'Největší měsíc v celé sluneční soustavě. Je větší než planeta Merkur.', note: '', facts: [['Průměr', '5 268 km'], ['Jeden oběh', '7 dní']] },
  Callisto: { name: 'Callisto', txt: 'Tmavý měsíc posetý krátery. Má jich nejvíc ze všech těles, která známe.', note: '', facts: [['Průměr', '4 821 km'], ['Jeden oběh', 'necelých 17 dní']] },
  Titan: { name: 'Titan', txt: 'Jediný měsíc, který má hustý vzduch. Jsou na něm jezera a řeky, ale místo vody v nich teče tekutý plyn.', note: '', facts: [['Průměr', '5 150 km'], ['Jeden oběh', '16 dní'], ['Teplota', '−180 °C'], ['Přistála tam', 'sonda Huygens v roce 2005']] },
  Titania: { name: 'Titania', txt: 'Největší měsíc Uranu. Je z ledu a kamení a má dlouhé kaňony.', note: '', facts: [['Průměr', '1 577 km'], ['Jeden oběh', 'necelých 9 dní']] },
  Triton: { name: 'Triton', txt: 'Největší měsíc Neptunu. Obíhá pozpátku a stříkají na něm gejzíry.', note: '', facts: [['Průměr', '2 707 km'], ['Jeden oběh', 'necelých 6 dní, pozpátku'], ['Teplota', '−235 °C']] },
  Charon: { name: 'Charon', txt: 'Největší měsíc Pluta. Je skoro poloviční než Pluto samo, takže kolem sebe krouží jako dva tanečníci.', note: '', facts: [['Průměr', '1 212 km'], ['Jeden oběh', '6 dní']] },
  'Polárka': { name: 'Polárka', txt: 'Hvězda, ke které míří zemská osa. Proto na obloze stojí na místě a ostatní hvězdy krouží kolem ní. Ukazuje, kde je sever.', note: '', facts: [['Souhvězdí', 'Malý medvěd'], ['Daleko', 'asi 430 světelných let']] },
  'Velký vůz': { name: 'Velký vůz', txt: 'Sedm jasných hvězd ve tvaru vozu s ojí. Je to část souhvězdí Velká medvědice. Když protáhneš zadní stranu vozu pětkrát dál, najdeš Polárku.', note: '', facts: [['Hvězd', '7'], ['Kdy je vidět', 'u nás celý rok']] },
  Orion: { name: 'Orion', txt: 'Souhvězdí lovce. Poznáš ho podle tří hvězd v řadě, to je Orionův pás.', note: '', facts: [['Nejjasnější hvězdy', 'Rigel a Betelgeuse'], ['Kdy je vidět', 'u nás v zimě']] },
  Kasiopeja: { name: 'Kasiopeja', txt: 'Pět hvězd ve tvaru písmene W. Leží naproti Velkému vozu, na druhé straně od Polárky.', note: '', facts: [['Hvězd', '5'], ['Kdy je vidět', 'u nás celý rok']] },
  NaseSlunce: { name: 'Naše Slunce', txt: 'Tady někde je Slunce a s ním celá sluneční soustava. Z téhle dálky by nebylo vidět, je to jedna obyčejná hvězda mezi miliardami.', note: '', facts: FACTS.galaxie },
  NaseGalaxie: { name: 'Naše galaxie', txt: 'Tohle je Mléčná dráha, galaxie, ve které bydlíme. Zvenku vypadá stejně jako spousta jiných.', note: '', facts: FACTS.vesmir },
};
// měsíc se chová jako planeta: jde k němu přiletět a točit se kolem něj
planets.forEach(p => p.moons.forEach(m => Object.assign(m, INFO[m.name === 'Měsíc' ? 'Mesic' : m.name], { holder: m.mesh, moons: [], parent: p })));
const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
let L = LV[0], focus = null, zoomTo = 0, flyTo = null, tr = null, playing = !reduced, simT = 0, simMs = Date.now(), days = 0; // model startuje ve skutečném dnešním okamžiku
let ecl = null, sizes = false, sz = 0, game = null, light = null, readText = '', recenter = false, info = null;
// rychlost času: kolik vteřin modelu uběhne za jednu skutečnou
const RATES = [1, 60, 600, 3600, 21600, 86400, 604800, 2629800, 31557600];
const RATE_NAMES = ['skutečný čas', '1 s = 1 minuta', '1 s = 10 minut', '1 s = 1 hodina', '1 s = 6 hodin', '1 s = 1 den', '1 s = 1 týden', '1 s = 1 měsíc', '1 s = 1 rok'];
const Y0 = Date.UTC(2026, 0, 1), J2000 = Date.UTC(2000, 0, 1, 12), SYN = 29.530588853 * 864e5, NEW0 = Date.UTC(2000, 0, 6, 18, 14); // NEW0 = známý nov
const moonPhi = ms => ((ms - NEW0) / SYN % 1 + 1) % 1 * TAU; // 0 = nov, π = úplněk
console.assert(Math.abs(moonPhi(Date.UTC(2026, 10, 24, 14, 53)) - Math.PI) < .2, 'moonPhi: úplněk 24. 11. 2026');
const czFmt = o => new Intl.DateTimeFormat('cs-CZ', { timeZone: 'Europe/Prague', ...o });
const fmtDT = czFmt({ weekday: 'long', day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' }), fmtD = czFmt({ day: 'numeric', month: 'long', year: 'numeric' }), fmtM = czFmt({ month: 'long' });
let clockText = '', rateText = '';

function preset() {
  const k = Math.max(1, Math.min(2.2, 1 / camera.aspect)); // na výšku postavený mobil potřebuje odstup
  return V(...L.cam).multiplyScalar(k);
}
function card(o) { $('#ttl').textContent = o.name; $('#txt').textContent = o.txt; $('#note').textContent = o.note; readText = o.say || o.txt + ' ' + o.note;
  $('#facts').classList.remove('all'); $('#factsMore').hidden = (o.facts || []).length <= 6; // na telefonu nejdřív jen šest údajů
  $('#facts').replaceChildren(...(o.facts || []).map(([k, val]) => { const d = document.createElement('div'), dt = document.createElement('dt'), dd = document.createElement('dd'); dt.textContent = k; dd.textContent = val; d.append(dt, dd); return d; }));
  $('#card').classList.toggle('show', !!o.say);
  $('#flag').hidden = !(o.flag >= 0); if (o.flag >= 0) $('#flag').style.backgroundPosition = `${-(o.flag % 16) * 40}px ${-Math.floor(o.flag / 16) * 40}px`; // otázka ve hře musí být vidět i ve sbalené kartě
  cardExtras(o); }
function pill(text, on, pressed) { const b = document.createElement('button'); b.className = 'pill'; b.textContent = text; b.onclick = on; if (pressed != null) b.setAttribute('aria-pressed', pressed); return b; }
function acts() {
  const a = $('#acts'); a.replaceChildren(); a.classList.remove('quiz');
  if (L.id === 'mapa' && (!info || quiz)) mapActs(a); else $('#legend').hidden = true; // karta místa ukazuje jen obsah, ovládání mapy se vrátí po Zpět
  if (L.id === 'mesic') a.append(pill('Zatmění Slunce', () => eclipse('sun'), ecl === 'sun'), pill('Zatmění Měsíce', () => eclipse('moon'), ecl === 'moon'));
  if (L.id === 'soustava') a.append(pill('Skutečné velikosti', toggleSizes, sizes), pill('Světlo ze Slunce', startLight, !!light), pill(game ? 'Konec hry' : 'Hra: najdi planetu', toggleGame, !!game), pill('Dobývání vesmíru', showHistory));
  if (L.id === 'galaxie') a.append(pill('Exoplanety', showExo));
}
function endModes() {
  ecl = null; earth.material.uniforms.ecl.value = 0; moon.material.color.set(0xffffff);
  quiz = null; mapSelect(null); mapFlyTo = null;
  sizes = false; game = null; light = null; lightRing.visible = false; focus = null; zoomTo = 0; flyTo = null; recenter = false; info = null; controls.enablePan = true;
}
function setLevel(i, keepCam) {
  endModes(); L = LV[i];
  [gE, gY, gC, gM, gO, gS, gG, gU].forEach(g => g.visible = g === L.group);
  if (L.id === 'mapa') setMapMode(mapMode);
  sky.visible = L.id !== 'vesmir'; stars.visible = L.id !== 'obloha'; skyBodies.visible = L.id === 'obloha';
  const flat = L.id === 'rez'; controls.enableRotate = !flat; controls.mouseButtons.LEFT = flat ? THREE.MOUSE.PAN : THREE.MOUSE.ROTATE; controls.touches.ONE = flat ? THREE.TOUCH.PAN : THREE.TOUCH.ROTATE; // plochý řez se neotáčí, tažením se posouvá
  camera.fov = L.id === 'obloha' ? 65 : 45; camera.near = .05; controls.zoomSpeed = 1; controls.rotateSpeed = L.id === 'obloha' ? -.3 : 1; controls.enablePan = L.id !== 'obloha' && L.id !== 'mapa'; resize(); // mapa se točí kolem středu Země, posun by ji rozhodil
  if (!keepCam) { camera.position.copy(preset()); controls.target.set(0, 0, 0); }
  controls.minDistance = L.min; controls.maxDistance = L.max;
  document.querySelectorAll('#levels button').forEach((b, j) => b.setAttribute('aria-pressed', inMain(MAIN[j], i)));
  $('#sub').hidden = i >= NS; document.querySelectorAll('#sub button').forEach(b => b.setAttribute('aria-pressed', b.id === 'sub-' + L.id));
  $('#back').hidden = true; $('#moonView').hidden = L.id !== 'mesic';
  $('#speed').value = lay.rok && L.group === gE ? 6 : L.def || 3; $('#speedL').hidden = $('#now').hidden = $('#whenL').hidden = !L.def; // galaxie a vesmír se za lidský čas nepohnou
  card(L); acts(); layPanel(); if (synth) synth.cancel();
}
const home0 = () => ({ pos: preset(), target: V() });
const SIZES_CARD = { name: 'Skutečné velikosti', txt: 'Takhle velké jsou planety doopravdy, když je postavíš vedle sebe. Ta žlutá stěna vlevo je jen kousíček Slunce, celé by se sem nevešlo. Najdeš malinkou Zemi? Ťukni na planetu a přiblížíme se k ní.', note: 'Vedle Jupiteru je Země jako hrášek vedle melounu.' };
const baseCard = () => sizes ? SIZES_CARD : L;
function overview() { // celkový pohled: soustava shora, nebo celá řada planet vedle sebe
  if (!sizes) return home0();
  const mid = rowX / 2, d = (mid + 5) / (Math.tan(rad(camera.fov / 2)) * camera.aspect);
  return { pos: V(mid, d * .1, d), target: V(mid) };
}
// přelet mezi zastávkami: odlétáme, dokud se svět nezmenší v tečku, a v dalším světě z té tečky vylétáme
function go(i) {
  if (tr || LV[i] === L) return;
  if (LV[i].group === L.group) { setLevel(i, true); flyTo = home0(); return; }
  if (reduced) return setLevel(i);
  endModes(); controls.enabled = false;
  tr = { to: i, out: i > LV.indexOf(L), t: 0, phase: 0, off: camera.position.clone().sub(controls.target), tgt: controls.target.clone() };
}
function stepTransition(dt) {
  tr.t += dt / (tr.phase ? 1.1 : .7); const e = Math.min(1, tr.t); let tgt, fade;
  if (!tr.phase) {
    tgt = tr.out ? tr.tgt : tr.tgt.clone().lerp(L.anchor.getWorldPosition(V()), e);
    camera.position.copy(tgt).add(tr.off.clone().multiplyScalar(Math.pow(tr.out ? 7 : .12, e))); fade = e * e;
    if (e >= 1) {
      setLevel(tr.to, true); const p = preset();
      Object.assign(tr, { phase: 1, t: 0, dir: p.clone().normalize(), d1: p.length(), d0: p.length() * (tr.out ? .1 : 6), a: tr.out ? L.anchor.getWorldPosition(V()) : V() });
    }
  } else {
    const k = 1 - Math.pow(1 - e, 3);
    tgt = tr.a.clone().lerp(ZERO, k);
    camera.position.copy(tgt).add(tr.dir.clone().multiplyScalar(tr.d0 * Math.pow(tr.d1 / tr.d0, k))); fade = (1 - e) ** 2;
    if (e >= 1) { tr = null; controls.enabled = true; if (after) { const fn = after; after = null; fn(); } } // úkol odložený na přílet, třeba otevřít nalezené heslo
  }
  controls.target.copy(tgt); camera.lookAt(tgt); $('#fade').style.opacity = fade;
}
function setFocus(p) {
  if (sizes && p === SUN) return; // zvětšené Slunce se do záběru nevejde
  const R = p.r * (sizes ? (p.parent || p).k : 1); // v řadě skutečných velikostí je planeta jinak velká
  focus = p; flyTo = null; zoomTo = p.parent ? Math.max(R * 9, .5) : Math.max(R * 7, sizes ? 1 : 3); controls.minDistance = R * 1.6; controls.enablePan = false; // u sledované planety by posun bojoval s kamerou
  card(p); $('#back').hidden = false;
}
function unfocus() { controls.enablePan = true; focus = null; zoomTo = 0; controls.minDistance = L.min; $('#back').hidden = true; }
function showInfo(o) { info = o; card(o); acts(); $('#back').hidden = false; setMin(false); } // kdo ťukne na jmenovku, chce číst, proto se karta rozbalí
const goBack = () => {
  if (info) { info = null; mapSelect(null); card(focus || baseCard()); acts(); $('#back').hidden = !focus; return; } // z informace zpět k planetě, u které stojíme
  if (focus && focus.parent) return setFocus(focus.parent); // od měsíce zpět k jeho planetě
  unfocus(); flyTo = overview(); card(baseCard());
};
$('#back').onclick = goBack;
controls.addEventListener('start', () => { zoomTo = 0; flyTo = null; mapFlyTo = null; });
