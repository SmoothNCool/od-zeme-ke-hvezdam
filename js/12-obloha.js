// Úkazy na obloze: den a noc jedním ťuknutím, meteorické roje, kometa, polární záře, družice. Soubory v js/ sdílejí jeden prostor jmen a načítají se v pořadí podle čísla.
// Obzor je ve skupině gO ve světových souřadnicích: nahoru +Y, sever −Z, východ +X. Hvězdy jsou ve skupině sky, směr z rovníkových souřadnic se do světa převede jejím natočením.
const skyWorld = (raH, dec) => eqToScene(raH, dec).applyQuaternion(sky.quaternion);
const sunAltAt = ms => Math.asin(eclDir(sunLamAt(ms)).dot(zenithAt(ms)));
function findTime(test, from = simMs) { // první okamžik v příštích 30 hodinách, kdy platí test (krok 10 minut)
  for (let t = from; t < from + 30 * 36e5; t += 6e5) if (test(t)) return t;
  return null;
}
function goNight() {
  const t = findTime(t => sunAltAt(t) < rad(-12)) || findTime(t => sunAltAt(t) < sunAltAt(t - 6e5) && sunAltAt(t) < sunAltAt(t + 6e5)); // v létě u nás nebývá úplná tma, pak nejtmavší chvíle
  simMs = t; skySlow();
}
function goDay() { // nejbližší poledne: Slunce nejvýš
  simMs = findTime(t => sunAltAt(t) > rad(5) && sunAltAt(t) > sunAltAt(t - 6e5) && sunAltAt(t) >= sunAltAt(t + 6e5)); skySlow();
}
function skySlow() { playing = true; syncPlay(); $('#speed').value = 1; acts(); } // 1 s = 1 minuta, ať úkazy neutečou
function lookSky(dir) { const d = dir.clone(); d.y = Math.max(d.y, .35); d.normalize(); camera.position.copy(d.multiplyScalar(-.1)); controls.target.set(0, 0, 0); }
const azAlt = (az, alt) => V(Math.cos(rad(alt)) * Math.sin(rad(az)), Math.sin(rad(alt)), -Math.cos(rad(alt)) * Math.cos(rad(az)));

