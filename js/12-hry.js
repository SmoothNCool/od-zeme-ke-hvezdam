// Hry a Cesta do vesmíru. Soubory v js/ sdílejí jeden prostor jmen a načítají se v pořadí podle čísla.
/* ---------- Cesta do vesmíru: časová osa jako cesta od Země ke hvězdám, u každé zastávky otázka a hvězdička ---------- */
// ke každé události z HISTORY: ikona, kam až lidé nebo sondy doletěli (0 oběžná dráha, 1 Měsíc, 2 planety, 3 za planetami, 4 Slunce) a otázka [otázka, správně, špatně, špatně]
const JOURNEY = [
  ['🛰️', 0, ['Co dělal Sputnik na oběžné dráze?', 'Vysílal pípání rádiem', 'Fotografoval Měsíc', 'Vezl prvního psa']],
  ['🐕', 0, ['Kdo byla Lajka?', 'Fenka', 'Opice', 'Kosmonautka']],
  ['👨‍🚀', 0, ['Jak dlouho trval let Jurije Gagarina?', '108 minut', '3 dny', '12 hodin']],
  ['👩‍🚀', 0, ['Čím je známá Valentina Těreškovová?', 'Byla první žena ve vesmíru', 'Chodila po Měsíci', 'Postavila stanici ISS']],
  ['🧑‍🚀', 0, ['Co jako první udělal Alexej Leonov?', 'Vystoupil z lodi do volného prostoru', 'Přistál na Marsu', 'Obletěl Měsíc']],
  ['🌕', 1, ['Kdo první vstoupil na Měsíc?', 'Neil Armstrong', 'Jurij Gagarin', 'Vladimír Remek']],
  ['🚀', 3, ['Kde je dnes sonda Voyager 1?', 'V mezihvězdném prostoru', 'Na Marsu', 'Shořela v atmosféře']],
  ['🎖️', 0, ['Odkud byl Vladimír Remek?', 'Z Československa', 'Z Polska', 'Z Francie']],
  ['🔭', 0, ['Proč Hubbleův dalekohled obíhá nad atmosférou?', 'Atmosféra rozmazává obraz', 'Je tam tepleji', 'Je tam blíž ke hvězdám']],
  ['🏠', 0, ['Od kdy na ISS bez přestávky žijí lidé?', 'Od roku 2000', 'Od roku 1969', 'Od roku 2020']],
  ['🪐', 2, ['Kam přistál modul Huygens?', 'Na měsíc Titan', 'Na Saturn', 'Na Mars']],
  ['🤖', 2, ['Co zjistilo vozítko Curiosity?', 'Na Marsu kdysi byla jezera', 'Na Marsu žijí bakterie', 'Na Marsu se dá dýchat']],
  ['☄️', 2, ['Na co přistál modul Philae?', 'Na jádro komety', 'Na planetku Ceres', 'Na Venuši']],
  ['💗', 3, ['Co ukázaly snímky Pluta?', 'Ledové hory a světlé srdce', 'Husté mraky jako na Venuši', 'Prstence jako u Saturnu']],
  ['🌑', 1, ['Kam jako první přistála sonda Čchang-e 4?', 'Na odvrácenou stranu Měsíce', 'Na Mars', 'Na kometu']],
  ['🚁', 2, ['Co přiletělo na Mars spolu s vozítkem Perseverance?', 'Malý vrtulník', 'Astronauti', 'Ponorka']],
  ['☀️', 4, ['Čím je rekordní sonda Parker Solar Probe?', 'Proletěla nejblíž Slunci', 'Je největší sondou', 'Přistála na Slunci']],
  ['🌙', 1, ['Co dokázala posádka Artemis II?', 'Obletěla Měsíc', 'Přistála na Měsíci', 'Doletěla k Marsu']],
];
console.assert(JOURNEY.length === HISTORY.length, 'každá událost má zastávku');
const ZONES = ['Oběžná dráha Země', 'Měsíc', 'Planety', 'Za planetami', 'Ke Slunci'];
const BADGES = [[5, '🥉', 'Kosmonaut'], [10, '🥈', 'Astronaut'], [18, '🥇', 'Průkopník vesmíru']];
const loadStars = () => { try { return new Set(JSON.parse(localStorage.getItem('cesta') || '[]')); } catch (e) { return new Set(); } };
let jStars = loadStars(), jSel = -1;
const saveStars = () => { try { localStorage.setItem('cesta', JSON.stringify([...jStars])); } catch (e) { /* bez úložiště se hvězdy pamatují jen do zavření */ } };
const jEl = document.createElement('section'); jEl.id = 'journey'; jEl.hidden = true; jEl.setAttribute('aria-label', 'Cesta do vesmíru'); document.body.append(jEl);
function badgeText() { const b = BADGES.filter(x => jStars.size >= x[0]).pop(), n = BADGES.find(x => jStars.size < x[0]); return (b ? b[1] + ' ' + b[2] : 'Zatím bez odznaku') + (n ? ' · do odznaku ' + n[2] + ' chybí ' + (n[0] - jStars.size) + ' ⭐' : ''); }
function drawJourney() {
  const n = HISTORY.length, Wp = 150 * n + 200, Hp = 420, x = i => 190 + i * 150, y = i => Hp - 70 - JOURNEY[i][1] * 70;
  let d = 'M 20 ' + (Hp - 30); for (let i = 0; i < n; i++) d += ' C ' + (x(i) - 75) + ' ' + (i ? y(i - 1) : Hp - 30) + ', ' + (x(i) - 75) + ' ' + y(i) + ', ' + x(i) + ' ' + y(i);
  const bands = ZONES.map((z, k) => `<text class="jz" x="12" y="${Hp - 64 - k * 70}">${z}</text><line class="jl" x1="0" x2="${Wp}" y1="${Hp - 70 - k * 70}" y2="${Hp - 70 - k * 70}"/>`).join('');
  const nodes = HISTORY.map((e, i) => `<g class="jn${jStars.has(i) ? ' done' : ''}${i === jSel ? ' sel' : ''}" data-i="${i}" tabindex="0" role="button" aria-label="${e[0]} ${e[1]}"><circle cx="${x(i)}" cy="${y(i)}" r="27"/><text class="ji" x="${x(i)}" y="${y(i) + 9}">${JOURNEY[i][0]}</text><text class="jy" x="${x(i)}" y="${y(i) + 48}">${e[0]}</text>${jStars.has(i) ? `<text class="js" x="${x(i) + 22}" y="${y(i) - 18}">⭐</text>` : ''}</g>`).join('');
  jEl.innerHTML = `<header><div><h2>Cesta do vesmíru</h2><p>${jStars.size} z ${n} ⭐ · ${badgeText()}</p></div><button class="jx" aria-label="Zavřít">✕</button></header>
    <div class="jw"><svg viewBox="0 0 ${Wp} ${Hp}" width="${Wp}" height="${Hp}"><rect class="jg" x="0" y="${Hp - 30}" width="${Wp}" height="30"/>${bands}<path class="jp" d="${d}"/>${nodes}</svg></div>
    <div class="jd"></div>`;
  jEl.querySelector('.jx').onclick = closeJourney;
  jEl.querySelectorAll('.jn').forEach(g => { g.onclick = () => pickStop(+g.dataset.i); g.onkeydown = e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); pickStop(+g.dataset.i); } }; });
  // obsah (text, obrázek a otázka) je ze statických dat aplikace, uživatelský vstup se do HTML nevkládá
  if (jSel >= 0) showStop(jSel); else jEl.querySelector('.jd').innerHTML = '<p class="jh">Ťukni na zastávku na cestě. U každé se dozvíš, co se stalo, a když správně odpovíš na otázku, získáš hvězdičku.</p>';
}
function pickStop(i) { jSel = i; drawJourney(); const g = jEl.querySelector(`.jn[data-i="${i}"]`); if (g) g.scrollIntoView({ block: 'nearest', inline: 'center', behavior: 'smooth' }); }
function showStop(i) {
  const [year, name, txt, date, wiki] = HISTORY[i], [, zone, q] = JOURNEY[i], dEl = jEl.querySelector('.jd');
  const opts = [q[1], q[2], q[3]].sort((a, b) => (a + i).localeCompare(b + i, 'cs')); // pořadí pevné, ale správná odpověď není vždy první
  dEl.innerHTML = '<div class="jt"><figure hidden><img alt=""></figure><div><h3></h3><p class="jm"></p><p class="jtx"></p></div></div><div class="jq"><strong></strong><div class="jo"></div><p class="jr" aria-live="polite"></p></div>';
  dEl.querySelector('h3').textContent = name; dEl.querySelector('.jm').textContent = date + ' · ' + ZONES[zone]; dEl.querySelector('.jtx').textContent = txt;
  dEl.querySelector('.jq strong').textContent = jStars.has(i) ? '⭐ Hvězdička je tvoje. ' + q[0] : q[0];
  dEl.querySelector('.jo').append(...opts.map(o => { const b = pill(o, () => answerStop(i, o, b)); return b; }));
  wikiGet({ t: wiki }).then(w => { if (jSel !== i || !w || !w.img) return; const im = dEl.querySelector('img'); im.onload = () => { if (jSel === i) dEl.querySelector('figure').hidden = false; }; im.src = w.img; }).catch(() => {});
}
function answerStop(i, o, b) {
  const right = o === JOURNEY[i][2][1], r = jEl.querySelector('.jr');
  jEl.querySelectorAll('.jo .pill').forEach(x => { x.disabled = true; if (x.textContent === JOURNEY[i][2][1]) x.classList.add('right'); });
  if (!right) { b.classList.add('wrong'); r.textContent = 'Vedle. Správně je: ' + JOURNEY[i][2][1] + '. Zkus jinou zastávku a pak se sem vrať.'; sfx('no'); setTimeout(() => { if (jSel === i) showStop(i); }, 2500); return; }
  sfx('ok'); const before = jStars.size; jStars.add(i); saveStars();
  const b2 = BADGES.find(x => x[0] === jStars.size && x[0] > before);
  r.textContent = b2 ? 'Správně! Získáváš odznak ' + b2[1] + ' ' + b2[2] + '.' : 'Správně! Máš hvězdičku.';
  setTimeout(() => { if (jSel === i) { const nx = HISTORY.findIndex((e, k) => !jStars.has(k) && k > i); jSel = nx >= 0 ? nx : i; drawJourney(); } }, 1600);
}
function openJourney(i) { closeFind(); jSel = i >= 0 ? i : -1; jEl.hidden = false; document.body.classList.add('jopen'); drawJourney(); if (i >= 0) pickStop(i); }
function closeJourney() { jEl.hidden = true; document.body.classList.remove('jopen'); }
addEventListener('keydown', e => { if (e.key === 'Escape' && !jEl.hidden) closeJourney(); });

