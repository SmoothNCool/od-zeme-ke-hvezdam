// Další vrstvy mapy světa: den a noc, časová pásma, podnebné pásy, kde žijí lidé, mořské proudy, sopky, vesmírná stanice právě teď.
// Soubory v js/ sdílejí jeden prostor jmen a načítají se v pořadí podle čísla.
LAY_VIEWS.mapa.push(['noc', 'Den a noc'], ['pasma', 'Časová pásma'], ['podnebi', 'Podnebné pásy'], ['lide', 'Kde žijí lidé'], ['proudy', 'Mořské proudy'], ['sopky', 'Sopky'], ['issNow', 'Vesmírná stanice teď']);
Object.assign(lay, { noc: 0, pasma: 0, podnebi: 0, lide: 0, proudy: 0, sopky: 0, issNow: 0 });

/* ---------- průsvitná koule nad pevninou: noc, podnebné pásy, hustota lidí ---------- */
const ovU = { sunDir: { value: V(1, 0, 0) }, night: { value: 0 }, climate: { value: 0 }, dens: { value: 0 }, densT: { value: null }, nightT: { value: nightT } };
const overlay = new THREE.Mesh(new THREE.SphereGeometry(1.00085, 160, 100), new THREE.ShaderMaterial({
  // bez hloubkového testu: pevnina je poskládaná z rovných trojúhelníků a koule by se s ní ve stejné výšce přetahovala; kreslí se jen přivrácená polokoule
  uniforms: ovU, transparent: true, depthWrite: false, depthTest: false,
  vertexShader: 'varying vec2 vUv;varying vec3 vN;void main(){vUv=uv;vN=normalize(position);gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0);}',
  // podnebné pásy zjednodušeně podle zeměpisné šířky; noc ztmaví povrch a rozsvítí města z noční fotky
  fragmentShader: 'uniform vec3 sunDir;uniform float night,climate,dens;uniform sampler2D densT,nightT;varying vec2 vUv;varying vec3 vN;' +
    'vec3 band(float a){return a<23.44?vec3(.91,.36,.25):a<40.0?vec3(.95,.66,.25):a<60.0?vec3(.42,.75,.42):a<66.56?vec3(.35,.66,.84):vec3(.9,.94,.98);}' +
    'void main(){vec3 c=vec3(0.0);float ca=0.0;float lat=degrees(asin(clamp(vN.y,-1.0,1.0)));' +
    'if(climate>0.5){c=band(abs(lat));ca=0.5;}' +
    'if(dens>0.5){vec4 d=texture2D(densT,vUv);c=mix(c,d.rgb,d.a);ca=max(ca,d.a);}' +
    'float k=0.0;if(night>0.5)k=1.0-smoothstep(-0.1,0.08,dot(vN,sunDir));float an=k*0.55;vec3 lights=texture2D(nightT,vUv).rgb*k*1.3;' +
    'float a=ca+an*(1.0-ca);if(a<0.002)discard;gl_FragColor=vec4((c*ca*(1.0-an)+vec3(0.02,0.04,0.13)*an+lights)/a,a);}',
}));
overlay.visible = false; overlay.renderOrder = -1; gM.add(overlay); // pod čarami hranic a řek, ty se kreslí až po ní
// místo, kde je Slunce právě v nadhlavníku: deklinace z délky Slunce, zeměpisná délka z času UTC (rovnici času zanedbávám, chyba do čtvrt hodiny)
function subSolar(ms) {
  const decl = Math.asin(Math.sin(rad(23.44)) * Math.sin(sunLamAt(ms))) * 180 / Math.PI, utcH = ((ms / 36e5) % 24 + 24) % 24;
  return [decl, ((-(utcH - 12) * 15) + 540) % 360 - 180];
}
console.assert(Math.abs(subSolar(Date.UTC(2026, 5, 21, 12))[0] - 23.44) < .3 && Math.abs(subSolar(Date.UTC(2026, 5, 21, 12))[1]) < .01, 'subSolar o slunovratu v poledne UTC');
const sunDot = points([0, 0, 0], new THREE.PointsMaterial({ size: 22, sizeAttenuation: false, transparent: true, depthTest: false, map: canvasTex((cx, s) => { const g = cx.createRadialGradient(s / 2, s / 2, 0, s / 2, s / 2, s / 2); g.addColorStop(0, '#fff6c9'); g.addColorStop(.45, '#ffc94d'); g.addColorStop(1, 'rgba(255,201,77,0)'); cx.fillStyle = g; cx.fillRect(0, 0, s, s); }, 64) }));
sunDot.visible = false; gM.add(sunDot);
label('Slunce v nadhlavníku', sunDot, 0, () => L.id === 'mapa' && !!lay.noc && front0(sunDot), null, 'star');
// jmenovka na mapě je vidět jen na přivrácené straně Země
const front0 = o => o.getWorldPosition(t1).dot(camera.position) > 1.02;

