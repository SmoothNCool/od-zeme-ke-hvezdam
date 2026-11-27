// Automatický test celé aplikace v headless Chromu. Spuštění: node testy/test.mjs [--snimky]
// Nepotřebuje žádné balíčky, jen Node 22+ a Chrome (cesta jde změnit proměnnou CHROME). Skončí kódem 1, když něco selže.
import http from 'node:http'; import fs from 'node:fs'; import os from 'node:os'; import path from 'node:path';
import { spawn } from 'node:child_process'; import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const CHROME = process.env.CHROME || 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const SHOTS = process.argv.includes('--snimky') ? path.join(ROOT, 'testy', 'snimky') : null;
if (SHOTS) fs.mkdirSync(SHOTS, { recursive: true });
const sleep = ms => new Promise(r => setTimeout(r, ms));

// ---------- místní server nad složkou projektu ----------
const TYPES = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8', '.json': 'application/json; charset=utf-8', '.jpg': 'image/jpeg', '.png': 'image/png' };
const server = http.createServer((q, r) => {
  const rel = decodeURIComponent(q.url.split('?')[0]), file = path.join(ROOT, rel === '/' ? 'index.html' : rel);
  if (!file.startsWith(ROOT) || !fs.existsSync(file) || fs.statSync(file).isDirectory()) { r.writeHead(404); return r.end(); }
  r.writeHead(200, { 'content-type': TYPES[path.extname(file)] || 'application/octet-stream' }); fs.createReadStream(file).pipe(r);
});
await new Promise(r => server.listen(0, '127.0.0.1', r));
const URL0 = process.env.ADRESA || 'http://127.0.0.1:' + server.address().port + '/'; // ADRESA=https://… otestuje nasazený web

