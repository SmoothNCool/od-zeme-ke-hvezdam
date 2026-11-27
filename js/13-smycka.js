// Hlavní smyčka a start. Soubory v js/ sdílejí jeden prostor jmen a načítají se v pořadí podle čísla.
let last = performance.now();
function frame(now) {
  requestAnimationFrame(frame);
  const dt = Math.min(.1, (now - last) / 1000); last = now;
  untilt(); // náklon 3D pohledu z minulého snímku pryč, ovládání počítá s kamerou mířící na střed Země
  const rate = ecl ? 17280 : RATES[$('#speed').value];
  if (playing && !tr) { simMs += dt * 1000 * rate; simT += dt * Math.min(4, rate / RATES[L.def || 3]); } // simT pohání jen ozdobné otáčení
  days = (simMs - Y0) / 864e5; // dny od začátku roku 2026 v UTC
  // otočení za tento snímek podle skutečné periody; nad pár otáček za vteřinu by z tělesa byla šmouha, proto strop
  const dDays = playing && !tr ? dt * rate / 86400 : 0, turn = (T, cap = 2) => THREE.MathUtils.clamp(dDays / T, -cap * dt, cap * dt) * TAU;
  const j2k = (simMs - J2000) / 864e5, ya = (days - 171.35) / 365.2422 * TAU; // ya = 0 při letním slunovratu

  // Země a Měsíc
  const lean = -ya - Math.PI; yaw.rotation.y = lean; // v létě je severní pól přikloněný ke Slunci (+X)
  // ve 12:00 UTC míří ke Slunci nultý poledník; při čase po dnech a rychlejším by Země jen náhodně poskakovala, proto se ukazuje vždy v poledne našeho času
  earth.rotation.y = ((playing && !ecl && rate >= 86400 ? 11 / 24 : days % 1) - .5) * TAU - lean; stepSeasons();
  const phi = moonPhi(simMs);
  moonPivot.rotation.y = phi; issPivot.rotation.y += turn(1 / 15.5, 1); // stanice obletí Zemi 15,5krát za den
  moon.getWorldPosition(moonW);
  if (ecl === 'moon') {
    const s = moonW.x < 0 ? 1 - THREE.MathUtils.smoothstep(Math.hypot(moonW.y, moonW.z), .7, 1.25) : 0;
    moon.material.color.setRGB(1 - .5 * s, 1 - .85 * s, 1 - .9 * s);
  }
  if (ecl && (ecl === 'sun' ? phi > .3 && phi < Math.PI : phi > Math.PI + .45)) endEclipse();
  if (L.group === gE) drawPhase(phi);

  // roční období: úhel 0 = letní slunovrat (172. den roku)
  yHolder.position.set(Math.cos(ya) * Y_R, 0, -Math.sin(ya) * Y_R);
  ySun.copy(yHolder.position).normalize().negate();
  yEarth.rotation.y += turn(1);

  // sluneční soustava
  sz += ((sizes ? 1 : 0) - sz) * Math.min(1, dt * 3);
  for (const p of planets) {
    const q = orbitPos(p, kepler((((p.a0 - p.peri + j2k / p.T * TAU) / TAU % 1) + 1) % 1 * TAU, p.e)); // střední anomálie = střední délka − délka přísluní
    p.ang = Math.atan2(-q.z, q.x); // ekliptikální délka, podle ní se planeta hledá na obloze
    p.holder.position.copy(q).lerp(p.row, sz);
    p.holder.scale.setScalar(1 + (p.k - 1) * sz);
    p.mesh.rotation.y += turn(p.rot);
    for (const m of p.moons) m.pivot.rotation.y += turn(m.T, 1.5);
  }
  sunMesh.rotation.y = simT * .05; sunMesh.position.x = SUN_X * sz; sunMesh.scale.setScalar(1 + (SUN_BIG - 1) * sz);
  gOrb.visible = sz < .05; belt.rotation.y = days / 1600 * TAU;
  stepComet(playing && !tr ? dt : 0); stepMeteors(dt, now);
  if (light) { light.r += dt * 2.2; lightRing.scale.setScalar(light.r); if (light.r > 47) { light = null; lightRing.visible = false; card(L); acts(); } }
  gG.rotation.y = simT * .02; gU.rotation.y = simT * .01;
  if (L.id === 'rez') layoutCut();
  if (L.group === gE) stepEarthIss(now);
  if (L.id !== 'mapa') { tileG.visible = false; $('#tileCredit').hidden = true; tilt3d = 0; lift.value = 0; if (camera.far !== 6000) { camera.far = 6000; camera.updateProjectionMatrix(); } }
  coreGlow.scale.setScalar(1 + .08 * Math.sin(now / 450));
  if (L.id === 'obloha') {
    // oblohu otočíme tak, aby zenit mířil nahoru (+Y), sever k −Z a východ k +X
    const zen = zenithAt(simMs), n = eqToScene(0, 90).addScaledVector(zen, -eqToScene(0, 90).dot(zen)).normalize(), ea = n.clone().cross(zen);
    sky.quaternion.setFromRotationMatrix(skyM.set(ea.x, ea.y, ea.z, 0, zen.x, zen.y, zen.z, 0, -n.x, -n.y, -n.z, 0, 0, 0, 0, 1));
    const lamS = sunLamAt(simMs), earthP = eclDir(planets[2].ang).multiplyScalar(AU[2]);
    sunSky.position.copy(eclDir(lamS)).multiplyScalar(2300); moonSky.position.copy(eclDir(lamS + phi)).multiplyScalar(2300);
    for (const [i, sp] of skyPlanets) sp.position.copy(eclDir(planets[i].ang).multiplyScalar(AU[i]).sub(earthP).normalize().multiplyScalar(2300));
    sunAlt = Math.asin(eclDir(lamS).dot(zen));
    controls.minPolarAngle = Math.PI / 2 + rad(Math.max(0, camera.fov / 2 - 7)); // kamera se dívá ze středu ven, takže výš = větší polární úhel
  } else sky.rotation.set(0, L.group === gE ? -(Math.PI / 2 + ya) : L.id === 'rok' ? Math.PI / 2 : 0, 0); // v pohledu na Zemi je Slunce pořád vpravo, takže se za rok otočí hvězdy
  if (L.id !== 'obloha') controls.minPolarAngle = 0;
  camD = camera.position.length();
  if (L.id === 'mapa') {
    controls.minDistance = mapMode === 'priroda' ? 1.0025 : 1.035; // příroda má dlaždice až do detailu, vektorová data blíž nic dalšího neukážou
    updateTiles(); $('#tileCredit').hidden = !tileG.visible; stepMapLayers(now);
    const h = camD - 1; // výška nad povrchem; čím níž, tím jemněji se otáčí i zoomuje
    controls.rotateSpeed = THREE.MathUtils.clamp(h / 2.1, .0008, 1); controls.zoomSpeed = THREE.MathUtils.clamp(h * 5, .02, 1);
    // ve 3D je terén blízko kamery, proto bližší ořez; vzdálený ořez se zkrátí, jinak by hloubka nestačila a hory by se prolínaly
    const t3 = tilt3d > .02, near = t3 ? Math.max(1e-4, h * .03) : THREE.MathUtils.clamp(h * .3, .0004, .05), far = t3 ? 4 : 6000;
    if (Math.abs(camera.near - near) > near * .05 || camera.far !== far) { camera.near = near; camera.far = far; camera.updateProjectionMatrix(); }
    if (vec) { // podrobnosti přibývají s přiblížením
      const nature = mapMode === 'priroda';
      vec.adm1.visible = camD < 1.75 && !!lay.regiony; vec.river.visible = camD < 2.6 && !!lay.reky; vec.bigRiver.visible = !!lay.reky; vec.caps.visible = !!lay.mesta;
      [2.6, 1.6, 1.22, 1.1].forEach((d, k) => vec.towns[k].visible = !!lay.mesta && camD < d);
      // ve 3D by čáry a tečky v nulové výšce nad zvednutým terénem plavaly, proto se schovají
      if (tilt3d > .02) [vec.border, vec.coast, vec.river, vec.bigRiver, vec.adm1, vec.caps, ...vec.towns].forEach(o => o.visible = false);
    }
  }
  // ve dne obloha zmodrá a hvězdy zmizí, i když tam pořád jsou
  const dayK = L.id === 'obloha' ? THREE.MathUtils.smoothstep(sunAlt, rad(-10), rad(3)) : 0;
  renderer.setClearColor(dayK ? new THREE.Color(0x05070f).lerp(new THREE.Color(0x6fa8e6), dayK) : 0x000000);
  const inSky = L.id === 'obloha'; // na obloze jsou hvězdy i čáry výraznější než jako pozadí jinde
  starMats.forEach(mt => { mt.opacity = 1 - dayK; mt.size = mt.userData.base * (inSky ? 1.5 : .8); }); lineMat.opacity = .75 * (1 - dayK); lineMat.visible = inSky && !!lay.souhvezdi; // čáry souhvězdí jen na obloze
  // při čase po dnech a rychlejším ukazuje Země vždy poledne, oblačnost proto stojí taky, jinak by se točila sama
  if (!(playing && !ecl && rate >= 86400)) cloudShift.value = (days * .03 % 1 + 1) % 1;

  if (tr) stepTransition(dt);
  else {
    if (focus) {
      focus.holder.getWorldPosition(v); camera.position.add(wp.copy(v).sub(controls.target)); controls.target.copy(v);
      if (zoomTo) {
        const off = camera.position.clone().sub(v), len = off.length(), nl = len + (zoomTo - len) * Math.min(1, dt * 3);
        camera.position.copy(v).add(off.setLength(nl)); if (Math.abs(nl - zoomTo) < .02 * zoomTo) zoomTo = 0;
      }
    } else if (flyTo) {
      const k = Math.min(1, dt * 3); camera.position.lerp(flyTo.pos, k); controls.target.lerp(flyTo.target, k);
      if (camera.position.distanceTo(flyTo.pos) < .05 + .01 * flyTo.pos.length()) flyTo = null;
    }
    if (mapFlyTo) stepMapFly(dt);
    if (recenter) { // nezruší ho ani další kolečko, jinak by střed otáčení zůstal viset mimo Slunce
      const dv = controls.target.clone().multiplyScalar(-Math.min(1, dt * 3)); controls.target.add(dv); camera.position.add(dv);
      if (focus || controls.target.length() < .05) recenter = false;
    }
    controls.update();
    // oddálení až na doraz pokračuje do většího světa, přiblížení na doraz do menšího
    if (!flyTo && !zoomTo && !L.noChain && !quiz) { // oddálení na doraz nesmí ukončit rozehraný kvíz
      const d = camera.position.distanceTo(controls.target), i = LV.indexOf(L);
      if (focus && d > 45) { unfocus(); card(baseCard()); recenter = !sizes; } // při oddálení se planeta pustí a střed se vrátí ke Slunci
      else if (d >= L.max * .998 && !sizes && i < LV.length - 1) go(Math.max(NS, i + 1)); // pohledy na Zemi do řetězu nepatří, ven se letí rovnou do soustavy
      else if (d <= L.min * 1.002 && !focus && i >= NS) go(i === NS ? 0 : i - 1);
    }
  }
  if (L.id === 'mapa') controls.enableRotate = !tiltOn; // ve 3D posouvá vlastní tažení
  if (L.id === 'mapa' && !tr) applyTilt(dt);
  // křížek je vidět, kdykoli je něco vybrané; Zpět jen tam, kde je o úroveň výš kam jít
  const open = !!(info || focus), nested = !!(focus && (info || focus.parent));
  if ($('#close').hidden === open) $('#close').hidden = !open;
  $('#back').classList.toggle('solo', !nested);
  renderer.render(scene, camera);
  drawLabels();

  if (L.group === gE) { const d = home.getWorldPosition(v).dot(SUN_DIR) > 0; chip((d ? 'U nás je den' : 'U nás je noc') + (lay.rok ? ', ' + seasonNow() : ''), d ? 'day' : ''); }
  else if (L.id === 'rok') {
    chip('U nás je ' + SEASONS[Math.floor(((ya / TAU) % 1 + 1) % 1 * 4)] + ', ' + fmtM.format(simMs), 'day');
  } else if (L.id === 'obloha') chip(sunAlt > 0 ? 'U nás je den' : sunAlt > rad(-8) ? 'U nás je soumrak' : 'U nás je noc', sunAlt > 0 ? 'day' : '');
  else if (light) {
    const reached = planets.filter(p => p.R <= light.r).pop();
    chip('Světlo letí ' + fmtMin(lightMin(light.r)) + (reached ? ', doletělo ' + reached.dat : ''), 'day');
  } else chip('');
  const ck = L.def ? 'Čas u nás: ' + (rate >= 86400 || ecl ? fmtD : fmtDT).format(simMs) : '', rt = RATE_NAMES[$('#speed').value];
  if (ck !== clockText) $('#clock').textContent = clockText = ck;
  if (rt !== rateText) $('#rate').textContent = rateText = rt;
}
setLevel(Math.max(0, LV.findIndex(l => '#' + l.id === location.hash)));
window.__t = { get level() { return L.id; }, get quiz() { return quiz; }, openJourney, get stars() { return jStars.size; }, get caught() { return caught; }, meteorHead: () => { for (const m of meteors.children) { if (m.userData.t > MET_FLY * .6) continue; const p = m.userData.head.position.clone().project(camera), x = (p.x + 1) / 2 * W, y = (1 - p.y) / 2 * H; if (p.z < 1 && x > 20 && x < W - 20 && y > 120 && y < H - 120 && !underUi(x - 5, y - 5, x + 5, y + 5)) return [x, y]; } return null; }, get moonRed() { return moonSky.material.color.r - moonSky.material.color.b; }, startFx, goNight, goDay, get sunAlt() { return sunAlt; }, get meteorsN() { return meteors.children.length; }, get satsN() { return sats.length; }, get auroraOn() { return aurora.visible; }, get cometOn() { return cometSky.visible; }, view3d: () => { const v = view3d(); return { d: v.d.toArray(), right: v.right.toArray(), fwd: v.fwd.toArray() }; }, turn3d, get lines3d() { return vec ? vec.border.visible : null; }, newComet, showHistory, showExo, get tilt() { return tilt3d; }, setTilt: on => set3d(on), get volc() { return volc ? volc.length : 0; }, get issNow() { return issNow; }, get mapMode() { return mapMode; }, get tiles() { return [...tiles.values()].filter(t => t.mesh.visible).length; }, get tilesFailed() { return tilesFailed; }, get tileZ() { let z = 0; for (const t of tiles.values()) if (t.mesh.visible) z = Math.max(z, t.z); return z; }, lay, setLay, get linesOn() { return lineMat.visible; }, toggleQuakes, showRecords, get quakes() { return quakes ? quakes.list.length : 0; }, quizStart, quizAnswer, quizNext, findHits, pickHit, showCountry, mapFly, get theme() { return mapTheme; }, get info() { return info && info.name; }, get selected() { return !!(selLine || selPin && selPin.visible); }, setMapMode: m => pickMode(m), countryCard, countryAt, get camD() { return camD; }, get mapShown() { return mapShown.map(m => m.text); }, get mapPool() { return mapPool.length; }, get buildMs() { return buildMs; }, get fov() { return camera.fov; }, get dist() { return camera.position.distanceTo(controls.target); }, get focus() { return focus && focus.name; }, go: x => go(typeof x === 'string' ? LV.findIndex(l => l.id === x) : x), eclipse, toggleSizes, startLight, toggleGame, setFocus, planets, comet }; // háčky pro automatický test
requestAnimationFrame(frame);
