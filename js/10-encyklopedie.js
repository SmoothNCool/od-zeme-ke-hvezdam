// Encyklopedie: články z Wikipedie, karty států a světadílů, tematické mapy, hledání. Soubory v js/ sdílejí jeden prostor jmen a načítají se v pořadí podle čísla.
/* ---------- úvod článku a obrázek z české Wikipedie ---------- */
// spec = { t: přesný název článku } nebo { s: hledaný text, name, lat, lon, km, word }.
// Při hledání se článek bere jen tehdy, když se jmenuje stejně jako místo a leží do km kilometrů od něj (bez souřadnic musí v textu zmínit druh místa). Radši nic než cizí článek.
const WIKI = 'https://cs.wikipedia.org/w/api.php?action=query&format=json&origin=*&redirects=1&prop=extracts|pageimages|coordinates|pageprops|info&exintro=1&explaintext=1&exsentences=3&exlimit=6&colimit=6&pilimit=6&piprop=thumbnail&pithumbsize=640&inprop=url&ppprop=disambiguation';
const wikiCache = new Map(), norm = t => t.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
const gcKm = (la1, lo1, la2, lo2) => Math.acos(THREE.MathUtils.clamp(latLon(la1, lo1).dot(latLon(la2, lo2)), -1, 1)) * 6371;
function wikiGet(spec) {
  const key = spec.t || spec.s + '|' + Math.round(spec.lat) + '|' + Math.round(spec.lon); if (wikiCache.has(key)) return wikiCache.get(key); // stejně pojmenovaná města ve stejném státě se nesmí splést
  const res = getJson(WIKI + (spec.t ? '&titles=' + encodeURIComponent(spec.t) : '&generator=search&gsrlimit=6&gsrsearch=' + encodeURIComponent(spec.s))).then(d => {
    const pages = Object.values(d.query && d.query.pages || {}).filter(p => p.extract && !(p.pageprops && 'disambiguation' in p.pageprops)).sort((a, b) => (a.index || 0) - (b.index || 0));
    const hit = pages.find(p => {
      if (spec.t) return true;
      if (norm(p.title.replace(/ \(.*\)$/, '')) !== norm(spec.name)) return false;
      const c = p.coordinates && p.coordinates[0];
      return c ? gcKm(c.lat, c.lon, spec.lat, spec.lon) <= spec.km : norm(p.extract).includes(norm(spec.word));
    });
    if (!hit || !String(hit.fullurl).startsWith('https://cs.wikipedia.org/')) return null;
    const img = hit.thumbnail && /^https:\/\/[a-z]+\.wikimedia\.org\//.test(hit.thumbnail.source) ? hit.thumbnail.source : '';
    return { txt: hit.extract.replace(/\s+/g, ' ').trim(), img, url: hit.fullurl };
  });
  wikiCache.set(key, res); res.catch(() => wikiCache.delete(key)); // po výpadku sítě to příště zkusí znovu
  return res;
}
console.assert(norm('Šumava (pohoří)'.replace(/ \(.*\)$/, '')) === 'sumava' && Math.abs(gcKm(50.09, 14.42, 49.19, 16.61) - 185) < 5, 'norm, gcKm');

// články k tělesům a heslům vesmíru; názvy jsou ověřené proti české Wikipedii
const WIKI_T = { Slunce: 'Slunce', Merkur: 'Merkur (planeta)', 'Venuše': 'Venuše (planeta)', 'Země': 'Země', Mars: 'Mars (planeta)', Jupiter: 'Jupiter (planeta)', Saturn: 'Saturn (planeta)', Uran: 'Uran (planeta)', Neptun: 'Neptun (planeta)', Pluto: 'Pluto (trpasličí planeta)', Kometa: 'Kometa',
  'Měsíc': 'Měsíc', Phobos: 'Phobos (měsíc)', Deimos: 'Deimos (měsíc)', Io: 'Io (měsíc)', Europa: 'Europa (měsíc)', Ganymed: 'Ganymedes (měsíc)', Callisto: 'Callisto', Titan: 'Titan (měsíc)', Titania: 'Titania (měsíc)', Triton: 'Triton (měsíc)', Charon: 'Charon (měsíc)',
  ISS: 'Mezinárodní vesmírná stanice', Pas: 'Hlavní pás', Kura: 'Zemská kůra', Plast: 'Zemský plášť', Jadro1: 'Zemské jádro', Jadro2: 'Zemské jádro', Mesic: 'Měsíc', 'Polárka': 'Polárka', rok: 'Roční období', galaxie: 'Galaxie Mléčná dráha', vesmir: 'Vesmír' };
