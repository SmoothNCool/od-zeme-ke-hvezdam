// Vesmír navíc: vzdálené sondy, časová osa dobývání vesmíru, exoplanety. Soubory v js/ sdílejí jeden prostor jmen a načítají se v pořadí podle čísla.
/* ---------- sondy na cestě ze sluneční soustavy ---------- */
// směr: ekliptikální délka a šířka v roce 2026 (přepočteno z rektascenze a deklinace), vzdálenost zaokrouhlená; v modelu stojí kousek za drahou Pluta, ve skutečnosti jsou mnohem dál
const PROBES = [
  ['Voyager 1', 255.9, 34.9, { name: 'Voyager 1', txt: 'Nejvzdálenější věc, kterou kdy lidé vyrobili. Odstartovala v roce 1977, proletěla kolem Jupiteru a Saturnu a v roce 2012 jako první opustila bublinu slunečního větru a vstoupila do mezihvězdného prostoru. Pořád posílá data.',
    note: 'V modelu stojí hned za Kuiperovým pásem, ve skutečnosti je čtyřikrát dál než Pluto. Signál od ní letí k Zemi skoro celý den.', facts: [['Start', '5. září 1977'], ['Daleko od Slunce', 'přes 170 au, asi 25 miliard km'], ['Rychlost', 'asi 61 000 km/h'], ['Na palubě', 'Zlatá deska se zvuky a obrázky Země']], wiki: { t: 'Voyager 1' } }],
  ['Voyager 2', 290.5, -38.4, { name: 'Voyager 2', txt: 'Jediná sonda, která navštívila všechny čtyři obří planety: Jupiter, Saturn, Uran a Neptun. Uran a Neptun zblízka nikdo jiný nefotil. Od roku 2018 je taky v mezihvězdném prostoru.',
    note: 'V modelu stojí hned za Kuiperovým pásem, ve skutečnosti je víc než třikrát dál než Pluto.', facts: [['Start', '20. srpna 1977'], ['Daleko od Slunce', 'přes 140 au'], ['Navštívila', 'Jupiter, Saturn, Uran, Neptun']], wiki: { t: 'Voyager 2' } }],
  ['New Horizons', 294.5, .7, { name: 'New Horizons', txt: 'Sonda, která v roce 2015 jako první proletěla kolem Pluta a ukázala jeho povrch se srdcem z dusíkového ledu. Pak letěla dál do Kuiperova pásu.',
    note: 'V modelu stojí hned za drahou Pluta, ve skutečnosti je asi o polovinu dál, než je Pluto od Slunce.', facts: [['Start', '19. ledna 2006'], ['U Pluta', '14. července 2015'], ['Daleko od Slunce', 'kolem 65 au']], wiki: { t: 'New Horizons' } }],
];
Object.assign(lay, { sondy: 1 }); LAY_VIEWS.soustava.push(['sondy', 'Vzdálené sondy']);
// sondy stojí za Kuiperovým pásem
const probeR = 60;
PROBES.forEach(([name, lon, lat, cardO]) => {
  // výška nad rovinou planet je poloviční, jinak by sondy v modelu visely nad soustavou
  const o = new THREE.Mesh(new THREE.OctahedronGeometry(.3), basic(0xd9e2ff)), b = rad(lat / 2), l = rad(lon);
  o.position.set(Math.cos(b) * Math.cos(l) * probeR, Math.sin(b) * probeR, -Math.cos(b) * Math.sin(l) * probeR); gOrb.add(o);
  const path = new THREE.Line(new THREE.BufferGeometry().setFromPoints([o.position.clone().multiplyScalar(.15), o.position.clone()]), new THREE.LineDashedMaterial({ color: 0x8d9bd6, dashSize: .8, gapSize: .6, transparent: true, opacity: .6 }));
  path.computeLineDistances(); gOrb.add(path); o.userData.path = path;
  label(name, o, .35, () => inS() && !sizes && !!lay.sondy, () => showInfo(cardO));
  PROBES.objs = (PROBES.objs || []).concat(o, path);
});

