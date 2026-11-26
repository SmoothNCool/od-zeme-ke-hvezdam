// Sluneční soustava. Soubory v js/ sdílejí jeden prostor jmen a načítají se v pořadí podle čísla.
/* ---------- Sluneční soustava (velikosti a vzdálenosti nejsou v měřítku) ---------- */
const gS = new THREE.Group(); scene.add(gS);
const gOrb = new THREE.Group(); gS.add(gOrb); // všechno, co v režimu skutečných velikostí mizí
gS.add(new THREE.PointLight(0xffffff, 1.5, 0), new THREE.AmbientLight(0xffffff, .3));
const sunMesh = new THREE.Mesh(new THREE.SphereGeometry(3, 48, 32), new THREE.MeshBasicMaterial({ map: sunT }));
gS.add(sunMesh); gOrb.add(glow(0xffa530, 16));
const SUN = { name: 'Slunce', r: 3, holder: sunMesh, moons: [],
  txt: 'Slunce je hvězda, obrovská žhavá koule. Vešlo by se do něj víc než milion Zemí.', note: 'Svítí a hřeje na všechny planety.' };
sunMesh.userData.p = SUN;
const picks = [sunMesh];
function pickable(holder, p, r) { const m = new THREE.Mesh(new THREE.SphereGeometry(r, 12, 8), new THREE.MeshBasicMaterial({ visible: false })); m.userData.p = p; holder.add(m); picks.push(m); }
// r = poloměr v modelu, R = dráha, T = oběh ve dnech, real = skutečný poloměr (Země = 1), lm = minuty světla ze Slunce
// kreslené (ne fotografické) povrchy: základní barva, skvrny [barva, počet, min. a max. poloměr, krytí] a volitelná dokreslovačka
function bodyTex(base, blots, extra) {
  return canvasTex((g, s) => {
    g.fillStyle = base; g.fillRect(0, 0, s, s);
    for (const [color, n, r0, r1, alpha] of blots) {
      g.fillStyle = color; g.globalAlpha = alpha;
      for (let i = 0; i < n; i++) { const r = r0 + Math.random() * (r1 - r0); g.beginPath(); g.ellipse(Math.random() * s, s * (.08 + .84 * Math.random()), r * .5, r, 0, 0, TAU); g.fill(); } // na kouli se šířka zdvojnásobí
    }
    g.globalAlpha = 1; if (extra) extra(g, s);
  }, 256);
}
const craters = base => bodyTex(base, [['#000', 45, 2, 9, .22], ['#fff', 25, 2, 8, .18]]);
const BODY_TEX = {
  Pluto: () => bodyTex('#b89b7e', [['#5b4636', 22, 10, 28, .35], ['#d9c6ad', 14, 8, 20, .3]], (g, s) => { // světlé srdce, které vyfotila sonda New Horizons
    g.fillStyle = '#f6eee0'; g.beginPath(); g.arc(s * .47, s * .47, s * .045, 0, TAU); g.arc(s * .53, s * .47, s * .045, 0, TAU); g.fill();
    g.beginPath(); g.moveTo(s * .425, s * .49); g.lineTo(s * .575, s * .49); g.lineTo(s * .5, s * .66); g.fill();
  }),
  Io: () => bodyTex('#e5cf55', [['#f4f0c0', 15, 6, 14, .4], ['#c4651c', 40, 3, 9, .7], ['#3a2a12', 18, 2, 5, .8]]),
  Europa: () => bodyTex('#e9e2d2', [['#cfc4ae', 12, 10, 30, .3]], (g, s) => { // síť hnědých prasklin v ledu
    g.strokeStyle = '#8a5a3a'; g.globalAlpha = .5; g.lineWidth = 1.2;
    for (let i = 0; i < 45; i++) { g.beginPath(); g.moveTo(Math.random() * s, Math.random() * s); g.quadraticCurveTo(Math.random() * s, Math.random() * s, Math.random() * s, Math.random() * s); g.stroke(); }
    g.globalAlpha = 1;
  }),
  Ganymed: () => bodyTex('#8f877c', [['#c9c3b8', 30, 6, 20, .35], ['#5a534b', 30, 6, 18, .35]]),
  Callisto: () => bodyTex('#4f463e', [['#d8d2c6', 90, 1, 3, .8]]),
  Titan: () => bodyTex('#d99a3a', [], (g, s) => { for (let i = 0; i < 14; i++) { g.fillStyle = i % 2 ? '#c07f25' : '#edb65a'; g.globalAlpha = .3; g.fillRect(0, Math.random() * s, s, 6 + Math.random() * 22); } g.globalAlpha = 1; }),
};
const hex = c => '#' + c.toString(16).padStart(6, '0');
let rowX = 2;
// oběžné doby měsíců ve dnech (záporná = obíhá pozpátku)
const MOON_DAYS = { 'Měsíc': 27.3, Phobos: .32, Deimos: 1.26, Io: 1.77, Europa: 3.55, Ganymed: 7.15, Callisto: 16.7, Titan: 15.9, Titania: 8.7, Triton: -5.88, Charon: 6.39 };
const planets = [
  { name: 'Merkur', t: 'mercury.jpg', r: .35, R: 6, T: 88, tilt: 0, real: .38, lm: 3.2, dat: 'k Merkuru', moons: [], txt: 'Nejmenší planeta a nejblíž u Slunce. Rok tam trvá jen 88 dní.', note: 'Nemá žádný měsíc.' },
  { name: 'Venuše', t: 'venus_atmosphere.jpg', r: .6, R: 8.5, T: 225, tilt: 3, real: .95, lm: 6, dat: 'k Venuši', moons: [], txt: 'Nejteplejší planeta, je tam tepleji než v troubě. Celá je schovaná v hustých mracích.', note: 'Nemá žádný měsíc.' },
  { name: 'Země', t: 'earth_daymap.jpg', r: .65, R: 11.5, T: 365.25, tilt: 23.4, real: 1, lm: 8.3, dat: 'k Zemi', moons: [['Měsíc', 0xcfcfcf]], txt: 'Náš domov. Jediná planeta, o které víme, že na ní někdo žije.', note: 'Má jeden měsíc.' },
  { name: 'Mars', t: 'mars.jpg', r: .45, R: 14.5, T: 687, tilt: 25, real: .53, lm: 12.7, dat: 'k Marsu', moons: [['Phobos', 0x9a8f85], ['Deimos', 0xb0a698]], txt: 'Červená planeta. Je červená, protože je na ní rezavý prach. Jezdí po ní robotická autíčka.', note: 'Má dva malé měsíce.' },
  { name: 'Jupiter', t: 'jupiter.jpg', r: 1.8, R: 20, T: 4333, tilt: 3, real: 11.2, lm: 43, dat: 'k Jupiteru', moons: [['Io', 0xe8d36a], ['Europa', 0xd9cbb0], ['Ganymed', 0xa39b8f], ['Callisto', 0x7a7168]], txt: 'Největší planeta. Je celá z plynu, nedá se na ní stát. Červená skvrna je obrovská bouřka, větší než celá Země.', note: 'Má skoro sto měsíců, tady vidíš čtyři největší.' },
  { name: 'Saturn', t: 'saturn.jpg', r: 1.5, R: 27, T: 10759, tilt: 27, real: 9.45, lm: 80, dat: 'k Saturnu', moons: [['Titan', 0xd9a441]], txt: 'Planeta s prstenci. Prstence jsou z kousků ledu a kamení.', note: 'Má přes 270 měsíců, největší je Titan.' },
  { name: 'Uran', t: 'uranus.jpg', r: 1, R: 33, T: 30687, tilt: 98, real: 4, lm: 160, dat: 'k Uranu', moons: [['Titania', 0xb8b3ad]], txt: 'Ledová planeta, která se kutálí po boku jako míč.', note: 'Má skoro 30 měsíců, největší je Titania.' },
  { name: 'Neptun', t: 'neptune.jpg', r: .95, R: 38, T: 60190, tilt: 28, real: 3.88, lm: 250, dat: 'k Neptunu', moons: [['Triton', 0xd8c9c2]], txt: 'Nejvzdálenější planeta. Je tam hrozná zima a fouká tam nejsilnější vítr ze všech planet. Rok tam trvá 165 našich let.', note: 'Má 16 měsíců, největší je Triton.' },
  { name: 'Pluto', dwarf: true, color: 0xcdb69c, r: .25, R: 43, T: 90560, tilt: 120, real: .19, lm: 328, dat: 'k Plutu', moons: [['Charon', 0xa9a39c]], txt: 'Pluto není planeta, je to trpasličí planeta. Je menší než náš Měsíc a neobíhá v jedné rovině s planetami, jeho dráha je šišatá a nakloněná. Mezi planety se počítalo do roku 2006.', note: 'Má pět měsíců, největší je Charon. Světlé srdce na povrchu je kreslené podle fotek sondy New Horizons.' },
].map((p, i) => {
  const holder = new THREE.Group(), tg = new THREE.Group(); tg.rotation.z = rad(p.tilt); holder.add(tg);
  const mesh = new THREE.Mesh(new THREE.SphereGeometry(p.r, 48, 32), new THREE.MeshLambertMaterial({ map: p.t ? tex(p.t) : BODY_TEX[p.name]() })); tg.add(mesh);
  const ringed = p.name === 'Saturn';
  if (ringed) {
    const g = new THREE.RingGeometry(p.r*1.25, p.r*2.3, 96), pos = g.attributes.position, uv = g.attributes.uv, v = V();
    for (let j = 0; j < pos.count; j++) { v.fromBufferAttribute(pos, j); uv.setXY(j, (v.length() - p.r*1.25) / (p.r*1.05), .5); }
    const rg = new THREE.Mesh(g, new THREE.MeshBasicMaterial({ map: tex('saturn_ring_alpha.png'), transparent: true, side: THREE.DoubleSide }));
    rg.rotation.x = -Math.PI / 2; tg.add(rg);
  }
  const moons = p.moons.map(([mn, color], j) => {
    const pivot = new THREE.Group(), mr = Math.max(.07, p.r * .14);
    const m = new THREE.Mesh(new THREE.SphereGeometry(mr, 24, 16), new THREE.MeshLambertMaterial({ map: mn === 'Měsíc' ? moonT : (BODY_TEX[mn] || (() => craters(hex(color))))() }));
    m.position.x = p.r * (ringed ? 2.8 : 1.9) + j * p.r * .5; pivot.add(m); tg.add(pivot);
    pivot.rotation.y = j * 2.1;
    return { name: mn, pivot, mesh: m, r: mr, T: MOON_DAYS[mn] };
  });
  gS.add(holder);
  // řada vedle sebe pro skutečné velikosti: 1 Země = 0,5 jednotky
  const half = p.real * .5 * (ringed ? 2.3 : 1); rowX += half + 3; const row = V(rowX); rowX += half;
  Object.assign(p, { rot: [58.6, -243, .9973, 1.026, .414, .444, -.718, .671, -6.39][i], /* doba otočení kolem osy ve dnech */ a0: rad([252.25, 181.98, 100.46, 355.45, 34.4, 49.94, 313.23, 304.88, 238.93][i]), /* střední délka v J2000, ať planety stojí tam, kde doopravdy jsou */ holder, mesh, moons, row, k: p.real * .5 / p.r });
  pickable(holder, p, Math.max(p.r * 1.5, 1.7)); return p;
});
// skutečné tvary a sklony drah (J2000): výstřednost, sklon k ekliptice, délka výstupného uzlu, délka přísluní ve stupních
const ELEMENTS = [[.2056, 7, 48.33, 77.46], [.0068, 3.39, 76.68, 131.53], [.0167, 0, 0, 102.95], [.0934, 1.85, 49.56, 336.04], [.0484, 1.3, 100.47, 14.73],
  [.0539, 2.49, 113.66, 92.6], [.0473, .77, 74.02, 170.95], [.0086, 1.77, 131.78, 44.96], [.2488, 17.14, 110.3, 224.07]];