for (const o of [SUN, comet, ...planets, ...planets.flatMap(p => p.moons)]) if (WIKI_T[o.name]) o.wiki = { t: WIKI_T[o.name] };
for (const k in INFO) if (WIKI_T[k]) INFO[k].wiki = { t: WIKI_T[k] };
for (const l of LV) if (WIKI_T[l.id]) l.wiki = { t: WIKI_T[l.id] };

// části karty, které přibyly s encyklopedií: tlačítka souvisejících hesel a článek z Wikipedie
let wikiTok = 0;
function cardExtras(o) {
  const ch = o.chips || []; $('#chips').hidden = !ch.length; $('#chipsT').textContent = o.chipsTitle || '';
  $('#chipsB').replaceChildren(...ch.map(([t, fn]) => pill(t, fn)));
  $('#flag').classList.toggle('big', !!o.bigFlag);
  $('#pic').hidden = $('#wiki').hidden = true; const tok = ++wikiTok;
  if (o.wiki) wikiGet(o.wiki).then(w => {
    if (tok !== wikiTok || !w) return; // mezitím se otevřela jiná karta
    $('#wikiT').textContent = w.txt; $('#wikiA').href = w.url; $('#wiki').hidden = false; readText += ' ' + w.txt;
    if (w.img && !o.wiki.noImg) { const im = $('#picI'); im.onload = () => { if (tok === wikiTok) $('#pic').hidden = false; }; im.src = w.img; } // ukázat až načtený, jinak problikne obrázek z minulé karty
  }).catch(() => {});
}

