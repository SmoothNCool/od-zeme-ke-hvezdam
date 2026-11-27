// Vrstvy: co je v kterém pohledu zapnuté, panel na přepínání, roční období na Zemi, atmosféra v průřezu. Soubory v js/ sdílejí jeden prostor jmen a načítají se v pořadí podle čísla.
/* ---------- panel vrstev ---------- */
// stav vrstev (lay) je v 01-zaklad.js; tady je jen, které vrstvy patří ke kterému pohledu
const EARTH_LAYS = [['mraky', 'Oblačnost'], ['iss', 'Vesmírná stanice'], ['rok', 'Roční období']];
const LAY_VIEWS = {
  zeme: EARTH_LAYS, mesic: EARTH_LAYS, rez: [['atmo', 'Atmosféra'], ['mraky', 'Oblačnost']],
  mapa: [['staty', 'Jména států'], ['mesta', 'Města'], ['regiony', 'Kraje a regiony'], ['reky', 'Řeky a jezera'], ['hory', 'Hory a pohoří'], ['more', 'Moře a ostrovy']],
  obloha: [['souhvezdi', 'Čáry souhvězdí'], ['jmenaS', 'Jména souhvězdí'], ['hvezdy', 'Jména hvězd']],
  soustava: [['drahy', 'Dráhy'], ['pas', 'Pás asteroidů']],
};
function setLay(key, on) {
  lay[key] = on ? 1 : 0;
  if (key === 'rok') seasonsToggled();
  applyLay(); layPanel();
}
function applyLay() { // promítne stav vrstev do scény; mapa a jmenovky si lay čtou samy každý snímek
  cloudOn.value = lay.mraky; issTilt.visible = !!lay.iss; seasonG.visible = subSun.visible = !!lay.rok;
  airG.visible = !!lay.atmo; airClouds.visible = !!(lay.atmo && lay.mraky);
  gPath.visible = !!lay.drahy; belt.visible = !!lay.pas;
}
function layPanel() { // zaškrtávátka pro právě otevřený pohled; Popisky jsou ve všech
  $('#laysB').replaceChildren(...(LAY_VIEWS[L.id] || []).map(([key, name]) => {
    const l = document.createElement('label'), c = document.createElement('input'); c.type = 'checkbox'; c.checked = !!lay[key]; c.dataset.lay = key;
    c.onchange = () => setLay(key, c.checked); l.append(c, ' ' + name); return l;
  }));
}
$('#layB').onclick = () => { $('#lays').hidden = !$('#lays').hidden; $('#layB').setAttribute('aria-expanded', !$('#lays').hidden); };
function pickMode(mode) { // přepnutí podkladu mapy nastaví vrstvy, které k němu patří; pak si je každý doladí sám
  lay.staty = lay.mesta = lay.regiony = mode === 'staty' ? 1 : 0; lay.hory = mode === 'priroda' ? 1 : 0;
  setMapMode(mode); layPanel();
}

/* ---------- roční období jako vrstva na Zemi: rovnoběžky, které je vysvětlují, a místo, kde je Slunce v nadhlavníku ---------- */
const seasonG = new THREE.Group(), seasonTurn = new THREE.Group(); tilt.add(seasonG); seasonG.add(seasonTurn);
const PARALLELS = [['Severní polární kruh', 66.56, 0x8fd0ff], ['Obratník Raka', 23.44, 0xffb347], ['Rovník', 0, 0xffffff], ['Obratník Kozoroha', -23.44, 0xffb347], ['Jižní polární kruh', -66.56, 0x8fd0ff]];
const parallelMarks = PARALLELS.map(([name, la, color]) => {
  const r = Math.cos(rad(la)) * 1.004, y = Math.sin(rad(la)) * 1.004, pts = [];
  for (let i = 0; i < 128; i++) pts.push(V(Math.cos(i / 128 * TAU) * r, y, Math.sin(i / 128 * TAU) * r));
  seasonG.add(loop(pts, color));
  const o = new THREE.Object3D(); o.position.set(0, y * 1.02, r * 1.02); seasonTurn.add(o); return [name, o]; // jmenovka sedí na kružnici, seasonTurn ji drží na straně ke kameře
});
const subSun = new THREE.Mesh(new THREE.SphereGeometry(.022, 12, 8), basic(0xffe14d)); subSun.position.copy(SUN_DIR).multiplyScalar(1.012); gE.add(subSun);
parallelMarks.forEach(([name, o]) => label(name, o, 0, () => L.group === gE && lay.rok && front(o, earth), null, 'sky'));
label('Slunce v nadhlavníku', subSun, .03, () => L.group === gE && lay.rok && front(subSun, earth), null, 'star');
const seasonNow = () => SEASONS[Math.floor((((days - 171.35) / 365.2422) % 1 + 1) % 1 * 4)];
function seasonsToggled() {
  $('#speed').value = lay.rok ? 6 : L.def; // po týdnech je vidět, jak Slunce putuje mezi obratníky
  if (!lay.rok) { if (info && info.season) goBack(); return; }
  showInfo({ name: 'Roční období', season: true, txt: LV[lv('rok')].txt, facts: FACTS.rok, wiki: { t: 'Roční období' },
    note: 'Čáry na Zemi jsou rovník, obratníky a polární kruhy. Žlutá tečka ukazuje místo, kde je Slunce v poledne přesně nad hlavou, během roku putuje mezi obratníky. Za polárním kruhem je v létě Slunce vidět celý den a v zimě vůbec. Čas běží po týdnech a Země se ukazuje vždy v poledne našeho času.',
    chips: [['Oběh Země kolem Slunce', () => go(lv('rok'))]], chipsTitle: 'Jiný pohled' });
}
function stepSeasons() { // jmenovky rovnoběžek se drží na boku přivráceném ke kameře
  if (!lay.rok || L.group !== gE) return;
  const c = seasonG.worldToLocal(t1.copy(camera.position)); seasonTurn.rotation.y = Math.atan2(c.x, c.z) + rad(50);
}