/* ---------- časová osa dobývání vesmíru ---------- */
const HISTORY = [
  ['1957', 'Sputnik 1', 'První umělá družice Země. Kovová koule s anténami obletěla Zemi za 96 minut a vysílala pípání, které chytali radioamatéři po celém světě.', '4. října 1957', 'Sputnik 1'],
  ['1957', 'Lajka', 'Fenka Lajka byla prvním živým tvorem na oběžné dráze. Ukázala, že živý organismus start a beztíži přežije. Na Zemi se už nevrátila.', '3. listopadu 1957', 'Lajka'],
  ['1961', 'Jurij Gagarin', 'První člověk ve vesmíru. V lodi Vostok 1 jednou obletěl Zemi, let trval 108 minut.', '12. dubna 1961', 'Jurij Gagarin'],
  ['1963', 'Valentina Těreškovová', 'První žena ve vesmíru. Za tři dny obletěla Zemi 48krát.', '16. června 1963', 'Valentina Těreškovová'],
  ['1965', 'Alexej Leonov', 'První výstup do volného prostoru. Mimo loď strávil 12 minut a skafandr se mu nafoukl tak, že se do lodi sotva vrátil.', '18. března 1965', 'Alexej Leonov'],
  ['1969', 'Apollo 11', 'První lidé na Měsíci. Neil Armstrong a Buzz Aldrin prošli po povrchu, Michael Collins čekal na oběžné dráze. Celkem na Měsíci chodilo 12 lidí, naposledy v roce 1972.', '20. července 1969', 'Apollo 11'],
  ['1977', 'Voyager 1 a 2', 'Dvě sondy odstartovaly na cestu k obřím planetám. Dnes jsou nejdál ze všech lidských výrobků a pořád posílají data.', 'srpen a září 1977', 'Voyager 1'],
  ['1978', 'Vladimír Remek', 'První Čechoslovák ve vesmíru a zároveň první člověk ve vesmíru, který nebyl z USA ani ze Sovětského svazu. Strávil týden na stanici Saljut 6.', '2. března 1978', 'Vladimír Remek'],
  ['1990', 'Hubbleův dalekohled', 'Dalekohled na oběžné dráze nad atmosférou, která rozmazává obraz. Jeho snímky ukázaly, jak starý je vesmír, a staly se slavnými po celém světě.', '24. dubna 1990', 'Hubbleův vesmírný dalekohled'],
  ['1998', 'Mezinárodní vesmírná stanice', 'Začala stavba ISS, největší stavby ve vesmíru. Od listopadu 2000 na ní bez přestávky žijí lidé.', '20. listopadu 1998', 'Mezinárodní vesmírná stanice'],
  ['2004', 'Cassini u Saturnu', 'Sonda Cassini začala obíhat Saturn a 13 let zkoumala jeho prstence a měsíce. Její výsadkový modul Huygens přistál na měsíci Titan.', '1. července 2004', 'Cassini-Huygens'],
  ['2012', 'Curiosity na Marsu', 'Vozítko velké jako auto přistálo na Marsu a zjistilo, že tam kdysi byla jezera vhodná pro život.', '6. srpna 2012', 'Mars Science Laboratory'],
  ['2014', 'Přistání na kometě', 'Modul Philae ze sondy Rosetta jako první přistál na jádru komety.', '12. listopadu 2014', 'Rosetta (sonda)'],
  ['2015', 'New Horizons u Pluta', 'První snímky Pluta zblízka. Ukázaly ledové hory a velké světlé srdce.', '14. července 2015', 'New Horizons'],
  ['2019', 'Odvrácená strana Měsíce', 'Čínská sonda Čchang-e 4 jako první přistála na straně Měsíce, kterou ze Země nikdy nevidíme.', '3. ledna 2019', 'Čchang-e 4'],
  ['2021', 'Perseverance a Webbův dalekohled', 'Vozítko Perseverance přistálo na Marsu a s ním první vrtulník na jiné planetě. Na konci roku odstartoval Webbův dalekohled, největší ve vesmíru.', '18. února a 25. prosince 2021', 'Vesmírný dalekohled Jamese Webba'],
  ['2024', 'Parker nejblíž Slunci', 'Sonda Parker Solar Probe proletěla jen 6,1 milionu km nad Sluncem, nejblíž ze všech lidských výrobků, rychlostí přes 690 000 km/h.', '24. prosince 2024', 'Parker Solar Probe'],
  ['2026', 'Artemis II', 'Čtyři astronauti obletěli Měsíc, první lidé u Měsíce po 54 letech. Doletěli dál od Země než kdokoli před nimi.', '1. až 10. dubna 2026', 'Artemis II'],
];
const histChips = () => HISTORY.map(e => [e[0] + ' · ' + e[1], () => showInfo({ name: e[1], txt: e[2], note: '', facts: [['Kdy', e[3]]], wiki: { t: e[4] }, chips: histChips(), chipsTitle: 'Časová osa' })]);
const showHistory = () => showInfo({ name: 'Dobývání vesmíru', txt: 'Od první družice k lidem u Měsíce uběhlo jen dvanáct let. Vyber si událost a dozvíš se víc.', note: '', facts: [['První družice', '1957'], ['První člověk', '1961'], ['Lidé na Měsíci', '1969 až 1972']], wiki: { t: 'Kosmonautika' }, chips: histChips(), chipsTitle: 'Časová osa' });