/* ---------- kde žijí lidé: z 25 000 měst nad 15 000 obyvatel se nakreslí hustotní mapa ---------- */
function densTex() {
  const W2 = 2048, H2 = 1024, cv = document.createElement('canvas'); cv.width = W2; cv.height = H2;
  const g = cv.getContext('2d'); g.globalCompositeOperation = 'lighter';
  for (const [, lat, lon, pop] of GEO.towns) {
    if (!(pop > 0 && Number.isFinite(lat) && Number.isFinite(lon))) continue;
    const x = (lon + 180) / 360 * W2, y = (90 - lat) / 180 * H2, r = 3 + Math.sqrt(pop) / 260, a = Math.min(.8, .05 + pop / 5e6);
    const gr = g.createRadialGradient(x, y, 0, x, y, r); gr.addColorStop(0, `rgba(255,255,255,${a})`); gr.addColorStop(1, 'rgba(255,255,255,0)');
    g.fillStyle = gr; g.fillRect(x - r, y - r, 2 * r, 2 * r);
  }
  const im = g.getImageData(0, 0, W2, H2), p = im.data, RAMP3 = [[255, 243, 176], [255, 154, 60], [215, 48, 31], [120, 0, 40]];
  for (let i = 0; i < p.length; i += 4) { // jeden odstín od světlé po tmavou: víc lidí = tmavší a sytější
    const v = Math.sqrt(p[i + 3] / 255); if (v < .08) { p[i + 3] = 0; continue; } // intenzita je v průhlednosti, barva bílé je po rozpočítání vždy 255
    const t = Math.min(.999, v) * 3, k = Math.floor(t), f = t - k, A = RAMP3[k], B = RAMP3[k + 1];
    p[i] = A[0] + (B[0] - A[0]) * f; p[i + 1] = A[1] + (B[1] - A[1]) * f; p[i + 2] = A[2] + (B[2] - A[2]) * f; p[i + 3] = 90 + 150 * v;
  }
  g.globalCompositeOperation = 'copy'; g.putImageData(im, 0, 0);
  const t = new THREE.CanvasTexture(cv); t.anisotropy = renderer.capabilities.getMaxAnisotropy(); return t;
}

/* ---------- časová pásma: pravidelná po 15° délky; skutečné hranice se řídí státy ---------- */
const tzG = new THREE.Group(); tzG.visible = false; gM.add(tzG);
const tzMarks = [];
for (let k = -11; k <= 12; k++) {
  const o = new THREE.Object3D(); tzG.add(o); tzMarks.push([k, o]);
  label(' ', o, 0, () => L.id === 'mapa' && !!lay.pasma && front0(o), null, 'tz');
  labels[labels.length - 1].tz = k;
}
let tzLines = null, tzMinute = -1;
function stepZones() {
  if (!tzLines) { const out = []; for (let k = 0; k < 24; k++) seg(out, [7.5 + 15 * k - 180, -78, 7.5 + 15 * k - 180, 78], 1.0012); tzLines = fat(out, 1.4, .006); tzLines.material.color.set(0xc9a8ff); tzLines.material.opacity = .8; tzG.add(tzLines); }
  const c = camera.position.clone().normalize(), lat = THREE.MathUtils.clamp(Math.asin(c.y) * 180 / Math.PI + 4, -60, 60);
  for (const [k, o] of tzMarks) o.position.copy(latLon(lat, k * 15)).multiplyScalar(1.004);
  const minute = Math.floor(simMs / 6e4); if (minute === tzMinute) return; tzMinute = minute;
  for (const l of labels) if (l.tz !== undefined) { l.el.textContent = 'UTC' + (l.tz > 0 ? '+' + l.tz : l.tz < 0 ? '−' + -l.tz : '') + ' · ' + new Date(simMs + l.tz * 36e5).toISOString().slice(11, 16); l.w = 0; }
}

