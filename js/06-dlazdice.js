// Přírodní mapa zblízka: satelitní snímky po dlaždicích a stínování reliéfu z výškového modelu. Soubory v js/ sdílejí jeden prostor jmen a načítají se v pořadí podle čísla.
// Snímky: EOxCloudless (Sentinel-2, EOX), výšky: Terrain Tiles (Mapzen, AWS Open Data). Obojí v projekci Web Mercator, dlaždice 256 px.
// Dlaždice se zapínají v režimu Příroda pod výškou TILE_H (v poloměrech Země) a doplňují celou kouli s fotkou, která zblízka rozmazává.
const IMG_URL = (z, x, y) => `https://tiles.maps.eox.at/wmts/1.0.0/s2cloudless-2024_3857/default/g/${z}/${y}/${x}.jpg`;
const DEM_URL = (z, x, y) => `https://s3.amazonaws.com/elevation-tiles-prod/terrarium/${z}/${x}/${y}.png`;
const TILE_H = .7, TILE_MAX = 14, DEM_UP = 2; // výšky stačí o dvě úrovně hrubší, jedna výšková dlaždice pokryje 16 snímků
const tileG = new THREE.Group(); gM.add(tileG);
const tileLoader = new THREE.TextureLoader(); tileLoader.setCrossOrigin('anonymous');
const tiles = new Map(), dems = new Map(); // klíč "z/x/y" -> { mesh, used } a { tex, used }
let tileFrame = 0, tilesFailed = 0;
const latOfY = (y, n) => Math.atan(Math.sinh(Math.PI * (1 - 2 * y / n))) * 180 / Math.PI; // Web Mercator: řádek dlaždice -> zeměpisná šířka
const tileMat = new THREE.ShaderMaterial({ // šablona; každá dlaždice dostane vlastní kopii s vlastními texturami
  side: THREE.DoubleSide, uniforms: { img: { value: null }, dem: { value: null }, demOff: { value: new THREE.Vector2() }, demK: { value: .25 }, mpp: { value: 100 }, relief: { value: 1 } },
  vertexShader: 'varying vec2 vUv;void main(){vUv=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0);}',
  // výška z kódování terrarium: (R*256 + G + B/256) − 32768 m; normála ze sousedních bodů, světlo od severozápadu jako na klasických mapách
  fragmentShader: 'uniform sampler2D img,dem;uniform vec2 demOff;uniform float demK,mpp,relief;varying vec2 vUv;' +
    'float hp(vec2 p){vec3 c=texture2D(dem,p).rgb*255.0;return c.r*256.0+c.g+c.b/256.0-32768.0;}' +
    // kódované výšky se nesmí míchat v textuře, proto plynulé prolnutí až po dekódování ze čtyř sousedních bodů
    'float h(vec2 p){vec2 q=p*256.0-0.5,f=fract(q),b=(floor(q)+0.5)/256.0;float t=1.0/256.0;return mix(mix(hp(b),hp(b+vec2(t,0.0)),f.x),mix(hp(b+vec2(0.0,t)),hp(b+vec2(t,t)),f.x),f.y);}' +
    'void main(){vec3 col=texture2D(img,vUv).rgb;vec2 p=demOff+vUv*demK;float t=1.0/256.0;' +
    'float dx=(h(p+vec2(t,0.0))-h(p-vec2(t,0.0)))/(2.0*mpp),dy=(h(p+vec2(0.0,t))-h(p-vec2(0.0,t)))/(2.0*mpp);' +
    'vec3 n=normalize(vec3(-dx*1.6,-dy*1.6,1.0));float l=dot(n,normalize(vec3(-0.6,0.6,0.75)));float base=0.75/length(vec3(-0.6,0.6,0.75));' +
    'gl_FragColor=vec4(col*mix(1.0,clamp(0.35+0.65*l/base,0.35,1.45),relief),1.0);}',
});
function demTex(z, x, y) { // výšková dlaždice, sdílená sousedními snímky
  const key = z + '/' + x + '/' + y; let d = dems.get(key);
  if (!d) {
    const tex = tileLoader.load(DEM_URL(z, x, y), undefined, undefined, () => { d.bad = true; });
    tex.magFilter = tex.minFilter = THREE.NearestFilter; tex.generateMipmaps = false; // kódované výšky se nesmí míchat
    dems.set(key, d = { tex, used: 0 });
  }
  d.used = tileFrame; return d;
}
function makeTile(z, x, y) {
  const n = 2 ** z, SEG = z < 6 ? 16 : 8, pos = [], uv = [], idx = [];
  const lon0 = x / n * 360 - 180, lon1 = (x + 1) / n * 360 - 180;
  for (let j = 0; j <= SEG; j++) for (let i = 0; i <= SEG; i++) { // mřížka rovnoměrná v Mercatoru, aby textura seděla
    const p = mapP(lon0 + (lon1 - lon0) * i / SEG, latOfY(y + j / SEG, n), 1.0002 + z * 3e-6); pos.push(p.x, p.y, p.z); uv.push(i / SEG, 1 - j / SEG); // jemnější úroveň o kousek výš, jinak by se s hrubší přetahovala
  }
  for (let j = 0; j < SEG; j++) for (let i = 0; i < SEG; i++) { const a = j * (SEG + 1) + i; idx.push(a, a + 1, a + SEG + 1, a + 1, a + SEG + 2, a + SEG + 1); } // proti směru hodinek při pohledu zvenku, jinak by je prohlížeč nekreslil
  const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2)); g.setIndex(idx);
  const dz = Math.max(0, z - DEM_UP), k = 2 ** (z - dz), d = demTex(dz, x >> (z - dz), y >> (z - dz)), m = tileMat.clone();
  const lat = latOfY(y + .5, n);
  Object.assign(m.uniforms, { dem: { value: d.tex }, demOff: { value: new THREE.Vector2((x % k) / k, 1 - ((y % k) + 1) / k) }, demK: { value: 1 / k }, mpp: { value: 40075016 * Math.cos(lat * Math.PI / 180) / 2 ** dz / 256 }, relief: { value: 1 } });
  const mesh = new THREE.Mesh(g, m); mesh.visible = false;
  m.uniforms.img = { value: tileLoader.load(IMG_URL(z, x, y), t => { t.anisotropy = renderer.capabilities.getMaxAnisotropy(); mesh.visible = true; }, undefined, () => { tilesFailed++; }) };
  tileG.add(mesh); return { mesh, used: 0, z };
}
function dropTile(key, t) { tileG.remove(t.mesh); t.mesh.geometry.dispose(); t.mesh.material.uniforms.img.value.dispose(); t.mesh.material.dispose(); tiles.delete(key); }
function updateTiles() { // volá se každý snímek z hlavní smyčky
  const h = camD - 1, on = L.id === 'mapa' && mapMode === 'priroda' && h < TILE_H;
  tileG.visible = on; if (!on) return;
  tileFrame++;
  const dir = camera.position.clone().normalize(), lat = Math.asin(dir.y) * 180 / Math.PI, lon = Math.atan2(-dir.z, dir.x) * 180 / Math.PI; // obráceně k latLon
  // úroveň: na šířku záběru se má vejít asi pět dlaždic
  const z = THREE.MathUtils.clamp(Math.round(Math.log2(TAU * 5 / Math.max(h * 1.3, 1e-4) * Math.cos(rad(Math.min(Math.abs(lat), 80))))), 2, TILE_MAX), n = 2 ** z;
  const latC = THREE.MathUtils.clamp(lat, -85, 85), cx = Math.floor((lon + 180) / 360 * n), cy = Math.floor((1 - Math.log(Math.tan(rad(latC)) + 1 / Math.cos(rad(latC))) / Math.PI) / 2 * n);
  const R = z <= 3 ? n : 3; // kolem středu záběru 7 × 7 dlaždic
  for (let dy = -R; dy <= R; dy++) for (let dx = -R; dx <= R; dx++) {
    const y = cy + dy; if (y < 0 || y >= n) continue;
    const x = ((cx + dx) % n + n) % n, key = z + '/' + x + '/' + y;
    let t = tiles.get(key); if (!t) tiles.set(key, t = makeTile(z, x, y));
    t.used = tileFrame;
  }
  // hrubší dlaždice zůstávají vidět, dokud se nenačtou jemnější; staré se uvolní, aby nerostla paměť
  for (const [key, t] of tiles) {
    if (t.z > z) t.mesh.visible = t.mesh.visible && t.used === tileFrame;
    t.mesh.renderOrder = t.z; // jemnější kreslit navrch
    if (tileFrame - t.used > 120 && tiles.size > 160) dropTile(key, t);
  }
  for (const [key, d] of dems) if (tileFrame - d.used > 600 && dems.size > 60) { d.tex.dispose(); dems.delete(key); }
}