/* ---------- karty států a světadílů ---------- */
const num = n => n.toLocaleString('cs-CZ'), dec1 = x => x >= 10 ? String(Math.round(x)) : x.toFixed(1).replace('.', ',');
const ST = i => window.STATY && STATY[i] || {};
let ranks = null; // pořadí samostatných států podle lidí a rozlohy
function rankOf(i, col) {
  if (!ranks) {
    const seen = new Set(), ok = GEO.c.map((c, k) => k).filter(k => { const c = GEO.c[k]; if (!STATY[k] || STATY[k].zavisle || !c[3] || seen.has(c[0])) return false; seen.add(c[0]); return true; });
    ranks = { n: ok.length }; for (const cl of [3, 4]) ranks[cl] = new Map(ok.slice().sort((a, b) => GEO.c[b][cl] - GEO.c[a][cl]).map((k, r) => [k, r + 1]));
  }
  const r = ranks[col].get(i); return r ? ', ' + r + '. na světě' : '';
}
const times = (r, more, less, same) => r >= 1.15 ? dec1(r) + '× ' + more : r <= .87 ? dec1(1 / r) + '× ' + less : same;
function countryCard(i) {
  const [name, cap, cont, pop, area, flag] = GEO.c[i], s = ST(i), facts = [], cz = GEO.c.find(c => c[0] === 'Česko');
  const add = (k, val) => val && facts.push([k, val]);
  add('Celý název', s.cele !== name && s.cele); add(cap.includes(' / ') ? 'Hlavní města' : 'Hlavní město', cap); add('Světadíl', cont);
  add('Obyvatel', pop && 'asi ' + fmtPop(pop) + rankOf(i, 3)); add('Rozloha', area && num(area) + ' km²' + rankOf(i, 4));
  add('Hustota zalidnění', pop && area && num(Math.round(pop / area)) + ' lidí na km²');
  if (name !== 'Česko' && pop && area) add('Proti Česku', times(area / cz[4], 'větší', 'menší', 'stejně velké') + ', lidí ' + times(pop / cz[3], 'víc', 'míň', 'stejně'));
  add(s.mena && s.mena.length > 1 ? 'Měny' : 'Měna', s.mena && s.mena.join(', ')); add(s.jazyk && s.jazyk.length > 1 ? 'Úřední jazyky' : 'Úřední jazyk', s.jazyk && s.jazyk.join(', '));
  add('Nejvyšší hora', s.vrchol && s.vrchol[0] + ', ' + num(s.vrchol[1]) + ' m'); add('Moře', s.bezmore && 'nemá, je to vnitrozemský stát');
  add('Naděje dožití', s.zivot && String(s.zivot[0]).replace('.', ',') + ' let (' + s.zivot[1] + ')'); add('Index lidského rozvoje', s.hdi && String(s.hdi[0]).replace('.', ',') + ' (' + s.hdi[1] + ')');
  add('Na silnici se jezdí', s.jizda); add('Telefonní předvolba', s.tel); add('Internetová doména', s.tld);
  add('Členství', s.clen && s.clen.join(', ')); add('Postavení', s.zavisle && 'závislé území nebo stát bez plného uznání');
  const nb = [...(neighbors[i] || [])].filter(j => GEO.c[j][3] > 0).sort((a, b) => GEO.c[a][0].localeCompare(GEO.c[b][0], 'cs'));
  return { name, txt: (s.zavisle ? 'Území' : 'Stát') + (cont ? ', ' + cont : '') + (cap ? ', hlavní město ' + cap.split(' / ')[0] : '') + '.', note: s.rok ? 'Počet obyvatel je z roku ' + s.rok + '. Údaje: Wikidata a seznam států mledoze/countries.' : '',
    facts, flag, wiki: s.w && { t: s.w, noImg: true }, // obrázkem článku o státu bývá vlajka, ta už na kartě je
    chips: nb.map(j => [GEO.c[j][0], () => showCountry(j, true)]), chipsTitle: 'Sousedé' };
}
const countryDist = i => 1.15 + 3.2 * Math.sqrt(GEO.c[i][4] / Math.PI) / 6371; // odstup, ze kterého je vidět celý stát
function showCountry(i, fly) {
  mapSelect({ c: i }); showInfo(countryCard(i));
  if (fly && GEO.c[i][8]) mapFly(GEO.c[i][8][1], GEO.c[i][8][0], countryDist(i));
}
function continentCard(name) {
  const key = name === 'Austrálie' ? 'Oceánie' : name, full = name === 'Austrálie' ? 'Austrálie a Oceánie' : name, seen = new Set();
  const members = GEO.c.map((c, i) => i).filter(i => { const c = GEO.c[i]; if (!c[3] || !c[2].split(' a ').includes(key) || seen.has(c[0])) return false; seen.add(c[0]); return true; }).sort((a, b) => GEO.c[b][3] - GEO.c[a][3]);
  return { name: full, txt: full + ', jeden ze sedmi světadílů.', note: members.length ? 'Státy, které leží na dvou světadílech, se počítají k oběma.' : '', facts: members.length ? [['Států a území na mapě', String(members.length)]] : [],
    wiki: { t: full }, chips: members.slice(0, 12).map(i => [GEO.c[i][0], () => showCountry(i, true)]), chipsTitle: 'Kde žije nejvíc lidí' };
}

