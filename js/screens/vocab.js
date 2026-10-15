// Jogo 2 — Vocabulário: cartas que viram, no estilo do Anki, com repetição espaçada (FSRS).
import * as store from '../store.js';
import { today } from '../dates.js';
import { esc, toast } from '../ui.js';
import { pop, haptic, inkBurst, success, fail, almost, ding, speakFr } from '../fx.js';
import { answer, preview, fmtDelay, AGAIN, HARD, GOOD, EASY } from '../learn/srs.js';
import { cardInfo, getCard, nextCard, counts, nextLearningDue } from '../learn/vocab.js';

const GRADES = [
  { g: AGAIN, label: 'Errei', cls: 'again' },
  { g: HARD, label: 'Difícil', cls: 'hard' },
  { g: GOOD, label: 'Bom', cls: 'good' },
  { g: EASY, label: 'Fácil', cls: 'easy' },
];

let session = null; // { cur: {id, kind}, flipped, done, ok, onExit }
let root = null;

export const vocabActive = () => !!session;

export function startVocab(el, onExit) {
  session = { cur: null, flipped: false, done: 0, ok: 0, onExit };
  root = el;
  pickNext();
  render(true);
}

export function renderVocab(el) {
  root = el;
  if (!session.cur) pickNext();
  render(false);
}

function pickNext() {
  session.cur = nextCard(store.vocab(), Date.now(), today());
  session.flipped = false;
}

function exit() {
  const cb = session?.onExit;
  session = null;
  document.body.classList.remove('playing');
  pop(false);
  haptic();
  cb?.();
}

function render(animate) {
  const V = store.vocab();
  const c = counts(V, Date.now(), today());
  if (!session.cur) { renderDone(c); return; }
  document.body.classList.add('playing');

  const info = cardInfo(session.cur.id);
  const card = getCard(V, info.id);
  const pv = preview(card, Date.now());
  const frontIsFr = info.dir === 'fr';
  const kindLabel = { new: 'Nova', learning: 'Aprendendo', review: 'Revisão' }[session.cur.kind];
  const speakBtn = (word) => `<button class="speak" data-speak="${esc(word)}" aria-label="Ouvir pronúncia">🔊</button>`;

  root.innerHTML = `<section class="screen play">
    <div class="play-top">
      <button class="round-btn" data-act="quit" aria-label="Sair">✕</button>
      <div class="vcounts" aria-label="Novas, aprendendo e revisões">
        <span class="vc new ${session.cur.kind === 'new' ? 'cur' : ''}">${c.news}</span>
        <span class="vc lrn ${session.cur.kind === 'learning' ? 'cur' : ''}">${c.learning}</span>
        <span class="vc rev ${session.cur.kind === 'review' ? 'cur' : ''}">${c.reviews}</span>
      </div>
      <div class="score">✓ ${session.ok}</div>
    </div>

    <div class="flip-wrap ${animate ? 'enter' : ''}">
      <div class="flip ${session.flipped ? 'flipped' : ''}" data-act="flip">
        <div class="face front vcard">
          <div class="v-top"><span class="dir-chip ${info.dir}">${frontIsFr ? '🇫🇷 Francês → Português' : '🇧🇷 Português → Francês'}</span><span class="v-kind">${kindLabel}</span></div>
          <div class="v-word ${frontIsFr ? '' : 'pt'}">${esc(info.front)}</div>
          ${frontIsFr ? speakBtn(info.fr) : ''}
          <div class="v-hint">toque para virar</div>
        </div>
        <div class="face back vcard">
          <div class="v-top"><span class="dir-chip ${info.dir}">${frontIsFr ? '🇫🇷 Francês → Português' : '🇧🇷 Português → Francês'}</span><span class="v-kind">${kindLabel}</span></div>
          <div class="v-q">${esc(info.front)}</div>
          <div class="v-answer">${esc(info.back)}</div>
          ${info.note ? `<div class="v-note">${esc(info.note)}</div>` : ''}
          ${speakBtn(info.fr)}
        </div>
      </div>
    </div>

    <div class="v-actions">
      ${session.flipped
        ? `<div class="grades">${GRADES.map((x) => `<button class="grade ${x.cls}" data-g="${x.g}"><b>${x.label}</b><small>${fmtDelay(pv[x.g])}</small></button>`).join('')}</div>`
        : '<button class="btn" data-act="flip" style="--c:#2f5bff">MOSTRAR RESPOSTA</button>'}
    </div>
  </section>`;

  const screen = root.querySelector('.screen');
  screen.addEventListener('click', onClick);
  if (animate && frontIsFr && store.vocab().prefs.speak) speakFr(info.fr);
}

