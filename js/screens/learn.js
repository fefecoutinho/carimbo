// Aba "Aprender": mini-jogos de francês. Jogo 1: Conjugaison.
import * as store from '../store.js';
import { today } from '../dates.js';
import { esc, toast } from '../ui.js';
import { pop, haptic, inkBurst, success, fail, almost, fanfare } from '../fx.js';
import { TENSES, makeQuestion, check, fullSentence, promptSubject, VERB_COUNT } from '../learn/conj.js';

const ROUND = 10;
const ACCENTS = ['é', 'è', 'ê', 'à', 'â', 'ç', 'ë', 'î', 'ï', 'ô', 'û', 'ù', 'œ', "'"];
const DECO = ['je suis', 'tu as', 'il va', 'nous allons', 'vous faites', 'elles sont'];

let root = null;
let game = null; // { qs, i, results: [{q, res, input}], answered, mode }
let tipTimer;

export function renderLearn(el) {
  root = el;
  if (game && game.i >= ROUND) game = null;
  if (game) renderGame();
  else renderHome();
}

export function leaveLearn() {
  document.body.classList.remove('playing');
}

// ---------- Início da aba ----------

function renderHome() {
  document.body.classList.remove('playing');
  const L = store.learn();
  const d = store.learnDay(today());
  const on = new Set(L.prefs.tenses);
  const mode = L.prefs.mode;
  root.innerHTML = `<section class="screen">
    <div class="topbar"><div class="eyebrow">Français 🇫🇷</div></div>
    <h1 class="h-display" style="font-size:clamp(34px,11vw,48px);margin:4px 0 14px">Aprender</h1>
    <div class="summary" style="margin-bottom:16px">
      <span class="pill">${d ? `✅ Hoje: ${d.ok}/${d.n} certas` : '🗓️ Ainda não praticou hoje'}</span>
      ${L.best ? `<span class="pill">🏆 Melhor rodada: ${L.best}/${ROUND}</span>` : ''}
    </div>

    <button class="game-card" data-act="play">
      <span class="gc-deco" aria-hidden="true">${DECO.map((w, i) => `<i style="--i:${i}">${w}</i>`).join('')}</span>
      <span class="eyebrow">Jogo 1</span>
      <span class="gc-title">Conjugaison</span>
      <span class="gc-sub">Um verbo, um tempo, uma pessoa: conjugue! ${ROUND} perguntas por rodada · ${VERB_COUNT} verbos.</span>
      <span class="gc-play">JOGAR ▶</span>
    </button>

    <div class="group-title">Tempos verbais</div>
    <div class="panel">
      <div class="tense-chips">${Object.entries(TENSES).map(([id, t]) => `<button class="tchip ${on.has(id) ? 'on' : ''}" style="--c:${t.color}" data-tense="${id}">
        <b>${t.fr}</b><small>${t.pt} · ${t.ex}</small></button>`).join('')}</div>
    </div>

    <div class="group-title">Como responder</div>
    <div class="panel">
      <div class="seg light">
        <button class="${mode === 'type' ? 'on' : ''}" data-mode="type">⌨️ Digitar</button>
        <button class="${mode === 'choice' ? 'on' : ''}" data-mode="choice">👆 Escolher</button>
      </div>
      <p class="t-kind" style="margin:12px 2px 0;font-weight:700;opacity:.8;line-height:1.45">${mode === 'type'
        ? 'Você escreve a conjugação. Vale com ou sem o pronome, e tem uma barra de acentos pra ajudar.'
        : 'Você escolhe entre 4 opções. Mais rápido, bom pra revisar.'}</p>
    </div>
    <p class="footer-note">Os verbos que você erra aparecem com mais frequência 😉<br>Mais jogos em breve.</p>
  </section>`;

  root.querySelector('.screen').addEventListener('click', (e) => {
    const b = e.target.closest('button');
    if (!b) return;
    if (b.dataset.act === 'play') { haptic(); startGame(); }
    else if (b.dataset.tense) {
      const set = new Set(store.learn().prefs.tenses);
      if (set.has(b.dataset.tense)) {
        if (set.size === 1) { toast('Deixe pelo menos um tempo ligado'); return; }
        set.delete(b.dataset.tense);
      } else set.add(b.dataset.tense);
      store.setLearnPref('tenses', Object.keys(TENSES).filter((t) => set.has(t)));
      b.classList.toggle('on');
      pop(b.classList.contains('on'));
      haptic();
    } else if (b.dataset.mode) {
      store.setLearnPref('mode', b.dataset.mode);
      pop();
      haptic();
      renderHome();
    }
  });
}

// ---------- Jogo ----------

function startGame() {
  const L = store.learn();
  const avoid = new Set();
  const qs = [];
  for (let i = 0; i < ROUND; i++) {
    const q = makeQuestion({ tenses: L.prefs.tenses, miss: L.miss, avoid });
    avoid.add(q.verb);
    qs.push(q);
  }
  game = { qs, i: 0, results: [], answered: false, mode: L.prefs.mode };
  renderGame(true);
}