/* ---------- tematické mapy: státy obarvené podle údaje ---------- */
// spojitý údaj = pět tříd se stejným počtem států, jeden odstín od světlé po tmavou; ano/ne = dvě barvy. Barvy prošly kontrolou rozlišitelnosti při barvosleposti.
const RAMP = ['#fbe6c5', '#f6c98b', '#ec9f4a', '#cf7420', '#96490c'], TWO = ['#c47a1c', '#3987c9'], NODATA = '#59627a';
const round2 = x => { const m = Math.pow(10, Math.floor(Math.log10(x)) - 1); return Math.round(x / m) * m; }; // hranice tříd na dvě platné číslice
const THEMES = {
  '': { name: 'Politická mapa' },
  pop: { name: 'Počet obyvatel', val: i => GEO.c[i][3], fmt: fmtPop },
  hust: { name: 'Hustota zalidnění', val: i => GEO.c[i][3] && GEO.c[i][4] ? GEO.c[i][3] / GEO.c[i][4] : 0, fmt: x => num(x) + ' lidí na km²' },
  zivot: { name: 'Naděje dožití', val: i => ST(i).zivot && ST(i).zivot[0], fmt: x => num(x) + ' let' },
  hdi: { name: 'Index lidského rozvoje', val: i => ST(i).hdi && ST(i).hdi[0], fmt: x => num(x) },
  jizda: { name: 'Jízda vlevo a vpravo', cat: i => ST(i).jizda, cats: ['vlevo', 'vpravo'] },
  more: { name: 'Státy bez moře', cat: i => ST(i).a2 && (ST(i).bezmore ? 'bez moře' : 'u moře'), cats: ['bez moře', 'u moře'] },
  eu: { name: 'Evropská unie', cat: i => ST(i).a2 && ((ST(i).clen || []).includes('EU') ? 'člen' : 'není člen'), cats: ['člen', 'není člen'] },
  nato: { name: 'NATO', cat: i => ST(i).a2 && ((ST(i).clen || []).includes('NATO') ? 'člen' : 'není člen'), cats: ['člen', 'není člen'] },
};
let mapTheme = '';
function paint() { // přebarví plochy států podle zvoleného tématu a sestaví legendu
  const theme = quiz ? '' : mapTheme, th = THEMES[theme], lg = $('#legend'); lg.replaceChildren(); legendVis();
  if (!vec) return;
  const colors = vec.land.geometry.attributes.color, c3 = new THREE.Color(), rows = []; let cls = () => -1;
  if (th.val) {
    const vals = GEO.c.map((c, i) => th.val(i)).filter(x => x > 0).sort((a, b) => a - b), cut = [1, 2, 3, 4].map(k => round2(vals[Math.floor(vals.length * k / 5)]));
    cls = i => { const x = th.val(i); return x > 0 ? cut.filter(t => x >= t).length : -1; };
    const unit = t => t.replace(/^[\d\s,]+/, ''), span = (a, b) => (unit(a) === unit(b) ? a.slice(0, a.length - unit(a).length).trim() : a) + ' až ' + b; // jednotka stačí jednou
    RAMP.forEach((col, k) => rows.push([col, k === 0 ? 'do ' + th.fmt(cut[0]) : k === 4 ? 'nad ' + th.fmt(cut[3]) : span(th.fmt(cut[k - 1]), th.fmt(cut[k]))]));
  } else if (th.cat) { cls = i => th.cats.indexOf(th.cat(i)); th.cats.forEach((t, k) => rows.push([TWO[k], t])); }
  GEO.c.forEach((c, i) => {
    const k = cls(i); c3.set(!theme || c[0] === 'Antarktida' ? baseColor(i) : k < 0 ? NODATA : (th.val ? RAMP : TWO)[k]);
    for (let p = vec.ranges[i][0]; p < vec.ranges[i][1]; p += 3) colors.setXYZ(p / 3, c3.r, c3.g, c3.b);
  });
  colors.needsUpdate = true;
  if (!theme) return;
  rows.push([NODATA, 'bez údaje']);
  const h = document.createElement('strong'); h.textContent = th.name; lg.append(h);
  for (const [col, text] of rows) { const r = document.createElement('span'), sw = document.createElement('i'); sw.style.background = col; r.append(sw, text); lg.append(r); }
}
function legendVis() { $('#legend').hidden = !(vec && mapTheme && L.id === 'mapa' && mapMode === 'staty' && !quiz); }
function themeSelect() {
  const s = document.createElement('select'); s.className = 'pill'; s.id = 'theme'; s.setAttribute('aria-label', 'Podle čeho obarvit státy');
  for (const k in THEMES) s.append(new Option(k ? 'Barvy: ' + THEMES[k].name : THEMES[k].name, k, false, k === mapTheme));
  s.onchange = () => { mapTheme = s.value; paint(); };
  return s;
}

