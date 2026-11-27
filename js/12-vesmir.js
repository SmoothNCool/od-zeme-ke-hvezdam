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
  comet.holder.position.copy(cometAt(cv.q, s)); comet.holder.visible = true; cometPath.visible = false; // dráhu prolétající komety nekreslit, jen ji samotnou
  const cd = comet.holder.position.length(), tl = Math.min(9, 60 / cd);
  tail.forEach((sp, i) => sp.position.copy(comet.holder.position).multiplyScalar((i + 1) * tl / 12 / cd));
}

/* ---------- padající hvězdy na noční obloze: meteory, které shoří v atmosféře ---------- */
const meteors = new THREE.Group(); gO.add(meteors);
let meteorWait = 3;
function stepMeteors(dt) {
  stepMeteorAnim(dt);
  if (L.id !== 'obloha' || sunAlt > rad(-6)) return;
  meteorWait -= dt; if (meteorWait > 0) return; meteorWait = 2 + Math.random() * 7;
  const az = Math.random() * TAU, alt = rad(25 + Math.random() * 50), len = rad(5 + Math.random() * 9), dirA = Math.random() * TAU;
  const p = (a, h) => V(Math.cos(h) * Math.sin(a), Math.sin(h), -Math.cos(h) * Math.cos(a)).multiplyScalar(1900);
  const a2 = az + Math.cos(dirA) * len / Math.max(.3, Math.cos(alt)), h2 = alt + Math.sin(dirA) * len;
  spawnMeteor(p(az, alt), p(a2, h2), 0xffffff);
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

/* ---------- Mléčná dráha: skutečné objekty na svých místech; 1 jednotka modelu = 1 000 světelných let, Slunce je 26 až 27 000 ly od středu ---------- */
// poloha z galaktických souřadnic: délka l (0° = směr ke středu galaxie), šířka b, vzdálenost od Slunce v ly
const galAt = (l, b, ly) => V(-Math.cos(rad(l)) * Math.cos(rad(b)), Math.sin(rad(b)), -Math.sin(rad(l)) * Math.cos(rad(b))).multiplyScalar(ly / 1000).add(ourSun.position);
const GAL_OBJ = [
  ['Střed galaxie', 0, 0, 26000, 0xffd27a, 0, { name: 'Střed Mléčné dráhy', txt: 'Uprostřed galaxie je obří černá díra Sagittarius A*. Je čtyři milionykrát těžší než Slunce. Kolem ní je nejhustší shluk hvězd v celé galaxii. Ze Země ho vidíme v souhvězdí Střelce, ale zakrývá ho prach, proto ho astronomové pozorují hlavně v rádiovém a infračerveném světle.', facts: [['Daleko od Slunce', 'asi 26 000 světelných let'], ['Černá díra', 'Sagittarius A*, 4 miliony Sluncí'], ['První snímek Sgr A*', '2022, dalekohled EHT']], wiki: { t: 'Sagittarius A*' } }],
  ['Mlhovina v Orionu', 209, -19.4, 1344, 0xff7fae, 1.6, { name: 'Mlhovina v Orionu', txt: 'Nejbližší velká porodnice hvězd. Za jasné zimní noci je vidět i pouhým okem jako mlhavá hvězdička pod Orionovým pásem. Rodí se v ní tisíce nových hvězd.', facts: [['Daleko od Slunce', 'asi 1 344 světelných let'], ['Kdy je vidět', 'u nás v zimě, v souhvězdí Orion']], wiki: { t: 'Velká mlhovina v Orionu' } }],
  ['Krabí mlhovina', 184.6, -5.8, 6500, 0x9fd8ff, 1.6, { name: 'Krabí mlhovina', txt: 'Zbytek hvězdy, která vybuchla jako supernova. Výbuch v roce 1054 zaznamenali čínští astronomové, byl vidět i ve dne. Uprostřed zůstala neutronová hvězda, která se otočí třicetkrát za sekundu.', facts: [['Daleko od Slunce', 'asi 6 500 světelných let'], ['Výbuch viděli lidé', 'v roce 1054']], wiki: { t: 'Krabí mlhovina' } }],
  ['Orlí mlhovina', 17, .8, 7000, 0xff9f7a, 1.6, { name: 'Orlí mlhovina', txt: 'Je v ní slavné místo Pilíře stvoření: vysoké sloupy plynu a prachu, ve kterých vznikají nové hvězdy. Fotka z Hubbleova dalekohledu patří k nejznámějším snímkům vesmíru.', facts: [['Daleko od Slunce', 'asi 7 000 světelných let'], ['Pilíře stvoření', 'vysoké asi 4 až 5 světelných let']], wiki: { t: 'Orlí mlhovina' } }],
  ['Éta Carinae', 287.6, -.6, 7500, 0xfff0c0, 1.4, { name: 'Éta Carinae', txt: 'Jedna z nejhmotnějších a nejjasnějších hvězd v naší galaxii. V 19. století prudce zjasnila a vyvrhla obří oblak plynu. Astronomové čekají, že jednou vybuchne jako supernova.', facts: [['Daleko od Slunce', 'asi 7 500 světelných let'], ['Je to', 'dvojhvězda, větší hvězda má asi 100 Sluncí']], wiki: { t: 'Éta Carinae' } }],
  ['Omega Centauri', 309.1, 15, 17000, 0xfff6d8, 2, { name: 'Omega Centauri', txt: 'Největší kulová hvězdokupa naší galaxie, koule z asi deseti milionů hvězd. Možná je to zbytek malé galaxie, kterou Mléčná dráha kdysi pohltila.', facts: [['Daleko od Slunce', 'asi 17 000 světelných let'], ['Hvězd', 'asi 10 milionů']], wiki: { t: 'Omega Centauri' } }],
  ['Hvězdokupa M13', 59, 40.9, 22000, 0xfff6d8, 2, { name: 'Kulová hvězdokupa M13', txt: 'Kulová hvězdokupa v souhvězdí Herkula, jedna z nejjasnějších na severní obloze. V roce 1974 k ní lidé poslali rádiovou zprávu z observatoře Arecibo.', facts: [['Daleko od Slunce', 'asi 22 000 světelných let'], ['Hvězd', 'statisíce']], wiki: { t: 'Messier 13' } }],
];
for (const [name, l, b, ly, color, size, cardO] of GAL_OBJ) {
  const o = size ? glow(color, size) : new THREE.Object3D(); o.position.copy(l || b || ly < 25000 ? galAt(l, b, ly) : V()); gG.add(o);
  label(name, o, size ? .6 : 2, () => L.id === 'galaxie', () => showInfo(cardO), 'sky');
}
// kroužek kolem Slunce: skoro všechny známé exoplanety jsou do pár tisíc světelných let
const exoRing = ring(3, 0x8ff0c8); exoRing.material.opacity = .9; exoRing.position.copy(ourSun.position); gG.add(exoRing);
// na kartě galaxie tlačítka ke všem objektům a k exoplanetám
LV[lv('galaxie')].chips = [['Exoplanety', () => showExo()], ...GAL_OBJ.map(o => [o[0], () => showInfo(o[6])])]; LV[lv('galaxie')].chipsTitle = 'Co v galaxii najdeš';
Object.assign(INFO.NaseSlunce, { txt: 'Slunce leží v menším rameni galaxie, kterému se říká Orionovo rameno, asi 26 000 světelných let od středu. Kolem středu galaxie oběhne jednou za zhruba 230 milionů let.', note: 'Zelený kroužek ukazuje 3 000 světelných let kolem Slunce. Skoro všechny známé exoplanety jsou uvnitř.', facts: [['Rameno', 'Orionovo rameno'], ['Daleko od středu', 'asi 26 000 světelných let'], ['Jeden oběh kolem středu', 'asi 230 milionů let']],
  chips: [['Exoplanety', () => showExo()]], chipsTitle: 'Planety u jiných hvězd' });

/* ---------- Vesmír: Místní skupina zhruba v měřítku (1 jednotka = 6 250 ly), ostatní galaxie daleko za ní ---------- */
const LOCAL = [
  ['Velké Magellanovo mračno', V(8, -16, 18), 3.2, { name: 'Velké Magellanovo mračno', txt: 'Trpasličí galaxie, která je průvodcem Mléčné dráhy. Z jižní polokoule je vidět pouhým okem jako odtržený kus Mléčné dráhy. V roce 1987 v ní vybuchla supernova, nejbližší za posledních 400 let.', facts: [['Daleko', 'asi 160 000 světelných let'], ['Kde je vidět', 'jen z jižní polokoule']], wiki: { t: 'Velké Magellanovo mračno' } }],
  ['Malé Magellanovo mračno', V(14, -24, 13), 2.2, { name: 'Malé Magellanovo mračno', txt: 'Menší sestra Velkého Magellanova mračna. Obě mračna pojmenovali Evropané podle mořeplavce Magellana, jehož výprava je popsala při cestě kolem světa.', facts: [['Daleko', 'asi 200 000 světelných let'], ['Kde je vidět', 'jen z jižní polokoule']], wiki: { t: 'Malé Magellanovo mračno' } }],
  ['Galaxie v Andromedě', V(200, 60, -330), 32, { name: 'Galaxie v Andromedě', txt: 'Nejbližší velká galaxie, větší než Mléčná dráha. Je to jedna z nejvzdálenějších věcí, které jsou vidět pouhým okem, jako slabá mlhavá skvrnka na podzimní obloze. Blíží se k nám. Podle nových měření z dalekohledů Hubble a Gaia ale srážka není jistá: šance, že se galaxie během příštích 10 miliard let srazí a splynou, je asi poloviční.', facts: [['Daleko', 'asi 2,5 milionu světelných let'], ['Hvězd', 'asi bilion'], ['Kdy je vidět', 'u nás na podzim, v souhvězdí Andromeda']], wiki: { t: 'Galaxie v Andromedě' } }],
  ['Galaxie v Trojúhelníku', V(110, -50, -400), 11, { name: 'Galaxie v Trojúhelníku', txt: 'Třetí největší galaxie Místní skupiny. Je to spirální galaxie, menší než Mléčná dráha i Andromeda.', facts: [['Daleko', 'asi 2,7 milionu světelných let']], wiki: { t: 'Galaxie v Trojúhelníku' } }],
];
for (const [name, pos, size, cardO] of LOCAL) {
  const s = galaxy(size, size > 5); s.material.color.set(0xdfe6ff); s.position.copy(pos); gU.add(s);
  label(name, s, size / 3, () => L.id === 'vesmir', () => showInfo(cardO), 'sky');
}
// ostatní galaxie daleko za Místní skupinou; ve skutečnosti jsou nejbližší další skupiny miliony světelných let daleko
for (const s of gU.children.slice(0, 600)) { s.position.setLength(520 + Math.random() * 1300); s.scale.multiplyScalar(2.6); }
const localMark = new THREE.Object3D(); localMark.position.set(60, 45, -120); gU.add(localMark);
const LOCAL_CARD = { name: 'Místní skupina', txt: 'Mléčná dráha patří do skupiny asi osmdesáti galaxií, které drží pohromadě gravitace. Největší jsou Andromeda a naše galaxie, ostatní jsou většinou malé trpasličí galaxie.', note: 'Místní skupina je v modelu zhruba ve správných vzdálenostech. Ostatní galaxie jsou ve skutečnosti mnohem dál, než jak je model ukazuje.', facts: [['Galaxií', 'asi 80'], ['Průměr', 'asi 10 milionů světelných let'], ['Největší', 'Andromeda a Mléčná dráha']], wiki: { t: 'Místní skupina galaxií' } };
label('Místní skupina galaxií', localMark, 0, () => L.id === 'vesmir', () => showInfo(LOCAL_CARD), 'star');

/* ---------- dějiny vesmíru: od Velkého třesku po člověka ---------- */
const COSMIC = [
  ['před 13,8 miliardy let', 'Velký třesk', 'Vesmír vznikl z nesmírně horkého a hustého stavu a od té doby se rozpíná. Prostor, čas i hmota vznikly zároveň.', 'Velký třesk'],
  ['asi 380 000 let po třesku', 'Vesmír zprůhledněl', 'Vesmír vychladl natolik, že se z částic poskládaly atomy a světlo mohlo volně letět. To nejstarší světlo zachycujeme dodnes jako reliktní záření.', 'Reliktní záření'],
  ['asi 100 až 200 milionů let po třesku', 'První hvězdy', 'Z oblaků vodíku a hélia se zrodily první hvězdy. Byly obří a v jejich nitru vznikly těžší prvky, ze kterých jsme dnes složení i my.', 'Hvězda'],
  ['před asi 13 miliardami let', 'Mléčná dráha', 'Nejstarší hvězdy naší galaxie jsou staré přes 13 miliard let. Galaxie rostla tím, že pohlcovala menší galaxie.', 'Galaxie Mléčná dráha'],
  ['před 4,6 miliardy let', 'Slunce', 'Z oblaku plynu a prachu se zrodilo Slunce. Ze zbytku kolem něj vznikly planety.', 'Slunce'],
  ['před 4,5 miliardy let', 'Země a Měsíc', 'Země se zformovala ze srážek menších těles. Brzy do ní narazilo těleso velké jako Mars a z vyvrženého materiálu vznikl Měsíc.', 'Země'],
  ['před 3,5 miliardy let', 'První život', 'Nejstarší jisté stopy života jsou mikroorganismy v moři. Ještě skoro tři miliardy let pak byl život jen jednobuněčný.', 'Vznik života'],
  ['před 230 až 66 miliony let', 'Dinosauři', 'Dinosauři vládli Zemi přes 160 milionů let. Vyhynuli po dopadu planetky na poloostrov Yucatán. Ptáci jsou jejich přímí potomci.', 'Dinosauři'],
  ['před asi 300 000 lety', 'Člověk', 'V Africe se objevil moderní člověk. Kdyby se celé dějiny vesmíru stlačily do jednoho roku, objevili by se lidé 31. prosince asi deset minut před půlnocí.', 'Člověk moudrý'],
];
const cosmicChips = () => COSMIC.map(e => [e[1], () => showInfo({ name: e[1], txt: e[2], note: '', facts: [['Kdy', e[0]]], wiki: { t: e[3] }, chips: cosmicChips(), chipsTitle: 'Dějiny vesmíru' })]);
const showCosmic = () => showInfo({ name: 'Dějiny vesmíru', txt: 'Vesmír je starý 13,8 miliardy let. Většinu té doby tu nebyla Země ani Slunce. Vyber si událost.', note: 'Kdyby se celé dějiny vesmíru stlačily do jednoho roku, Slunce by vzniklo na začátku září a dinosauři by žili od Vánoc.', facts: [['Stáří vesmíru', '13,8 miliardy let'], ['Stáří Země', '4,5 miliardy let']], wiki: { t: 'Vznik a vývoj vesmíru' }, chips: cosmicChips(), chipsTitle: 'Od Velkého třesku po člověka' });
SUBS.galaxie = null; SUBS.vesmir = [['Vesmír', () => { info = null; card(L); $('#back').hidden = true; }], ['Místní skupina', () => showInfo(LOCAL_CARD)], ['Dějiny vesmíru', showCosmic]];
LV[lv('vesmir')].chipsTitle = 'Co ve vesmíru najdeš'; LV[lv('vesmir')].chips = [['Galaxie v Andromedě', () => showInfo(LOCAL[2][3])], ['Magellanova mračna', () => showInfo(LOCAL[0][3])], ['Místní skupina', () => showInfo(LOCAL_CARD)], ['Dějiny vesmíru', showCosmic]];
