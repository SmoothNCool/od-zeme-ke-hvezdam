// Ovládání, jmenovky, ťuknutí do scény. Soubory v js/ sdílejí jeden prostor jmen a načítají se v pořadí podle čísla.
/* ---------- ovládání ---------- */
// hlavní menu = čtyři světy; Země a Měsíc má tři pohledy ve druhém řádku
const NS = LV.findIndex(l => l.id === 'soustava'); // vše před soustavou jsou pohledy na Zemi
const MAIN = [0, NS, NS + 1, NS + 2], inMain = (m, i) => m === i || (m === 0 && i < NS);
MAIN.forEach(m => {
  const b = document.createElement('button'), l = LV[m]; b.id = 'lv-' + l.id;
  b.innerHTML = '<span class="ico" aria-hidden="true">' + l.ico + '</span><span class="long">' + (m ? l.name : 'Země a Měsíc') + '</span><span class="short">' + { zeme: 'Země', soustava: 'Soustava', galaxie: 'Galaxie', vesmir: 'Vesmír' }[l.id] + '</span>';
  b.onclick = () => inMain(m, LV.indexOf(L)) || go(m); $('#levels').append(b);
});
LV.slice(0, NS).forEach((l, i) => l.hidden || $('#sub').append(Object.assign(pill(l.tab || l.name, () => go(i)), { id: 'sub-' + l.id })));
function syncPlay() { $('#play').textContent = playing ? '⏸' : '▶'; $('#play').setAttribute('aria-label', playing ? 'Zastavit čas' : 'Pustit čas'); }
$('#play').onclick = () => { playing = !playing; syncPlay(); };
syncPlay();
function setBare(b) { document.body.classList.toggle('bare', b); $('#showUi').hidden = !b; resize(); }
$('#hideUi').onclick = () => { $('#sets').hidden = true; setBare(true); }; $('#showUi').onclick = () => setBare(false);
const zoomStep = dy => renderer.domElement.dispatchEvent(new WheelEvent('wheel', { deltaY: dy, clientX: W / 2, clientY: H / 2, bubbles: true, cancelable: true }));
[['#zin', -100], ['#zout', 100]].forEach(([id, dy]) => { // držením tlačítka se zoomuje plynule
  let timer; const stop = () => clearInterval(timer);
  $(id).addEventListener('pointerdown', () => { zoomStep(dy); timer = setInterval(() => zoomStep(dy), 60); });
  ['pointerup', 'pointerleave', 'pointercancel'].forEach(ev => $(id).addEventListener(ev, stop));
});
addEventListener('keydown', e => {
  if (e.target.matches && e.target.matches('input,select,textarea')) return; // psaní do pole nejsou klávesové zkratky
  if (e.key.toLowerCase() === 'h') setBare(!document.body.classList.contains('bare'));
  const zoom = { '+': -100, '=': -100, '-': 100 }[e.key]; // záložní zoom z klávesnice
  if (zoom) zoomStep(zoom);
  const mv = { a: [-1, 0], d: [1, 0], w: [0, 1], s: [0, -1] }[e.key.toLowerCase()]; // WASD posouvá stejně jako šipky
  if (mv && !focus && !tr && L.id !== 'obloha' && L.id !== 'mapa') { // mapa se točí kolem středu Země, posun by ji rozhodil
    const stp = camera.position.distanceTo(controls.target) * .06;
    const dv = V().setFromMatrixColumn(camera.matrix, 0).multiplyScalar(mv[0] * stp).add(V().setFromMatrixColumn(camera.matrix, 1).multiplyScalar(mv[1] * stp));
    camera.position.add(dv); controls.target.add(dv);
  }
});
function setMin(m) { $('#card').classList.toggle('min', m); $('#more').setAttribute('aria-expanded', !m); $('#more').textContent = m ? '▴' : '▾'; }
setMin(matchMedia('(max-width:700px),(max-height:560px)').matches);
$('#more').onclick = () => setMin(!$('#card').classList.contains('min'));
$('#now').onclick = () => { simMs = Date.now(); $('#speed').value = L.def; $('#when').value = ''; };
const localIso = ms => new Date(ms - new Date(ms).getTimezoneOffset() * 6e4).toISOString().slice(0, 16); // tvar, který čeká pole datetime-local
$('#when').onfocus = () => { if (!$('#when').value) $('#when').value = localIso(simMs); };
$('#when').onchange = () => { const t = new Date($('#when').value).getTime(); if (!isNaN(t)) { simMs = t; playing = false; syncPlay(); } }; // čas se zastaví, ať zvolený okamžik neuteče
$('#factsMore').onclick = () => { $('#facts').classList.add('all'); $('#factsMore').hidden = true; };
$('#sunHint').onclick = () => { const d = camera.position.distanceTo(controls.target); unfocus(); flyTo = { pos: V(-4, .6, 2).setLength(Math.max(d, 4.5)), target: V() }; }; // pohled přes noční stranu Země ke Slunci
$('#center').onclick = () => { mapFlyTo = null; focus ? goBack() : (flyTo = overview()); };
if (document.fullscreenEnabled) { $('#full').hidden = false; $('#full').onclick = () => document.fullscreenElement ? document.exitFullscreen() : document.documentElement.requestFullscreen().catch(() => {}); }