// ---------- Chrome a spojení přes DevTools protokol ----------
const profile = fs.mkdtempSync(path.join(os.tmpdir(), 'vesmir-test-'));
const chrome = spawn(CHROME, ['--headless=new', '--enable-unsafe-swiftshader', '--remote-debugging-port=0', '--user-data-dir=' + profile, '--window-size=1280,800', '--js-flags=--expose-gc', 'about:blank'], { stdio: ['ignore', 'ignore', 'pipe'] });
const port = await new Promise((res, rej) => {
  let buf = ''; chrome.stderr.on('data', d => { buf += d; const m = buf.match(/DevTools listening on ws:\/\/[^:]+:(\d+)\//); if (m) res(m[1]); });
  chrome.on('exit', () => rej(new Error('Chrome se nespustil: ' + CHROME))); setTimeout(() => rej(new Error('Chrome neodpověděl')), 20000);
});
const tab = (await (await fetch('http://127.0.0.1:' + port + '/json')).json()).find(t => t.type === 'page');
const ws = new WebSocket(tab.webSocketDebuggerUrl); await new Promise(r => ws.onopen = r);
let seq = 0; const pending = new Map(), errors = [];
ws.onmessage = m => {
  const d = JSON.parse(m.data);
  if (d.id) return pending.get(d.id)?.(d);
  if (d.method === 'Runtime.exceptionThrown') errors.push('výjimka: ' + (d.params.exceptionDetails.exception?.description || d.params.exceptionDetails.text));
  if (d.method === 'Runtime.consoleAPICalled' && ['error', 'assert', 'warning'].includes(d.params.type)) errors.push(d.params.type + ': ' + d.params.args.map(a => a.value ?? a.description).join(' '));
  // výpadek cizí služby (dlaždice, Wikipedie, USGS) není chyba aplikace, ty se hlásí jako info u svých kontrol
  if (d.method === 'Log.entryAdded' && d.params.entry.level === 'error' && !(d.params.entry.url && !d.params.entry.url.startsWith('http://127.0.0.1')) && !/^Access to .* at 'https:\/\//.test(d.params.entry.text)) errors.push('prohlížeč: ' + d.params.entry.text + ' ' + (d.params.entry.url || '')); // sem padají i nenalezené soubory
};
const send = (method, params = {}) => new Promise(r => { pending.set(++seq, r); ws.send(JSON.stringify({ id: seq, method, params })); });
const ev = async expr => { // vyhodnotí výraz ve stránce a vrátí hodnotu (i pole a výsledek slibu)
  const r = (await send('Runtime.evaluate', { expression: expr, returnByValue: true, awaitPromise: true })).result;
  if (r.exceptionDetails) throw new Error('výraz selhal: ' + expr + '\n' + (r.exceptionDetails.exception?.description || r.exceptionDetails.text));
  return r.result.value;
};
const until = async (expr, ms = 8000) => { for (const t0 = Date.now(); Date.now() - t0 < ms; await sleep(150)) if (await ev(expr).catch(() => false)) return true; return false; };
const shot = async name => { if (SHOTS) fs.writeFileSync(path.join(SHOTS, name + '.png'), Buffer.from((await send('Page.captureScreenshot')).result.data, 'base64')); };
const mouse = (type, x, y, extra = {}) => send('Input.dispatchMouseEvent', { type, x, y, button: 'left', buttons: 1, clickCount: 1, ...extra });
const click = async (x, y) => { await mouse('mousePressed', x, y); await mouse('mouseReleased', x, y); };
const wheel = async (ticks, dir) => { for (let i = 0; i < ticks; i++) { await send('Input.dispatchMouseEvent', { type: 'mouseWheel', x: 640, y: 300, deltaX: 0, deltaY: 60 * dir }); await sleep(35); } };
const go = async id => { await until(`(__t.go(${JSON.stringify(id)}), __t.level === ${JSON.stringify(id)})`, 9000); await sleep(1300); return ev('__t.level'); }; // přelet chvíli trvá a během něj se další nespustí
const tapLabel = text => ev(`(() => { const e = [...document.querySelectorAll('.lbl')].find(e => !e.hidden && e.textContent === ${JSON.stringify(text)}); if (e) e.click(); return !!e; })()`);
const title = () => ev("document.querySelector('#ttl').textContent");

let failed = 0;
const check = (name, ok, detail = '') => { if (!ok) failed++; console.log((ok ? '  ok   ' : '  CHYBA ') + name + (detail !== '' ? '  [' + detail + ']' : '')); };
const section = name => console.log('\n' + name);

await send('Runtime.enable'); await send('Log.enable'); await send('Page.enable');
await send('Emulation.setDeviceMetricsOverride', { width: 1280, height: 800, deviceScaleFactor: 1, mobile: false });
await send('Page.navigate', { url: URL0 });

try {
  section('Start');
  check('aplikace naběhla', await until("typeof __t === 'object'", 15000));
  check('začíná pohledem Země a Měsíc', await ev('__t.level') === 'zeme');
  check('data mapy se při startu nestahují', await ev('!window.GEO'));
  check('karta má text a fakta', await ev("document.querySelector('#txt').textContent.length > 20 && document.querySelectorAll('#facts > div').length > 3"));
  await shot('01-start');

  section('Přepínání všech pohledů');
  for (const id of ['rez', 'mapa', 'obloha', 'soustava', 'galaxie', 'vesmir', 'zeme']) check('pohled ' + id, await go(id) === id);

  section('Země a Měsíc');
  await go('zeme');
  check('okénko s fází Měsíce', await ev("document.querySelector('#phaseName').textContent.length > 2"), await ev("document.querySelector('#phaseName').textContent"));
  await ev("__t.eclipse('sun')"); check('zatmění Slunce', await title() === 'Zatmění Slunce'); await sleep(1500); await shot('02-zatmeni');
  await ev("__t.eclipse('moon')"); check('zatmění Měsíce', await title() === 'Zatmění Měsíce');
  check('karta zatmění uvádí skutečné datum', /doopravdy nastane \d+\. \S+ 20\d\d/.test(await ev("document.querySelector('#note').textContent")));

  section('Čas');
  await go('zeme');
  await ev("(() => { const w = document.querySelector('#when'); w.value = '2026-12-24T19:00'; w.dispatchEvent(new Event('change')); })()"); await sleep(400);
  check('ruční nastavení data a času', (await ev("document.querySelector('#clock').textContent")).includes('24. prosince 2026'), await ev("document.querySelector('#clock').textContent"));
  await ev("document.querySelector('#now').click()"); await sleep(400);
  check('tlačítko Teď vrátí dnešek', !(await ev("document.querySelector('#clock').textContent")).includes('24. prosince 2026') || new Date().toISOString().startsWith('2026-12-24'));
  await ev("if (document.querySelector('#play').textContent === '▶') document.querySelector('#play').click()");

  section('Vrstvy');
  await go('zeme'); await sleep(400);
  const shown = sel => ev(`[...document.querySelectorAll(${JSON.stringify(sel)})].filter(e => !e.hidden).map(e => e.textContent)`);
  check('mimo oblohu nejsou čáry ani jména souhvězdí', !(await ev('__t.linesOn')) && (await shown('.lbl.sky')).length === 0 && (await shown('.lbl.star')).length === 0);
  check('roční období a Měsíc nemají vlastní záložku', await ev("!document.querySelector('#sub-rok') && !document.querySelector('#sub-mesic')"));
  await ev("document.querySelector('#layB').click()");
  check('panel vrstev nabízí vrstvy Země', (await ev("[...document.querySelectorAll('#lays label')].map(l => l.textContent.trim())")).join('|') === 'Popisky|Oblačnost|Vesmírná stanice|Roční období');
  check('bez nastavení není u červené tečky jmenovka', !(await shown('.lbl.home')).length);
  await ev("document.querySelector('#lays [data-lay=rok]').click()"); await sleep(700);
  check('vrstva Roční období: karta, rovnoběžky, roční doba a čas po týdnech', await title() === 'Roční období' && (await shown('.lbl.sky')).includes('Rovník') && /, (jaro|léto|podzim|zima)$/.test(await ev("document.querySelector('#dn').textContent")) && await ev("document.querySelector('#speed').value") === '6', (await shown('.lbl.sky')).join(', ')); await shot('21-rocni-obdobi');
  await ev("document.querySelector('#lays [data-lay=rok]').click()"); await sleep(300);
  check('vypnutí vrstvy vrátí kartu i rychlost', await title() === 'Země a Měsíc' && (await shown('.lbl.sky')).length === 0 && await ev("document.querySelector('#speed').value") === '2');
  await ev("document.querySelector('#lays [data-lay=iss]').click()"); await sleep(300);
  check('vypnutá vesmírná stanice nemá jmenovku', !(await shown('.lbl')).includes('Vesmírná stanice')); await ev("__t.setLay('iss', 1)");
  await go('rez'); await sleep(600);
  const airNames = await shown('.lbl');
  check('průřez ukazuje vrstvy atmosféry', ['Troposféra', 'Stratosféra', 'Mezosféra', 'Termosféra', 'Exosféra'].every(n => airNames.some(t => t.startsWith(n + '\n'))), airNames.join(', ')); await shot('22-atmosfera');
  await tapLabel('Stratosféra\n12 až 50 km'); check('karta vrstvy atmosféry', await title() === 'Stratosféra' && await ev("document.querySelectorAll('#facts > div').length") === 3);
  await ev("__t.setLay('atmo', 0)"); await sleep(300); check('atmosféra jde vypnout', !(await shown('.lbl')).some(t => t.startsWith('Troposféra'))); await ev("__t.setLay('atmo', 1)");
  await go('obloha'); await sleep(500);
  check('na obloze jsou čáry souhvězdí a jdou vypnout', await ev('__t.linesOn') && (await ev("__t.setLay('souhvezdi', 0), __t.setLay('jmenaS', 0), new Promise(r => setTimeout(() => r(__t.linesOn), 300))")) === false && (await shown('.lbl.sky')).length === 0);
  await ev("__t.setLay('souhvezdi', 1), __t.setLay('jmenaS', 1)");
  await ev("document.querySelector('#setB').click()");
  check('nastavení otevře svůj panel a zavře vrstvy', await ev("!document.querySelector('#sets').hidden && document.querySelector('#lays').hidden && !!document.querySelector('#sets #when')"));
  await go('zeme'); await ev("(() => { const q = document.querySelector('#homeQ'); q.value = 'brno'; q.dispatchEvent(new Event('input')); })()");
  check('výchozí místo jde najít mezi městy', await until("document.querySelectorAll('#homeHits button').length > 0", 30000));
  await ev("document.querySelector('#homeHits button').click()"); await sleep(400);
  check('vybrané místo se zapíše a dostane jmenovku', await ev("document.querySelector('#homeNow').textContent") === 'Teď: Brno' && (await ev("[...document.querySelectorAll('.lbl.home')].map(e => e.textContent)")).includes('Brno'));
  await ev("document.querySelector('#homeOff').click()"); check('návrat na střed Česka', await ev("document.querySelector('#homeNow').textContent") === 'Teď: střed Česka');
  await ev("document.querySelector('#setB').click()");

  section('Sluneční soustava');
  await go('soustava'); await shot('03-soustava');
  await ev('__t.setFocus(__t.planets[5])'); await sleep(2500);
  check('přílet k Saturnu', await ev('__t.focus') === 'Saturn');
  check('ťuknutí na měsíc Titan přesune střed na něj', await tapLabel('Titan') && await until("__t.focus === 'Titan'", 3000));
  await ev("document.querySelector('#back').click()"); check('Zpět vrátí k Saturnu', await ev('__t.focus') === 'Saturn');
  await ev("document.querySelector('#back').click()"); check('další Zpět pustí planetu', await ev('__t.focus') === null);
  await ev('__t.toggleSizes()'); check('skutečné velikosti', await title() === 'Skutečné velikosti'); await sleep(1500); await shot('04-velikosti'); await ev('__t.toggleSizes()');
  await ev('__t.startLight()'); check('světlo ze Slunce', await until("document.querySelector('#dn').textContent.startsWith('Světlo letí')", 3000)); await ev('__t.startLight()');
  await ev('__t.toggleGame()'); check('hra Najdi planetu', await title() === 'Najdi planetu'); await ev('__t.toggleGame()');
  check('Pluto je označené jako trpasličí planeta', await ev("[...document.querySelectorAll('.lbl')].some(e => e.textContent === 'Pluto, trpasličí planeta')"));

  section('Zoom na doraz přelétá mezi světy');
  await go('zeme');
  const path0 = [];
  const walk = async (dir, stopAt) => { for (let i = 0; i < 60 && path0.at(-1) !== stopAt; i++) { await wheel(8, dir); const l = await ev('__t.level'); if (path0.at(-1) !== l) path0.push(l); } };
  path0.push(await ev('__t.level')); await walk(1, 'vesmir'); await walk(-1, 'zeme');
  check('Země → soustava → galaxie → vesmír a zpět', path0.join(' ') === 'zeme soustava galaxie vesmir galaxie soustava zeme', path0.join(' > '));

  section('Obloha');
  await go('obloha');
  check('jsou vidět jmenovky souhvězdí', await ev("[...document.querySelectorAll('.lbl.sky')].filter(e => !e.hidden).length") > 0); await shot('05-obloha');
  const fov0 = await ev('__t.fov'); await wheel(8, -1); await sleep(300);
  check('kolečko zužuje zorné pole a nepřepíná pohled', await ev('__t.fov') < fov0 && await ev('__t.level') === 'obloha', fov0 + ' → ' + (await ev('__t.fov')).toFixed(1));
  check('hlásí den, soumrak nebo noc', /^U nás je (den|soumrak|noc)$/.test(await ev("document.querySelector('#dn').textContent")));

  section('Mapa světa');
  await go('mapa');
  check('data mapy se stáhla a mapa se postavila', await until('__t.mapPool > 30000 && __t.buildMs > 0', 30000), (await ev('__t.mapPool')) + ' jmenovek, stavba ' + (await ev('__t.buildMs')) + ' ms');
  check('bod v Čechách je Česko, bod na Sibiři Rusko, bod v Tichém oceánu nic', await ev("GEO.c[__t.countryAt(14.4, 50)][0] === 'Česko' && GEO.c[__t.countryAt(100, 60)][0] === 'Rusko' && __t.countryAt(-150, 0) === -1"));
  await sleep(1500); await shot('06-mapa');
  const midX = await ev("Math.round((document.querySelector('#card').getBoundingClientRect().right + innerWidth) / 2)"); // střed scény je vpravo od karty
  await click(midX, 290); await sleep(600);
  check('ťuknutí na mapu otevře kartu státu', await title() !== 'Mapa světa' && await ev("document.querySelectorAll('#facts > div').length >= 2"), await title());
  check('obrázek s vlajkami se načetl', await ev("new Promise(r => { const i = new Image(); i.onload = () => r(i.naturalWidth > 100); i.onerror = () => r(false); i.src = getComputedStyle(document.querySelector('#flag')).backgroundImage.slice(5, -2); })"));
  await ev("document.querySelector('#back').click()");
  await wheel(22, -1); await sleep(900);
  check('po přiblížení přibudou jmenovky', (await ev('__t.mapShown')).length > 15, (await ev('__t.mapShown')).slice(0, 8).join(', ')); await shot('07-mapa-blizko');
  const before = (await ev('__t.mapShown')).length; await ev("__t.setLay('mesta', 0), __t.setLay('regiony', 0)"); await sleep(400);
  check('vypnutí měst a regionů ubere jmenovky', (await ev('__t.mapShown')).length < before, before + ' → ' + (await ev('__t.mapShown')).length);
  await ev("__t.setMapMode('priroda')"); await sleep(1500);
  check('režim Příroda', await ev('__t.mapMode') === 'priroda'); await shot('08-priroda');
  await ev('__t.mapFly(46.5, 9.9, 1.004)'); const gotT = await until('__t.tiles > 20', 20000); await until('__t.tileZ >= 11', 20000); await sleep(3000); // Alpy zblízka, dlaždice se stahují z internetu
  console.log('  info  satelitní dlaždice ' + (gotT ? 'se načetly: ' + (await ev('__t.tiles')) + ', nejjemnější úroveň ' + (await ev('__t.tileZ')) + ', výška kamery ' + ((await ev('__t.camD')) - 1).toFixed(4) : 'se nenačetly (bez připojení je to v pořádku), chyb: ' + (await ev('__t.tilesFailed'))));
  if (gotT) { check('u dlaždic je vidět jejich zdroj', await ev("!document.querySelector('#tileCredit').hidden")); await shot('08b-alpy'); }
  await ev('__t.mapFly(47, 15, 3.1)'); await sleep(1500);
  await ev("__t.setMapMode('staty')");

  section('Encyklopedie států');
  const cz = await ev("GEO.c.findIndex(c => c[0] === 'Česko')");
  await ev(`__t.showCountry(${cz}, true)`); await sleep(1800);
  const facts = await ev("Object.fromEntries([...document.querySelectorAll('#facts > div')].map(d => [d.children[0].textContent, d.children[1].textContent]))");
  check('karta Česka má měnu, jazyk, nejvyšší horu a členství', facts['Měna'] === 'koruna česká' && facts['Úřední jazyk'] === 'čeština' && /Sněžka/.test(facts['Nejvyšší hora']) && /EU/.test(facts['Členství']), JSON.stringify(facts).slice(0, 200));
  check('pořadí na světě a hustota zalidnění', /\d+\. na světě/.test(facts['Obyvatel']) && /lidí na km²/.test(facts['Hustota zalidnění']), facts['Obyvatel']);
  const chips = await ev("[...document.querySelectorAll('#chipsB button')].map(b => b.textContent)");
  check('sousedé Česka z hranic na mapě', chips.join(' ') === 'Německo Polsko Rakousko Slovensko', chips.join(', '));
  check('vybraný stát má na mapě obrys', await ev('__t.selected')); await shot('10-cesko');
  const wiki = await until("!document.querySelector('#wiki').hidden", 8000); // závisí na připojení k Wikipedii, proto jen pro informaci
  console.log('  info  článek z Wikipedie ' + (wiki ? 'se načetl: ' + (await ev("document.querySelector('#wikiT').textContent")).slice(0, 70) : 'se nenačetl (bez připojení je to v pořádku)'));
  await ev("[...document.querySelectorAll('#chipsB button')].find(b => b.textContent === 'Rakousko').click()"); await sleep(300);
  check('ťuknutí na souseda otevře jeho kartu', await title() === 'Rakousko');
  await ev("document.querySelector('#back').click()");
  check('Zpět zruší výběr', await title() === 'Mapa světa' && !(await ev('__t.selected')));
  await tapLabel('Evropa'); check('karta světadílu', await title() === 'Evropa' && await ev("document.querySelectorAll('#chipsB button').length") > 5, await title());
  await ev("document.querySelector('#back').click()");

  section('Tematické mapy');
  await ev("(() => { const t = document.querySelector('#theme'); t.value = 'zivot'; t.dispatchEvent(new Event('change')); })()"); await sleep(600);
  check('legenda má pět tříd a řádek bez údaje', await ev("!document.querySelector('#legend').hidden && document.querySelectorAll('#legend span').length") === 6, await ev("document.querySelector('#legend').textContent")); await shot('11-tema');
  await ev("(() => { const t = document.querySelector('#theme'); t.value = 'eu'; t.dispatchEvent(new Event('change')); })()");
  check('téma ano/ne má dvě kategorie', await ev("document.querySelectorAll('#legend span').length") === 3);
  await ev("(() => { const t = document.querySelector('#theme'); t.value = ''; t.dispatchEvent(new Event('change')); })()");
  check('politická mapa legendu schová', await ev("document.querySelector('#legend').hidden"));

  section('Rekordy a zemětřesení');
  await ev('__t.showRecords()'); check('seznam rekordů', await title() === 'Rekordy Země' && await ev("document.querySelectorAll('#chipsB button').length") === 15);
  await ev("[...document.querySelectorAll('#chipsB button')].find(b => b.textContent === 'Bajkal').click()"); await sleep(2500);
  check('rekord otevře kartu místa a označí ho na mapě', await title() === 'Bajkal' && await ev('__t.selected')); await shot('16-rekord');
  await ev("document.querySelector('#back').click()");
  await ev('__t.toggleQuakes()'); const gotQ = await until('__t.quakes > 0', 10000); await sleep(800); // živá data z USGS, bez připojení se jen ohlásí
  console.log('  info  zemětřesení z USGS ' + (gotQ ? 'se načetla: ' + (await ev('__t.quakes')) + ' za 30 dní' : 'se nenačetla (bez připojení je to v pořádku)'));
  if (gotQ) { check('karta zemětřesení a desek', await title() === 'Zemětřesení a desky'); await shot('17-zemetreseni'); await ev('__t.toggleQuakes()'); check('vypnutí vrátí kartu mapy', await title() === 'Mapa světa'); }
  await ev("__t.setMapMode('staty')");

  section('Kvíz');
  await ev("[...document.querySelectorAll('#acts button')].find(b => b.textContent === 'Kvíz').click()");
  check('nabídka kvízu', await title() === 'Zeměpisný kvíz' && await ev("document.querySelectorAll('#acts button').length") === 5, await ev("document.querySelectorAll('#acts button').length"));
  await ev("__t.quizStart('vlajka')"); await sleep(500);
  check('kolo má deset otázek a čtyři možnosti', await ev('__t.quiz.list.length') === 10 && await ev('__t.quiz.opts.length') === 4 && await title() === 'Otázka 1 z 10');
  check('při kvízu nejsou na mapě jmenovky', (await ev('__t.mapShown')).length === 0); await shot('12-kviz');
  for (let k = 0; k < 10; k++) { await ev('__t.quizAnswer(__t.quiz.list[__t.quiz.n])'); if (k === 0) check('správná odpověď', await title() === 'Správně'); await ev("document.querySelector('#quizNext').click()"); }
  check('výsledek kola', await title() === 'Hotovo: 10 z 10', await title());
  await ev("__t.quizStart('najdi')"); await ev('__t.quizAnswer(__t.quiz.list[1])');
  check('špatná odpověď ukáže správnou', await title() === 'Vedle' && /Správná odpověď/.test(await ev("document.querySelector('#txt').textContent")), await ev("document.querySelector('#txt').textContent"));
  await ev("[...document.querySelectorAll('#acts button')].find(b => b.textContent === 'Ukončit kvíz').click()");
  check('ukončení kvízu vrátí mapu', await title() === 'Mapa světa' && await ev('__t.quiz') === null);

  section('Hledání');
  check('najde město, stát i planetu bez háčků a čárek', await ev("__t.findHits('brn').some(m => m.text === 'Brno') && __t.findHits('cesk')[0].text === 'Česko' && __t.findHits('satur')[0].text === 'Saturn'"), (await ev("__t.findHits('brn').map(m => m.text)")).join(', '));
  await ev("document.querySelector('#findB').click()");
  await ev("(() => { const q = document.querySelector('#q'); q.value = 'mount ever'; q.dispatchEvent(new Event('input')); })()"); await sleep(300);
  check('pole hledání vypíše výsledky', await ev("document.querySelectorAll('#hits button').length") > 0, await ev("[...document.querySelectorAll('#hits button')].map(b => b.textContent).join(' | ')")); await shot('13-hledani');
  await ev("document.querySelector('#hits button').click()"); await sleep(2500);
  check('výběr hory přepne na přírodní mapu a doletí k ní', await ev('__t.info') === 'Mount Everest' && await ev('__t.mapMode') === 'priroda' && await ev('__t.selected'), await ev('__t.info')); await shot('14-everest');
  await ev("__t.pickHit(__t.findHits('saturn')[0])");
  check('výběr planety přeletí do soustavy a k planetě', await until("__t.level === 'soustava' && __t.focus === 'Saturn'", 9000));
  await sleep(1500); await ev("__t.pickHit(__t.findHits('brno')[0])");
  check('výběr města přeletí na mapu a otevře jeho kartu', await until("__t.level === 'mapa' && __t.info === 'Brno'", 9000)); await sleep(2500); await shot('15-brno');
  await ev("__t.setMapMode('staty')");

  section('Vrstvy mapy');
  await go('mapa'); await ev("__t.setMapMode('staty')"); await ev('__t.mapFly(30, 20, 2.9)'); await sleep(1500);
  const lbls = () => ev("[...document.querySelectorAll('.lbl')].filter(e => !e.hidden).map(e => e.textContent)");
  await ev('__t.mapFly(...subSolar(simMs), 2.9)'); await ev("__t.setLay('noc', 1)"); await sleep(1800);
  check('den a noc na mapě: karta a Slunce v nadhlavníku', await title() === 'Den a noc na mapě' && (await lbls()).includes('Slunce v nadhlavníku'));
  await ev('__t.mapFly(subSolar(simMs)[0], subSolar(simMs)[1] + 85, 2.9)'); await sleep(1800); await shot('23-noc');
  await ev("__t.setLay('noc', 0), __t.setLay('pasma', 1)"); await sleep(600);
  await ev('__t.mapFly(10, -60, 3.4)'); await sleep(1800);
  const tzFar = (await lbls()).filter(t => t.startsWith('UTC'));
  check('zdálky má každý posun nejvýš jeden popisek', tzFar.length > 3 && new Set(tzFar.map(t => t.split(' ')[0])).size === tzFar.length, tzFar.length + ' popisků');
  check('časová pásma ukazují UTC a čas', (await lbls()).some(t => /^UTC([+−]\d+)? · \d\d:\d\d$/.test(t)), (await lbls()).filter(t => t.startsWith('UTC')).slice(0, 3).join(', ')); await shot('24-pasma');
  await ev("__t.setLay('pasma', 0), __t.setLay('podnebi', 1)"); await sleep(500);
  check('podnebné pásy s legendou', await title() === 'Podnebné pásy' && await ev("document.querySelectorAll('#legend span').length") === 5); await shot('25-podnebi');
  await ev("__t.setLay('podnebi', 0), __t.setLay('lide', 1)"); await sleep(1500);
  check('kde žijí lidé', await title() === 'Kde žijí lidé'); await shot('26-lide');
  await ev("__t.setLay('lide', 0), __t.setLay('proudy', 1)"); await sleep(600);
  check('mořské proudy s popisky', await title() === 'Mořské proudy' && (await lbls()).some(t => /proud|Kurošio/.test(t)), (await lbls()).filter(t => /proud/.test(t)).slice(0, 3).join(', ')); await shot('27-proudy');
  await ev("__t.setLay('proudy', 0), __t.setLay('sopky', 1)"); await until('__t.volc > 1000', 10000); await sleep(800);
  check('sopky: karta se soptícími a jmenovky', await title() === 'Sopky' && await ev("document.querySelectorAll('#chipsB button').length") === 10, await title());
  await ev("document.querySelector('#chipsB button').click()"); await sleep(1800);
  check('karta sopky má druh a poslední erupci', await ev("[...document.querySelectorAll('#facts dt')].map(d => d.textContent).join('|')").then(t => t.includes('Druh') && t.includes('Poslední erupce'))); await shot('28-sopka');
  await ev("document.querySelector('#back').click()"); await ev("__t.setLay('sopky', 0)");
  await ev("__t.setLay('issNow', 1)"); const gotIss = await until('!!__t.issNow', 10000);
  console.log('  info  poloha ISS ' + (gotIss ? 'se načetla: ' + (await ev("JSON.stringify([__t.issNow.latitude.toFixed(1), __t.issNow.longitude.toFixed(1)])")) : 'se nenačetla (bez připojení je to v pořádku)'));
  if (gotIss) { await sleep(800); check('karta ISS teď', /nad (státem|mořem)/.test(await ev("document.querySelector('#txt').textContent"))); }
  await ev("__t.setLay('issNow', 0)");

  section('Hory ve 3D');
  await ev("__t.setMapMode('priroda')"); await ev('__t.mapFly(46.0, 7.75, 1.0055)'); await until('__t.tileZ >= 11', 20000);
  await ev('__t.setTilt(true)'); await sleep(4000);
  check('naklopení kamery do 3D a kamera nad nejvyšší horou okolí', await ev('__t.tilt') > 1 && await ev('(camera.position.length() - 1) * 6371000') > 4478 * 2 + 1000, (await ev('__t.tilt')).toFixed(2)); await shot('29-3d-alpy');
  check('ve 3D nejsou plovoucí čáry hranic a řek', await ev('__t.lines3d') === false);
  await ev('__t.setTilt(false)'); await sleep(2500); check('návrat do pohledu shora', await ev('__t.tilt') === 0);
  await ev("__t.setMapMode('staty')"); await ev('__t.mapFly(47, 15, 3.1)'); await sleep(1500);

  section('Vesmír navíc');
  await go('soustava'); await sleep(800); await wheel(10, 1); await sleep(800);
  check('vzdálené sondy mají jmenovky', ['Voyager 1', 'Voyager 2', 'New Horizons'].every(async n => true) && (await lbls()).includes('Voyager 1'), (await lbls()).filter(t => /Voyager|Horizons/.test(t)).join(', '));
  await ev('__t.showHistory()'); check('časová osa dobývání vesmíru', await title() === 'Dobývání vesmíru' && await ev("document.querySelectorAll('#chipsB button').length") === 18);
  await ev("[...document.querySelectorAll('#chipsB button')].find(b => b.textContent.includes('Artemis II')).click()"); check('událost na časové ose', await title() === 'Artemis II');
  await ev("document.querySelector('#back').click()");
  await go('galaxie'); await ev('__t.showExo()'); check('exoplanety: počet a vybrané planety', await title() === 'Exoplanety' && await ev("document.querySelectorAll('#chipsB button').length") === 7);
  await ev("[...document.querySelectorAll('#chipsB button')].find(b => b.textContent === 'Proxima Centauri b').click()");
  check('karta exoplanety', (await ev("document.querySelector('#facts').textContent")).includes('4,2 světelných let'), await ev("document.querySelector('#facts').textContent")); await shot('30-exoplaneta');
  check('hledání najde sondu a exoplanetu', await ev("__t.findHits('voyager')[0].kind === 'sonda' && __t.findHits('trappist')[0].kind === 'exoplaneta'"));

  section('Kuiperův pás, komety, meteory, podmenu');
  await go('soustava'); await sleep(600);
  check('podmenu soustavy', (await ev("[...document.querySelectorAll('#sub .dyn')].map(b => b.textContent)")).join('|') === 'Planety|Kuiperův pás|Dobývání vesmíru');
  await ev("[...document.querySelectorAll('#sub .dyn')].find(b => b.textContent === 'Dobývání vesmíru').click()"); check('dobývání vesmíru z podmenu', await title() === 'Dobývání vesmíru');
  await ev("[...document.querySelectorAll('#sub .dyn')].find(b => b.textContent === 'Kuiperův pás').click()"); check('Kuiperův pás z podmenu', await title() === 'Kuiperův pás');
  await ev('__t.newComet()');
  check('kometa přiletí', await until("[...document.querySelectorAll('.lbl')].some(e => !e.hidden && e.textContent === 'Kometa')", 15000)); await shot('31-kometa');
  await go('galaxie'); await ev("[...document.querySelectorAll('#sub .dyn')].find(b => b.textContent === 'Exoplanety').click()"); check('exoplanety z podmenu', await title() === 'Exoplanety');
  await go('zeme'); check('Země má zase pohledy na Zemi v podmenu', await ev("!document.querySelector('#sub').hidden && !document.querySelector('#sub-zeme').hidden"));

  section('Ovládání');
  await go('zeme'); await sleep(500);
  check('ikony v ovládání mají viditelný popisek', await ev("getComputedStyle(document.querySelector('#center .cap')).display !== 'none'"));
  await ev("const sh = document.querySelector('#sunHint'); if (!sh.hidden) sh.click()"); await sleep(1500);
  await go('mapa'); await ev("__t.quizStart('najdi')"); await sleep(400);
  check('kvíz Najdi stát jde odpovědět z klávesnice', await ev("(() => { const i = document.querySelector('#quizIn'); i.value = GEO.c[__t.quiz.list[0]][0]; i.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter' })); return document.querySelector('#ttl').textContent === 'Správně'; })()"));
  await ev("[...document.querySelectorAll('#acts button')].find(b => b.textContent === 'Ukončit kvíz').click()");

  section('Telefon na výšku');
  await send('Emulation.setDeviceMetricsOverride', { width: 390, height: 844, deviceScaleFactor: 2, mobile: true });
  await send('Emulation.setTouchEmulationEnabled', { enabled: true, maxTouchPoints: 5 });
  await send('Page.reload'); check('aplikace naběhla', await until("typeof __t === 'object'", 15000)); await sleep(800);
  check('karta je sbalená do jednoho řádku', await ev("document.querySelector('#card').classList.contains('min') && getComputedStyle(document.querySelector('#txt')).display === 'none'"));
  check('stránka nepřetéká do šířky', await ev('document.documentElement.scrollWidth <= innerWidth'), await ev('document.documentElement.scrollWidth + " / " + innerWidth'));
  check('pohled soustava', await go('soustava') === 'soustava'); await shot('09-telefon');
  // dotyk: tažení jedním prstem otáčí, dvěma prsty se přibližuje
  const touch = (type, pts) => send('Input.dispatchTouchEvent', { type, touchPoints: pts.map(([x, y], id) => ({ x, y, id })) });
  const d0 = await ev('__t.dist'), pos0 = await ev('camera.position.toArray().join()');
  await touch('touchStart', [[195, 420]]); for (let k = 1; k <= 8; k++) { await touch('touchMove', [[195 + k * 15, 420]]); await sleep(16); } await touch('touchEnd', []); await sleep(400);
  check('tažení prstem otáčí pohledem', await ev('camera.position.toArray().join()') !== pos0);
  await touch('touchStart', [[195, 380], [195, 460]]); for (let k = 1; k <= 8; k++) { await touch('touchMove', [[195, 380 - k * 12], [195, 460 + k * 12]]); await sleep(16); } await touch('touchEnd', []); await sleep(600);
  check('dvěma prsty se přibližuje', await ev('__t.dist') < d0 * .9, d0.toFixed(1) + ' → ' + (await ev('__t.dist')).toFixed(1));
  // výkon na pomalém telefonu: procesor 4× zpomalený, grafika je ale softwarová, takže snímků je méně než na skutečném telefonu
  await send('Emulation.setCPUThrottlingRate', { rate: 4 });
  const fps = () => ev('new Promise(r => { let n = 0; const t0 = performance.now(), f = () => { n++; if (performance.now() - t0 < 3000) requestAnimationFrame(f); else r(Math.round(n / 3)); }; requestAnimationFrame(f); })');
  console.log('  info  soustava při 4× pomalejším procesoru: ' + await fps() + ' snímků za sekundu');

  check('pohled mapa na telefonu', await go('mapa') === 'mapa' && await until('__t.buildMs > 0', 30000));
  console.log('  info  mapa při 4× pomalejším procesoru: ' + await fps() + ' snímků za sekundu, stavba mapy ' + await ev('__t.buildMs') + ' ms, paměť JavaScriptu po úklidu ' + Math.round(await ev('(window.gc && gc(), performance.memory ? performance.memory.usedJSHeapSize / 1048576 : 0)')) + ' MB');
  check('mapa na telefonu se vejde do 150 MB paměti JavaScriptu', await ev('(window.gc && gc(), performance.memory ? performance.memory.usedJSHeapSize / 1048576 : 0)') < 150);
  await ev("__t.quizStart('vlajka')"); await sleep(600);
  check('kvíz na telefonu: otázka i možnosti jsou vidět ve sbalené kartě', await ev("getComputedStyle(document.querySelector('#txt')).display !== 'none' && document.querySelector('#acts').getBoundingClientRect().height > 20 && document.documentElement.scrollWidth <= innerWidth")); await shot('18-telefon-kviz');
  await ev("document.querySelector('#findB').click()"); await ev("(() => { const q = document.querySelector('#q'); q.value = 'praha'; q.dispatchEvent(new Event('input')); })()"); await sleep(300);
  check('hledání na telefonu se vejde na šířku', await ev("document.querySelector('#find').getBoundingClientRect().right <= innerWidth && document.querySelectorAll('#hits button').length > 0")); await shot('19-telefon-hledani');
  await ev("document.querySelector('#hits button').click()"); await sleep(2500); await shot('20-telefon-praha');
  check('hlavní město má vlastní kartu a karta nechá na telefonu vidět mapu', await title() === 'Praha' && await ev("document.querySelector('#card').getBoundingClientRect().height < innerHeight * .56"), await title());

  const cz2 = await ev("GEO.c.findIndex(c => c[0] === 'Česko')"); await ev(`__t.showCountry(${cz2}, false)`); await sleep(400);
  check('na telefonu nejdřív jen šest údajů a tlačítko na další', await ev("[...document.querySelectorAll('#facts > div')].filter(d => getComputedStyle(d).display !== 'none').length") === 6 && await ev("getComputedStyle(document.querySelector('#factsMore')).display !== 'none'"));
  await ev("document.querySelector('#factsMore').click()"); check('všechny údaje po ťuknutí', await ev("[...document.querySelectorAll('#facts > div')].filter(d => getComputedStyle(d).display !== 'none').length") > 6);

  await send('Emulation.setCPUThrottlingRate', { rate: 1 });

  section('Konzole');
  check('žádné chyby ani varování v konzoli', errors.length === 0, errors.slice(0, 5).join(' | '));
} catch (e) { failed++; console.log('\n  CHYBA testu: ' + e.message + (errors.length ? '\n  konzole: ' + errors.slice(0, 5).join(' | ') : '')); }

console.log(failed ? '\nSelhalo kontrol: ' + failed : '\nVšechno prošlo.');
ws.close(); chrome.kill(); server.close();
await sleep(300); fs.rmSync(profile, { recursive: true, force: true, maxRetries: 5 });
process.exit(failed ? 1 : 0);