/* ---------- exoplanety: planety u jiných hvězd; údaje z archivu NASA, stav 27. 11. 2026 ---------- */
const EXO_COUNT = 6473, EXO_STARS = 4865, EXO_DATE = '27. 11. 2026';
// [jméno, vzdálenost v parsecích, poloměr v Zemích, oběh ve dnech, rok objevu, metoda, rovnovážná teplota K, článek, popis]
const EXO = [
  ['51 Pegasi b', 15.46, 14.1, 4.23, 1995, 'radiální rychlosti', 1329, '51 Pegasi b', 'První exoplaneta objevená u hvězdy podobné Slunci. Je to plynný obr větší než Jupiter, který obíhá svou hvězdu za čtyři dny. Objevitelé za ni dostali Nobelovu cenu.'],
  ['Proxima Centauri b', 1.3, 1.02, 11.18, 2016, 'radiální rychlosti', 218, 'Proxima Centauri b', 'Nejbližší známá exoplaneta. Obíhá nejbližší hvězdu po Slunci, je velká skoro jako Země a leží v pásmu, kde by mohla být tekutá voda.'],
  ['TRAPPIST-1 e', 12.43, .92, 6.1, 2017, 'tranzit', 250, 'TRAPPIST-1', 'Jedna ze sedmi planet velikosti Země u malé červené hvězdy TRAPPIST-1. Tři z nich leží v obyvatelné zóně.'],
  ['Kepler-452 b', 551.7, 1.63, 384.8, 2015, 'tranzit', 265, 'Kepler-452b', 'Planeta trochu větší než Země, která obíhá hvězdu podobnou Slunci za 385 dní. Novináři jí říkali sestřenice Země.'],
  ['K2-18 b', 38, 2.37, 32.9, 2015, 'tranzit', 284, 'K2-18b', 'Planeta větší než Země, v jejíž atmosféře Webbův dalekohled našel vodní páru, metan a oxid uhličitý.'],
  ['HD 209458 b', 48.3, 15.58, 3.52, 1999, 'radiální rychlosti', 1459, 'HD 209458 b', 'První exoplaneta, u které astronomové pozorovali přechod přes hvězdu a změřili složení atmosféry. Plyn se z ní odpařuje jako ocas komety.'],
  ['Kepler-186 f', 177.6, 1.17, 129.9, 2014, 'tranzit', 177, 'Kepler-186f', 'První objevená planeta velikosti Země v obyvatelné zóně jiné hvězdy.'],
];
const ly = pc => pc * 3.2616;
function exoCard(e) {
  const [name, pc, re, per, year, how, teq, wiki, txt] = e;
  return { name, txt, note: 'Údaje: NASA Exoplanet Archive. Teplota je odhad bez vlivu atmosféry.', wiki: { t: wiki }, chips: exoChips(), chipsTitle: 'Další exoplanety',
    facts: [['Vzdálenost', (ly(pc) < 10 ? dec1(ly(pc)) : num(Math.round(ly(pc)))) + ' světelných let'], ['Velikost', dec1(re).replace('.', ',') + '× Země'], ['Jeden oběh', per < 10 ? dec1(per).replace('.', ',') + ' dne' : num(Math.round(per)) + ' dní'], ['Objevena', year + ', metodou ' + how], ['Teplota', 'asi ' + num(Math.round(teq - 273)) + ' °C']] };
}
const exoChips = () => EXO.map(e => [e[0], () => showInfo(exoCard(e))]);
const showExo = () => showInfo({ name: 'Exoplanety', txt: 'Planety, které obíhají kolem jiných hvězd než Slunce. První u hvězdy podobné Slunci našli astronomové v roce 1995, dnes jich známe tisíce. Většinu prozradí slabé zatemnění hvězdy, když planeta přechází před ní.',
  note: 'Počet je z archivu NASA ke dni ' + EXO_DATE + ' a stále roste.', wiki: { t: 'Exoplaneta' }, chips: exoChips(), chipsTitle: 'Zajímavé exoplanety',
  facts: [['Potvrzených exoplanet', num(EXO_COUNT)], ['U kolika hvězd', num(EXO_COUNT > 0 ? EXO_STARS : 0)], ['Objeveno přechodem před hvězdou', 'asi 74 %'], ['Objeveno kolísáním hvězdy', 'asi 19 %']] });
