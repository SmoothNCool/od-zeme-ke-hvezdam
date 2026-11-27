// Vrstvy Země a obzor pro pohled na oblohu. Soubory v js/ sdílejí jeden prostor jmen a načítají se v pořadí podle čísla.
/* ---------- Vrstvy Země: plochá výseč od středu Země až na okraj atmosféry ---------- */
// Není v měřítku: kůra a atmosféra by ve skutečném poměru nebyly vidět, proto má každá vrstva čitelnou tloušťku a skutečné hloubky a výšky jsou na jmenovkách.
// Na šířku leží výseč vodorovně (střed Země vlevo), na výšku svisle; jmenovky se střídají po obou stranách, aby se nepřekrývaly.
const gC = new THREE.Group(); scene.add(gC);
const cutG = new THREE.Group(), airG = new THREE.Group(), airClouds = new THREE.Group(); gC.add(cutG); cutG.add(airG, airClouds);
const CUT_A = rad(20); // polovina úhlu výseče
// [klíč karty, jmenovka, vnější poloměr v modelu, barva u spodního okraje, barva u horního okraje, patří k atmosféře]
const CUT = [['Jadro1', 'Vnitřní jádro\n5 150 až 6 371 km hluboko', 1.2, '#fffdf0', '#ffe98a'], ['Jadro2', 'Vnější jádro\n2 900 až 5 150 km', 2.6, '#ffe070', '#f4a024'], ['Plast', 'Plášť\n35 až 2 900 km', 4.2, '#f59331', '#a12c18'], ['Kura', 'Kůra\ndo 35 km', 4.8, '#8f6d47', '#57412c'],
  ['Troposfera', 'Troposféra\n0 až 12 km', 5.8, '#cfe9ff', '#9ccdfa', 1], ['Stratosfera', 'Stratosféra\n12 až 50 km', 6.8, '#8ec3f6', '#6aa7ea', 1], ['Mezosfera', 'Mezosféra\n50 až 85 km', 7.7, '#5c97df', '#4479c8', 1], ['Termosfera', 'Termosféra\n85 až 600 km', 8.8, '#3d68bb', '#2b4590', 1], ['Exosfera', 'Exosféra\nnad 600 km', 10, '#27407f', '#0c1430', 1]];
const cutAt = (r, k) => V(Math.sin(CUT_A * k) * r, Math.cos(CUT_A * k) * r, 0); // bod výseče: r od středu Země, k = −1 levý okraj až 1 pravý
const cutPicks = [], layerMarks = [];
CUT.forEach(([key, name, r1, c0, c1, air], i) => {
  const r0 = i ? CUT[i - 1][2] : 0, parent = air ? airG : cutG, STEPS = 6, a = new THREE.Color(c0), b = new THREE.Color(c1);
  for (let s = 0; s < STEPS; s++) { // plynulý přechod barvy složený z proužků
    const ra = r0 + (r1 - r0) * s / STEPS, rb = r0 + (r1 - r0) * (s + 1) / STEPS;
    const m = new THREE.Mesh(ra ? new THREE.RingGeometry(ra, rb, 40, 1, Math.PI / 2 - CUT_A, CUT_A * 2) : new THREE.CircleGeometry(rb, 40, Math.PI / 2 - CUT_A, CUT_A * 2), new THREE.MeshBasicMaterial({ color: a.clone().lerp(b, (s + .5) / STEPS), side: THREE.DoubleSide }));
    m.userData.key = key; parent.add(m); cutPicks.push(m);
  }
  const edge = []; for (let k = -1; k <= 1.001; k += .05) edge.push(cutAt(r1, k)); // hranice vrstvy
  const line = new THREE.Line(new THREE.BufferGeometry().setFromPoints(edge), new THREE.LineBasicMaterial({ color: key === 'Kura' ? 0x9be08a : 0x0b1022, transparent: true, opacity: key === 'Kura' ? 1 : .45 })); line.position.z = .01; parent.add(line);
  const side = i % 2 ? 1 : -1, o = new THREE.Object3D(); o.position.copy(cutAt((r0 + r1) / 2, side * 1.06)); parent.add(o); layerMarks.push([name, o, key, side]);
});
for (let i = 0; i < 9; i++) { const c = glow(0xffffff, .55 + (i % 3) * .2, .5); c.position.copy(cutAt(5.05 + (i % 4) * .17, -.85 + i * .21)).setZ(.03); airClouds.add(c); } // oblačnost v troposféře
const coreGlow = glow(0xffc860, 2.2); coreGlow.position.z = .05; cutG.add(coreGlow); // jádro je žhavé jako povrch Slunce, proto svítí
let cutFlat = true;
// střed výseče jde do středu volné plochy, posun od karty řeší kamera (setViewOffset v resize)
function layoutCut() { // na šířku vodorovně a posunuté doprava od karty, na výšku svisle a zúžené
  cutFlat = camera.aspect >= 1;
  if (cutFlat) { cutG.rotation.z = -Math.PI / 2; cutG.scale.set(1, 1, 1); cutG.position.set(-4.6, -.3, 0); }
  else { cutG.rotation.z = 0; cutG.scale.set(.55, 1, 1); cutG.position.set(0, -4.6, 0); }
}
// jmenovka vrstvy stojí vně výseče: na šířku nad a pod ní, na výšku vlevo a vpravo; vrací posun v procentech šířky a výšky jmenovky
const cutAlign = side => cutFlat ? [-50, side < 0 ? -100 : 0] : [side < 0 ? -100 : 0, -50];

/* ---------- Obloha u nás: země pod nohama a světové strany; hvězdy jsou ve skupině sky ---------- */
const gO = new THREE.Group(); scene.add(gO);
gO.add(new THREE.Mesh(new THREE.SphereGeometry(2000, 48, 12, 0, TAU, Math.PI / 2, Math.PI / 2), new THREE.MeshBasicMaterial({ color: 0x121c30, side: THREE.BackSide })), ring(1990, 0x6f8fd8));
const compass = [['Sever', 0, -1], ['Východ', 1, 0], ['Jih', 0, 1], ['Západ', -1, 0]].map(([name, x, z]) => { const o = new THREE.Object3D(); o.position.set(x * 1900, 70, z * 1900); gO.add(o); return [name, o]; });
const skyM = new THREE.Matrix4(); let sunAlt = 0;
