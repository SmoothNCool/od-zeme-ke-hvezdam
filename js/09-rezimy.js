// Hlas, zvuky, zatmění, fáze Měsíce, skutečné velikosti, světlo, hra. Soubory v js/ sdílejí jeden prostor jmen a načítají se v pořadí podle čísla.
/* ---------- hlas ---------- */
const synth = window.speechSynthesis; if (synth) synth.getVoices(); else $('#read').hidden = true;
function say(text) { // false = zařízení má hlasy, ale žádný český
  if (!synth) return; synth.cancel();
  const vs = synth.getVoices(), cs = vs.find(v => v.lang.toLowerCase().startsWith('cs'));
  if (vs.length && !cs) return false;
  const u = new SpeechSynthesisUtterance(text); u.lang = 'cs-CZ'; if (cs) u.voice = cs; u.rate = .9; synth.speak(u);
}
$('#read').onclick = () => {
  if (synth.speaking) return synth.cancel();
  if (say(readText) === false) $('#note').textContent = 'V tomhle zařízení chybí český hlas. Dá se doinstalovat v nastavení systému.';
};

/* ---------- zvuky (syntetické, žádné soubory) ---------- */
let actx = null, sndOn = true;
function tone(f, t, dur, type = 'sine', vol = .15) {
  const o = actx.createOscillator(), g = actx.createGain(); o.type = type; o.frequency.value = f;
  g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(.0001, t + dur); o.connect(g).connect(actx.destination); o.start(t); o.stop(t + dur);
}
function sfx(kind) {
  if (!sndOn) return;
  try { actx = actx || new (window.AudioContext || window.webkitAudioContext)(); if (actx.state === 'suspended') actx.resume(); } catch (e) { return; }
  const t = actx.currentTime;
  if (kind === 'ok') [660, 880, 1320].forEach((f, i) => tone(f, t + i * .11, .25));
  else tone(180, t, .3, 'triangle', .2);
}
$('#snd').onclick = () => { sndOn = !sndOn; $('#snd').setAttribute('aria-pressed', sndOn); };

/* ---------- zatmění ---------- */
// skutečná zatmění podle NASA (F. Espenak, Eclipses 2021–2030), čas největší fáze v UTC
const ECLIPSES = {
  sun: [[Date.UTC(2027, 7, 2, 10, 7), 'úplné zatmění Slunce. Celé Slunce se schová ve Španělsku a v Egyptě, u nás Měsíc zakryje jen jeho část'],
    [Date.UTC(2028, 0, 26, 15, 9), 'prstencové zatmění Slunce, vidět bude ve Španělsku a v Jižní Americe'],
    [Date.UTC(2028, 6, 22, 2, 57), 'úplné zatmění Slunce, vidět bude v Austrálii'],
    [Date.UTC(2030, 5, 1, 6, 29), 'prstencové zatmění Slunce. Prstenec uvidí v Řecku a Turecku, u nás Měsíc zakryje část Slunce'],
    [Date.UTC(2030, 10, 25, 6, 52), 'úplné zatmění Slunce, vidět bude v jižní Africe a v Austrálii']],
  moon: [[Date.UTC(2028, 0, 12, 4, 14), 'částečné zatmění Měsíce, vidět bude i z Evropy'],
    [Date.UTC(2028, 6, 6, 18, 21), 'částečné zatmění Měsíce, vidět bude i z Evropy'],
    [Date.UTC(2028, 11, 31, 16, 53), 'úplné zatmění Měsíce na Silvestra, vidět bude i z Evropy'],
    [Date.UTC(2029, 5, 26, 3, 23), 'úplné zatmění Měsíce, vidět bude i z Evropy'],
    [Date.UTC(2029, 11, 20, 22, 43), 'úplné zatmění Měsíce, vidět bude i z Evropy'],
    [Date.UTC(2030, 5, 15, 18, 35), 'částečné zatmění Měsíce, vidět bude i z Evropy']],
};
for (const k in ECLIPSES) for (const [t] of ECLIPSES[k]) { // každé datum musí padnout na nov, resp. úplněk
  const off = Math.abs(((moonPhi(t) - (k === 'sun' ? 0 : Math.PI)) / TAU + 1.5) % 1 - .5) * TAU;
  console.assert(off < .25, 'zatmění mimo nov/úplněk', k, new Date(t).toISOString(), off);
}
function eclipse(kind) {
  if (ecl === kind) return endEclipse();
  const list = ECLIPSES[kind], ev = list.find(e => e[0] > simMs + 864e5) || list[0], half = kind === 'sun' ? 0 : .5;
  const syzygy = NEW0 + (Math.round((ev[0] - NEW0) / SYN - half) + half) * SYN; // nov nebo úplněk modelu nejbližší skutečnému zatmění
  ecl = kind; playing = true; syncPlay(); earth.material.uniforms.ecl.value = kind === 'sun' ? 1 : 0; moon.material.color.set(0xffffff);
  simMs = syzygy - (kind === 'sun' ? .3 : .45) / TAU * SYN;
  flyTo = kind === 'sun' ? { pos: V(10, 3, 7), target: V() } : { pos: V(-4, 4, 13), target: V(-2.5) };
  const real = 'Tohle zatmění doopravdy nastane ' + fmtD.format(ev[0]) + ': ' + ev[1] + '. Zatmění je vzácné, většinou Měsíc proletí kousek nad stínem nebo pod ním.';
  card(kind === 'sun'
    ? { name: 'Zatmění Slunce', txt: 'Měsíc se dostal přesně mezi Slunce a Zemi. Jeho stín dopadá na Zemi. Kdo stojí v tom stínu, tomu se ve dne na chvíli setmí.', note: real }
    : { name: 'Zatmění Měsíce', txt: 'Země se dostala přesně mezi Slunce a Měsíc. Měsíc se schoval do stínu Země, potemní a zčervená.', note: real });
  acts();
}
function endEclipse() { ecl = null; earth.material.uniforms.ecl.value = 0; moon.material.color.set(0xffffff); flyTo = home0(); card(L); acts(); }