function dotsHTML() {
  return game.qs.map((_, i) => {
    const r = game.results[i];
    const cls = r ? (r.res === 'wrong' ? 'wrong' : r.res) : i === game.i ? 'now' : '';
    return `<i class="${cls}"></i>`;
  }).join('');
}

function renderGame(focus = false) {
  if (game.i >= ROUND) { renderSummary(); return; }
  document.body.classList.add('playing');
  const q = game.qs[game.i];
  const t = TENSES[q.tense];
  const subj = promptSubject(q.subject, q.tense);
  const okCount = game.results.filter((r) => r.res !== 'wrong').length;

  root.innerHTML = `<section class="screen play">
    <div class="play-top">
      <button class="round-btn" data-act="quit" aria-label="Sair do jogo">✕</button>
      <div class="dots">${dotsHTML()}</div>
      <div class="score" aria-label="Acertos">✓ ${okCount}</div>
    </div>

    <div class="qcard" style="--c:${t.color}">
      <div class="tense-chip">${t.fr}<small>${t.pt} · “${t.ex}”</small></div>
      <div class="verb-wrap">
        <span class="tip" role="tooltip">${esc(q.pt)}</span>
        <button class="verb" data-act="tip" aria-label="Ver tradução de ${esc(q.verb)}">${esc(q.verb)}</button>
      </div>
      <div class="ask">Conjugue com <b>${esc(subj)}</b> <span class="hint-tap">· toque no verbo pra traduzir</span></div>
      <div class="reveal"></div>
      <div class="stamp-result" aria-hidden="true"></div>
    </div>

    ${game.mode === 'type' ? `
      <div class="answer-row">
        <span class="subj-pre">${esc(subj)}</span>
        <input class="input ans" type="text" inputmode="text" autocomplete="off" autocorrect="off" autocapitalize="off"
          spellcheck="false" enterkeyhint="go" placeholder="…" aria-label="Sua resposta">
      </div>
      <div class="accents">${ACCENTS.map((a) => `<button data-acc="${esc(a)}" tabindex="-1">${esc(a)}</button>`).join('')}</div>
    ` : `<div class="choices">${q.choices.map((c, i) => `<button class="choice" data-choice="${i}">${esc(c)}</button>`).join('')}</div>`}

    <button class="btn" data-act="go" style="--c:${t.color}">${game.mode === 'type' ? 'VERIFICAR' : 'PULAR'}</button>
  </section>`;

  game.answered = false;
  const screen = root.querySelector('.screen');
  const input = screen.querySelector('.ans');

  screen.addEventListener('pointerdown', (e) => {
    // Botões de acento não podem tirar o foco do campo (senão o teclado fecha).
    if (e.target.closest('[data-acc]')) e.preventDefault();
  });
  screen.addEventListener('click', (e) => {
    const b = e.target.closest('button');
    if (!b) return;
    if (b.dataset.acc && input && !game.answered) {
      const s = input.selectionStart ?? input.value.length;
      const en = input.selectionEnd ?? s;
      input.value = input.value.slice(0, s) + b.dataset.acc + input.value.slice(en);
      input.setSelectionRange(s + 1, s + 1);
      input.focus();
      pop();
      haptic();
    } else if (b.dataset.act === 'tip') showTip();
    else if (b.dataset.act === 'quit') { game = null; pop(false); haptic(); renderHome(); window.scrollTo(0, 0); }
    else if (b.dataset.choice !== undefined && !game.answered) answer(q.choices[Number(b.dataset.choice)], b);
    else if (b.dataset.act === 'go') {
      if (game.answered) next();
      else if (game.mode === 'type') answer(input.value);
      else answer('', null);
    }
  });
  input?.addEventListener('keydown', (e) => {
    if (e.key !== 'Enter') return;
    e.preventDefault();
    if (game.answered) next();
    else answer(input.value);
  });
  input?.addEventListener('beforeinput', (e) => { if (game.answered) e.preventDefault(); });
  if (input && focus) input.focus();
}

function showTip() {
  const tip = root.querySelector('.tip');
  if (!tip) return;
  const on = !tip.classList.contains('show');
  tip.classList.toggle('show', on);
  pop(on);
  haptic();
  clearTimeout(tipTimer);
  if (on) tipTimer = setTimeout(() => tip.classList.remove('show'), 3000);
}