// bod dráhy pro excentrickou anomálii E: elipsa v rovině dráhy, pak natočení přísluní, sklon a uzel
function orbitPos(p, E) { return V(p.R * (Math.cos(E) - p.e), 0, -p.R * Math.sqrt(1 - p.e * p.e) * Math.sin(E)).applyMatrix4(p.M); }
planets.forEach((p, i) => {
  const [e, inc, node, peri] = ELEMENTS[i], rot = (axis, deg) => new THREE.Matrix4()['makeRotation' + axis](rad(deg));
  Object.assign(p, { e, inc, peri: rad(peri), M: rot('Y', node).multiply(rot('X', inc)).multiply(rot('Y', peri - node)) });
  const pts = Array.from({ length: 160 }, (_, k) => orbitPos(p, k / 160 * TAU));
  if (!p.dwarf) return gOrb.add(loop(pts));
  const dashed = new THREE.LineLoop(new THREE.BufferGeometry().setFromPoints(pts), new THREE.LineDashedMaterial({ color: 0xa08c6e, dashSize: 1.1, gapSize: .9 })); // trpasličí planeta = čárkovaná dráha
  dashed.computeLineDistances(); gOrb.add(dashed);
});
console.assert(orbitPos(planets[0], 1.2).y !== 0 && Math.abs(orbitPos(planets[2], 1.2).y) < 1e-9, 'sklon: Merkur mimo rovinu, Země v ní');
const SUN_BIG = 109 * .5 / 3, SUN_X = -(109 * .5) + .5;
const lightTable = [[3, 0], ...planets.map(p => [p.R, p.lm])];
function lightMin(r) { // model není v měřítku, takže minuty dopočítáme mezi drahami planet
  for (let i = 1; i < lightTable.length; i++) { const [r0, m0] = lightTable[i - 1], [r1, m1] = lightTable[i]; if (r <= r1) return m0 + (m1 - m0) * Math.max(0, r - r0) / (r1 - r0); }
  return lightTable[lightTable.length - 1][1];
}
console.assert(Math.abs(lightMin(11.5) - 8.3) < 1e-9 && lightMin(3) === 0, 'lightMin');
const lightRing = ring(1, 0xfff0a0); lightRing.material.opacity = 1; lightRing.visible = false; gOrb.add(lightRing);
// pás asteroidů mezi Marsem a Jupiterem
const rockTex = canvasTex((g, s) => { // kulatý kamínek osvětlený z jedné strany
  const r = g.createRadialGradient(s * .36, s * .34, s * .04, s / 2, s / 2, s * .46);
  r.addColorStop(0, '#fff'); r.addColorStop(.6, '#9a9a9a'); r.addColorStop(1, '#3a3a3a');
  g.fillStyle = r; g.beginPath(); g.arc(s / 2, s / 2, s * .44, 0, TAU); g.fill();
}, 64);
const belt = new THREE.Group();
[[1500, .16, 0x8f8473], [450, .26, 0xb3a48c], [120, .4, 0x7d776f]].forEach(([n, size, color]) => {
  const p = []; for (let i = 0; i < n; i++) { const a = Math.random() * TAU, r = 16.2 + Math.random() * 2.1; p.push(Math.cos(a) * r, gauss() * .25, Math.sin(a) * r); }
  belt.add(points(p, new THREE.PointsMaterial({ color, size, map: rockTex, alphaTest: .5 })));
});
const beltMark = new THREE.Object3D(); beltMark.position.set(-17.2, 0, 0); belt.add(beltMark); gOrb.add(belt);
// kometa na protáhlé dráze, ohon míří vždy od Slunce
const COMET = { a: 24, e: .74, T: 1400 }; COMET.b = COMET.a * Math.sqrt(1 - COMET.e ** 2);
const cometPlane = new THREE.Group(); cometPlane.rotation.set(rad(18), 0, rad(8)); gOrb.add(cometPlane);
cometPlane.add(loop(Array.from({ length: 128 }, (_, i) => V(COMET.a * (Math.cos(i/128*TAU) - COMET.e), 0, -COMET.b * Math.sin(i/128*TAU))), 0x2c5a66));
const comet = { name: 'Kometa', r: .6, holder: new THREE.Group(), moons: [],
  txt: 'Kometa je špinavá ledová koule. Když přiletí blízko ke Slunci, led se vypařuje a udělá jí dlouhý ohon.', note: 'Ohon míří vždycky od Slunce pryč.' };
cometPlane.add(comet.holder); comet.holder.add(glow(0xffffff, 1.1));
const tail = Array.from({ length: 12 }, (_, i) => { const s = glow(0x9fe8ff, .9 * (1 - i / 14), .5 * (1 - i / 13)); comet.holder.add(s); return s; });
pickable(comet.holder, comet, 1.7);