/* ---------- fáze Měsíce, jak ji vidíme ze Země ---------- */
const PHASES = [[.25, 'Nov'], [Math.PI/2 - .2, 'Dorůstající srpek'], [Math.PI/2 + .2, 'První čtvrť'], [Math.PI - .25, 'Dorůstá'], [Math.PI + .25, 'Úplněk'],
  [Math.PI*1.5 - .2, 'Couvá'], [Math.PI*1.5 + .2, 'Poslední čtvrť'], [TAU - .25, 'Couvající srpek'], [TAU, 'Nov']];
let phaseDrawn = -1;
function drawPhase(phi) {
  if (Math.abs(phi - phaseDrawn) < .02) return; phaseDrawn = phi;
  const g = $('#phase').getContext('2d'), c = 64, R = 58, dark = '#1b2136', lit = '#f2efe4', cos = Math.cos(phi);
  g.clearRect(0, 0, 128, 128);
  g.fillStyle = dark; g.beginPath(); g.arc(c, c, R, 0, TAU); g.fill();
  g.fillStyle = lit; g.beginPath(); g.arc(c, c, R, -Math.PI/2, Math.PI/2, phi > Math.PI); g.fill(); // dorůstá = svítí pravá půlka
  g.fillStyle = cos < 0 ? lit : dark; g.beginPath(); g.ellipse(c, c, Math.abs(cos) * R, R, 0, 0, TAU); g.fill();
  $('#phaseName').textContent = PHASES.find(p => phi <= p[0])[1];
}

/* ---------- skutečné velikosti, světlo, hra ---------- */
function toggleSizes() {
  sizes = !sizes; game = null; light = null; lightRing.visible = false; unfocus();
  flyTo = overview(); card(baseCard());
  acts();
}
function startLight() {
  if (light) { light = null; lightRing.visible = false; card(L); return acts(); }
  if (sizes) toggleSizes(); game = null; unfocus(); flyTo = home0();
  light = { r: 3 }; lightRing.visible = true;
  card({ name: 'Jak rychle letí světlo', txt: 'Světlo je nejrychlejší věc na světě. A stejně mu cesta ze Slunce k nám trvá osm minut. K Neptunu letí přes čtyři hodiny.', note: 'Žlutý kruh ukazuje, kam už světlo doletělo.' });
  acts();
}
const fmtMin = m => { m = Math.round(m); return m < 60 ? m + ' min' : (m / 60 | 0) + ' h ' + m % 60 + ' min'; };
const QUIZ = [['Saturn', 'Najdi planetu s prstenci.'], ['Země', 'Najdi planetu, na které bydlíme.'], ['Mars', 'Najdi červenou planetu.'],
  ['Jupiter', 'Najdi největší planetu.'], ['Slunce', 'Najdi hvězdu, která nám svítí.'], ['Merkur', 'Najdi planetu, která je nejblíž u Slunce.']];
const starsRow = () => game.stars ? '⭐'.repeat(game.stars) : 'Za každou správnou odpověď je hvězdička.';
function ask() {
  let q; do q = QUIZ[Math.random() * QUIZ.length | 0]; while (q === game.q);
  game.q = q; game.wait = false; card({ name: 'Najdi planetu', txt: q[1], note: starsRow(), say: q[1] }); say(q[1]);
}
function answer(p) {
  if (game.wait) return;
  if (p.name === game.q[0]) {
    game.stars++; game.wait = true; sfx('ok'); const t = 'Správně! To je ' + p.name + '.';
    card({ name: 'Správně!', txt: 'To je ' + p.name + '.', note: starsRow(), say: t }); say(t);
    const g = game; setTimeout(() => game === g && ask(), 2600);
  } else { sfx('no'); const t = 'Tohle je ' + p.name + '. Zkus to znovu. ' + game.q[1]; card({ name: 'Zkus to znovu', txt: 'Tohle je ' + p.name + '. ' + game.q[1], note: starsRow(), say: t }); say(t); }
}
function toggleGame() {
  if (game) { game = null; if (synth) synth.cancel(); card(L); return acts(); }
  if (sizes) toggleSizes(); light = null; lightRing.visible = false; unfocus(); flyTo = home0();
  game = { stars: 0 }; ask(); acts();
}