/* ---------- mořské proudy: schéma hlavních proudů, teplé červeně, studené modře ---------- */
const CURRENTS = [
  ['Golfský proud', 1, [-80, 25, -79, 30, -75, 35, -65, 39, -50, 42]], ['Severoatlantský proud', 1, [-50, 42, -35, 48, -20, 53, -10, 58, 5, 64, 15, 70]],
  ['Severní rovníkový proud', 1, [-20, 15, -40, 14, -60, 15, -75, 18]], ['Jižní rovníkový proud', 1, [8, -2, -15, -3, -30, -5, -36, -9]],
  ['Brazilský proud', 1, [-36, -12, -40, -20, -46, -28, -52, -36]], ['Agulhaský proud', 1, [42, -15, 38, -25, 32, -31, 25, -36, 20, -38]],
  ['Kurošio', 1, [123, 23, 128, 28, 135, 33, 142, 36, 155, 38]], ['Východoaustralský proud', 1, [154, -15, 155, -25, 154, -32, 152, -38]],
  ['Severní rovníkový proud', 1, [-110, 12, -140, 13, -170, 13, 160, 13, 130, 14]], ['Jižní rovníkový proud', 1, [-85, -3, -110, -5, -140, -8, -170, -12]],
  ['Jižní rovníkový proud', 1, [100, -12, 80, -13, 60, -13, 48, -14]],
  ['Labradorský proud', 0, [-60, 65, -55, 58, -52, 50, -55, 44]], ['Kanárský proud', 0, [-12, 40, -15, 30, -18, 22, -20, 15]],
  ['Benguelský proud', 0, [15, -35, 12, -25, 10, -15, 8, -5]], ['Humboldtův proud', 0, [-75, -45, -75, -35, -74, -25, -79, -12, -82, -4]],
  ['Kalifornský proud', 0, [-127, 47, -125, 38, -120, 30, -115, 22]], ['Ojašio', 0, [160, 55, 150, 47, 145, 42]], ['Západoaustralský proud', 0, [110, -35, 112, -28, 110, -20]],
  ['Antarktický cirkumpolární proud', 0, [-180, -58, -150, -60, -120, -59, -90, -58, -60, -57, -30, -55, 0, -52, 30, -50, 60, -50, 90, -51, 120, -53, 150, -56, 180, -58]],
];
const curG = new THREE.Group(); curG.visible = false; gM.add(curG);
function buildCurrents() {
  const lines = [[], []];
  for (const [name, warm, pts] of CURRENTS) {
    seg(lines[warm], pts, 1.0013);
    const n = pts.length, x1 = pts[n - 2], y1 = pts[n - 1], dx = x1 - pts[n - 4], dy = y1 - pts[n - 3], L0 = Math.hypot(dx, dy), ux = dx / L0 * 2.2, uy = dy / L0 * 2.2; // šipka na konci
    seg(lines[warm], [x1 - ux - uy * .7, y1 - uy + ux * .7, x1, y1, x1 - ux + uy * .7, y1 - uy - ux * .7], 1.0013);
    const m = pts.length >> 2 << 1; mapLabel(name, pts[m + 1], pts[m], 3.4, 'sea', 'proudy', () => showInfo({ name, txt: name + (warm ? ', teplý' : ', studený') + ' mořský proud.', note: 'Na mapě je zjednodušené schéma, skutečný proud se vlní a mění se během roku.', facts: [['Druh', warm ? 'teplý proud' : 'studený proud']], wiki: { s: name, name, word: 'proud', km: Infinity } }), 'mořský proud');
  }
  lines.forEach((l, warm) => { const f = fat(l, 2.6); f.material.color.set(warm ? 0xff6f4f : 0x4fc3ff); curG.add(f); });
  mapPool.sort((a, b) => b.maxD - a.maxD);
}