/* ---------- hledání ---------- */
// pevná hesla (pohledy, tělesa, souhvězdí) + po stažení dat mapy všechny její jmenovky
let findFixed = null, after = null;
function goThen(i, fn) { // přepne pohled a teprve po příletu udělá fn
  if (tr) return; if (LV[i] === L) return fn();
  go(i); if (tr) after = fn; else fn();
}
const lv = id => LV.findIndex(l => l.id === id);
const quitModes = () => { if (game) toggleGame(); if (sizes) toggleSizes(); }; // nalezená planeta nesmí rozbít rozehranou hru ani řadu velikostí
function findList() {
  if (findFixed) return findFixed;
  findFixed = LV.map((l, i) => ({ text: l.name, kind: 'pohled', run: () => go(i) }));
  for (const p of [SUN, ...planets, comet]) {
    findFixed.push({ text: p.name, kind: p === SUN ? 'hvězda' : p === comet ? 'kometa' : p.dwarf ? 'trpasličí planeta' : 'planeta', run: () => goThen(lv('soustava'), () => { quitModes(); setFocus(p); }) });
    for (const m of p.moons || []) findFixed.push({ text: m.name, kind: 'měsíc', sub: p.name, run: () => goThen(lv('soustava'), () => { quitModes(); setFocus(m); }) });
  }
  for (const [text, key, id] of [['Atmosféra: troposféra', 'Troposfera', 'rez'], ['Atmosféra: stratosféra', 'Stratosfera', 'rez'], ['Vesmírná stanice ISS', 'ISS', 'zeme'], ['Pás asteroidů', 'Pas', 'soustava'], ['Zemská kůra', 'Kura', 'rez'], ['Zemský plášť', 'Plast', 'rez'], ['Zemské jádro', 'Jadro1', 'rez']])
    findFixed.push({ text, kind: 'heslo', run: () => goThen(lv(id), () => showInfo(INFO[key])) });
  for (const c of constMarks) findFixed.push({ text: c.cz, kind: 'souhvězdí', run: () => goThen(lv('obloha'), () => {
    showInfo(constInfo(c)); const dir = c.mark.getWorldPosition(V()).normalize();
    if (dir.y > .12) { camera.position.copy(dir.multiplyScalar(-.1)); controls.target.set(0, 0, 0); } // kamera stojí uprostřed a dívá se ven, proto opačný směr
  }) });
  findFixed.forEach(f => f.n = norm(f.text));
  return findFixed;
}
function findHits(q) {
  const n = norm(q.trim()), out = [], seen = new Set(); if (n.length < 2) return out;
  const all = [findList(), window.GEO ? mapPool : []];
  for (const test of [t => t.startsWith(n), t => !t.startsWith(n) && t.includes(n)]) // nejdřív hesla, která hledaným textem začínají
    for (const list of all) for (const m of list) {
      if (out.length >= 8) return out;
      if (!m.click && !m.run || !test(m.n || (m.n = norm(m.text)))) continue;
      const key = m.text + '|' + m.kind + '|' + m.sub; if (seen.has(key)) continue;
      seen.add(key); out.push(m);
    }
  return out;
}
function pickHit(m) {
  if (tr) return; // uprostřed přeletu mezi světy to nejde, výsledky zůstanou otevřené
  closeFind();
  if (m.run) return m.run();
  goThen(lv('mapa'), () => { // jmenovka mapy: otevřít kartu a doletět tam
    quiz = null; if (m.mode === 'hory' && mapMode !== 'priroda') pickMode('priroda'); // hory jsou nejlíp vidět na přírodní mapě
    if (m.mode && !lay[m.mode]) { lay[m.mode] = 1; layPanel(); }
    m.click(); acts(); mapFly(m.lat, m.lon, THREE.MathUtils.clamp(m.maxD * .8, 1.12, 3));
  });
}
function showHits() {
  const q = $('#q').value, hits = findHits(q);
  $('#hits').replaceChildren(...hits.map(m => {
    const b = document.createElement('button'), s = document.createElement('small'); b.textContent = m.text; s.textContent = m.kind + (m.sub ? ', ' + m.sub : ''); b.append(s); b.onclick = () => pickHit(m); return b;
  }));
  $('#findNote').textContent = norm(q.trim()).length < 2 ? '' : !window.GEO ? 'Načítám zeměpisná jména…' : hits.length ? '' : 'Nic takového tu není.';
}
function openFind() {
  $('#find').hidden = false; $('#q').value = ''; showHits(); $('#q').focus();
  loadGeo().then(showHits).catch(() => { $('#findNote').textContent = 'Zeměpisná jména se nepodařilo stáhnout, hledám jen ve vesmíru.'; }); // 30 000 jmen z mapy se stáhne až teď
}
function closeFind() { $('#find').hidden = true; $('#q').blur(); }
$('#findB').onclick = () => $('#find').hidden ? openFind() : closeFind();
$('#q').oninput = showHits;
$('#q').onkeydown = e => {
  e.stopPropagation(); // písmena nesmí spouštět klávesové zkratky (H, W, A, S, D)
  if (e.key === 'Escape') closeFind();
  if (e.key === 'Enter' && $('#hits').firstChild) $('#hits').firstChild.click();
  if (e.key === 'ArrowDown' && $('#hits').firstChild) { e.preventDefault(); $('#hits').firstChild.focus(); }
};
$('#hits').onkeydown = e => {
  e.stopPropagation(); const el = document.activeElement;
  if (e.key === 'Escape') closeFind();
  if (e.key === 'ArrowDown' && el.nextSibling) { e.preventDefault(); el.nextSibling.focus(); }
  if (e.key === 'ArrowUp') { e.preventDefault(); (el.previousSibling || $('#q')).focus(); }
};
addEventListener('keydown', e => { if (e.key === '/' && $('#find').hidden && !(e.target.matches && e.target.matches('input,select,textarea'))) { e.preventDefault(); openFind(); } });