console.assert(Math.abs(4800 / EXO_COUNT - .74) < .01 && Math.abs(1204 / EXO_COUNT - .19) < .01, 'podíly metod objevu');

/* ---------- podmenu pro soustavu a galaxii: témata, která by se jinak v kartě ztratila ---------- */
const SUBS = {
  soustava: [['Planety', () => { unfocus(); info = null; card(baseCard()); $('#back').hidden = true; }], ['Kuiperův pás', () => { quitModes(); showInfo(INFO.Kuiper); }], ['Dobývání vesmíru', showHistory]],
  galaxie: [['Mléčná dráha', () => { info = null; card(L); $('#back').hidden = true; }], ['Exoplanety', showExo]],
};
function subMenu() {
  const sub = $('#sub'), earth = LV.indexOf(L) < NS, list = SUBS[L.id];
  sub.querySelectorAll('.dyn').forEach(b => b.remove());
  sub.querySelectorAll('button').forEach(b => b.hidden = !earth);
  if (!earth && list) list.forEach(([t, fn], k) => {
    const b = pill(t, () => { fn(); sub.querySelectorAll('.dyn').forEach(x => x.setAttribute('aria-pressed', x === b)); }, k === 0); b.classList.add('dyn'); sub.append(b);
  });
  sub.hidden = !earth && !list;
}

/* ---------- Kuiperův pás: ledová tělesa za Neptunem; v modelu mezi 40 a 54, Pluto v něm leží ---------- */
Object.assign(lay, { kuiper: 1 }); LAY_VIEWS.soustava.push(['kuiper', 'Kuiperův pás']);
const kuiper = (() => {
  const pos = [], col = [], c = new THREE.Color();
  for (let i = 0; i < 2600; i++) {
    const a = Math.random() * TAU, r = 40 + Math.random() * 14, y = (Math.random() - .5) * 4 * Math.random();
    pos.push(Math.cos(a) * r, y, Math.sin(a) * r); c.setHSL(.58, .25, .55 + Math.random() * .3); col.push(c.r, c.g, c.b);
  }
  const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setAttribute('color', new THREE.Float32BufferAttribute(col, 3));
  return new THREE.Points(g, new THREE.PointsMaterial({ size: .22, vertexColors: true, transparent: true, opacity: .8 }));
})();
gOrb.add(kuiper);
const kuiperMark = new THREE.Object3D(); kuiperMark.position.set(30, 0, 36); gOrb.add(kuiperMark);
INFO.Kuiper = { name: 'Kuiperův pás', txt: 'Za drahou Neptunu obíhá Slunce obrovský prstenec ledových těles, zbytků ze vzniku sluneční soustavy. Leží v něm i Pluto a další trpasličí planety. Odtud přilétá část komet.', note: 'Ještě mnohem dál je Oortův oblak, obří koule ledových těles, odkud přilétají komety s nejdelšími drahami. V modelu není, nevešel by se.',
  facts: [['Kde je', 'za Neptunem, asi 30 až 50 au od Slunce'], ['Z čeho je', 'led, prach a kamení'], ['Známá tělesa', 'Pluto, Haumea, Makemake, Arrokoth'], ['Navštívila ho', 'sonda New Horizons, Pluto v roce 2015, Arrokoth v roce 2019']], wiki: { t: 'Kuiperův pás' } };
label('Kuiperův pás', kuiperMark, .3, () => inS() && !sizes && !!lay.kuiper, () => showInfo(INFO.Kuiper));