/* ---------- sopky (Smithsonian GVP), stahují se až při zapnutí vrstvy ---------- */
let volc = null, volcWait = null;
const eruption = y => y == null ? 'neznámá, ale v posledních 12 000 letech' : y >= new Date().getFullYear() - 1 ? 'soptí v posledních letech (' + y + ')' : y > 0 ? 'v roce ' + y : 'asi v roce ' + num(-y) + ' př. n. l.';
function volcCard(v) {
  const [name, lat, lon, elev, kind, year] = v, i = countryAt(lon, lat);
  return { name, txt: name + ', ' + kind + (i >= 0 ? ', ' + GEO.c[i][0] : '') + '.', note: 'Údaje: Smithsonian Institution, Global Volcanism Program.',
    facts: [['Druh', kind], ['Výška', elev != null ? num(elev) + ' m' + (elev < 0 ? ' (pod hladinou moře)' : '') : ''], ['Poslední erupce', eruption(year)], ['Stát', i >= 0 ? GEO.c[i][0] : 'v moři nebo na hranici']].filter(f => f[1]),
    wiki: { s: name + ' sopka', name, lat, lon, km: 80, word: 'sop' } };
}
function loadVolcanoes() {
  if (volcWait) return volcWait;
  return volcWait = getJson('data/sopky.json').then(list => {
    volc = list;
    const tex = canvasTex((cx, s) => { cx.fillStyle = '#e8402a'; cx.strokeStyle = '#fff'; cx.lineWidth = s * .06; cx.beginPath(); cx.moveTo(s / 2, s * .12); cx.lineTo(s * .9, s * .85); cx.lineTo(s * .1, s * .85); cx.closePath(); cx.fill(); cx.stroke(); }, 64);
    const recent = [], old = [];
    for (const v of list) { const w = mapP(v[2], v[1], 1.0015); (v[5] >= 2000 ? recent : old).push(w.x, w.y, w.z); }
    volc.obj = [points(recent, new THREE.PointsMaterial({ size: 15, sizeAttenuation: false, map: tex, alphaTest: .5 })), points(old, new THREE.PointsMaterial({ size: 9, sizeAttenuation: false, map: tex, alphaTest: .5 }))];
    volc.obj.forEach(o => { o.visible = !!lay.sopky; gM.add(o); });
    for (const v of list) mapLabel(v[0], v[1], v[2], v[5] >= 2000 ? 2.2 : 1.35, 'vol', 'sopky', () => { mapSelect({ lat: v[1], lon: v[2] }); showInfo(volcCard(v)); }, 'sopka', v[4]);
    mapPool.sort((a, b) => b.maxD - a.maxD);
  }).catch(err => { volcWait = null; throw err; });
}

/* ---------- vesmírná stanice právě teď (wheretheiss.at), poloha se obnovuje každých 5 s ---------- */
const issDot = points([0, 0, 0], new THREE.PointsMaterial({ size: 26, sizeAttenuation: false, transparent: true, depthTest: false, map: canvasTex((cx, s) => { cx.fillStyle = '#fff'; cx.fillRect(s * .42, s * .3, s * .16, s * .4); cx.fillStyle = '#4f86ff'; cx.fillRect(s * .1, s * .4, s * .3, s * .2); cx.fillRect(s * .6, s * .4, s * .3, s * .2); }, 64) }));
issDot.visible = false; gM.add(issDot);
let issNow = null, issTimer = 0, issBusy = false;
label('Vesmírná stanice teď', issDot, 0, () => L.id === 'mapa' && !!lay.issNow && !!issNow && front0(issDot), () => showInfo(issCard(true)), 'home');
function issCard(fly) {
  if (fly && issNow) mapFly(issNow.latitude, issNow.longitude, 1.9);
  if (!issNow) return { name: 'Vesmírná stanice teď', txt: 'Zjišťuji, kde stanice právě je…', note: '', facts: [] };
  const i = countryAt(issNow.longitude, issNow.latitude);
  return { name: 'Vesmírná stanice teď', txt: 'Mezinárodní vesmírná stanice právě letí nad ' + (i >= 0 ? 'státem ' + GEO.c[i][0] : 'mořem') + '. Poloha se obnovuje každých pět vteřin.', note: 'Poloha: wheretheiss.at. Čas na mapě běží podle nastavení, stanice ale ukazuje skutečný okamžik.', wiki: INFO.ISS.wiki,
    facts: [['Výška', num(Math.round(issNow.altitude)) + ' km'], ['Rychlost', num(Math.round(issNow.velocity)) + ' km/h'], ['Je nad ní', issNow.visibility === 'daylight' ? 'den' : 'noc'], ['Poloha', issNow.latitude.toFixed(1).replace('.', ',') + '°, ' + issNow.longitude.toFixed(1).replace('.', ',') + '°']] };
}
function pollIss(now) {
  if (issBusy || now - issTimer < 5000) return; issBusy = true; issTimer = now;
  getJson('https://api.wheretheiss.at/v1/satellites/25544').then(d => {
    if (!Number.isFinite(d.latitude) || !Number.isFinite(d.longitude)) return;
    issNow = d; issDot.position.copy(mapP(d.longitude, d.latitude, 1.0016 + (d.altitude || 0) / 6371 * 0)); issDot.visible = true;
    if (info && info.name === 'Vesmírná stanice teď') card(issCard(false));
  }).catch(() => {}).finally(() => { issBusy = false; });
}