function onClick(e) {
  const el = e.target.closest('[data-speak],[data-act],[data-g]');
  if (!el) return;
  if (el.dataset.speak) { e.stopPropagation(); speakFr(el.dataset.speak); haptic(); return; }
  if (el.dataset.act === 'quit') { exit(); return; }
  if (el.dataset.act === 'flip') {
    if (session.flipped) return;
    flip();
    return;
  }
  if (el.dataset.g) grade(Number(el.dataset.g));
}

function flip() {
  session.flipped = true;
  pop(true);
  haptic();
  const info = cardInfo(session.cur.id);
  // Vira só a carta (sem redesenhar) para a animação ficar suave; troca os botões embaixo.
  root.querySelector('.flip').classList.add('flipped');
  const pv = preview(getCard(store.vocab(), info.id), Date.now());
  root.querySelector('.v-actions').innerHTML = `<div class="grades enter">${GRADES.map((x) => `<button class="grade ${x.cls}" data-g="${x.g}"><b>${x.label}</b><small>${fmtDelay(pv[x.g])}</small></button>`).join('')}</div>`;
  if (info.dir === 'pt' && store.vocab().prefs.speak) speakFr(info.fr);
}

function grade(g) {
  const V = store.vocab();
  const { id, kind } = session.cur;
  const before = getCard(V, id);
  const after = answer(before, g, Date.now());
  const ok = g !== AGAIN;
  store.saveVocabAnswer(today(), id, after, { wasNew: before.st === 'new', ok, review: kind === 'review' });
  session.done++;
  if (ok) session.ok++;

  const wrap = root.querySelector('.flip-wrap');
  wrap.classList.remove('enter');
  wrap.classList.add(g === AGAIN ? 'out-left' : 'out-right', `g${g}`);
  if (g === AGAIN) fail();
  else if (g === HARD) almost();
  else if (g === GOOD) ding();
  else success();
  haptic(g === AGAIN || g === EASY);
  if (g === EASY) {
    const r = wrap.getBoundingClientRect();
    inkBurst(r.right - 40, r.top + r.height / 2, '#2f7bff', 14);
  }
  if (store.vocab().daily[today()]?.n === 1) setTimeout(() => toast('🇫🇷 Dia marcado no calendário!'), 600);

  setTimeout(() => {
    if (!session) return;
    pickNext();
    render(true);
  }, 330);
}

function renderDone(c) {
  document.body.classList.remove('playing');
  const V = store.vocab();
  const d = V.daily[today()] || { n: 0, ok: 0, new: 0 };
  const nextDue = nextLearningDue(V);
  const wait = nextDue ? Math.max(1, Math.round((nextDue - Date.now()) / 60000)) : null;
  root.innerHTML = `<section class="screen">
    <div class="sum-card">
      <div class="eyebrow">Vocabulário · hoje</div>
      <div class="sum-emoji">${wait ? '⏳' : '🎉'}</div>
      <div class="sum-stamp" style="border-color:#2f7bff;color:#2f7bff">${wait ? 'Quase lá !' : 'Fini !'}</div>
      <p class="sum-msg">${wait
        ? `Ainda ${wait === 1 ? 'falta 1 minuto' : `faltam ${wait} minutos`} para as cartas em aprendizado voltarem. Elas precisam desse intervalo pra fixar.`
        : 'Tudo em dia por hoje. As próximas cartas voltam na hora certa pra sua memória.'}</p>
      <div class="v-sumrow">
        <div><b>${d.n}</b><span>respostas</span></div>
        <div><b>${d.n ? Math.round((d.ok / d.n) * 100) : 0}%</b><span>lembrou</span></div>
        <div><b>${d.new}</b><span>novas</span></div>
      </div>
    </div>
    ${wait ? '<button class="btn" data-act="again" style="--c:#2f5bff;margin-top:18px">VERIFICAR DE NOVO</button>' : ''}
    <button class="btn ghost" data-act="home" style="color:rgba(255,255,255,.85)">Voltar</button>
    ${c.news === 0 && !wait ? '<p class="footer-note">Quer mais palavras novas? Aumente o limite diário na aba Aprender.</p>' : ''}
  </section>`;
  window.scrollTo(0, 0);
  if (session.done && !session.cheered) { session.cheered = true; success(); haptic(true); }
  root.querySelector('.screen').addEventListener('click', (e) => {
    const act = e.target.closest('[data-act]')?.dataset.act;
    if (act === 'again') { pickNext(); render(true); }
    else if (act === 'home') exit();
  });
}