/* ---------- hry v pravém sloupci: ikona kostky ---------- */
const GAMES = [
  ['🚀', 'Cesta do vesmíru', 'Projdi dějiny letů do vesmíru a sbírej hvězdičky a odznaky.', () => openJourney()],
  ['🌍', 'Zeměpisný kvíz', 'Najdi stát na mapě, poznej vlajku, tvar státu nebo hlavní město.', () => loadGeo().then(() => goThen(lv('mapa'), quizMenu)).catch(() => {})],
  ['🪐', 'Najdi planetu', 'Ťukni na planetu, na kterou se ptám.', () => goThen(lv('soustava'), () => { if (!game) toggleGame(); })],
  ['☄️', 'Chytej meteory', 'V noci padají Perseidy. Ťukni na padající hvězdu, než zhasne.', () => goThen(lv('obloha'), () => startFx('perseidy'))],
];
const gEl = document.createElement('div'); gEl.id = 'games'; gEl.hidden = true;
gEl.innerHTML = '<strong>Hry</strong><div class="gl"></div>';
gEl.querySelector('.gl').append(...GAMES.map(([ico, name, sub, fn]) => { const b = document.createElement('button'); b.className = 'tile'; const i = document.createElement('span'), t = document.createElement('b'), s = document.createElement('small'); i.textContent = ico; t.textContent = name; s.textContent = sub; b.append(i, t, s); b.onclick = () => { gEl.hidden = true; $('#gamesB').setAttribute('aria-expanded', false); fn(); }; return b; }));
document.body.append(gEl);
$('#zoom').insertBefore(Object.assign(document.createElement('button'), { id: 'gamesB', title: 'Hry', textContent: '🎲' }), $('#setB').nextSibling);
$('#gamesB').setAttribute('aria-label', 'Hry'); $('#gamesB').setAttribute('aria-expanded', 'false');
panels.gamesB = '#games';
// na telefonu se při otevřeném panelu karta sbalí, jinak by se oba nevešly
for (const id in panels) $('#' + id).onclick = () => { for (const k in panels) { const open = k === id && $(panels[k]).hidden; $(panels[k]).hidden = !open; $('#' + k).setAttribute('aria-expanded', open); if (open && innerWidth <= 700) setMin(true); } };

/* ---------- podmenu soustavy: skutečné velikosti a cesta do vesmíru místo Kuiperova pásu ---------- */
SUBS.soustava = [['Planety', () => { if (sizes) toggleSizes(); unfocus(); info = null; card(baseCard()); $('#back').hidden = true; }], ['Skutečné velikosti', () => { if (!sizes) toggleSizes(); }], ['Cesta do vesmíru', () => openJourney()]];
const findList3 = findList;
findList = () => { if (findFixed) return findFixed; findList3(); for (const f of findFixed) if (f.kind && f.kind.startsWith('dobývání vesmíru')) { const i = HISTORY.findIndex(e => e[1] === f.text); f.run = () => openJourney(i); } return findFixed; };