/* ---------- komety: místo jedné nehybné sem tam nějaká proletí kolem Slunce ---------- */
cometPlane.children[0].visible = false; // stará pevná dráha
Object.assign(comet, { txt: 'Kometa je hrouda ledu a prachu velká jen pár kilometrů. Většinu času je daleko za planetami. Když se přiblíží ke Slunci, led se začne odpařovat a vznikne ohon, který míří vždy od Slunce. V modelu sem tam nějaká proletí.', note: 'Některé komety se vracejí po desítkách let, jako Halleyova, jiné po tisících let a některé jen jednou proletí.' });
const cometPath = new THREE.Line(new THREE.BufferGeometry(), new THREE.LineDashedMaterial({ color: 0x5fa8b8, dashSize: .9, gapSize: .7, transparent: true, opacity: .5 })); cometPlane.add(cometPath);
let cv = { on: false, wait: 4 };
const cometAt = (q, s) => V(q - s * s / (4 * q), 0, -s); // parabola s přísluním ve vzdálenosti q
function newComet() {
  const q = 3.5 + Math.random() * 6, S = Math.sqrt(4 * q * 75);
  cometPlane.rotation.set(rad(-35 + Math.random() * 70), Math.random() * TAU, rad(-20 + Math.random() * 40));
  cometPath.geometry.setFromPoints(Array.from({ length: 81 }, (_, i) => cometAt(q, S * (i / 40 - 1)))); cometPath.computeLineDistances();
  cv = { on: true, t: 0, dur: 18 + Math.random() * 10, q, S };
}
function stepComet(dt) {
  if (!cv.on) {
    comet.holder.visible = cometPath.visible = false; cv.wait -= dt; if (cv.wait <= 0) newComet();
    if (focus === comet) { unfocus(); card(baseCard()); }
    return;
  }
  cv.t += dt / cv.dur;
  if (cv.t >= 1) { cv = { on: false, wait: 15 + Math.random() * 25 }; return; }
  // na začátku a na konci pomalu, u Slunce rychle, jako skutečná kometa
  const u = cv.t * 2 - 1, s = cv.S * Math.sign(u) * Math.pow(Math.abs(u), .6);
  comet.holder.position.copy(cometAt(cv.q, s)); comet.holder.visible = cometPath.visible = true;
  const cd = comet.holder.position.length(), tl = Math.min(9, 60 / cd);
  tail.forEach((sp, i) => sp.position.copy(comet.holder.position).multiplyScalar((i + 1) * tl / 12 / cd));
}

/* ---------- padající hvězdy na noční obloze: meteory, které shoří v atmosféře ---------- */
const meteors = new THREE.Group(); gO.add(meteors);
let meteorWait = 3;
function stepMeteors(dt) {
  for (const m of [...meteors.children]) { m.userData.t += dt; m.material.opacity = Math.max(0, 1 - m.userData.t / .9); if (m.userData.t > .9) { meteors.remove(m); m.geometry.dispose(); m.material.dispose(); } }
  if (L.id !== 'obloha' || sunAlt > rad(-6)) return;
  meteorWait -= dt; if (meteorWait > 0) return; meteorWait = 2 + Math.random() * 7;
  const az = Math.random() * TAU, alt = rad(25 + Math.random() * 50), len = rad(5 + Math.random() * 9), dirA = Math.random() * TAU;
  const p = (a, h) => V(Math.cos(h) * Math.sin(a), Math.sin(h), -Math.cos(h) * Math.cos(a)).multiplyScalar(1900);
  const a2 = az + Math.cos(dirA) * len / Math.max(.3, Math.cos(alt)), h2 = alt + Math.sin(dirA) * len;
  const line = new THREE.Line(new THREE.BufferGeometry().setFromPoints([p(az, alt), p(a2, h2)]), new THREE.LineBasicMaterial({ color: 0xffffff, transparent: true, opacity: 1 }));
  line.userData.t = 0; meteors.add(line);
}

// sondy jdou vypnout jako vrstva; hesla vesmíru jdou najít
const applyLay1 = applyLay;
applyLay = () => { applyLay1(); PROBES.objs.forEach(o => o.visible = !!lay.sondy); kuiper.visible = !!lay.kuiper; };
const findList1 = findList;
findList = () => {
  if (findFixed) return findFixed;
  findList1();
  for (const [name, , , c] of PROBES) findFixed.push({ text: name, kind: 'sonda', run: () => goThen(lv('soustava'), () => { quitModes(); if (!lay.sondy) setLay('sondy', 1); showInfo(c); }) });
  for (const e of EXO) findFixed.push({ text: e[0], kind: 'exoplaneta', run: () => goThen(lv('galaxie'), () => showInfo(exoCard(e))) });
  for (const e of HISTORY) findFixed.push({ text: e[1], kind: 'dobývání vesmíru, ' + e[0], run: () => goThen(lv('soustava'), () => histChips().find(c => c[0].endsWith(e[1]))[1]()) });
  findFixed.push({ text: 'Exoplanety', kind: 'heslo', run: () => goThen(lv('galaxie'), showExo) }, { text: 'Dobývání vesmíru', kind: 'časová osa', run: () => goThen(lv('soustava'), showHistory) });
  findFixed.forEach(f => f.n = norm(f.text));
  return findFixed;
};
applyLay();
