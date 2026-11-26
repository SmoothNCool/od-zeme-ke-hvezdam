// Průřez Zemí a obzor pro pohled na oblohu. Soubory v js/ sdílejí jeden prostor jmen a načítají se v pořadí podle čísla.
/* ---------- Uvnitř Země: koule s vykrojenou čtvrtinou ---------- */
const gC = new THREE.Group(); scene.add(gC);
const LAYERS = [[1, '#7a5a3a'], [.97, '#c23b1c'], [.546, '#f6a12e'], [.19, '#fff2a8']]; // vnější poloměr vrstvy jako díl poloměru Země; kůra je schválně tlustší, jinak by nebyla vidět
const cutTex = canvasTex((g, s) => {
  const c = s / 2, R = r => r * c;
  const band = (r1, r0, inner, outer) => { const gr = g.createRadialGradient(c, c, R(r0), c, c, R(r1)); gr.addColorStop(0, inner); gr.addColorStop(1, outer); g.fillStyle = gr; g.beginPath(); g.arc(c, c, R(r1), 0, TAU); g.fill(); };
  band(1, .97, '#8f6d47', '#57412c');      // kůra
  band(.97, .546, '#f59331', '#a12c18');   // plášť, u jádra žhavější
  band(.546, .19, '#ffe070', '#f4a024');   // vnější jádro, tekuté železo
  band(.19, 0, '#fffdf0', '#ffe98a');      // vnitřní jádro
  for (let i = 0; i < 7000; i++) { // zrnitost horniny a žhavé šmouhy
    const a = Math.random() * TAU, r = Math.sqrt(Math.random());
    g.fillStyle = Math.random() < .5 ? 'rgba(255,235,160,.10)' : 'rgba(70,15,0,.10)';
    g.beginPath(); g.arc(c + Math.cos(a) * R(r), c + Math.sin(a) * R(r), 1 + Math.random() * 4, 0, TAU); g.fill();
  }
  g.lineCap = 'round';
  for (let k = 0; k < 12; k++) { // proudění v plášti: horký kámen u jádra stoupá, nahoře chladne a klesá, smyčky se šipkou
    const a = k / 12 * TAU, x = c + Math.cos(a) * R(.76), y = c + Math.sin(a) * R(.76), dir = k % 2 ? 1 : -1;
    g.save(); g.translate(x, y); g.rotate(a); g.strokeStyle = g.fillStyle = 'rgba(255,238,170,.7)'; g.lineWidth = 3.5;
    g.beginPath(); g.ellipse(0, 0, R(.16), R(.075), 0, .5, TAU - .5, dir < 0); g.stroke();
    g.beginPath(); g.moveTo(R(.16) * Math.cos(.5) + 9, dir * R(.075) * Math.sin(.5) * -1 + dir * 2); g.lineTo(R(.16) * Math.cos(.5) - 9, dir * R(.075) * Math.sin(.5) * -1 - dir * 5); g.lineTo(R(.16) * Math.cos(.5) + 2, dir * R(.075) * Math.sin(.5) * -1 - dir * 15); g.fill();
    g.restore();
  }
  for (let k = 0; k < 26; k++) { // víření tekutého železa ve vnějším jádru
    const a = Math.random() * TAU, r = .24 + Math.random() * .26; g.strokeStyle = 'rgba(255,255,220,.5)'; g.lineWidth = 2.5;
    g.beginPath(); g.arc(c, c, R(r), a, a + .25 + Math.random() * .5); g.stroke();
  }
  g.strokeStyle = 'rgba(50,15,0,.6)'; g.lineWidth = 2.5; // hranice vrstev
  for (const [r] of LAYERS) { g.beginPath(); g.arc(c, c, R(r) - 1.5, 0, TAU); g.stroke(); }
}, 1024);
const shellT = tex('earth_daymap.jpg'); shellT.repeat.x = .75; // tři čtvrtiny koule nesou tři čtvrtiny mapy
gC.add(new THREE.Mesh(new THREE.SphereGeometry(1, 64, 48, 0, TAU * .75), new THREE.MeshBasicMaterial({ map: shellT })));
[0, -Math.PI / 2].forEach(ry => { // dvě řezné plochy, půlkruhy s vrstvami
  const f = new THREE.Mesh(new THREE.CircleGeometry(1, 64, Math.PI / 2, Math.PI), new THREE.MeshBasicMaterial({ map: cutTex, side: THREE.DoubleSide }));
  f.rotation.y = ry; gC.add(f);
});
const coreGlow = glow(0xffc860, 1); coreGlow.material.depthTest = false; // jádro je žhavé jako povrch Slunce, proto svítí
gC.add(new THREE.Mesh(new THREE.SphereGeometry(.19, 32, 24), new THREE.MeshBasicMaterial({ color: 0xfff6c8 })), coreGlow, atmosphere(1, V(-.55, .6, -.58).normalize()));
const layerMarks = [['Vnitřní jádro, střed je 6 371 km hluboko', -.08, -.02, 'Jadro1'], ['Vnější jádro, od 2 900 km', -.37, .16, 'Jadro2'], ['Plášť, od 35 km', -.75, .34, 'Plast'], ['Kůra', -.985, .1, 'Kura']].map(([name, x, y, key]) => {
  const o = new THREE.Object3D(); o.position.set(x, y, 0); gC.add(o); return [name, o, key];
});

/* ---------- Obloha u nás: země pod nohama a světové strany; hvězdy jsou ve skupině sky ---------- */
const gO = new THREE.Group(); scene.add(gO);
gO.add(new THREE.Mesh(new THREE.SphereGeometry(2000, 48, 12, 0, TAU, Math.PI / 2, Math.PI / 2), new THREE.MeshBasicMaterial({ color: 0x121c30, side: THREE.BackSide })), ring(1990, 0x6f8fd8));
const compass = [['Sever', 0, -1], ['Východ', 1, 0], ['Jih', 0, 1], ['Západ', -1, 0]].map(([name, x, z]) => { const o = new THREE.Object3D(); o.position.set(x * 1900, 70, z * 1900); gO.add(o); return [name, o]; });
const skyM = new THREE.Matrix4(); let sunAlt = 0;