/* ---------- atmosféra v průřezu Zemí: pět vrstev na řezných plochách a oblačnost; tloušťky jsou zvětšené, jinak by nebyly vidět ---------- */
// [klíč karty, jméno, vnější poloměr v modelu, barva, průhlednost, výška do jmenovky]
const AIR = [['Troposfera', 'Troposféra', 1.03, '#a9d8ff', .9, 'do 12 km'], ['Stratosfera', 'Stratosféra', 1.07, '#73b3f2', .8, 'do 50 km'], ['Mezosfera', 'Mezosféra', 1.11, '#4c88da', .7, 'do 85 km'], ['Termosfera', 'Termosféra', 1.22, '#3659b3', .55, 'do 600 km'], ['Exosfera', 'Exosféra', 1.4, '#27356e', .32, 'nad 600 km']];
const airG = new THREE.Group(); gC.add(airG);
AIR.forEach(([key, name, r1, color, opacity, height], k) => {
  const r0 = k ? AIR[k - 1][2] : 1;
  [0, -Math.PI / 2].forEach(ry => { // stejné dvě řezné plochy jako u vrstev Země
    const f = new THREE.Mesh(new THREE.RingGeometry(r0, r1, 64, 1, Math.PI / 2, Math.PI), new THREE.MeshBasicMaterial({ color, transparent: true, opacity, side: THREE.DoubleSide, depthWrite: false }));
    f.rotation.y = ry; airG.add(f);
  });
  const o = new THREE.Object3D(), ang = rad(172 + k * 19); o.position.set(Math.cos(ang) * 1.62, Math.sin(ang) * 1.62, 0); airG.add(o); // vrstvy jsou u sebe moc natěsno, jmenovky proto stojí vedle modelu v pořadí od země nahoru
  label(name + ', ' + height, o, 0, () => L.id === 'rez' && lay.atmo, tip(key));
});
const airCloudT = cloudT.clone(); airCloudT.repeat.x = .75; airCloudT.needsUpdate = true; // tři čtvrtiny koule nesou tři čtvrtiny oblačnosti
const airClouds = new THREE.Mesh(new THREE.SphereGeometry(1.012, 64, 48, 0, TAU * .75), new THREE.MeshBasicMaterial({ color: 0xffffff, alphaMap: airCloudT, transparent: true, depthWrite: false }));
gC.add(airClouds);
const AIR_NOTE = 'V modelu je vrstva nakreslená mnohem tlustší než doopravdy. Celá atmosféra po hranici vesmíru by byla tenčí než čára, kterou je Země obtažená.';
Object.assign(INFO, {
  Troposfera: { name: 'Troposféra', txt: 'Nejnižší vrstva atmosféry, ve které žijeme. Je v ní většina vzduchu a skoro všechna vodní pára, proto se tu odehrává počasí: mraky, déšť, vítr i bouřky. S výškou v ní teplota klesá.', note: AIR_NOTE, facts: [['Sahá do výšky', '8 km u pólů, až 18 km nad rovníkem'], ['Teplota nahoře', 'kolem −55 °C'], ['Létají tu', 'dopravní letadla, v 10 až 12 km']], wiki: { t: 'Troposféra' } },
  Stratosfera: { name: 'Stratosféra', txt: 'Klidná vrstva bez počasí. Leží v ní ozonová vrstva, která pohlcuje většinu ultrafialového záření ze Slunce. Proto tu teplota s výškou stoupá.', note: AIR_NOTE, facts: [['Sahá do výšky', 'asi 50 km'], ['Ozonová vrstva', 'hlavně 15 až 35 km'], ['Létají tu', 'meteorologické balony']], wiki: { t: 'Stratosféra' } },
  Mezosfera: { name: 'Mezosféra', txt: 'Nejchladnější místo na Zemi je vysoko nad námi. V téhle vrstvě shoří většina meteorů, které pak vidíme jako padající hvězdy.', note: AIR_NOTE, facts: [['Sahá do výšky', 'asi 85 km'], ['Teplota nahoře', 'až −90 °C']], wiki: { t: 'Mezosféra' } },
  Termosfera: { name: 'Termosféra', txt: 'Vzduch je tu tak řídký, že by se tu už nedalo dýchat ani létat letadlem. Vzniká tu polární záře a obíhá tudy Mezinárodní vesmírná stanice. Ve výšce 100 km leží dohodnutá hranice vesmíru.', note: AIR_NOTE, facts: [['Sahá do výšky', 'asi 600 km'], ['Hranice vesmíru', '100 km (Kármánova hranice)'], ['Vesmírná stanice', 'asi 400 km']], wiki: { t: 'Termosféra' } },
  Exosfera: { name: 'Exosféra', txt: 'Vnější okraj atmosféry. Jednotlivé atomy a molekuly tu létají tak daleko od sebe, že se skoro nesrážejí, a některé unikají do vesmíru. Ostrou horní hranici nemá.', note: AIR_NOTE, facts: [['Začíná ve výšce', 'asi 600 km'], ['Přechází do vesmíru', 'kolem 10 000 km']], wiki: { t: 'Exosféra' } },
});
applyLay();
