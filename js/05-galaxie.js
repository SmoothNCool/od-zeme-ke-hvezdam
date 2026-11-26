// Mléčná dráha a vesmír. Soubory v js/ sdílejí jeden prostor jmen a načítají se v pořadí podle čísla.
/* ---------- Mléčná dráha ---------- */
const gG = new THREE.Group(); scene.add(gG);
const armAngle = (r, k) => k * Math.PI / 2 + Math.log(r / 4) / .23; // čtyři logaritmická ramena
(() => {
  const warm = new THREE.Color(1, .8, .5), blue = new THREE.Color(.6, .75, 1), c = new THREE.Color();
  function layer(n, size, pick) {
    const pos = [], col = [];
    for (let i = 0; i < n; i++) {
      const [r, a, bright] = pick(), y = gauss() * (.25 + 1.6 * Math.exp(-r / 9));
      pos.push(Math.cos(a) * r, y, Math.sin(a) * r);
      c.copy(warm).lerp(blue, Math.min(1, r / 30)).multiplyScalar(bright); col.push(c.r, c.g, c.b);
    }
    const pts = points(pos, new THREE.PointsMaterial({ size, map: glowTex, vertexColors: true, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false }));
    pts.geometry.setAttribute('color', new THREE.Float32BufferAttribute(col, 3)); gG.add(pts); return pts;
  }
  const star = () => {
    const u = Math.random();
    if (u < .14) { const x = gauss() * 8, z = gauss() * 2.8; return [Math.hypot(x, z), Math.atan2(z, x) + .45, .5 + Math.random() * .5]; } // středová příčka
    const r = 4 + 50 * Math.pow(Math.random(), .75);
    if (u < .3) return [r, Math.random() * TAU, .25 + Math.random() * .3]; // řídký disk mezi rameny
    const k = Math.random() < .7 ? (Math.random() < .5 ? 0 : 2) : (Math.random() < .5 ? 1 : 3); // dvě hlavní a dvě slabší ramena
    return [r, armAngle(r, k) + gauss() * .22, .45 + Math.random() * .55];
  };
  layer(60000, .55, star); layer(5000, 1.5, star);
  const neb = layer(500, 2.4, () => { const r = 8 + 40 * Math.random(); return [r, armAngle(r, Math.random() * 4 | 0) + gauss() * .1, 1]; }); // růžové mlhoviny, kde se rodí hvězdy
  neb.material.vertexColors = false; neb.material.color.set(0xff5f8f); neb.material.opacity = .45;
  // mlžný podklad: záře ramen a tmavé prachové pásy na jejich vnitřní straně
  const haze = canvasTex((g, s) => {
    const q = s / 120, blob = (x, z, rr, color) => {
      const px = s / 2 + x * q, pz = s / 2 + z * q, R = rr * q, gr = g.createRadialGradient(px, pz, 0, px, pz, R);
      gr.addColorStop(0, color); gr.addColorStop(1, 'rgba(0,0,0,0)'); g.fillStyle = gr; g.fillRect(px - R, pz - R, 2 * R, 2 * R);
    };
    blob(0, 0, 56, 'rgba(120,140,220,.22)');
    for (let i = 0; i < 2600; i++) { const r = 5 + 47 * Math.random(), k = i % 4, a = armAngle(r, k) + gauss() * .12; blob(Math.cos(a) * r, Math.sin(a) * r, 2.5 + Math.random() * 4, k % 2 ? 'rgba(110,150,255,.05)' : 'rgba(140,175,255,.09)'); }
    g.globalCompositeOperation = 'destination-out';
    for (let i = 0; i < 1500; i++) { const r = 6 + 44 * Math.random(), a = armAngle(r, i % 4) - .16 + gauss() * .05; blob(Math.cos(a) * r, Math.sin(a) * r, 1 + Math.random() * 1.8, 'rgba(0,0,0,.22)'); }
    g.globalCompositeOperation = 'lighter';
    blob(0, 0, 14, 'rgba(255,215,150,.9)');
  }, 1024);
  const hz = new THREE.Mesh(new THREE.PlaneGeometry(120, 120), new THREE.MeshBasicMaterial({ map: haze, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide }));
  hz.rotation.x = -Math.PI / 2; gG.add(hz, glow(0xffe9b0, 22));
})();
const ourSun = glow(0xffe066, 4); ourSun.position.set(27, 0, 0); gG.add(ourSun);

/* ---------- Vesmír plný galaxií ---------- */
const gU = new THREE.Group(); scene.add(gU);
const galTex = [true, false].map(spiral => canvasTex((g, s) => {
  const r = g.createRadialGradient(s/2, s/2, 0, s/2, s/2, s/2 * (spiral ? .45 : 1));
  r.addColorStop(0, 'rgba(255,255,255,1)'); r.addColorStop(.3, 'rgba(255,255,255,.4)'); r.addColorStop(1, 'rgba(255,255,255,0)');
  g.fillStyle = r; g.fillRect(0, 0, s, s);
  if (!spiral) return;
  g.fillStyle = 'rgba(255,255,255,.16)';
  for (let i = 0; i < 900; i++) { const t = Math.random(), a = (i % 2) * Math.PI + t * 5 + gauss() * .35, d = t * s * .46; g.beginPath(); g.arc(s/2 + Math.cos(a) * d, s/2 + Math.sin(a) * d, 1.6, 0, TAU); g.fill(); }
}));
function galaxy(size, spiral) {
  const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: galTex[spiral ? 0 : 1], color: [0xffe0b0, 0xb9ccff, 0xffffff, 0xffc0d8][Math.random() * 4 | 0],
    rotation: Math.random() * TAU, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false }));
  sp.scale.set(size, size * (.35 + Math.random() * .65), 1); return sp;
}
for (let i = 0; i < 600; i++) {
  const s = galaxy(5 + Math.random() * 13, i % 3 !== 0);
  s.position.copy(V(gauss(), gauss(), gauss()).normalize().multiplyScalar(22 + Math.random() * 260)); gU.add(s);
}
const ourGalaxy = galaxy(16, true); ourGalaxy.material.color.set(0xffffff); ourGalaxy.scale.set(16, 12, 1); gU.add(ourGalaxy);