function answer(value, chosenBtn) {
  if (game.answered) return;
  const q = game.qs[game.i];
  if (game.mode === 'type' && !value.trim()) { toast('Escreve a sua resposta 🙂'); return; }
  const res = game.mode === 'choice' ? (value === q.answers[0] ? 'ok' : 'wrong') : check(q, value);
  const ok = res !== 'wrong';
  game.answered = true;
  game.results.push({ q, res, input: value });

  const firstToday = !store.learnDay(today());
  store.logAnswer(today(), { tense: q.tense, verb: q.verb, ok });

  const screen = root.querySelector('.screen');
  const card = screen.querySelector('.qcard');
  const stamp = screen.querySelector('.stamp-result');
  const reveal = screen.querySelector('.reveal');
  const full = (f) => esc(fullSentence(q.subject, q.tense, f));
  const alt = q.alt.length ? `<div class="alt">também vale: ${q.alt.slice(0, 2).map(full).join(' · ')}</div>` : '';

  card.classList.add(res === 'wrong' ? 'is-wrong' : res === 'accent' ? 'is-almost' : 'is-ok');
  stamp.textContent = res === 'ok' ? 'BRAVO !' : res === 'accent' ? 'PRESQUE !' : 'OUPS !';
  stamp.className = `stamp-result show ${res}`;

  if (res === 'ok') {
    reveal.innerHTML = `<div class="right">✓ ${full(q.answers[0])}</div>${alt}`;
    success();
    haptic(true);
    const r = stamp.getBoundingClientRect();
    inkBurst(r.left + r.width / 2, r.top + r.height / 2, '#1fb36b', 18);
  } else if (res === 'accent') {
    reveal.innerHTML = `<div class="right">${full(q.answers[0])}</div><div class="note">Quase perfeito — olha o acento!</div>${alt}`;
    almost();
    haptic();
  } else {
    reveal.innerHTML = `<div class="label">Resposta certa</div><div class="right">${full(q.answers[0])}</div>${alt}
      ${value ? `<div class="yours">você: <s>${esc(value)}</s></div>` : ''}`;
    fail();
    haptic(true);
  }

  if (chosenBtn) chosenBtn.classList.add(ok ? 'ok' : 'wrong');
  screen.querySelectorAll('.choice').forEach((b) => {
    b.disabled = true;
    if (q.choices[Number(b.dataset.choice)] === q.answers[0]) b.classList.add('ok');
  });
  const input = screen.querySelector('.ans');
  if (input) input.classList.add(res === 'wrong' ? 'wrong' : 'ok');

  const go = screen.querySelector('[data-act=go]');
  go.textContent = game.i + 1 >= ROUND ? 'VER RESULTADO' : 'PRÓXIMA →';
  go.classList.add('next');
  screen.querySelector('.dots').innerHTML = dotsHTML();
  screen.querySelector('.score').textContent = `✓ ${game.results.filter((r) => r.res !== 'wrong').length}`;

  if (firstToday) setTimeout(() => toast('🇫🇷 Dia marcado no calendário!'), 900);
}

function next() {
  game.i++;
  pop();
  haptic();
  renderGame(game.i < ROUND);
}

// ---------- Resultado da rodada ----------

function grade(n) {
  if (n >= ROUND) return ['Parfait !', 'Rodada perfeita. Você é uma máquina de conjugar.'];
  if (n >= 8) return ['Magnifique !', 'Muito bem! Quase tudo certo.'];
  if (n >= 6) return ['Très bien !', 'Mandou bem. Mais uma rodada e fica afiado.'];
  if (n >= 4) return ['Pas mal !', 'Tá no caminho. Os que você errou vão voltar pra revisão.'];
  return ['Courage !', 'Faz parte. Os erros voltam mais vezes até grudar.'];
}

function renderSummary() {
  document.body.classList.remove('playing');
  const okN = game.results.filter((r) => r.res !== 'wrong').length;
  const misses = game.results.filter((r) => r.res === 'wrong');
  const [title, msg] = grade(okN);
  store.setBest(okN);

  root.innerHTML = `<section class="screen">
    <div class="sum-card">
      <div class="eyebrow">Conjugaison · resultado</div>
      <div class="sum-score"><b>${okN}</b><span>/${ROUND}</span></div>
      <div class="sum-stamp">${title}</div>
      <p class="sum-msg">${msg}</p>
      <div class="dots big">${dotsHTML()}</div>
    </div>
    ${misses.length ? `<div class="group-title">Pra revisar</div>
      <div class="panel">${misses.map(({ q, input }) => `<div class="miss-row">
        <span class="mini-chip" style="--c:${TENSES[q.tense].color}">${TENSES[q.tense].fr}</span>
        <div class="grow"><div class="m-right">${esc(fullSentence(q.subject, q.tense, q.answers[0]))}</div>
        <div class="m-meta">${esc(q.verb)} = ${esc(q.pt)}${input ? ` · você: <s>${esc(input)}</s>` : ''}</div></div></div>`).join('')}</div>` : ''}
    <button class="btn" data-act="again" style="--c:#2f5bff;margin-top:18px">JOGAR DE NOVO</button>
    <button class="btn ghost" data-act="home" style="color:rgba(255,255,255,.8)">Voltar</button>
  </section>`;
  window.scrollTo(0, 0);

  fanfare();
  haptic(true);
  const st = root.querySelector('.sum-stamp').getBoundingClientRect();
  setTimeout(() => inkBurst(st.left + st.width / 2, st.top + st.height / 2, okN >= 6 ? '#1fb36b' : '#ff7a1f', 22), 350);

  root.querySelector('.screen').addEventListener('click', (e) => {
    const act = e.target.closest('[data-act]')?.dataset.act;
    if (act === 'again') { haptic(); startGame(); }
    else if (act === 'home') { game = null; pop(false); renderHome(); }
  });
}