/* ---------- živá Země: zemětřesení za posledních 30 dní (USGS) a hranice tektonických desek ---------- */
const QUAKES_URL = 'https://earthquake.usgs.gov/earthquakes/feed/v1.0/summary/4.5_month.geojson';
let quakes = null, quakesOn = false, quakeWait = null; // quakes = { list seřazený od nejsilnějšího, objs }
const fmtMag = m => m.toFixed(1).replace('.', ',');
function buildQuakes(feed, plates) {
  const fin = Number.isFinite; // cizí data: brát jen záznamy se správnými čísly
  const list = feed.features.filter(f => f.properties && f.properties.type === 'earthquake' && fin(f.properties.mag) && fin(f.properties.time) && f.geometry && Array.isArray(f.geometry.coordinates) && f.geometry.coordinates.slice(0, 2).every(fin)).map(f => {
    const [lon, lat, depth] = f.geometry.coordinates; return { mag: f.properties.mag, place: String(f.properties.place || ''), time: f.properties.time, lat, lon, depth: fin(depth) ? depth : 0, dir: latLon(lat, lon) };
  }).sort((a, b) => b.mag - a.mag);
  const tex = canvasTex((cx, sz) => { cx.fillStyle = 'rgba(255,90,79,.55)'; cx.strokeStyle = '#fff'; cx.lineWidth = sz * .07; cx.beginPath(); cx.arc(sz / 2, sz / 2, sz * .4, 0, TAU); cx.fill(); cx.stroke(); }, 64);
  const groups = [[], [], []]; // tři velikosti teček podle síly
  for (const q of list) { const w = mapP(q.lon, q.lat, 1.0018); groups[q.mag >= 6.5 ? 2 : q.mag >= 5.5 ? 1 : 0].push(w.x, w.y, w.z); }
  const objs = groups.map((g, k) => points(g, new THREE.PointsMaterial({ size: [9, 16, 26][k], sizeAttenuation: false, map: tex, transparent: true, alphaTest: .05 })));
  const lines = []; for (const line of plates) seg(lines, unwrap(dec(line)), 1.0013);
  const edge = fat(lines, 1.8); edge.material.color.set(0xff9a3c); objs.push(edge);
  gM.add(...objs); quakes = { list, objs };
}
function quakeAt(dir) { // zemětřesení nejblíž ťuknutí; čím blíž je kamera, tím přesněji se musí trefit
  let best = null, bd = Math.cos(Math.max(.006, (camD - 1) * .02));
  for (const q of quakes.list) { const d = q.dir.dot(dir); if (d > bd) { bd = d; best = q; } }
  return best;
}
function showQuake(q, fly) {
  const i = countryAt(q.lon, q.lat); mapSelect({ lat: q.lat, lon: q.lon }); if (fly) mapFly(q.lat, q.lon, 1.7);
  showInfo({ name: 'Zemětřesení, magnituda ' + fmtMag(q.mag), txt: i >= 0 ? 'Epicentrum leží na území státu ' + GEO.c[i][0] + '.' : 'Epicentrum leží pod mořem.', note: 'Zdroj: americká geologická služba USGS.',
    facts: [['Kdy (čas u nás)', fmtDT.format(q.time)], ['Hloubka', num(Math.round(q.depth)) + ' km'], ['Místo podle USGS', q.place]] });
}
function quakesCard() {
  const top = quakes.list[0];
  return { name: 'Zemětřesení a desky', txt: 'Každá tečka je zemětřesení s magnitudou aspoň 4,5 za posledních 30 dní. Čím větší tečka, tím bylo silnější. Oranžové čáry jsou hranice tektonických desek. Většina zemětřesení leží právě na nich, protože se tam desky srážejí, třou o sebe nebo se od sebe vzdalují.',
    note: 'Ťukni na tečku a dozvíš se víc. Údaje o zemětřesení: USGS, stažené právě teď. Hranice desek: Peter Bird (2003).', wiki: { t: 'Desková tektonika' },
    facts: [['Zemětřesení za 30 dní', num(quakes.list.length)], ['Nejsilnější', top ? 'magnituda ' + fmtMag(top.mag) + ', ' + fmtD.format(top.time) : '']].filter(f => f[1]),
    chips: quakes.list.slice(0, 6).map(q => ['M ' + fmtMag(q.mag) + ' · ' + q.place.replace(/^.* of /, ''), () => showQuake(q, true)]), chipsTitle: 'Nejsilnější za posledních 30 dní' };
}
function toggleQuakes() {
  quakesOn = !quakesOn; if (quakes) quakes.objs.forEach(o => o.visible = quakesOn);
  if (!quakesOn) { if (info) goBack(); return acts(); }
  if (quakes) showInfo(quakesCard());
  else if (!quakeWait) { // první zapnutí: stáhnout aktuální data
    $('#note').textContent = 'Stahuji aktuální zemětřesení…';
    quakeWait = Promise.all([getJson(QUAKES_URL), getJson('data/desky.json')]).then(([feed, plates]) => {
      buildQuakes(feed, plates); quakes.objs.forEach(o => o.visible = quakesOn);
      if (quakesOn && L.id === 'mapa' && !quiz) { mapSelect(null); showInfo(quakesCard()); acts(); }
    }).catch(err => { console.info(err); quakeWait = null; quakesOn = false; if (quakes) quakes.objs.forEach(o => o.visible = false); if (L.id === 'mapa' && !info && !quiz) $('#note').textContent = 'Zemětřesení se nepodařilo stáhnout. Zkontroluj připojení a zkus to znovu.'; acts(); });
  }
  acts();
}