/* ---------- úkazy ---------- */
// čas: nejbližší maximum roje v našem čase; radiant: rektascenze v hodinách a deklinace
const nextUTC = (m, d, h) => { const y = new Date(simMs).getUTCFullYear(); let t = Date.UTC(y, m, d, h); if (t < simMs - 2 * 864e5) t = Date.UTC(y + 1, m, d, h); return t; };
const SHOWER_NOTE = 'V modelu padají meteory mnohem častěji než doopravdy. Meteory se zdánlivě rozbíhají z jednoho místa na obloze, z radiantu, podle jehož souhvězdí se roj jmenuje.';
const SKY_FX = {
  perseidy: { name: 'Perseidy', when: () => nextUTC(7, 12, 21), radiant: [3.07, 58], look: true,
    txt: 'Nejznámější letní meteorický roj. Země každý rok v srpnu prolétá prachem, který za sebou nechala kometa Swift–Tuttle. Zrnka velká jako písek vletí do atmosféry rychlostí 59 km/s a shoří jako padající hvězdy.', note: SHOWER_NOTE,
    facts: [['Maximum', '12. až 13. srpna'], ['Za hodinu', 'až kolem 100 meteorů'], ['Mateřská kometa', '109P/Swift–Tuttle'], ['Radiant', 'souhvězdí Persea']], wiki: { t: 'Perseidy' } },
  geminidy: { name: 'Geminidy', when: () => nextUTC(11, 14, 21), radiant: [7.47, 32.5], look: true,
    txt: 'Nejsilnější roj roku, padá v prosinci. Zvláštní je tím, že ho nezpůsobuje kometa, ale planetka Phaethon. Meteory jsou pomalejší a často jasné.', note: SHOWER_NOTE,
    facts: [['Maximum', '13. až 14. prosince'], ['Za hodinu', 'až kolem 150 meteorů'], ['Mateřské těleso', 'planetka 3200 Phaethon'], ['Radiant', 'souhvězdí Blíženců']], wiki: { t: 'Geminidy' } },
  leonidy: { name: 'Leonidy', when: () => nextUTC(10, 18, 3), radiant: [10.13, 21.6], look: true,
    txt: 'Listopadový roj z komety Tempel–Tuttle. Většinou je slabý, ale jednou za zhruba 33 let může nastat meteorický déšť s tisíci meteorů za hodinu, jako v letech 1833 a 1966. Meteory jsou nejrychlejší ze všech rojů.', note: SHOWER_NOTE,
    facts: [['Maximum', '17. až 18. listopadu, nad ránem'], ['Rychlost', '71 km/s'], ['Mateřská kometa', '55P/Tempel–Tuttle'], ['Radiant', 'souhvězdí Lva']], wiki: { t: 'Leonidy' } },
  kometa: { name: 'Jasná kometa', when: () => findTime(t => sunAltAt(t) < rad(-10)), look: true,
    txt: 'Párkrát za desetiletí přiletí kometa, kterou je vidět pouhým okem. Večer po setmění stojí nízko nad západem a její ohon míří od Slunce, které je pod obzorem. Naposledy to tak vypadalo v říjnu 2024 s kometou Tsuchinshan–ATLAS.', note: 'Kometa v modelu je ukázka, ne skutečná kometa na nastavené datum. Jasné komety nejde dlouho dopředu předpovědět.',
    facts: [['Ohon míří', 'od Slunce'], ['Slavné komety', 'Hale–Bopp 1997, NEOWISE 2020, Tsuchinshan–ATLAS 2024']], wiki: { t: 'Kometa' } },
  polarni: { name: 'Polární záře', when: () => findTime(t => sunAltAt(t) < rad(-15)) || findTime(t => sunAltAt(t) < rad(-8)), look: true,
    txt: 'Když Slunce vyvrhne obří oblak nabitých částic a ten narazí do Země, rozzáří se vysoko v atmosféře kyslík a dusík. U pólů je polární záře častá, u nás jen při nejsilnějších magnetických bouřích, nízko nad severním obzorem.', note: 'Zelenou barvu dává kyslík ve výšce asi 100 až 250 km, červenou kyslík ještě výš. Z Česka byla výrazná polární záře vidět třeba v květnu a říjnu 2024.',
    facts: [['Výška', '100 až 300 km'], ['U nás je vidět', 'na severu, vzácně'], ['Zelená', 'kyslík'], ['Červená', 'kyslík ve větší výšce']], wiki: { t: 'Polární záře' } },
  zatmeni: { name: 'Zatmění Měsíce', ico: '🌘', when: () => { const e = ECLIPSES.moon.find(e => e[0] > simMs - 864e5); return e ? e[0] - 75 * 6e4 : null; }, look: true,
    txt: 'Při úplňku se Měsíc dostane do stínu Země. Nezmizí, ale potemní a zčervená, protože na něj dopadá jen světlo lomené zemskou atmosférou, stejně červené jako při západu Slunce. Model přepne na nejbližší skutečné zatmění viditelné z Evropy.', note: 'Data zatmění: NASA. Zatmění Měsíce je vidět ze všech míst, kde je Měsíc zrovna nad obzorem, a dívat se na něj je úplně bezpečné.',
    facts: [['Kdy', 'jen při úplňku'], ['Barva', 'tmavě červená až měděná'], ['Trvá', 'až kolem 4 hodin, úplná fáze nejvýš asi 1 hodinu 45 minut']], wiki: { t: 'Zatmění Měsíce' } },
  druzice: { name: 'Družice', when: () => findTime(t => sunAltAt(t) < rad(-8)), look: false,
    txt: 'Po setmění je vidět, jak po obloze pomalu a bez blikání plují světelné tečky. Jsou to družice, které jsou vysoko ještě na slunci a odrážejí jeho světlo. Za pár minut přeletí celou oblohu. Řada teček za sebou je vlak družic Starlink krátce po startu.', note: 'Družice v modelu letí po náhodných drahách, skutečné přelety se počítají z jejich drah. Nejjasnější je Mezinárodní vesmírná stanice.',
    facts: [['Kdy jsou vidět', 'hlavně 1 až 2 hodiny po západu a před východem Slunce'], ['Na oběžné dráze', 'kolem 17 tisíc funkčních družic, dvě třetiny z nich jsou Starlink'], ['Nejjasnější', 'Mezinárodní vesmírná stanice']], wiki: { t: 'Umělá družice' } },
};
let skyFx = null;
const fxOn = key => !!(info && info.fx === key && L.id === 'obloha');
function startFx(key) {
  const f = SKY_FX[key], t = f.when(); if (t) simMs = t; skySlow(); caught = 0;
  const ev = key === 'zatmeni' && ECLIPSES.moon.find(e => e[0] > simMs);
  showInfo(Object.assign({ fx: key, tiles: fxTiles(key), chipsTitle: 'Další úkazy' }, f, ev ? { note: 'Tohle zatmění doopravdy nastane ' + fmtD.format(ev[0]) + ': ' + ev[1] + '. ' + f.note } : {}));
  setTimeout(() => { // po přepnutí času se natočí obloha, teprve pak jde zamířit pohled
    if (f.radiant) lookSky(skyWorld(...f.radiant)); else if (key === 'zatmeni') lookSky(moonSky.getWorldPosition(V()).normalize()); else if (key === 'kometa') lookSky(azAlt(285, 15)); else if (key === 'polarni') lookSky(azAlt(0, 15)); else lookSky(azAlt(180, 45));
  }, 60);
}
const FX_ICO = { perseidy: '☄️', geminidy: '🌠', leonidy: '🦁', kometa: '☄️', polarni: '🌌', zatmeni: '🌘', druzice: '🛰️' };
const fxWhen = k => { const f = SKY_FX[k]; if (!f.radiant && k !== 'zatmeni') return { kometa: 'ukázka jasné komety', polarni: 'ukázka, u nás vzácně', druzice: 'každý večer po setmění' }[k]; const t = f.when(); return t ? 'nejbližší: ' + fmtD.format(t) : ''; };
const fxTiles = skip => Object.keys(SKY_FX).filter(k => k !== skip).map(k => [FX_ICO[k], SKY_FX[k].name, fxWhen(k), () => startFx(k)]);
const fxChips = () => [];
const showSkyFx = () => showInfo({ name: 'Úkazy na obloze', txt: 'Vyber úkaz. Model přepne čas na noc, kdy je vidět, a natočí pohled tam, kam se dívat. Padající hvězdy jde chytat ťuknutím.', note: 'Čas běží pomalu, 1 s = 1 minuta. Tlačítkem Teď dole se vrátíš do skutečného okamžiku.', facts: [], tiles: fxTiles(), chipsTitle: 'Úkazy' });
function skyActs(a) {
  const night = sunAlt < rad(-6);
  a.append(pill('Noc', goNight, night), pill('Den', goDay, sunAlt > 0), pill('Úkazy na obloze', showSkyFx));
}

