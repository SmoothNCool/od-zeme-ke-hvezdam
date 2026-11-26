// Mapa světa. Soubory v js/ sdílejí jeden prostor jmen a načítají se v pořadí podle čísla.
/* ---------- Mapa světa: samostatná zeměkoule s politickou a přírodní mapou ---------- */
// GEO.arcs = úseky hranic a pobřeží (sousední státy sdílejí tentýž úsek), GEO.shared = '1' u úseku mezi dvěma státy
// GEO.adm1 = hranice krajů a regionů, GEO.regions/towns/phys/isles/seas/peaks/lakeNames = jmenovky s polohou (české názvy z Wikidat)
// GEO.c = [název, hlavní město, světadíl, obyvatel, rozloha km², vlajka, barva, mnohoúhelníky jako seznamy úseků, bod jmenovky, poloha hl. města]; GEO.rivers = [jméno, řád, čára]; GEO.lakes = [prstenec]
const gM = new THREE.Group(); scene.add(gM);
const GEO_COLORS = ['#f2b872', '#8ecfd6', '#c3a6e6', '#a6cf8e', '#ef9aa2', '#e8da8a'];
const unwrap = flat => { // čára nebo prstenec přes 180. poledník se narovná, aby šly kreslit i testovat
  if (flat.some((val, i) => i % 2 && val < -89.5)) return flat.slice(); // Antarktida sahá až na pól a jde kolem celé Země, tu nechat být
  const out = []; let prev = null, off = 0;
  for (let i = 0; i < flat.length; i += 2) {
    if (prev !== null) { if (flat[i] + off - prev > 180) off -= 360; else if (flat[i] + off - prev < -180) off += 360; }
    prev = flat[i] + off; out.push(prev, flat[i + 1]);
  }
  return out;
};
const dec = a => { const out = []; let x = 0, y = 0; for (let i = 0; i < a.length; i += 2) { x += a[i]; y += a[i + 1]; out.push(x / 1000, y / 1000); } return out; }; // data jsou rozdíly v tisícinách stupně
let ARCS, RIVERS, LAKES, geoShapes; // naplní se v initMapData, až dorazí data mapy
const loadGeo = () => window.GEO ? Promise.resolve() : fetch('data/geo.json').then(r => { if (!r.ok) throw new Error(r.status); return r.json(); }).then(d => { window.GEO = d; });
function ringOf(idx) { // prstenec = úseky za sebou; záporný index znamená úsek pozpátku (~i)
  const out = [];
  for (const i of idx) {
    const a = ARCS[i < 0 ? ~i : i], skip = out.length ? 2 : 0; // první bod dalšího úseku je poslední bod předchozího
    if (i < 0) for (let k = a.length - 2 - skip; k >= 0; k -= 2) out.push(a[k], a[k + 1]);
    else for (let k = skip; k < a.length; k += 2) out.push(a[k], a[k + 1]);
  }
  return out;
}
const fatMats = []; // materiály tlustých čar potřebují znát velikost okna
const OCEAN = 0x17365f, mapMat = new THREE.MeshBasicMaterial({ color: OCEAN });
const globe = new THREE.Mesh(new THREE.SphereGeometry(1, 128, 96), mapMat); gM.add(globe, atmosphere(1, V(.4, .5, .75).normalize()));
let mapMode = 'staty', camD = 9, vec = null, photo8k = null;
// Mapa je vektorová: plochy států jsou trojúhelníky přímo na kouli, hranice a řeky čáry, města body. Proto zůstává ostrá při jakémkoli přiblížení.
function buildVector() {
  const pos = [], col = [], c3 = new THREE.Color(); let R = 1.0008; // vrstvy leží těsně nad sebou, jinak by se zblízka vůči sobě posouvaly
  const P = (lon, lat, r) => latLon(lat, lon).multiplyScalar(r);
  const far = (a, b) => Math.max(Math.abs(a[0] - b[0]), Math.abs(a[1] - b[1])) > 3, mid = (a, b) => [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2];
  // velký trojúhelník by vedl tětivou pod povrchem koule, proto se dělí; o dělení hrany rozhoduje jen její délka, takže sousední trojúhelníky na sebe navazují bez škvír
  function tri(a, b, c, depth) {
    let n = far(a, b) + far(b, c) + far(c, a);
    if (!n || depth > 9) { for (const q of [a, b, c]) { const w = P(q[0], q[1], R); pos.push(w.x, w.y, w.z); col.push(c3.r, c3.g, c3.b); } return; }
    if (n === 1) while (!far(a, b)) [a, b, c] = [b, c, a]; // dlouhá hrana bude ab
    if (n === 2) while (far(c, a)) [a, b, c] = [b, c, a];  // krátká hrana bude ca
    const mab = mid(a, b), d = depth + 1;
    if (n === 1) { tri(a, mab, c, d); tri(mab, b, c, d); return; }
    const mbc = mid(b, c);
    if (n === 2) { tri(mab, b, mbc, d); tri(a, mab, mbc, d); tri(a, mbc, c, d); return; }
    const mca = mid(c, a); tri(a, mab, mca, d); tri(mab, b, mbc, d); tri(mca, mbc, c, d); tri(mab, mbc, mca, d);
  }
  function fill(poly) { // mnohoúhelník s dírami -> trojúhelníky
    const rings = poly.map(r => { const pts = []; for (let k = 0; k < r.length - 2; k += 2) pts.push(new THREE.Vector2(r[k], r[k + 1])); return pts; }).filter(r => r.length >= 3);
    if (!rings.length) return;
    const faces = THREE.ShapeUtils.triangulateShape(rings[0], rings.slice(1)), all = rings[0].concat(...rings.slice(1));
    for (const f of faces) tri([all[f[0]].x, all[f[0]].y], [all[f[1]].x, all[f[1]].y], [all[f[2]].x, all[f[2]].y], 0);
  }
  function seg(out, flat, r) { // lomená čára, dlouhé úseky se dělí ze stejného důvodu jako trojúhelníky
    for (let k = 2; k < flat.length; k += 2) {
      const x0 = flat[k - 2], y0 = flat[k - 1], dx = flat[k] - x0, dy = flat[k + 1] - y0, n = Math.max(1, Math.ceil(Math.max(Math.abs(dx), Math.abs(dy)) / 2));
      for (let i = 0; i < n; i++) { const a = P(x0 + dx * i / n, y0 + dy * i / n, r), b = P(x0 + dx * (i + 1) / n, y0 + dy * (i + 1) / n, r); out.push(a.x, a.y, a.z, b.x, b.y, b.z); }
    }
  }
  const fat = (flat, width) => { // čára s tloušťkou v pixelech
    const g = new THREE.LineSegmentsGeometry(); g.setPositions(flat);
    const m = new THREE.LineMaterial({ color: 0xffffff, linewidth: width, transparent: true }); m.resolution.set(W, H); fatMats.push(m);
    return new THREE.LineSegments2(g, m);
  };
  const border = [], coast = [], river = [], bigRiver = [], adm = [], caps = [], towns = [[], [], [], []];
  GEO.c.forEach((c, i) => {
    c3.set(c[0] === 'Antarktida' ? '#eef2f7' : GEO_COLORS[c[6]]);
    for (const poly of geoShapes[i]) fill(poly);
    if (c[9]) { const w = P(c[9][0], c[9][1], 1.0014); caps.push(w.x, w.y, w.z); }
  });
  ARCS.forEach((a, i) => seg(GEO.shared[i] === '1' ? border : coast, unwrap(a), 1.0011)); // každý úsek jednou, takže společná hranice je jedna čára
  R = 1.00095; c3.set('#2f6fb5'); for (const lake of LAKES) fill([lake]);
  for (const [, rank, line] of RIVERS) seg(rank < 5 ? bigRiver : river, unwrap(line), 1.0012);
  for (const a of GEO.adm1) seg(adm, unwrap(dec(a)), 1.00105);
  for (const [, lat, lon, pop] of GEO.towns) { const w = P(lon, lat, 1.0014); towns[pop >= 1e6 ? 0 : pop >= 1e5 ? 1 : pop >= 3e4 ? 2 : 3].push(w.x, w.y, w.z); } // čtyři velikosti, menší se ukazují až zblízka
  const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setAttribute('color', new THREE.Float32BufferAttribute(col, 3));
  const dot = canvasTex((cx, sz) => { cx.fillStyle = '#16233f'; cx.beginPath(); cx.arc(sz / 2, sz / 2, sz * .46, 0, TAU); cx.fill(); cx.fillStyle = '#fff'; cx.beginPath(); cx.arc(sz / 2, sz / 2, sz * .32, 0, TAU); cx.fill(); }, 32);
  const v = {
    land: new THREE.Mesh(g, new THREE.MeshBasicMaterial({ vertexColors: true, side: THREE.DoubleSide })),
    border: fat(border, 1.9), coast: fat(coast, 1.1), river: fat(river, 1.1), bigRiver: fat(bigRiver, 2.2), adm1: fat(adm, 1),
    caps: points(caps, new THREE.PointsMaterial({ size: 10, sizeAttenuation: false, map: dot, alphaTest: .5 })),
    towns: towns.map((t, i) => points(t, new THREE.PointsMaterial({ size: [7, 5.5, 4.5, 4][i], sizeAttenuation: false, map: dot, alphaTest: .5 }))),
  };
  gM.add(v.land, v.coast, v.adm1, v.border, v.river, v.bigRiver, v.caps, ...v.towns);
  return v;
}
let building = false, buildMs = 0;
function setMapMode(mode) {
  mapMode = mode; const nature = mode === 'priroda';
  if (!vec) { // první otevření: data mapy se teprve stáhnou a pak se z nich postaví geometrie
    if (!building) {
      building = true; $('#note').textContent = 'Stahuji a kreslím mapu, chvilku strpení…';
      loadGeo().then(() => {
        const t0 = performance.now(); initMapData(); vec = buildVector(); buildMs = Math.round(performance.now() - t0); building = false;
        if (L.id === 'mapa' && !info) card(baseCard());
        setMapMode(mapMode);
      }).catch(err => { building = false; console.error(err); $('#note').textContent = 'Mapu se nepodařilo stáhnout. Zkontroluj připojení a otevři ji znovu.'; });
    }
    return acts();
  }
  vec.land.visible = vec.caps.visible = !nature;
  const style = (line, color, opacity) => { line.material.color.set(color); line.material.opacity = opacity; };
  style(vec.border, nature ? 0xffffff : 0x16233f, nature ? .8 : 1); style(vec.coast, nature ? 0xffffff : 0x0e1a33, nature ? .3 : 1);
  style(vec.river, nature ? 0x8fd0ff : 0x2f6fb5, 1); style(vec.bigRiver, nature ? 0x8fd0ff : 0x2f6fb5, 1); style(vec.adm1, nature ? 0xffffff : 0x4d5d80, nature ? .4 : .85);
  mapMat.color.set(nature ? 0xffffff : OCEAN); mapMat.map = nature ? (photo8k && photo8k.image ? photo8k : dayT) : null; mapMat.needsUpdate = true;
  // podrobnější fotka pro přírodní mapu se stahuje až na vyžádání a jen na větší obrazovce, na telefonu by zabrala moc paměti
  if (nature && !photo8k && W >= 900 && renderer.capabilities.maxTextureSize >= 8192)
    photo8k = loader.load('tex/earth_daymap_8k.jpg', t => { t.anisotropy = renderer.capabilities.getMaxAnisotropy(); if (mapMode === 'priroda') { mapMat.map = t; mapMat.needsUpdate = true; } });
  acts();
}
function countryAt(lon, lat) { // který stát leží pod bodem: paprskový test bod v mnohoúhelníku
  if (!geoShapes) return -1; // data mapy se ještě nestáhla
  for (let i = 0; i < geoShapes.length; i++) for (const poly of geoShapes[i]) for (const sh of [0, 360, -360]) {
    let inside = false; const x = lon + sh;
    for (const ring of poly) for (let a = 0, b = ring.length - 2; a < ring.length; b = a, a += 2) {
      const xa = ring[a], ya = ring[a + 1], xb = ring[b], yb = ring[b + 1];
      if ((ya > lat) !== (yb > lat) && x < (xb - xa) * (lat - ya) / (yb - ya) + xa) inside = !inside;
    }
    if (inside) return i;
  }
  return -1;
}
const fmtPop = n => n >= 1e9 ? (n / 1e9).toFixed(1).replace('.', ',') + ' miliardy' : n >= 1e6 ? (n / 1e6).toFixed(1).replace('.', ',') + ' milionu' : Math.round(n / 1e3) + ' tisíc';
function countryCard(i) {
  const [name, cap, cont, pop, area, flag] = GEO.c[i], facts = [];
  if (cap) facts.push(['Hlavní město', cap]); if (cont) facts.push(['Světadíl', cont]);
  if (pop) facts.push(['Obyvatel', 'asi ' + fmtPop(pop)]); if (area) facts.push(['Rozloha', area.toLocaleString('cs-CZ') + ' km²']);
  return { name, txt: cap ? name + ', hlavní město ' + cap + '.' : name + '.', note: '', facts, flag };
}
// Jmenovky mapy. Je jich přes 15 000, proto nejsou ve společném seznamu jmenovek: mají vlastní zásobník, prvek stránky vzniká až při prvním zobrazení
// a každý snímek se bere jen to, co je dost blízko a v záběru. maxD = do jaké vzdálenosti kamery od středu Země je jmenovka vidět.
const mapPool = [];
const mapLabel = (text, lat, lon, maxD, cls, mode, click) => mapPool.push({ text, dir: latLon(lat, lon), maxD, cls, mode, click, el: null, w: 0, stamp: -1 });
const byRank = (rank, steps) => { for (const [r, d] of steps) if (rank <= r) return d; return steps[steps.length - 1][1]; };
const what = (name, facts) => () => showInfo({ name, txt: name + '.', note: '', facts: facts.filter(f => f[1]) });
function initMapData() { // spustí se jednou, až se stáhnou data mapy: rozbalí tvary a zaregistruje jmenovky
  ARCS = GEO.arcs.map(dec); RIVERS = GEO.rivers.map(([name, rank, line]) => [name, rank, dec(line)]); LAKES = GEO.lakes.map(dec);
  geoShapes = GEO.c.map(c => c[7].map(poly => poly.map(r => unwrap(ringOf(r)))));
  console.assert(GEO.c[countryAt(14.4, 50)][0] === 'Česko' && GEO.c[countryAt(100, 60)][0] === 'Rusko' && countryAt(-150, 0) === -1, 'countryAt');
  [['Evropa', 52, 22], ['Asie', 48, 95], ['Afrika', 5, 20], ['Severní Amerika', 47, -102], ['Jižní Amerika', -12, -58], ['Austrálie', -25, 134], ['Antarktida', -82, 20]].forEach(([t, la, lo]) => mapLabel(t, la, lo, 99, 'geo'));
  [['Tichý oceán', -5, -150], ['Atlantský oceán', 28, -42], ['Indický oceán', -22, 80], ['Severní ledový oceán', 86, -30], ['Jižní oceán', -63, -120]].forEach(([t, la, lo]) => mapLabel(t, la, lo, 99, 'sea'));
  const byArea = GEO.c.map((c, i) => i).sort((a, b) => GEO.c[b][4] - GEO.c[a][4]); // při kolizi jmenovek vyhrává větší stát
  const showAt = a => a > 2e6 ? 3.6 : a > 4e5 ? 2.7 : a > 8e4 ? 2 : a > 1e4 ? 1.6 : 1.36; // velké státy jsou vidět zdálky, malé až zblízka
  for (const i of byArea) { const c = GEO.c[i]; if (c[8]) mapLabel(c[0], c[8][1], c[8][0], showAt(c[4]), 'ctry', 'staty', () => showInfo(countryCard(i))); }
  for (const i of byArea) { const c = GEO.c[i]; if (c[9]) mapLabel(c[1].split(' / ')[0], c[9][1], c[9][0], Math.max(1.3, showAt(c[4]) - .55), 'cap', 'staty', () => showInfo(countryCard(i))); } // hlavní město o něco později než jeho stát
  for (const [name, lat, lon, rank, kind, country] of GEO.regions) mapLabel(name, lat, lon, byRank(rank, [[2, 1.8], [4, 1.38], [6, 1.2], [99, 1.1]]), 'reg', 'staty', what(name, [['Co to je', kind], ['Stát', country]]));
  for (const [name, lat, lon, pop, country] of GEO.towns)
    mapLabel(name, lat, lon, pop > 5e6 ? 2.4 : pop > 1e6 ? 1.9 : pop > 3e5 ? 1.5 : pop > 1e5 ? 1.3 : pop > 3e4 ? 1.16 : 1.075, 'cap', 'staty', what(name, [['Obyvatel', pop ? 'asi ' + fmtPop(pop) : ''], ['Stát', country]]));
  for (const [name, lat, lon, rank, kind] of GEO.phys) mapLabel(name, lat, lon, byRank(rank, [[1, 3.2], [2, 2.6], [3, 2.1], [4, 1.7], [99, 1.4]]), 'mnt', 'priroda', what(name, [['Co to je', kind]]));
  for (const [name, lat, lon, rank, kind] of GEO.isles) mapLabel(name, lat, lon, byRank(rank, [[1, 2.9], [2, 2.3], [3, 1.8], [4, 1.5], [99, 1.25]]), 'sky', '', what(name, [['Co to je', kind]]));
  for (const [name, lat, lon, rank, kind] of GEO.seas) mapLabel(name, lat, lon, byRank(rank, [[1, 3.2], [2, 2.5], [4, 1.9], [99, 1.45]]), 'sea', '', what(name, [['Co to je', kind]]));
  for (const [name, lat, lon, elev, rank] of GEO.peaks) mapLabel(name + ', ' + elev.toLocaleString('cs-CZ') + ' m', lat, lon, byRank(rank, [[1, 2.2], [3, 1.7], [99, 1.35]]), 'mnt', 'priroda', what(name, [['Co to je', 'hora'], ['Výška', elev.toLocaleString('cs-CZ') + ' m nad mořem']]));
  for (const [name, lat, lon, rank] of GEO.lakeNames) mapLabel(name, lat, lon, byRank(rank, [[1, 2.2], [3, 1.6], [99, 1.3]]), 'sea', '', what(name, [['Co to je', 'jezero']]));
  for (const [name, rank, line] of RIVERS) if (name) { const k = (line.length >> 2) * 2; mapLabel(name, line[k + 1], line[k], rank < 3 ? 3 : rank < 5 ? 2.3 : 1.8, 'sea', '', what(name, [['Co to je', 'řeka']])); }
  mapPool.sort((a, b) => b.maxD - a.maxD); // co je vidět zdálky, má při kolizi přednost
}
let mapShown = [], mapStamp = 0;
function drawMapLabels(placed, on) {
  const stamp = ++mapStamp, next = [];
  if (on && L.id === 'mapa') {
    const cd = camera.position.length(), camDir = t1.copy(camera.position).divideScalar(cd);
    // kam až na kouli dohlédne kužel záběru (kamera míří na střed Země), nejdál k obzoru
    const cone = Math.atan(Math.tan(rad(camera.fov / 2)) * Math.hypot(1, camera.aspect)), reach = cd * Math.sin(cone) >= 1 ? Math.acos(1 / cd) : Math.min(Math.acos(1 / cd), Math.asin(cd * Math.sin(cone)) - cone);
    const minDot = Math.cos(Math.min(Math.PI / 2, reach * 1.25 + .02));
    for (const m of mapPool) {
      if (m.maxD <= cd || next.length >= 140) break; // seřazeno od nejdřív viditelných, dál už není nic
      if (m.mode && m.mode !== mapMode || m.dir.dot(camDir) < minDot) continue;
      wp.copy(m.dir).multiplyScalar(1.004).project(camera);
      const x = (wp.x + 1) / 2 * W, y = (1 - wp.y) / 2 * H - 6;
      if (x < -40 || x > W + 40 || y < 0 || y > H + 30) continue;
      if (!m.el) { // prvek vzniká až teď
        m.el = document.createElement(m.click ? 'button' : 'span'); m.el.className = 'lbl ' + m.cls; m.el.textContent = m.text; if (m.click) m.el.onclick = m.click;
        $('#labels').append(m.el); m.w = m.el.offsetWidth; m.el.hidden = true;
      }
      if (placed.some(q => Math.abs(q[0] - x) < (q[2] + m.w) / 2 + 4 && Math.abs(q[1] - y) < 20)) continue; // jmenovka na mapě nesmí uhnout jinam, radši počká na větší přiblížení
      placed.push([x, y, m.w]); m.stamp = stamp; next.push(m);
      m.el.hidden = false; m.el.style.transform = `translate(${x}px,${y}px) translate(-50%,-100%)`;
    }
  }
  for (const m of mapShown) if (m.stamp !== stamp) m.el.hidden = true;
  mapShown = next;
}