/* ---------- rekordy Země: místa, která jsou v něčem nej; povídání o nich je z Wikipedie ---------- */
const RECORDS = [['Mount Everest', 'nejvyšší hora světa', 27.99, 86.93], ['Marianský příkop', 'nejhlubší místo oceánu', 11.35, 142.2], ['Nil', 'jedna ze dvou nejdelších řek světa', 26, 32.5],
  ['Amazonka', 'řeka s největším průtokem na světě', -3.1, -60], ['Sahara', 'největší horká poušť', 23, 12], ['Kaspické moře', 'největší jezero světa', 41.7, 50.6], ['Bajkal', 'nejhlubší jezero světa', 53.5, 108],
  ['Salto Angel', 'nejvyšší vodopád světa', 5.97, -62.54], ['Grónsko', 'největší ostrov světa', 72, -40], ['Mrtvé moře', 'nejníže položené místo na souši', 31.5, 35.5], ['Velký bariérový útes', 'největší korálový útes', -18.3, 147.7],
  ['Atacama', 'nejsušší poušť mimo polární oblasti', -24.5, -69.25], ['Amazonský prales', 'největší tropický deštný prales', -5, -62], ['Vostok (polární stanice)', 'místo s nejnižší naměřenou teplotou na Zemi', -78.46, 106.84], ['Mauna Loa', 'největší činná sopka na Zemi', 19.48, -155.6]];
const recordChips = () => RECORDS.map(r => [r[0].replace(/ \(.*\)$/, ''), () => showRecord(r)]);
function showRecord([t, what, lat, lon]) {
  const name = t.replace(/ \(.*\)$/, ''); mapSelect({ lat, lon }); mapFly(lat, lon, 1.6);
  showInfo({ name, txt: name + ', ' + what + '.', note: '', facts: [], wiki: { t }, chips: recordChips(), chipsTitle: 'Další rekordy' });
}
function showRecords() {
  if (mapMode !== 'priroda') pickMode('priroda');
  showInfo({ name: 'Rekordy Země', txt: 'Místa, která jsou na naší planetě v něčem nej. Vyber si a přeletíme tam.', note: '', facts: [], chips: recordChips(), chipsTitle: 'Kam to bude' });
}
