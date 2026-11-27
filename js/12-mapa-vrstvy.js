// Další vrstvy mapy světa: den a noc, časová pásma, podnebné pásy, kde žijí lidé, mořské proudy, sopky, vesmírná stanice právě teď.
// Soubory v js/ sdílejí jeden prostor jmen a načítají se v pořadí podle čísla.
LAY_VIEWS.mapa.push(['noc', 'Den a noc'], ['pasma', 'Časová pásma'], ['podnebi', 'Podnebné pásy'], ['lide', 'Kde žijí lidé'], ['proudy', 'Mořské proudy'], ['sopky', 'Sopky'], ['issNow', 'Vesmírná stanice teď']);
Object.assign(lay, { noc: 0, pasma: 0, podnebi: 0, lide: 0, proudy: 0, sopky: 0, issNow: 0 });

/* ---------- průsvitná koule nad pevninou: noc, podnebné pásy, hustota lidí ---------- */
const ovU = { sunDir: { value: V(1, 0, 0) }, night: { value: 0 }, climate: { value: 0 }, dens: { value: 0 }, densT: { value: null }, nightT: { value: nightT }, tz: { value: 0 }, tzT: { value: null } };
const overlay = new THREE.Mesh(new THREE.SphereGeometry(1.00085, 160, 100), new THREE.ShaderMaterial({
  // bez hloubkového testu: pevnina je poskládaná z rovných trojúhelníků a koule by se s ní ve stejné výšce přetahovala; kreslí se jen přivrácená polokoule
  uniforms: ovU, transparent: true, depthWrite: false, depthTest: false,
  vertexShader: 'varying vec2 vUv;varying vec3 vN;void main(){vUv=uv;vN=normalize(position);gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0);}',
  // podnebné pásy zjednodušeně podle zeměpisné šířky; noc ztmaví povrch a rozsvítí města z noční fotky
  fragmentShader: 'uniform vec3 sunDir;uniform float night,climate,dens,tz;uniform sampler2D densT,nightT,tzT;varying vec2 vUv;varying vec3 vN;' +
    'vec3 band(float a){return a<23.44?vec3(.91,.36,.25):a<40.0?vec3(.95,.66,.25):a<60.0?vec3(.42,.75,.42):a<66.56?vec3(.35,.66,.84):vec3(.9,.94,.98);}' +
    'void main(){vec3 c=vec3(0.0);float ca=0.0;float lat=degrees(asin(clamp(vN.y,-1.0,1.0)));' +
    'if(climate>0.5){c=band(abs(lat));ca=0.5;}' +
    'if(dens>0.5){vec4 d=texture2D(densT,vUv);c=mix(c,d.rgb,d.a);ca=max(ca,d.a);}' +
    'if(tz>0.5){vec4 d=texture2D(tzT,vUv);c=mix(c,d.rgb,d.a);ca=max(ca,d.a);}' +
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

/* ---------- časová pásma tak, jak opravdu jsou (Natural Earth): barevné oblasti, hranice a jmenovky s časem ---------- */
const tzG = new THREE.Group(); tzG.visible = false; gM.add(tzG);
let tzData = null, tzWait = null, tzMinute = -1;
const tzName = z => 'UTC' + (z ? (z > 0 ? '+' : '−') + Math.floor(Math.abs(z)) + (Math.abs(z) % 1 ? ':' + String(Math.round(Math.abs(z) % 1 * 60)).padStart(2, '0') : '') : '');
console.assert(tzName(5.75) === 'UTC+5:45' && tzName(-3.5) === 'UTC−3:30' && tzName(0) === 'UTC', 'tzName');
const tzTime = z => new Date(simMs + z * 36e5).toISOString().slice(11, 16);
// jako na klasické mapě pásem: celé hodiny se střídají ve dvou modrých, posun o půl nebo čtvrt hodiny je oranžový (barvy prošly kontrolou rozlišitelnosti)
const TZ_EVEN = '#2f4fb0', TZ_ODD = '#7f9cf0', TZ_HALF = '#d9902a';
const tzColor = z => z % 1 ? TZ_HALF : ((Math.round(z) % 2) + 2) % 2 ? TZ_ODD : TZ_EVEN;
function loadZones() {
  if (tzWait) return tzWait;
  return tzWait = getJson('data/pasma.json').then(list => {
    tzData = list;
    const W2 = 4096, H2 = 2048, cv = document.createElement('canvas'); cv.width = W2; cv.height = H2; const g = cv.getContext('2d'); g.globalAlpha = .72;
    const lines = [];
    const tzBest = new Map();
    for (const [z, , marks] of list) for (const [la, lo] of marks) { const b = tzBest.get(z); if (!b || Math.abs(la) < Math.abs(b[0])) tzBest.set(z, [la, lo]); }
    for (const [z, col, marks, rings] of list) {
      g.fillStyle = tzColor(z); g.beginPath();
      for (const r of rings) { const flat = dec(r); for (let k = 0; k < flat.length; k += 2) g[k ? 'lineTo' : 'moveTo']((flat[k] + 180) / 360 * W2, (90 - flat[k + 1]) / 180 * H2); g.closePath(); seg(lines, flat, 1.0012); }
      g.fill('evenodd');
      for (const [la, lo] of marks) mapLabel(tzName(z) + ' · ' + tzTime(z), la, lo, tzBest.get(z)[0] === la && tzBest.get(z)[1] === lo ? 99 : 2.1, 'tz', 'pasma', () => showZone(z), 'časové pásmo'); mapPool[mapPool.length - 1].tz = z;
    }
    ovU.tzT.value = new THREE.CanvasTexture(cv);
    const f = fat(lines, 2.2); f.material.color.set(0xffffff); f.material.opacity = .85; tzG.add(f);
    mapPool.sort((a, b) => b.maxD - a.maxD); tzMinute = -1;
  }).catch(err => { tzWait = null; throw err; });
}
const zoneRings = z => tzData.filter(t => t[0] === z).flatMap(t => t[3].map(dec));
function showZone(z) {
  mapSelect({ rings: zoneRings(z) });
  showInfo({ name: 'Časové pásmo ' + tzName(z), txt: 'V tomhle pásmu je teď ' + tzTime(z) + '.', note: 'Čas se počítá podle hodin dole, bez letního času. Zvýrazněná jsou všechna místa se stejným časem.', facts: [['Posun proti světovému času', tzName(z)], ['Proti Česku', z === 1 ? 'stejný čas' : (z > 1 ? '+' : '−') + dec1(Math.abs(z - 1)).replace('.', ',') + ' h']], wiki: { t: 'Časové pásmo', noImg: true } });
}
function zoneAt(lon, lat) { // které pásmo leží pod bodem (paprskový test jako u států)
  if (!tzData) return null;
  for (const [z, , , rings] of tzData) { let inside = false; for (const r of rings) { const f = dec(r); for (let a = 0, b = f.length - 2; a < f.length; b = a, a += 2) if ((f[a + 1] > lat) !== (f[b + 1] > lat) && lon < (f[b] - f[a]) * (lat - f[a + 1]) / (f[b + 1] - f[a + 1]) + f[a]) inside = !inside; } if (inside) return z; }
  return null;
}
function stepZones() { // jmenovky ukazují čas v pásmu, obnovují se jednou za minutu modelu
  const minute = Math.floor(simMs / 6e4); if (minute === tzMinute || !tzData) return; tzMinute = minute;
  for (const m of mapPool) if (m.tz !== undefined) { m.text = tzName(m.tz) + ' · ' + tzTime(m.tz); if (m.el) { m.el.textContent = m.text; m.w = m.el.offsetWidth || m.w; } }
}

/* ---------- mořské proudy: hladké křivky, po kterých plynou čárky ve směru proudu ---------- */
// [jméno, teplý 1 / studený 0, [délka, šířka, …]]; schéma hlavních proudů podle učebnicových map
const CURRENTS = [
  ['Golfský proud', 1, [-81, 25, -79.8, 28.5, -78.5, 32, -75.5, 35.5, -71, 38.3, -64, 40, -55, 41.5, -48, 43]],
  ['Severoatlantský proud', 1, [-48, 43, -40, 47, -30, 51, -20, 54.5, -11, 58, -2, 62, 7, 66.5, 16, 71]],
  ['Kanárský proud', 0, [-11, 42, -14, 36, -17, 29, -19, 23, -21, 17]],
  ['Severní rovníkový proud', 1, [-22, 15, -35, 14.5, -48, 14.5, -60, 15.5, -72, 18]],
  ['Labradorský proud', 0, [-62, 66, -58, 61, -54, 55, -51.5, 50, -52, 45]],
  ['Jižní rovníkový proud', 1, [9, -1, -2, -2, -14, -3.5, -26, -5, -34, -7]],
  ['Brazilský proud', 1, [-35, -10, -38, -16, -41, -22, -45, -27, -50, -33, -54, -38]],
  ['Benguelský proud', 0, [17, -35, 14, -29, 12, -22, 10, -15, 8, -8]],
  ['Agulhaský proud', 1, [41, -14, 38, -21, 35, -27, 30, -32, 24, -36, 19, -38]],
  ['Jižní rovníkový proud', 1, [105, -12, 93, -13, 80, -13.5, 66, -13.5, 52, -14]],
  ['Západoaustralský proud', 0, [113, -36, 113.5, -30, 113, -24, 111, -18]],
  ['Kurošio', 1, [122, 22, 125, 26, 129, 29.5, 134, 32.5, 140, 35, 148, 36.5, 158, 38]],
  ['Ojašio', 0, [163, 56, 158, 52, 152, 47, 146, 42.5]],
  ['Severní rovníkový proud', 1, [-110, 13, -125, 13, -140, 13, -155, 13.5, -170, 13.5, 175, 14, 160, 14.5, 140, 15]],
  ['Kalifornský proud', 0, [-128, 48, -126, 42, -123, 36, -119, 30, -115, 24]],
  ['Jižní rovníkový proud', 1, [-84, -4, -95, -5, -110, -6, -125, -7.5, -140, -9.5, -155, -12]],
  ['Humboldtův proud', 0, [-76, -46, -75, -39, -73, -31, -73, -23, -76, -15, -81, -6]],
  ['Východoaustralský proud', 1, [154, -14, 155, -20, 155, -26, 154, -31, 152, -36]],
  ['Antarktický cirkumpolární proud', 0, [-180, -58, -160, -60, -140, -60, -120, -59, -100, -58, -80, -58, -60, -57, -40, -54, -20, -52, 0, -51, 20, -50, 40, -50, 60, -50, 80, -51, 100, -52, 120, -53, 140, -55, 160, -57, 180, -58]],
];
const curG = new THREE.Group(); curG.visible = false; gM.add(curG);
const curMats = [];
function smooth(flat) { // Catmull-Rom: z lomené čáry hladká křivka
  const pts = []; for (let i = 0; i < flat.length; i += 2) pts.push(new THREE.Vector2(flat[i], flat[i + 1]));
  const out = [];
  for (let i = 0; i < pts.length - 1; i++) {
    const p0 = pts[Math.max(0, i - 1)], p1 = pts[i], p2 = pts[i + 1], p3 = pts[Math.min(pts.length - 1, i + 2)];
    for (let k = 0; k < 8; k++) { const t = k / 8, t2 = t * t, t3 = t2 * t;
      out.push(.5 * (2 * p1.x + (-p0.x + p2.x) * t + (2 * p0.x - 5 * p1.x + 4 * p2.x - p3.x) * t2 + (-p0.x + 3 * p1.x - 3 * p2.x + p3.x) * t3),
        .5 * (2 * p1.y + (-p0.y + p2.y) * t + (2 * p0.y - 5 * p1.y + 4 * p2.y - p3.y) * t2 + (-p0.y + 3 * p1.y - 3 * p2.y + p3.y) * t3)); }
  }
  out.push(pts[pts.length - 1].x, pts[pts.length - 1].y); return out;
}
function buildCurrents() {
  const named = new Set();
  for (const [name, warm, pts] of CURRENTS) {
    const line = smooth(unwrap(pts)), out = [], col = warm ? 0xff7d5c : 0x5cc8ff; seg(out, line, 1.0013);
    // široký průsvitný pruh ukazuje, kudy proud teče, čárky po něm plynou ve směru proudu
    const band = fat(out, 9); band.material.color.set(col); band.material.opacity = .22; curG.add(band);
    const f = fat(out, 3.4, .035); f.material.gapSize = .02; f.material.color.set(col); f.material.opacity = .95; f.renderOrder = 1; curG.add(f); curMats.push(f.material);
    if (named.has(name)) continue; named.add(name);
    const m = (line.length >> 2) << 1;
    mapLabel(name, line[m + 1], ((line[m] + 540) % 360) - 180, 3.4, warm ? 'curW' : 'curC', 'proudy', () => showInfo({ name, txt: name + (warm ? ', teplý' : ', studený') + ' mořský proud.', note: 'Na mapě je zjednodušené schéma, skutečný proud se vlní a mění se během roku.', facts: [['Druh', warm ? 'teplý proud' : 'studený proud']], wiki: { s: name, name, word: 'proud', km: Infinity } }), 'mořský proud');
  }
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
    for (const v of list) { mapLabel(v[0], v[1], v[2], v[5] >= 2000 ? 2.2 : 1.35, 'vol', 'sopky', () => { mapSelect({ lat: v[1], lon: v[2] }); showInfo(volcCard(v)); }, 'sopka', v[4]); mapPool[mapPool.length - 1].h = Math.max(0, v[3] || 0); }
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
    issNow = d; issDot.position.copy(mapP(d.longitude, d.latitude, 1.0016)); issDot.visible = true;
    iss.position.copy(latLon(d.latitude, d.longitude)).multiplyScalar(1.07); // v pohledu na Zemi sedí stanice nad skutečným místem, výška je zvětšená
    if (info && info.name === 'Vesmírná stanice teď') card(issCard(false));
  }).catch(() => {}).finally(() => { issBusy = false; });
}

/* ---------- karty k vrstvám a jejich zapínání ---------- */
const MAP_LAY_CARDS = {
  noc: () => ({ name: 'Den a noc na mapě', txt: 'Tmavá část Země je právě v noci, rozsvícená místa jsou města. Žlutá tečka je místo, kde je Slunce právě přímo nad hlavou. Hranice dne a noci se posouvá na západ o 15° za hodinu.', note: 'Čas a jeho rychlost nastavíš dole, datum v ozubeném kolečku. Hranici světla model kreslí bez soumraku a lomu světla v atmosféře.', facts: [['Jedno otočení Země', '24 hodin'], ['Rychlost hranice na rovníku', 'asi 1 670 km/h']], wiki: { t: 'Den', noImg: true } }),
  pasma: () => ({ name: 'Časová pásma', txt: 'Země se otočí o 15° za hodinu, proto se svět dělí na časová pásma. Ve stejném pásmu ukazují hodiny stejný čas. Hranice pásem se drží hranic států, proto jsou klikaté, a některé státy mají posun o půl hodiny. Jmenovky ukazují, kolik je v pásmu právě hodin.', note: 'Hranice pásem: Natural Earth. Čas je bez letního času a řídí se hodinami dole.', legend: [[TZ_EVEN, 'celé hodiny'], [TZ_ODD, 'sousední celé hodiny'], [TZ_HALF, 'posun o půl nebo čtvrt hodiny']], facts: [['Česko', 'UTC+1, v létě UTC+2'], ['Nejvíc pásem', 'Francie se zámořím, 12']], wiki: { t: 'Časové pásmo' } }),
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
  if (key === 'pasma' && on) loadZones().catch(() => { $('#note').textContent = 'Časová pásma se nepodařilo stáhnout.'; });
  if (key === 'sopky' && on) loadVolcanoes().then(() => { volc.obj.forEach(o => o.visible = !!lay.sopky); if (lay.sopky && info && info.layer === 'sopky') mapLayCard('sopky'); }).catch(() => { $('#note').textContent = 'Sopky se nepodařilo stáhnout.'; });
  if (key === 'sopky' && volc && volc.obj) volc.obj.forEach(o => o.visible = !!on);
  if (key === 'issNow') issTimer = 0;
  if (on) mapLayCard(key); else if (info && info.layer === key) goBack();
};
let mapLayLast = 0;
function stepMapLayers(now) { // volá hlavní smyčka v pohledu na mapu
  const dt = Math.min(.1, (now - mapLayLast) / 1000); mapLayLast = now;
  ovU.night.value = lay.noc; ovU.climate.value = lay.podnebi; ovU.dens.value = lay.lide && ovU.densT.value ? 1 : 0; ovU.tz.value = lay.pasma && ovU.tzT.value ? 1 : 0;
  overlay.visible = !!(lay.noc || lay.podnebi || lay.lide || lay.pasma);
  for (const m of curMats) m.dashOffset -= dt * .02;
  const [la, lo] = subSolar(simMs); ovU.sunDir.value.copy(latLon(la, lo)); sunDot.position.copy(ovU.sunDir.value).multiplyScalar(1.002); sunDot.visible = !!lay.noc;
  tzG.visible = !!lay.pasma; if (lay.pasma) stepZones();
  curG.visible = !!lay.proudy;
  issDot.visible = !!lay.issNow && !!issNow; if (lay.issNow) pollIss(now);
}

// ISS v pohledu na Zemi: místo věčného kroužení skutečná poloha nad tím místem, kde právě je
earth.add(iss); iss.scale.setScalar(1.6);
Object.assign(INFO.ISS, { note: 'Stanice je ve skutečné poloze, která se obnovuje každých pět vteřin. Výška nad Zemí je v modelu zvětšená, jinak by nebyla vidět.' });
function stepEarthIss(now) { iss.visible = !!lay.iss && !!issNow; if (lay.iss) pollIss(now); }

// popisek k bílému kruhu kolem severního pólu na přírodní mapě
const initMapData1 = initMapData;
initMapData = () => {
  initMapData1();
  mapLabel('Arktický mořský led', 86, 30, 3.6, 'sea', 'hory', () => showInfo({ name: 'Arktický mořský led', txt: 'Bílá čepice kolem severního pólu je zamrzlá hladina Severního ledového oceánu. Pod ní není pevnina, jen moře. V zimě led narůstá, v létě taje a jeho plocha se v posledních desetiletích zmenšuje.', note: 'Na satelitní mapě je led tak, jak byl na snímcích, ze kterých fotka vznikla.', facts: [['Tloušťka', 'většinou 1 až 4 m'], ['Nejmenší plocha', 'v září'], ['Největší plocha', 'v březnu']], wiki: { t: 'Mořský led' } }), 'moře');
  mapPool.sort((a, b) => b.maxD - a.maxD);
};
