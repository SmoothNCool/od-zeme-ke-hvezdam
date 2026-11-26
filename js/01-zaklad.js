// Základ: vykreslování, kamera, pomocné funkce. Soubory v js/ sdílejí jeden prostor jmen a načítají se v pořadí podle čísla.
const $ = s => document.querySelector(s);
const TAU = Math.PI * 2, rad = THREE.MathUtils.degToRad, V = (x = 0, y = 0, z = 0) => new THREE.Vector3(x, y, z), ZERO = V();
let renderer;
try { renderer = new THREE.WebGLRenderer({ canvas: $('#c'), antialias: true }); }
catch (e) { $('#fail').hidden = false; $('#dock').hidden = true; throw e; } // bez 3D grafiky nemá smysl pokračovat
renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(45, 1, 0.05, 6000);
const controls = new THREE.OrbitControls(camera, renderer.domElement);
controls.enableDamping = true; controls.listenToKeyEvents(window); // posun: dva prsty, pravé tlačítko myši nebo šipky
const loader = new THREE.TextureLoader(), tex = n => loader.load('tex/' + n);
const gauss = () => (Math.random() + Math.random() + Math.random() - 1.5) * 0.82;
const basic = color => new THREE.MeshBasicMaterial({ color });

function canvasTex(draw, s = 128) {
  const c = document.createElement('canvas'); c.width = c.height = s;
  draw(c.getContext('2d'), s); return new THREE.CanvasTexture(c);
}
const glowTex = canvasTex((g, s) => {
  const r = g.createRadialGradient(s/2, s/2, 0, s/2, s/2, s/2);
  r.addColorStop(0, 'rgba(255,255,255,1)'); r.addColorStop(.25, 'rgba(255,255,255,.55)'); r.addColorStop(1, 'rgba(255,255,255,0)');
  g.fillStyle = r; g.fillRect(0, 0, s, s);
});
function glow(color, size, opacity = 1) {
  const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTex, color, opacity, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false }));
  sp.scale.set(size, size, 1); return sp;
}
function loop(pts, color = 0x3a4a80) {
  return new THREE.LineLoop(new THREE.BufferGeometry().setFromPoints(pts), new THREE.LineBasicMaterial({ color, transparent: true, opacity: .7 }));
}
function ring(r, color) { const p = []; for (let i = 0; i < 128; i++) p.push(V(Math.cos(i/128*TAU)*r, 0, Math.sin(i/128*TAU)*r)); return loop(p, color); }
function points(pos, mat) { const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); return new THREE.Points(g, mat); }
// zeměpisná poloha -> bod na kouli s texturou (0° délky míří na +X, východ na -Z)
function latLon(lat, lon) { const a = rad(lat), o = rad(lon); return V(Math.cos(o)*Math.cos(a), Math.sin(a), -Math.sin(o)*Math.cos(a)); }
function kepler(M, e) { let E = M + e * Math.sin(M); for (let i = 0; i < 8; i++) E -= (E - e * Math.sin(E) - M) / (1 - e * Math.cos(E)); return E; }
console.assert(latLon(0, 0).distanceTo(V(1)) < 1e-9 && latLon(90, 0).y > .999, 'latLon');
const HOME = [49.8, 15.5]; // střed Česka (šířka, délka): odtud se počítá den a noc, hodiny i obloha
console.assert(Math.abs(kepler(1, 0) - 1) < 1e-9 && Math.abs(kepler(Math.PI, .7) - Math.PI) < 1e-9, 'kepler');
