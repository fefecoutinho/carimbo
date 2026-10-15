// Repetição espaçada no estilo do Anki, com o algoritmo FSRS-4.5 (parâmetros padrão).
// Cada carta guarda: estabilidade (s, em dias), dificuldade (d, 1–10), estado e próxima revisão.
// A próxima revisão é marcada para quando a chance de lembrar cai para 90%.

const W = [0.4872, 1.4003, 3.7145, 13.8206, 5.1618, 1.2298, 0.8975, 0.031, 1.6474, 0.1367,
  1.0461, 2.1072, 0.0793, 0.3246, 1.587, 0.2272, 2.8755];
const DECAY = -0.5;
const FACTOR = 19 / 81;
export const RETENTION = 0.9;

export const MIN = 60e3;
export const DAY = 864e5;
const LEARN_STEPS = [1 * MIN, 10 * MIN];
const RELEARN_STEPS = [10 * MIN];
export const LEARN_AHEAD = 20 * MIN; // como no Anki: sem mais nada, mostra antes cartas que vencem em até 20 min

// Notas: 1 = Errei, 2 = Difícil, 3 = Bom, 4 = Fácil.
export const AGAIN = 1;
export const HARD = 2;
export const GOOD = 3;
export const EASY = 4;

const clampD = (d) => Math.min(10, Math.max(1, d));
const initS = (g) => Math.max(0.1, W[g - 1]);
const initD = (g) => clampD(W[4] - (g - 3) * W[5]);
const nextD = (d, g) => clampD(W[7] * initD(GOOD) + (1 - W[7]) * (d - W[6] * (g - 3)));
export const retrievability = (days, s) => (1 + FACTOR * days / s) ** DECAY;

function recallS(d, s, r, g) {
  const hard = g === HARD ? W[15] : 1;
  const easy = g === EASY ? W[16] : 1;
  return s * (1 + Math.exp(W[8]) * (11 - d) * s ** -W[9] * (Math.exp((1 - r) * W[10]) - 1) * hard * easy);
}
function forgetS(d, s, r) {
  return Math.min(s, W[11] * d ** -W[12] * ((s + 1) ** W[13] - 1) * Math.exp((1 - r) * W[14]));
}

// Intervalo em dias para a estabilidade s, mirando a retenção desejada.
const MAX_IVL = 3650; // no máximo 10 anos, como um teto razoável
const interval = (s) => Math.min(MAX_IVL, Math.max(1, Math.round((s / FACTOR) * (RETENTION ** (1 / DECAY) - 1))));

function fuzz(days) {
  if (days < 3) return days;
  return Math.max(1, Math.round(days * (0.95 + Math.random() * 0.1)));
}

export const newCard = () => ({ st: 'new', s: 0, d: 0, due: 0, last: 0, reps: 0, lapses: 0, step: 0 });

// Calcula o estado da carta depois de responder com a nota g. Não altera a carta original.
export function answer(card, g, now = Date.now(), { random = true } = {}) {
  const c = { ...card };
  const fz = random ? fuzz : (x) => x;

  if (c.st === 'new') {
    c.s = initS(g);
    c.d = initD(g);
    c.st = 'learning';
    c.step = 0;
  } else if (c.st === 'review') {
    const days = Math.max(0, (now - c.last) / DAY);
    const r = retrievability(days, c.s);
    const oldD = c.d;
    c.d = nextD(oldD, g);
    if (g === AGAIN) {
      c.s = forgetS(oldD, c.s, r);
      c.lapses++;
      c.st = 'relearning';
      c.step = 0;
      c.due = now + RELEARN_STEPS[0];
    } else {
      // Garante Difícil < Bom < Fácil, como o Anki.
      const ivl = {};
      for (const k of [HARD, GOOD, EASY]) ivl[k] = interval(recallS(oldD, c.s, r, k));
      ivl[HARD] = Math.min(ivl[HARD], ivl[GOOD]);
      ivl[GOOD] = Math.max(ivl[GOOD], ivl[HARD] + 1);
      ivl[EASY] = Math.max(ivl[EASY], ivl[GOOD] + 1);
      c.s = recallS(oldD, c.s, r, g);
      c.due = now + fz(ivl[g]) * DAY;
    }
    c.last = now;
    c.reps++;
    return c;
  }

  // Aprendendo / reaprendendo: passos curtos no mesmo dia.
  const steps = c.st === 'relearning' ? RELEARN_STEPS : LEARN_STEPS;
  if (g === AGAIN) {
    c.step = 0;
    c.due = now + steps[0];
  } else if (g === HARD) {
    c.due = now + (c.step === 0 && steps.length > 1 ? (steps[0] + steps[1]) / 2 : steps[c.step] * 1.5);
  } else if (g === GOOD) {
    c.step++;
    if (c.step >= steps.length) {
      c.st = 'review';
      c.due = now + fz(interval(c.s)) * DAY;
    } else c.due = now + steps[c.step];
  } else {
    // Fácil: sai do aprendizado na hora. Carta nova já começou com a estabilidade de "Fácil".
    c.st = 'review';
    c.due = now + fz(card.st === 'new' ? interval(c.s) : interval(c.s) + 1) * DAY;
  }
  c.last = now;
  c.reps++;
  return c;
}

// Quanto tempo até a próxima revisão para cada nota (para mostrar nos botões).
export function preview(card, now = Date.now()) {
  const out = {};
  for (const g of [AGAIN, HARD, GOOD, EASY]) out[g] = answer(card, g, now, { random: false }).due - now;
  return out;
}

export function fmtDelay(ms) {
  const m = ms / MIN;
  if (m < 1) return '<1min';
  if (m < 60) return `${Math.round(m)}min`;
  const h = m / 60;
  if (h < 24) return `${Math.round(h)}h`;
  const d = ms / DAY;
  if (d < 30) return `${Math.round(d)}d`;
  if (d < 365) return `${(d / 30).toFixed(d < 300 ? 1 : 0).replace('.', ',')}m`;
  return `${(d / 365).toFixed(1).replace('.', ',')}a`;
}