/* ---------- popisky přichycené k tělesům ---------- */
const labels = [], wp = V(), v = V(), t1 = V();
function label(text, obj, r, show, onClick, cls) {
  const el = document.createElement(onClick ? 'button' : 'span'); el.className = 'lbl' + (cls ? ' ' + cls : ''); el.textContent = text; el.hidden = true;
  if (onClick) el.onclick = onClick;
  $('#labels').append(el); labels.push({ el, obj, r, show });
}
// kolečko a gesto touchpadu mají zoomovat, ať je kurzor nad čímkoli kromě menu a karty (ty se samy posouvají)
addEventListener('wheel', e => {
  if (e.target.closest && e.target.closest('#dock,#top')) return;
  if (L.id === 'obloha') { // stojíme na místě, takže zoom = užší zorné pole
    e.preventDefault(); e.stopPropagation();
    if (!tr) { camera.fov = THREE.MathUtils.clamp(camera.fov * (e.deltaY < 0 ? .93 : 1 / .93), 12, 85); resize(); }
    return;
  }
  if (e.target !== renderer.domElement) { e.preventDefault(); renderer.domElement.dispatchEvent(new WheelEvent('wheel', e)); return; }
  // zoom míří tam, kde je kurzor: bod pod ním zůstane na místě (stejnolehlost se středem v tom bodě)
  if (focus || tr || !e.deltaY || L.id === 'mapa') return;
  const k = e.deltaY < 0 ? .95 : 1 / .95, dist = camera.position.distanceTo(controls.target);
  if (dist * k < controls.minDistance || dist * k > controls.maxDistance) return;
  ray.setFromCamera({ x: e.clientX / W * 2 - 1, y: 1 - e.clientY / H * 2 }, camera);
  const n = camera.getWorldDirection(V()), t = controls.target.clone().sub(ray.ray.origin).dot(n) / ray.ray.direction.dot(n);
  const d = ray.ray.at(t, V()).sub(controls.target).multiplyScalar(1 - k);
  camera.position.add(d); controls.target.add(d);
}, { passive: false, capture: true });
// je bod na přivrácené straně koule?
const front = (obj, ball) => { obj.getWorldPosition(wp); ball.getWorldPosition(v); return t1.copy(wp).sub(v).dot(v.copy(camera.position).sub(wp)) > 0; };
const inS = () => L.id === 'soustava' && !game;
const tip = key => () => showInfo(INFO[key]);
label('Vesmírná stanice', iss, .05, () => L.id === 'zeme' && lay.iss && front(iss, earth), tip('ISS'));
label('Měsíc', moon, .27, () => L.group === gE, tip('Mesic'));
SEASONS.forEach((s, i) => label(s[0].toUpperCase() + s.slice(1), seasonMarks[i], 0, () => L.id === 'rok'));
label('Slunce', sunMesh, 3, () => inS() && !sizes, () => setFocus(SUN));
planets.forEach(p => {
  label(p.dwarf ? p.name + ', trpasličí planeta' : p.name, p.holder, p.r, () => inS() && focus !== p, () => setFocus(p), p.dwarf && 'dwarf');
  p.moons.forEach(m => label(m.name, m.mesh, m.r, () => inS() && focus !== m && (focus === p || (focus && focus.parent === p)), () => setFocus(m)));
});
label('Kometa', comet.holder, .5, () => inS() && !sizes && focus !== comet, () => setFocus(comet));
label('Pás asteroidů', beltMark, .3, () => inS() && !sizes && lay.pas, tip('Pas'));
label('Tady je naše Slunce', ourSun, 1, () => L.id === 'galaxie', tip('NaseSlunce'), 'home');
label('Naše galaxie', ourGalaxy, 6, () => L.id === 'vesmir', tip('NaseGalaxie'), 'home');
layerMarks.forEach(([name, o, key, side]) => { label(name, o, 0, () => L.id === 'rez' && o.parent.visible, tip(key), 'cut'); labels[labels.length - 1].align = () => cutAlign(side); });
compass.forEach(([name, o]) => label(name, o, 0, () => L.id === 'obloha', null, 'home'));
// souhvězdí a hvězdy mají jmenovky jen na obloze, a to ty nad obzorem
const FAMOUS = { UMa: 'Velký vůz', Ori: 'Orion', Cas: 'Kasiopeja' }, up = o => o.getWorldPosition(v).y > 60;
const MONTH_IN = ['v lednu', 'v únoru', 'v březnu', 'v dubnu', 'v květnu', 'v červnu', 'v červenci', 'v srpnu', 'v září', 'v říjnu', 'v listopadu', 'v prosinci'];
function constInfo(c) {
  const raH = ((c.ra / 15) % 24 + 24) % 24, month = MONTH_IN[((Math.round(raH / 2 - 2.08) % 12) + 12) % 12]; // měsíc, kdy je souhvězdí večer nejvýš
  const when = c.dec < -45 ? 'z Česka není vidět nikdy' : c.dec > 50 ? 'u nás celý rok' : c.dec < -25 ? 'jen nízko nad obzorem, večer ' + month : 'večer nejlíp ' + month;
  const known = INFO[FAMOUS[c.id]];
  return { name: c.cz, txt: known ? known.txt : 'Jedno z 88 souhvězdí, na která je rozdělená celá obloha. Lidé si z hvězd odjakživa skládali obrázky, aby se na obloze vyznali.', note: '', facts: [['Latinsky', c.la], ['Kdy je vidět', when]], wiki: { s: 'souhvězdí ' + c.cz, name: c.cz, word: 'souhvězdí', km: Infinity } };
}
constMarks.forEach(c => label(c.cz, c.mark, 0, () => L.id === 'obloha' && lay.jmenaS && up(c.mark), () => showInfo(constInfo(c)), 'sky'));
starMarks.forEach(st => label(st.name, st.mark, 0, () => L.id === 'obloha' && lay.hvezdy && up(st.mark), st.name === 'Polárka' ? tip('Polárka') : null, 'star'));
label('Slunce', sunSky, 0, () => L.id === 'obloha' && up(sunSky));
label('Měsíc', moonSky, 0, () => L.id === 'obloha' && up(moonSky), tip('Mesic'));
skyPlanets.forEach(([i, sp]) => label(planets[i].name, sp, 0, () => L.id === 'obloha' && up(sp)));

