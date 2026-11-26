// Hvězdné pozadí a katalog souhvězdí. Soubory v js/ sdílejí jeden prostor jmen a načítají se v pořadí podle čísla.
/* ---------- hvězdné pozadí ---------- */
const stars = (() => {
  const p = [];
  for (let i = 0; i < 2500; i++) { const v = V(gauss(), gauss(), gauss()).normalize().multiplyScalar(2500); p.push(v.x, v.y, v.z); }
  return points(p, new THREE.PointsMaterial({ color: 0xcfd8ff, size: 1.6, sizeAttenuation: false }));
})();
// obloha je v ekliptikální soustavě: rovina XZ, délka roste k −Z, takže sedí s polohami planet
const eqToScene = (raH, dec) => {
  const a = raH / 24 * TAU, d = rad(dec), e = rad(23.44), x = Math.cos(d) * Math.cos(a), y = Math.cos(d) * Math.sin(a), z = Math.sin(d);
  return V(x, -y * Math.sin(e) + z * Math.cos(e), -(y * Math.cos(e) + z * Math.sin(e)));
};
console.assert(Math.abs(eqToScene(0, 90).y - Math.cos(rad(23.44))) < 1e-9 && eqToScene(0, 90).z < 0, 'eqToScene: pól');
// katalog: SKY.stars = [rektascenze°, deklinace°, jasnost], SKY.cons = [zkratka, česky, latinsky, [poloha popisku], čáry], SKY.named = [jméno, ra°, dec°]
const sky = new THREE.Group(); sky.add(stars); scene.add(sky);
const starTex = canvasTex((g, s) => { // hvězda má plné jádro a krátkou záři, aby nebyla jen mlhavá skvrna
  const r = g.createRadialGradient(s / 2, s / 2, 0, s / 2, s / 2, s / 2);
  r.addColorStop(0, 'rgba(255,255,255,1)'); r.addColorStop(.38, 'rgba(255,255,255,1)'); r.addColorStop(.6, 'rgba(255,255,255,.35)'); r.addColorStop(1, 'rgba(255,255,255,0)');
  g.fillStyle = r; g.fillRect(0, 0, s, s);
}, 64);
const skyPos = (ra, dec) => eqToScene(ra / 15, dec).multiplyScalar(2400);
const starMats = [[1.5, 9], [3, 6], [4.2, 4], [9, 2.6]].map(([maxMag, size], i, a) => { // jasnější hvězda = větší tečka
  const flat = [];
  for (const [ra, dec, mag] of SKY.stars) if (mag < maxMag && mag >= (i ? a[i - 1][0] : -9)) { const q = skyPos(ra, dec); flat.push(q.x, q.y, q.z); }
  const m = new THREE.PointsMaterial({ color: 0xffffff, size, sizeAttenuation: false, map: starTex, transparent: true, depthWrite: false });
  m.userData.base = size; sky.add(points(flat, m)); return m;
});
const lineMat = new THREE.LineBasicMaterial({ color: 0x8fb0ff, transparent: true, opacity: .3 });
{
  const seg = [];
  for (const c of SKY.cons) for (const ln of c[4]) for (let i = 1; i < ln.length; i++) seg.push(skyPos(...ln[i - 1]), skyPos(...ln[i]));
  sky.add(new THREE.LineSegments(new THREE.BufferGeometry().setFromPoints(seg), lineMat));
}
const skyMark = q => { const o = new THREE.Object3D(); o.position.copy(q); sky.add(o); return o; };
const constMarks = SKY.cons.map(c => ({ id: c[0], cz: c[1], la: c[2], ra: c[3][0], dec: c[3][1], mark: skyMark(skyPos(...c[3])) }));
const starMarks = SKY.named.map(([name, ra, dec]) => ({ name, mark: skyMark(skyPos(ra, dec)) }));
// Slunce, Měsíc a planety na obloze (jen v pohledu Obloha)
const skyBodies = new THREE.Group(); sky.add(skyBodies);
const sunSky = glow(0xfff2b0, 330), moonSky = glow(0xe9edf5, 170); skyBodies.add(sunSky, moonSky);
const AU = [.387, .723, 1, 1.524, 5.203, 9.537]; // skutečné vzdálenosti od Slunce, podle nich vyjde směr, kde planetu na obloze hledat
const skyPlanets = [[0, 0xcfc5b8, 55], [1, 0xfff4d0, 110], [3, 0xff7a50, 65], [4, 0xffe2b0, 95], [5, 0xf1d9a0, 70]].map(([i, color, size]) => { const sp = glow(color, size); skyBodies.add(sp); return [i, sp]; });
const eclDir = lam => V(Math.cos(lam), 0, -Math.sin(lam)); // směr k bodu ekliptiky s délkou lam
// zenit nad středem Česka v daném okamžiku: místní hvězdný čas = Greenwichský + zeměpisná délka
const zenithAt = ms => eqToScene((18.697374558 + 24.06570982441908 * (ms - Date.UTC(2000, 0, 1, 12)) / 864e5 + HOME[1] / 15) % 24, HOME[0]);
const sunLamAt = ms => Math.PI / 2 + ((ms - Date.UTC(2026, 0, 1)) / 864e5 - 171.35) / 365.2422 * TAU; // délka Slunce, 90° o letním slunovratu
console.assert(Math.abs(Math.asin(zenithAt(Date.now()).dot(eqToScene(2.53, 89.26))) - rad(HOME[0])) < rad(1.5), 'Polárka má být nad obzorem tolik stupňů, kolik je zeměpisná šířka');
console.assert(Math.abs(Math.asin(zenithAt(Date.UTC(2026, 5, 21, 10, 58)).dot(eclDir(sunLamAt(Date.UTC(2026, 5, 21, 10, 58))))) - rad(90 - HOME[0] + 23.44)) < rad(2), 'výška Slunce v poledne o letním slunovratu');
