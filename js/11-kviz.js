// Zeměpisný kvíz na mapě světa a tlačítka mapy. Soubory v js/ sdílejí jeden prostor jmen a načítají se v pořadí podle čísla.
// quiz = null | { menu } | { mode, list, n, ok, opts, wait, done }
let quiz = null, quizArea = 'Celý svět';
const QUIZ_MODES = [['najdi', 'Najdi stát na mapě'], ['obrys', 'Poznej stát podle tvaru'], ['vlajka', 'Poznej vlajku'], ['mesto', 'Hlavní města']];
const QUIZ_AREAS = { 'Celý svět': [20, 10, 3.4], Evropa: [52, 15, 2], Asie: [35, 90, 2.7], Afrika: [3, 20, 2.6], Amerika: [10, -85, 3.2], 'Oceánie': [-22, 145, 2.6] }; // odkud je na oblast vidět
const QUIZ_LEN = 10;
const shuffle = a => { for (let i = a.length - 1; i > 0; i--) { const j = Math.random() * (i + 1) | 0; [a[i], a[j]] = [a[j], a[i]]; } return a; };
function quizPool(mode, area) { // samostatné státy s vlajkou a hlavním městem; na mapě se nehledají ty nejmenší, na ty se nedá trefit
  const seen = new Set(), key = area === 'Amerika' ? 'Amerika' : area;
  return GEO.c.map((c, i) => i).filter(i => {
    const c = GEO.c[i], s = STATY[i];
    if (!s || s.zavisle || c[5] < 0 || !c[1] || !c[3] || !c[8] || seen.has(c[0])) return false;
    if (area !== 'Celý svět' && !c[2].includes(key)) return false;
    if ((mode === 'najdi' || mode === 'obrys') && c[4] < 5000) return false;
    seen.add(c[0]); return true;
  });
}
const quizKey = () => 'kviz-' + quiz.mode + '-' + quizArea;
const record = () => { try { return +localStorage.getItem(quizKey()) || 0; } catch (e) { return 0; } }; // v soukromém okně úložiště být nemusí
function quizCard(o) { card(Object.assign({ note: '', say: o.txt }, o)); acts(); }
function quizMenu() {
  if (!window.STATY) { $('#note').textContent = 'Mapa se ještě stahuje, zkus to za chvilku.'; return; }
  mapSelect(null); info = null; $('#back').hidden = true; quiz = { menu: true }; // při kvízu je mapa politická, zvolené téma se po něm vrátí
  if (mapMode !== 'staty') pickMode('staty'); paint();
  quizCard({ name: 'Zeměpisný kvíz', txt: 'Vyber si oblast a druh otázek. Kolo má nejvýš ' + QUIZ_LEN + ' otázek.' });
}
function quizStart(mode) {
  const list = shuffle(quizPool(mode, quizArea)).slice(0, QUIZ_LEN);
  quiz = { mode, list, n: 0, ok: 0 }; mapFly(...QUIZ_AREAS[quizArea]); quizAsk();
}
function quizAsk() {
  const i = quiz.list[quiz.n], c = GEO.c[i], head = 'Otázka ' + (quiz.n + 1) + ' z ' + quiz.list.length;
  quiz.wait = false; quiz.opts = null; mapSelect(null);
  if (quiz.mode !== 'najdi') { // tři další možnosti ze stejného světadílu, ať to není moc snadné
    const same = shuffle(quizPool(quiz.mode, 'Celý svět').filter(j => j !== i && GEO.c[j][2] === c[2])), rest = shuffle(quizPool(quiz.mode, 'Celý svět').filter(j => j !== i && GEO.c[j][2] !== c[2]));
    quiz.opts = shuffle([i, ...same.concat(rest).slice(0, 3)]);
  }
  if (quiz.mode === 'najdi') quizCard({ name: head, txt: 'Najdi na mapě: ' + c[0] + '. Ťukni na stát.', flag: c[5] });
  else if (quiz.mode === 'obrys') { mapSelect({ c: i }); mapFly(c[8][1], c[8][0], countryDist(i) + .25); quizCard({ name: head, txt: 'Který stát je na mapě zvýrazněný?' }); }
  else if (quiz.mode === 'vlajka') quizCard({ name: head, txt: 'Kterému státu patří tahle vlajka?', flag: c[5], bigFlag: true });
  else quizCard({ name: head, txt: 'Jaké je hlavní město státu ' + c[0] + '?', flag: c[5] });
}
const capOf = j => GEO.c[j][1].split(' / ')[0];
function quizAnswer(j) {
  if (!quiz || quiz.wait || quiz.done || quiz.menu) return;
  const i = quiz.list[quiz.n], c = GEO.c[i], right = GEO.c[j][0] === c[0]; // některé státy jsou v datech dvakrát (odlehlá území), proto se porovnává jméno
  quiz.wait = true; quiz.picked = j; if (right) quiz.ok++; sfx(right ? 'ok' : 'no');
  mapSelect({ c: i, color: right ? 0x7be08a : 0xffc94d }); mapFly(c[8][1], c[8][0], countryDist(i) + .25);
  const wrong = quiz.mode === 'najdi' ? 'Tohle je ' + GEO.c[j][0] + '. ' : '';
  quizCard({ name: right ? 'Správně' : 'Vedle', txt: (right ? '' : wrong + 'Správná odpověď: ') + c[0] + ', hlavní město ' + capOf(i) + '.', note: 'Zatím ' + quiz.ok + ' z ' + (quiz.n + 1) + '.', flag: c[5] });
}
function quizNext() {
  if (++quiz.n < quiz.list.length) return quizAsk();
  const best = record(), n = quiz.list.length, share = quiz.ok / n; quiz.done = true; mapSelect(null);
  if (quiz.ok > best) try { localStorage.setItem(quizKey(), quiz.ok); } catch (e) { /* bez úložiště se rekord nepamatuje */ }
  quizCard({ name: 'Hotovo: ' + quiz.ok + ' z ' + n, txt: share === 1 ? 'Bez jediné chyby, výborně.' : share >= .7 ? 'Dobrá práce.' : share >= .4 ? 'Slušný základ, příště to bude lepší.' : 'Tohle chce trénink. Zkus si mapu nejdřív prohlédnout.',
    note: quiz.ok > best && best ? 'Nový rekord, dosud to bylo ' + best + '.' : best ? 'Tvůj rekord v tomhle kvízu: ' + Math.max(best, quiz.ok) + '.' : '' });
}
function quizStop() { quiz = null; mapSelect(null); card(L); acts(); paint(); }