let W = 1, H = 1;
function project(obj) { // -> wp = pozice na obrazovce v px a vzdálenost, vrací false, když je za kamerou
  obj.getWorldPosition(wp); const dist = camera.position.distanceTo(wp);
  wp.project(camera); const ok = wp.z < 1;
  wp.set((wp.x + 1) / 2 * W, (1 - wp.y) / 2 * H, dist); return ok;
}
// tělesa, která umí zakrýt jmenovku něčeho za sebou: [objekt ve středu, poloměr]
const OCCLUDERS = new Map([[gS, [[sunMesh, 3], ...planets.map(p => [p.holder, p.r])]], [gE, [[earth, 1], [moon, .27]]], [gY, [[yEarth, 2.5], [gY, 3]]]]);
function hidden(obj) {
  const list = OCCLUDERS.get(L.group); if (!list) return false;
  obj.getWorldPosition(t1); const d = t1.clone().sub(camera.position), len2 = d.lengthSq();
  for (const [o, r] of list) {
    o.getWorldPosition(v); const R = r * o.scale.x;
    if (v.distanceTo(t1) < R * 1.06) continue; // jmenovka patří tomuhle tělesu nebo leží na jeho povrchu
    const t = v.clone().sub(camera.position).dot(d) / len2; // kde na přímce kamera–jmenovka je těleso nejblíž
    if (t > 0 && t < 1 && camera.position.clone().addScaledVector(d, t).distanceTo(v) < R * .97) return true;
  }
  return false;
}
// obdélníky ovládání; jmenovka, která by pod nimi ležela, se schová, aby se netrefila jiná věc a nebylo vidět useknuté jméno
let uiRects = [];
const underUi = (x0, y0, x1, y1) => uiRects.some(r => x1 > r.left && x0 < r.right && y1 > r.top && y0 < r.bottom);
const dockObs = new ResizeObserver(() => { document.documentElement.style.setProperty('--dockH', $('#dock').offsetHeight + 'px'); resize(); }); dockObs.observe($('#dock')); // na telefonu stojí tlačítka nad kartou
function drawLabels() {
  uiRects = [...document.querySelectorAll('#levels button,#sub button,#zoom button,#dock>*,#lays,#sets,#find,#tileCredit')].map(e => e.getBoundingClientRect()).filter(r => r.width);
  const on = $('#names').checked && !tr, pxPerUnit = H / 2 / Math.tan(rad(camera.fov / 2));
  const placed = [];
  for (const l of labels) {
    const vis = on && l.show() && !hidden(l.obj) && project(l.obj) && wp.x > -50 && wp.x < W + 50 && wp.y > 0 && wp.y < H + 50;
    l.el.hidden = !vis;
    if (!vis) continue;
    if (l.align) { const [ax, ay] = l.align(); l.el.style.transform = `translate(${wp.x}px,${wp.y}px) translate(${ax}%,${ay}%)`; continue; } // jmenovka s pevným umístěním, rozmístění hlídá sám pohled
    if (!l.w) l.w = l.el.offsetWidth; // text se nemění, stačí změřit jednou
    const x = wp.x; let y = wp.y - l.r * l.obj.scale.x * pxPerUnit / wp.z - 8;
    // jmenovky se nesmí překrývat: ta, která koliduje s už umístěnou, uhne o řádek výš
    for (let n = 0; n < 6 && placed.some(q => Math.abs(q[0] - x) < (q[2] + l.w) / 2 + 4 && Math.abs(q[1] - y) < 34); n++) y -= 34;
    if (underUi(x - l.w / 2, y - 30, x + l.w / 2, y)) { l.el.hidden = true; continue; }
    placed.push([x, y, l.w]);
    l.el.style.transform = `translate(${x}px,${y}px) translate(-50%,-100%)`;
  }
  drawMapLabels(placed, on);
  // když Slunce není v záběru, ukaž na kraji obrazovky, odkud svítí
  const hint = $('#sunHint'); let show = L.group === gE && !tr;
  if (show) {
    farSun.getWorldPosition(v).project(camera);
    const behind = v.z > 1; if (behind) { v.x = -v.x; v.y = -v.y; }
    show = behind || Math.abs(v.x) > .95 || Math.abs(v.y) > .95;
    if (show) { const s = .86 / Math.max(Math.abs(v.x), Math.abs(v.y), 1e-6); hint.style.transform = `translate(${(v.x * s + 1) / 2 * W - 27}px,${(1 - v.y * s) / 2 * H - 27}px)`; }
  }
  hint.hidden = !show;
}
let chipText = '';
function chip(text, cls) { if (text === chipText) return; chipText = text; const el = $('#dn'); el.hidden = !text; el.textContent = text; el.className = cls || ''; }