/* ---------- karty k vrstvám a jejich zapínání ---------- */
const MAP_LAY_CARDS = {
  noc: () => ({ name: 'Den a noc na mapě', txt: 'Tmavá část Země je právě v noci, rozsvícená místa jsou města. Žlutá tečka je místo, kde je Slunce právě přímo nad hlavou. Hranice dne a noci se posouvá na západ o 15° za hodinu.', note: 'Čas a jeho rychlost nastavíš dole, datum v ozubeném kolečku. Hranici světla model kreslí bez soumraku a lomu světla v atmosféře.', facts: [['Jedno otočení Země', '24 hodin'], ['Rychlost hranice na rovníku', 'asi 1 670 km/h']], wiki: { t: 'Den', noImg: true } }),
  pasma: () => ({ name: 'Časová pásma', txt: 'Země se otočí o 15° za hodinu, proto je svět rozdělený na 24 pásem po 15°. Ve stejném pásmu ukazují hodiny stejný čas. Jmenovky ukazují, kolik je v pásmu hodin.', note: 'Na mapě jsou pásma pravidelná. Skutečné hranice se drží hranic států a krajů a některé státy mají posun o půl hodiny.', facts: [['Česko', 'UTC+1, v létě UTC+2'], ['Nejvíc pásem', 'Francie se zámořím, 12']], wiki: { t: 'Časové pásmo' } }),
  podnebi: () => ({ name: 'Podnebné pásy', txt: 'Čím dál od rovníku, tím šikměji dopadá sluneční světlo a tím je chladněji. Proto se Země dělí na podnebné pásy: tropický, subtropický, mírný, subpolární a polární.', note: 'Na mapě jsou pásy zjednodušeně podle zeměpisné šířky. Skutečné hranice posouvají moře, proudy a hory.', facts: [['Tropický', 'mezi obratníky'], ['Subtropický', 'do 40°'], ['Mírný', 'do 60°, tady žijeme'], ['Subpolární', 'do polárních kruhů'], ['Polární', 'za polárními kruhy']], wiki: { t: 'Klasifikace podnebí' }, legend: [['#e85c40', 'tropický'], ['#f2a840', 'subtropický'], ['#6bbf6b', 'mírný'], ['#59a8d6', 'subpolární'], ['#e6eff9', 'polární']] }),
  lide: () => ({ name: 'Kde žijí lidé', txt: 'Na Zemi žije přes 8 miliard lidí, ale rozložení je velmi nerovné. Nejvíc jich žije ve východní a jižní Asii, v Evropě a podél řek a pobřeží. Pouště, hory a polární oblasti jsou skoro prázdné.', note: 'Mapa je spočítaná z 25 000 měst nad 15 000 obyvatel (GeoNames), lidé na venkově v ní chybí.', facts: [['Lidí na Zemi', 'přes 8 miliard'], ['Ve městech', 'víc než polovina']], wiki: { t: 'Hustota zalidnění' }, legend: [['#fff3b0', 'málo'], ['#ff9a3c', ''], ['#d7301f', ''], ['#780028', 'nejvíc']] }),
  proudy: () => ({ name: 'Mořské proudy', txt: 'Mořská voda neustále proudí jako obří řeky v oceánu. Teplé proudy (červeně) nesou teplo od rovníku k pólům, studené (modře) vracejí chladnou vodu. Díky Golfskému proudu je v Evropě tepleji než v Kanadě ve stejné zeměpisné šířce.', note: 'Na mapě je zjednodušené schéma hlavních proudů.', facts: [['Teplé proudy', 'červeně'], ['Studené proudy', 'modře'], ['Největší', 'Antarktický cirkumpolární proud']], wiki: { t: 'Mořský proud' }, legend: [['#ff6f4f', 'teplý proud'], ['#4fc3ff', 'studený proud']] }),
  sopky: () => volc ? ({ name: 'Sopky', txt: 'Na mapě je ' + num(volc.length) + ' sopek, které soptily v posledních zhruba 12 000 letech. Větší trojúhelník znamená erupci od roku 2000. Většina leží na hranicích tektonických desek, hlavně kolem Tichého oceánu v takzvaném Ohnivém kruhu.', note: 'Údaje: Smithsonian Institution, Global Volcanism Program. Ťukni na jméno sopky a dozvíš se víc.', facts: [['Sopek na mapě', num(volc.length)], ['Soptily od roku 2000', num(volc.filter(v => v[5] >= 2000).length)]], wiki: { t: 'Sopka' },
    chips: volc.slice(0, 10).map(v => [v[0], () => { mapSelect({ lat: v[1], lon: v[2] }); showInfo(volcCard(v)); mapFly(v[1], v[2], 1.25); }]), chipsTitle: 'Soptily naposledy' }) : ({ name: 'Sopky', txt: 'Stahuji seznam sopek…', note: '', facts: [] }),
  issNow: () => issCard(true),
};
function mapLayCard(key) {
  const c = MAP_LAY_CARDS[key](); c.layer = key;
  showInfo(c);
  if (c.legend) { // legenda vrstvy pod nadpisem karty, stejně jako u barevné mapy
    const lg = $('#legend'); lg.replaceChildren(); const h = document.createElement('strong'); h.textContent = c.name; lg.append(h);
    for (const [col, text] of c.legend) { const r = document.createElement('span'), sw = document.createElement('i'); sw.style.background = col; r.append(sw, text); lg.append(r); }
    lg.hidden = false;
  }
}
const setLay0 = setLay;
setLay = (key, on) => { // stávající přepínání vrstev doplněné o vrstvy mapy
  setLay0(key, on);
  if (!(key in MAP_LAY_CARDS) || L.id !== 'mapa') return;
  if (key === 'lide' && on && !ovU.densT.value) ovU.densT.value = densTex();
  if (key === 'proudy' && on && !curG.children.length) buildCurrents();
  if (key === 'sopky' && on) loadVolcanoes().then(() => { volc.obj.forEach(o => o.visible = !!lay.sopky); if (lay.sopky && info && info.layer === 'sopky') mapLayCard('sopky'); }).catch(() => { $('#note').textContent = 'Sopky se nepodařilo stáhnout.'; });
  if (key === 'sopky' && volc && volc.obj) volc.obj.forEach(o => o.visible = !!on);
  if (key === 'issNow') issTimer = 0;
  if (on) mapLayCard(key); else if (info && info.layer === key) goBack();
};
function stepMapLayers(now) { // volá hlavní smyčka v pohledu na mapu
  ovU.night.value = lay.noc; ovU.climate.value = lay.podnebi; ovU.dens.value = lay.lide && ovU.densT.value ? 1 : 0;
  overlay.visible = !!(lay.noc || lay.podnebi || lay.lide);
  const [la, lo] = subSolar(simMs); ovU.sunDir.value.copy(latLon(la, lo)); sunDot.position.copy(ovU.sunDir.value).multiplyScalar(1.002); sunDot.visible = !!lay.noc;
  tzG.visible = !!lay.pasma; if (lay.pasma) stepZones();
  curG.visible = !!lay.proudy;
  issDot.visible = !!lay.issNow && !!issNow; if (lay.issNow) pollIss(now);
}
