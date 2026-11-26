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
const URL0 = 'http://127.0.0.1:' + server.address().port + '/';

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
  await ev("__t.setMapMode('priroda')"); await sleep(1500);
  check('režim Příroda', await ev("document.querySelector('#acts [aria-pressed=true]').textContent") === 'Příroda'); await shot('08-priroda');
  await ev("__t.setMapMode('staty')");

  section('Telefon na výšku');
  await send('Emulation.setDeviceMetricsOverride', { width: 390, height: 844, deviceScaleFactor: 2, mobile: true });
  await send('Page.reload'); check('aplikace naběhla', await until("typeof __t === 'object'", 15000)); await sleep(800);
  check('karta je sbalená do jednoho řádku', await ev("document.querySelector('#card').classList.contains('min') && getComputedStyle(document.querySelector('#txt')).display === 'none'"));
  check('stránka nepřetéká do šířky', await ev('document.documentElement.scrollWidth <= innerWidth'), await ev('document.documentElement.scrollWidth + " / " + innerWidth'));
  check('pohled soustava', await go('soustava') === 'soustava'); await shot('09-telefon');

  section('Konzole');
  check('žádné chyby ani varování v konzoli', errors.length === 0, errors.slice(0, 5).join(' | '));
} catch (e) { failed++; console.log('\n  CHYBA testu: ' + e.message); }

console.log(failed ? '\nSelhalo kontrol: ' + failed : '\nVšechno prošlo.');
ws.close(); chrome.kill(); server.close();
await sleep(300); fs.rmSync(profile, { recursive: true, force: true, maxRetries: 5 });
process.exit(failed ? 1 : 0);