/* ---------- ťuknutí do scény ---------- */
const ray = new THREE.Raycaster(); let down = null;
renderer.domElement.addEventListener('pointerdown', e => down = [e.clientX, e.clientY]);
renderer.domElement.addEventListener('pointerup', e => {
  if (!down || tr || Math.hypot(e.clientX - down[0], e.clientY - down[1]) > 8) return;
  ray.setFromCamera({ x: e.clientX / W * 2 - 1, y: 1 - e.clientY / H * 2 }, camera);
  if (L.id === 'mapa') { // ťuknutí na stát
    const hit = ray.intersectObject(globe)[0], i = hit ? countryAt(hit.uv.x * 360 - 180, hit.uv.y * 180 - 90) : -1;
    const q = hit && quakesOn && quakes && !quiz && quakeAt(latLon(hit.uv.y * 180 - 90, hit.uv.x * 360 - 180));
    if (quiz) { if (quiz.mode === 'najdi' && i >= 0) quizAnswer(i); } // v kvízu je ťuknutí odpověď
    else if (q) showQuake(q);
    else if (i >= 0) showCountry(i);
  } else if (L.id === 'rez') { // ťuknutí na vrstvu ve výseči
    const hit = ray.intersectObjects(cutPicks).find(h => h.object.parent.visible); if (hit) showInfo(INFO[hit.object.userData.key]);
  } else if (L.id === 'soustava') {
    const hit = ray.intersectObjects(picks)[0]; if (hit) game ? answer(hit.object.userData.p) : setFocus(hit.object.userData.p);
    else if (focus) goBack(); // ťuknutí do prázdna pustí planetu
  }
});

renderer.domElement.addEventListener('dblclick', e => {
  if (tr || focus || L.id === 'obloha' || L.id === 'mapa') return;
  ray.setFromCamera({ x: e.clientX / W * 2 - 1, y: 1 - e.clientY / H * 2 }, camera);
  const hit = ray.intersectObjects(L.group.children, true).find(h => h.object.isMesh && h.object.material.visible !== false);
  if (hit) flyTo = { pos: camera.position.clone().add(hit.point.clone().sub(controls.target)), target: hit.point.clone() };
});

function resize() { W = innerWidth; H = innerHeight; renderer.setSize(W, H, false); camera.aspect = W / H;
  // scéna výš, ať ji dole nezakrývá karta; na širokém displeji i doprava od rozbalené karty
  const side = W > 900 && !$('#card').classList.contains('min') && !document.body.classList.contains('bare') ? $('#card').getBoundingClientRect().right / 2 : 0;
  camera.setViewOffset(W, H, -side, H * .1, W, H); fatMats.forEach(mt => mt.resolution.set(W, H)); }
addEventListener('resize', resize); resize();