/* ---------- tlačítka pod kartou mapy ---------- */
function mapActs(a) {
  if (!quiz) {
    a.append(pill('Státy', () => pickMode('staty'), mapMode === 'staty'), pill('Příroda', () => pickMode('priroda'), mapMode === 'priroda'));
    if (mapMode === 'staty') a.append(themeSelect());
    a.append(pill('Kvíz', quizMenu), pill('Rekordy', showRecords), pill('Zemětřesení', toggleQuakes, quakesOn));
  } else if (quiz.menu) {
    const s = document.createElement('select'); s.className = 'pill'; s.id = 'quizArea'; s.setAttribute('aria-label', 'Oblast kvízu');
    for (const k in QUIZ_AREAS) s.append(new Option(k, k, false, k === quizArea));
    s.onchange = () => { quizArea = s.value; };
    a.append(s, ...QUIZ_MODES.map(([mode, name]) => pill(name, () => quizStart(mode))), pill('Zpět na mapu', quizStop));
  } else if (quiz.done) a.append(pill('Ještě jednou', () => quizStart(quiz.mode)), pill('Jiný kvíz', quizMenu), pill('Zpět na mapu', quizStop));
  else {
    if (quiz.opts) a.append(...quiz.opts.map(j => { // po odpovědi zůstanou možnosti vidět, správná a zvolená jsou označené
      const b = pill(quiz.mode === 'mesto' ? capOf(j) : GEO.c[j][0], () => quizAnswer(j)), right = j === quiz.list[quiz.n];
      if (quiz.wait) { b.disabled = true; if (right) b.classList.add('right'); else if (j === quiz.picked) b.classList.add('wrong'); }
      return b;
    }));
    if (quiz.wait) a.append(Object.assign(pill(quiz.n + 1 < quiz.list.length ? 'Další otázka' : 'Výsledek', quizNext), { id: 'quizNext' }));
    a.append(pill('Ukončit kvíz', quizStop));
  }
  legendVis();
}
