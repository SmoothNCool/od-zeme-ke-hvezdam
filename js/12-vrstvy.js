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

/* ---------- karty vrstev atmosféry (výseč je v 07-rez-obloha.js) ---------- */
const AIR_NOTE = 'Výseč není v měřítku. Ve skutečném poměru by celá atmosféra po hranici vesmíru byla tenčí než čára, kterou je Země na obrázku obtažená.';
Object.assign(INFO, {
  Troposfera: { name: 'Troposféra', txt: 'Nejnižší vrstva atmosféry, ve které žijeme. Je v ní většina vzduchu a skoro všechna vodní pára, proto se tu odehrává počasí: mraky, déšť, vítr i bouřky. S výškou v ní teplota klesá.', note: AIR_NOTE, facts: [['Sahá do výšky', '8 km u pólů, až 18 km nad rovníkem'], ['Teplota nahoře', 'kolem −55 °C'], ['Létají tu', 'dopravní letadla, v 10 až 12 km']], wiki: { t: 'Troposféra' } },
  Stratosfera: { name: 'Stratosféra', txt: 'Klidná vrstva bez počasí. Leží v ní ozonová vrstva, která pohlcuje většinu ultrafialového záření ze Slunce. Proto tu teplota s výškou stoupá.', note: AIR_NOTE, facts: [['Sahá do výšky', 'asi 50 km'], ['Ozonová vrstva', 'hlavně 15 až 35 km'], ['Létají tu', 'meteorologické balony']], wiki: { t: 'Stratosféra' } },
  Mezosfera: { name: 'Mezosféra', txt: 'Nejchladnější místo na Zemi je vysoko nad námi. V téhle vrstvě shoří většina meteorů, které pak vidíme jako padající hvězdy.', note: AIR_NOTE, facts: [['Sahá do výšky', 'asi 85 km'], ['Teplota nahoře', 'až −90 °C']], wiki: { t: 'Mezosféra' } },
  Termosfera: { name: 'Termosféra', txt: 'Vzduch je tu tak řídký, že by se tu už nedalo dýchat ani létat letadlem. Vzniká tu polární záře a obíhá tudy Mezinárodní vesmírná stanice. Ve výšce 100 km leží dohodnutá hranice vesmíru.', note: AIR_NOTE, facts: [['Sahá do výšky', 'asi 600 km'], ['Hranice vesmíru', '100 km (Kármánova hranice)'], ['Vesmírná stanice', 'asi 400 km']], wiki: { t: 'Termosféra' } },
  Exosfera: { name: 'Exosféra', txt: 'Vnější okraj atmosféry. Jednotlivé atomy a molekuly tu létají tak daleko od sebe, že se skoro nesrážejí, a některé unikají do vesmíru. Ostrou horní hranici nemá.', note: AIR_NOTE, facts: [['Začíná ve výšce', 'asi 600 km'], ['Přechází do vesmíru', 'kolem 10 000 km']], wiki: { t: 'Exosféra' } },
});

/* ---------- nastavení: datum a čas, výchozí místo ---------- */
// Výchozí místo je bod, pro který se počítá den a noc a obloha. Bez nastavení je to střed Česka. Volba zůstává jen v prohlížeči (localStorage), nikam se neposílá.
const HOME0 = HOME.slice(); let homeName = '';
function setHome(lat, lon, name, keep) {
  HOME[0] = lat; HOME[1] = lon; homeName = name || '';
  homes.forEach(m => m.position.copy(latLon(lat, lon)).multiplyScalar(m.userData.r));
  homeLabels.forEach(l => { l.el.textContent = homeName; l.w = 0; });
  $('#homeNow').textContent = homeName ? 'Teď: ' + homeName : 'Teď: střed Česka';
  $('#homeOff').hidden = !homeName; $('#homeQ').value = ''; $('#homeHits').replaceChildren();
  if (keep !== false) try { homeName ? localStorage.setItem('domov', JSON.stringify([lat, lon, homeName])) : localStorage.removeItem('domov'); } catch (e) { /* bez úložiště platí volba jen do zavření stránky */ }
}
// jmenovka u červené tečky je vidět jen s vlastním místem a nese jeho jméno
const homeLabels = [[home, .03, () => L.group === gE && !!homeName && front(home, earth)], [yHome, .08, () => L.id === 'rok' && !!homeName && front(yHome, yEarth)]].map(([o, r, show]) => { label(' ', o, r, show, tip('Doma'), 'home'); return labels[labels.length - 1]; });
$('#homeQ').oninput = () => {
  const n = norm($('#homeQ').value.trim()); if (n.length < 2) return $('#homeHits').replaceChildren();
  loadGeo().then(() => { // města se hledají ve jménech mapy
    if (norm($('#homeQ').value.trim()) !== n) return;
    const hits = mapPool.filter(m => (m.kind === 'město' || m.kind === 'hlavní město') && (m.n || (m.n = norm(m.text))).startsWith(n)).slice(0, 6);
    $('#homeHits').replaceChildren(...hits.map(m => { const b = document.createElement('button'), s = document.createElement('small'); b.textContent = m.text; s.textContent = m.sub; b.append(s); b.onclick = () => setHome(m.lat, m.lon, m.text); return b; }));
  }).catch(() => {});
};
$('#homeQ').onkeydown = e => e.stopPropagation(); // psaní nesmí spouštět klávesové zkratky
$('#homeOff').onclick = () => setHome(HOME0[0], HOME0[1], '');
const panels = { layB: '#lays', setB: '#sets' }; // vpravo je vždy otevřený nejvýš jeden panel
for (const id in panels) $('#' + id).onclick = () => { for (const k in panels) { const open = k === id && $(panels[k]).hidden; $(panels[k]).hidden = !open; $('#' + k).setAttribute('aria-expanded', open); } };
try { const h = JSON.parse(localStorage.getItem('domov')); if (Array.isArray(h) && Number.isFinite(h[0]) && Number.isFinite(h[1])) setHome(h[0], h[1], String(h[2] || '').slice(0, 60), false); else setHome(HOME0[0], HOME0[1], '', false); } catch (e) { setHome(HOME0[0], HOME0[1], '', false); }
INFO.Kura.facts.push(['Nejhlubší vrt', '12 km, Kolský poloostrov']);
INFO.Troposfera.facts.push(['Nejvyšší hora', 'Mount Everest, 8,8 km']);
INFO.Mezosfera.facts.push(['Meteory shoří', 'v 75 až 100 km']);
INFO.Termosfera.facts.push(['Polární záře', '100 až 300 km']);
applyLay();