/* ---------- kreslení úkazů ---------- */
// meteory z radiantu: start kus od radiantu, letí směrem od něj
const radMark = new THREE.Object3D(); gO.add(radMark);
label('Radiant', radMark, 0, () => !!(info && SKY_FX[info.fx] && SKY_FX[info.fx].radiant && L.id === 'obloha' && radMark.position.y > 60), null, 'star');
let showerWait = 0;
// meteor: svítící hlava letí z a do b a táhne za sebou slábnoucí stopu; pak zhasne
const MET_FLY = .55, MET_FADE = .5;
function spawnMeteor(a, b, color) {
  const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute([0, 0, 0, 0, 0, 0], 3));
  g.setAttribute('color', new THREE.Float32BufferAttribute([0, 0, 0, 1, 1, 1], 3));
  const trail = new THREE.Line(g, new THREE.LineBasicMaterial({ vertexColors: true, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false })), head = glow(color, 46, 1);
  const m = new THREE.Group(); m.add(trail, head); m.userData = { a, b, t: 0, trail, head }; meteors.add(m); return m;
}
function stepMeteorAnim(dt) {
  for (const m of [...meteors.children]) {
    const u = m.userData; u.t += dt; const k = Math.min(1, u.t / MET_FLY), fade = Math.max(0, 1 - Math.max(0, u.t - MET_FLY) / MET_FADE);
    const hp = u.a.clone().lerp(u.b, k), tp = u.a.clone().lerp(u.b, Math.max(0, k - .45));
    const pos = u.trail.geometry.attributes.position; pos.setXYZ(0, tp.x, tp.y, tp.z); pos.setXYZ(1, hp.x, hp.y, hp.z); pos.needsUpdate = true;
    u.trail.material.opacity = fade; u.head.position.copy(hp); u.head.material.opacity = k < 1 ? 1 : fade * .6;
    if (u.t > MET_FLY + MET_FADE || u.caught) { meteors.remove(m); u.trail.geometry.dispose(); u.trail.material.dispose(); u.head.material.dispose(); }
  }
}
function meteorLine(a, b, color) { spawnMeteor(a, b, color); }
function stepShower(dt, f) {
  const R = skyWorld(...f.radiant); radMark.position.copy(R).multiplyScalar(1880);
  if (R.y < -.15 || sunAlt > rad(-6)) return;
  showerWait -= dt; if (showerWait > 0) return; showerWait = .25 + Math.random() * .5;
  const d = V(Math.random() - .5, Math.random() - .5, Math.random() - .5).addScaledVector(R, -1).normalize(), d2 = d.addScaledVector(R, -d.dot(R)).normalize();
  const a0 = rad(6 + Math.random() * 45), len = rad(4 + Math.random() * 9), at = th => R.clone().multiplyScalar(Math.cos(th)).addScaledVector(d2, Math.sin(th)).multiplyScalar(1900);
  const s = at(a0); if (s.y < 120) return;
  meteorLine(s, at(a0 + len), Math.random() < .2 ? 0xbfffd8 : 0xffffff);
}
// kometa: hlava a ohon od Slunce
const cometSky = new THREE.Group(); cometSky.visible = false; gO.add(cometSky);
const cometHead = glow(0xe8fbff, 70); cometSky.add(cometHead);
const cometTail = Array.from({ length: 18 }, (_, i) => { const s = glow(0x8fd4ff, 70 * (1 - i / 22), .5 * (1 - i / 19)); cometSky.add(s); return s; }); // iontový ohon: rovný a modrý
const dustTail = Array.from({ length: 14 }, (_, i) => { const s = glow(0xfff0c8, 120 * (1 - i / 18), .5 * (1 - i / 15)); cometSky.add(s); return s; }); // prachový ohon: širší, nažloutlý, zahnutý
label('Kometa', cometHead, 0, () => fxOn('kometa'), null, 'star');
function stepCometSky() {
  const head = azAlt(285, 15), sun = eclDir(sunLamAt(simMs)).applyQuaternion(sky.quaternion);
  const away = head.clone().sub(sun).addScaledVector(head, -head.clone().sub(sun).dot(head)).normalize(); // tečný směr od Slunce
  cometHead.position.copy(head).multiplyScalar(1850);
  cometTail.forEach((s, i) => s.position.copy(head).addScaledVector(away, (i + 1) * .02).normalize().multiplyScalar(1850));
  const side = away.clone().cross(head).normalize();
  dustTail.forEach((s, i) => { const t = (i + 1) * .016; s.position.copy(head).addScaledVector(away, t).addScaledVector(side, t * t * 2.2).normalize().multiplyScalar(1850); });
}
// polární záře: záclona nad severním obzorem, paprsky se pomalu vlní
const auroraU = { time: { value: 0 } };
const aurora = new THREE.Mesh(new THREE.CylinderGeometry(1840, 1840, 1100, 96, 1, true, Math.PI - 1.15, 2.3), new THREE.ShaderMaterial({
  uniforms: auroraU, transparent: true, depthWrite: false, side: THREE.DoubleSide, blending: THREE.AdditiveBlending,
  vertexShader: 'varying vec2 vUv;void main(){vUv=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0);}',
  fragmentShader: 'uniform float time;varying vec2 vUv;void main(){float x=vUv.x*40.0;float rays=0.55+0.45*sin(x*1.7+time*0.6+sin(x*0.37+time*0.23)*3.0);' +
    'float curtain=smoothstep(0.0,0.12,vUv.y)*(1.0-smoothstep(0.35,1.0,vUv.y))*(0.6+0.4*sin(vUv.x*9.0+time*0.15));float edge=smoothstep(0.0,0.15,vUv.x)*(1.0-smoothstep(0.85,1.0,vUv.x));' +
    'vec3 col=mix(vec3(0.2,1.0,0.45),vec3(0.95,0.25,0.4),smoothstep(0.35,0.9,vUv.y));gl_FragColor=vec4(col*rays*curtain*edge*0.75,1.0);}',
}));
aurora.position.y = 520; aurora.visible = false; gO.add(aurora);
// družice: tečky po velkých kružnicích od obzoru k obzoru, občas vlak Starlinku
const sats = []; let satWait = 2;
const satMat = new THREE.PointsMaterial({ size: 4, sizeAttenuation: false, color: 0xf4f7ff, transparent: true });
const issSkyMark = new THREE.Object3D(); gO.add(issSkyMark); let issSky = null;
label('Vesmírná stanice', issSkyMark, 0, () => L.id === 'obloha' && !!issSky && issSkyMark.position.y > 60, () => showInfo(INFO.ISS), 'star');
const issMat = new THREE.PointsMaterial({ size: 8, sizeAttenuation: false, color: 0xfffbea, transparent: true });
function newSat(train) {
  const A = azAlt(Math.random() * 360, 0), B = azAlt(Math.random() * 360, 25 + Math.random() * 60), w = B.addScaledVector(A, -B.dot(A)).normalize();
  const n = train ? 14 : 1, g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(new Array(n * 3).fill(0), 3));
  const bright = !train && !issSky && Math.random() < .3, p = new THREE.Points(g, bright ? issMat : satMat); gO.add(p);
  const s = { p, A, w, n, t: 0, dur: 22 + Math.random() * 18, bright }; sats.push(s); if (bright) issSky = s;
}
function stepSats(dt) {
  const night = L.id === 'obloha' && sunAlt < rad(-6);
  if (night) { satWait -= dt * (fxOn('druzice') ? 4 : 1); if (satWait <= 0) { satWait = 6 + Math.random() * 10; newSat(Math.random() < (fxOn('druzice') ? .35 : .12)); } }
  for (const s of [...sats]) {
    s.t += dt / s.dur; const pos = s.p.geometry.attributes.position;
    for (let k = 0; k < s.n; k++) { const th = Math.max(0, s.t - k * .012) * Math.PI, v = s.A.clone().multiplyScalar(Math.cos(th)).addScaledVector(s.w, Math.sin(th)).multiplyScalar(1880); pos.setXYZ(k, v.x, v.y, v.z); }
    pos.needsUpdate = true; s.p.visible = night; if (s === issSky) issSkyMark.position.set(pos.getX(0), pos.getY(0), pos.getZ(0));
    if (s.t > 1.2 || !night && L.id !== 'obloha') { gO.remove(s.p); s.p.geometry.dispose(); sats.splice(sats.indexOf(s), 1); if (s === issSky) issSky = null; }
  }
}
const MOON_COL = new THREE.Color(0xe9edf5), MOON_RED = new THREE.Color(0x9a3a22);
function stepSkyFx(dt) {
  const ev = fxOn('zatmeni') && ECLIPSES.moon.find(e => Math.abs(e[0] - simMs) < 3 * 36e5), k = ev ? 1 - THREE.MathUtils.smoothstep(Math.abs(ev[0] - simMs) / 6e4, 30, 80) : 0;
  moonSky.material.color.copy(MOON_COL).lerp(MOON_RED, k); moonSky.material.opacity = 1 - k * .35;
  $('#catch').hidden = !(info && SKY_FX[info.fx] && SKY_FX[info.fx].radiant && L.id === 'obloha');
  if (!$('#catch').hidden) $('#catch').textContent = 'Chyceno meteorů: ' + caught + (bestCatch ? ' · rekord ' + bestCatch : '') + ' · ťukni na padající hvězdu';
  const f = info && SKY_FX[info.fx];
  if (f && f.radiant && L.id === 'obloha') stepShower(dt, f);
  cometSky.visible = fxOn('kometa') && sunAlt < rad(-4); if (cometSky.visible) stepCometSky();
  aurora.visible = fxOn('polarni') && sunAlt < rad(-8); auroraU.time.value += dt;
  stepSats(dt);
}
const stepMeteors0 = stepMeteors;
stepMeteors = (dt, now) => { stepMeteors0(dt, now); stepSkyFx(dt); };
// úkazy jdou najít lupou
const findList2 = findList;
findList = () => { if (findFixed) return findFixed; findList2(); for (const k in SKY_FX) findFixed.push({ text: SKY_FX[k].name, kind: 'úkaz na obloze', n: norm(SKY_FX[k].name), run: () => goThen(lv('obloha'), () => startFx(k)) }); return findFixed; };

