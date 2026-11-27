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
const chrome = spawn(CHROME, ['--headless=new', '--enable-unsafe-swiftshader', '--remote-debugging-port=0', '--user-data-dir=' + profile, '--window-size=1280,800', 'about:blank'], { stdio: ['ignore', 'ignore', 'pipe'] });
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
  if (d.method === 'Log.entryAdded' && d.params.entry.level === 'error') errors.push('prohlížeč: ' + d.params.entry.text + ' ' + (d.params.entry.url || '')); // sem padají i nenalezené soubory
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
  check('začíná pohledem Den a noc', await ev('__t.level') === 'zeme');
  check('data mapy se při startu nestahují', await ev('!window.GEO'));
  check('karta má text a fakta', await ev("document.querySelector('#txt').textContent.length > 20 && document.querySelectorAll('#facts > div').length > 3"));
  await shot('01-start');

  section('Přepínání všech pohledů');
  for (const id of ['mesic', 'rok', 'rez', 'obloha', 'soustava', 'galaxie', 'vesmir', 'zeme']) check('pohled ' + id, await go(id) === id);

  section('Země a Měsíc');
  await go('mesic');
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
  check('roční období nemají vlastní záložku', await ev("!document.querySelector('#sub-rok')"));
  await ev("document.querySelector('#layB').click()");
  check('panel vrstev nabízí vrstvy Země', (await ev("[...document.querySelectorAll('#lays label')].map(l => l.textContent.trim())")).join('|') === 'Popisky|Oblačnost|Vesmírná stanice|Roční období');
  await ev("document.querySelector('#lays [data-lay=rok]').click()"); await sleep(700);
  check('vrstva Roční období: karta, rovnoběžky, roční doba a čas po týdnech', await title() === 'Roční období' && (await shown('.lbl.sky')).includes('Rovník') && /, (jaro|léto|podzim|zima)$/.test(await ev("document.querySelector('#dn').textContent")) && await ev("document.querySelector('#speed').value") === '6', (await shown('.lbl.sky')).join(', ')); await shot('21-rocni-obdobi');
  await ev("document.querySelector('#lays [data-lay=rok]').click()"); await sleep(300);
  check('vypnutí vrstvy vrátí kartu i rychlost', await title() === 'Den a noc' && (await shown('.lbl.sky')).length === 0 && await ev("document.querySelector('#speed').value") === '2');
  await ev("document.querySelector('#lays [data-lay=iss]').click()"); await sleep(300);
  check('vypnutá vesmírná stanice nemá jmenovku', !(await shown('.lbl')).includes('Vesmírná stanice')); await ev("__t.setLay('iss', 1)");
  await go('rez'); await sleep(600);
  const airNames = await shown('.lbl');
  check('průřez ukazuje vrstvy atmosféry', ['Troposféra', 'Stratosféra', 'Mezosféra', 'Termosféra', 'Exosféra'].every(n => airNames.some(t => t.startsWith(n + ','))), airNames.join(', ')); await shot('22-atmosfera');
  await tapLabel('Stratosféra, do 50 km'); check('karta vrstvy atmosféry', await title() === 'Stratosféra' && await ev("document.querySelectorAll('#facts > div').length") === 3);
  await ev("__t.setLay('atmo', 0)"); await sleep(300); check('atmosféra jde vypnout', !(await shown('.lbl')).some(t => t.startsWith('Troposféra'))); await ev("__t.setLay('atmo', 1)");
  await go('obloha'); await sleep(500);
  check('na obloze jsou čáry souhvězdí a jdou vypnout', await ev('__t.linesOn') && (await ev("__t.setLay('souhvezdi', 0), __t.setLay('jmenaS', 0), new Promise(r => setTimeout(() => r(__t.linesOn), 300))")) === false && (await shown('.lbl.sky')).length === 0);
  await ev("__t.setLay('souhvezdi', 1), __t.setLay('jmenaS', 1)");
  await ev("document.querySelector('#layB').click()");

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
  await click(640, 290); await sleep(600);
  check('ťuknutí na mapu otevře kartu státu', await title() !== 'Mapa světa' && await ev("document.querySelectorAll('#facts > div').length >= 2"), await title());
  check('obrázek s vlajkami se načetl', await ev("new Promise(r => { const i = new Image(); i.onload = () => r(i.naturalWidth > 100); i.onerror = () => r(false); i.src = getComputedStyle(document.querySelector('#flag')).backgroundImage.slice(5, -2); })"));
  await ev("document.querySelector('#back').click()");
  await wheel(22, -1); await sleep(900);
  check('po přiblížení přibudou jmenovky', (await ev('__t.mapShown')).length > 15, (await ev('__t.mapShown')).slice(0, 8).join(', ')); await shot('07-mapa-blizko');
  const before = (await ev('__t.mapShown')).length; await ev("__t.setLay('mesta', 0), __t.setLay('regiony', 0)"); await sleep(400);
  check('vypnutí měst a regionů ubere jmenovky', (await ev('__t.mapShown')).length < before, before + ' → ' + (await ev('__t.mapShown')).length);
  await ev("__t.setMapMode('priroda')"); await sleep(1500);
  check('režim Příroda', await ev("document.querySelector('#acts [aria-pressed=true]').textContent") === 'Příroda'); await shot('08-priroda');
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
  check('výběr hory přepne na přírodní mapu a doletí k ní', await ev('__t.info') === 'Mount Everest' && await ev("document.querySelector('#acts [aria-pressed=true]').textContent") === 'Příroda' && await ev('__t.selected'), await ev('__t.info')); await shot('14-everest');
  await ev("__t.pickHit(__t.findHits('saturn')[0])");
  check('výběr planety přeletí do soustavy a k planetě', await until("__t.level === 'soustava' && __t.focus === 'Saturn'", 9000));
  await sleep(1500); await ev("__t.pickHit(__t.findHits('brno')[0])");
  check('výběr města přeletí na mapu a otevře jeho kartu', await until("__t.level === 'mapa' && __t.info === 'Brno'", 9000)); await sleep(2500); await shot('15-brno');
  await ev("__t.setMapMode('staty')");

  section('Telefon na výšku');
  await send('Emulation.setDeviceMetricsOverride', { width: 390, height: 844, deviceScaleFactor: 2, mobile: true });
  await send('Page.reload'); check('aplikace naběhla', await until("typeof __t === 'object'", 15000)); await sleep(800);
  check('karta je sbalená do jednoho řádku', await ev("document.querySelector('#card').classList.contains('min') && getComputedStyle(document.querySelector('#txt')).display === 'none'"));
  check('stránka nepřetéká do šířky', await ev('document.documentElement.scrollWidth <= innerWidth'), await ev('document.documentElement.scrollWidth + " / " + innerWidth'));
  check('pohled soustava', await go('soustava') === 'soustava'); await shot('09-telefon');

  check('pohled mapa na telefonu', await go('mapa') === 'mapa' && await until('__t.buildMs > 0', 30000));
  await ev("__t.quizStart('vlajka')"); await sleep(600);
  check('kvíz na telefonu: otázka i možnosti jsou vidět ve sbalené kartě', await ev("getComputedStyle(document.querySelector('#txt')).display !== 'none' && document.querySelector('#acts').getBoundingClientRect().height > 20 && document.documentElement.scrollWidth <= innerWidth")); await shot('18-telefon-kviz');
  await ev("document.querySelector('#findB').click()"); await ev("(() => { const q = document.querySelector('#q'); q.value = 'praha'; q.dispatchEvent(new Event('input')); })()"); await sleep(300);
  check('hledání na telefonu se vejde na šířku', await ev("document.querySelector('#find').getBoundingClientRect().right <= innerWidth && document.querySelectorAll('#hits button').length > 0")); await shot('19-telefon-hledani');
  await ev("document.querySelector('#hits button').click()"); await sleep(2500); await shot('20-telefon-praha');
  check('hlavní město má vlastní kartu a karta nechá na telefonu vidět mapu', await title() === 'Praha' && await ev("document.querySelector('#card').getBoundingClientRect().height < innerHeight * .56"), await title());

  section('Konzole');
  check('žádné chyby ani varování v konzoli', errors.length === 0, errors.slice(0, 5).join(' | '));
} catch (e) { failed++; console.log('\n  CHYBA testu: ' + e.message); }

console.log(failed ? '\nSelhalo kontrol: ' + failed : '\nVšechno prošlo.');
ws.close(); chrome.kill(); server.close();
await sleep(300); fs.rmSync(profile, { recursive: true, force: true, maxRetries: 5 });
process.exit(failed ? 1 : 0);