/* ---------- hra: chytej meteory ---------- */
let caught = 0, bestCatch = 0; try { bestCatch = +localStorage.getItem('meteory') || 0; } catch (e) { /* bez úložiště bez rekordu */ }
const catchEl = document.createElement('div'); catchEl.id = 'catch'; catchEl.hidden = true; document.body.append(catchEl);
renderer.domElement.addEventListener('pointerup', e => {
  if (L.id !== 'obloha' || !meteors.children.length) return;
  for (const m of meteors.children) {
    const u = m.userData; if (u.t > MET_FLY + .3) continue; // zhaslý meteor už chytit nejde
    // stačí ťuknout kamkoli na jeho stopu, meteor je rychlý
    const scr = v3 => { const p = v3.clone().project(camera); return [(p.x + 1) / 2 * W, (1 - p.y) / 2 * H, p.z]; }, h = scr(u.head.position), a0 = scr(u.a);
    const dx = h[0] - a0[0], dy = h[1] - a0[1], l2 = dx * dx + dy * dy || 1, k = THREE.MathUtils.clamp(((e.clientX - a0[0]) * dx + (e.clientY - a0[1]) * dy) / l2, 0, 1);
    if (h[2] < 1 && Math.hypot(a0[0] + dx * k - e.clientX, a0[1] + dy * k - e.clientY) < 55) {
      u.caught = true; caught++; sfx('ok');
      if (caught > bestCatch) { bestCatch = caught; try { localStorage.setItem('meteory', caught); } catch (er) { /* bez úložiště */ } }
      return;
    }
  }
});
