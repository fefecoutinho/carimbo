// Jogo "Conjugaison": sorteia verbo + tempo + pessoa e confere a resposta.
import { VERBS } from './verbs.js';

export const TENSES = {
  PRESENT: { fr: 'Présent', pt: 'presente', ex: 'eu como', color: '#2f7bff' },
  PASSE_COMPOSE: { fr: 'Passé composé', pt: 'passado', ex: 'eu comi', color: '#ff3b5c' },
  IMPARFAIT: { fr: 'Imparfait', pt: 'pretérito imperfeito', ex: 'eu comia', color: '#ff7a1f' },
  FUTUR: { fr: 'Futur simple', pt: 'futuro', ex: 'eu comerei', color: '#1fb36b' },
  CONDITIONNEL_PRESENT: { fr: 'Conditionnel', pt: 'futuro do pretérito', ex: 'eu comeria', color: '#b44bff' },
  SUBJONCTIF_PRESENT: { fr: 'Subjonctif', pt: 'subjuntivo', ex: 'que eu coma', color: '#14a3c4' },
  PLUS_QUE_PARFAIT: { fr: 'Plus-que-parfait', pt: 'mais-que-perfeito', ex: 'eu tinha comido', color: '#ff4fb8' },
};

// Pronome → pessoa (0..5) e gênero (para a concordância com être).
const SUBJECTS = [
  { pr: 'je', p: 0 }, { pr: 'tu', p: 1 }, { pr: 'il', p: 2, g: 'm' }, { pr: 'elle', p: 2, g: 'f' },
  { pr: 'nous', p: 3 }, { pr: 'vous', p: 4 }, { pr: 'ils', p: 5, g: 'm' }, { pr: 'elles', p: 5, g: 'f' },
];

const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];
const shuffle = (arr) => {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
};

// Formas aceitas para uma pessoa; a primeira é a "oficial".
function accepted(entry, g) {
  if (typeof entry === 'string') return [entry];
  if (Array.isArray(entry)) return entry;
  if (g) return entry[g];
  return [...new Set([...entry.m, ...entry.f])];
}

const startsWithVowel = (s) => /^[aeiouyhàâéèêëîïôûù]/i.test(s);

// "que" + pronome, com elisão (qu'il, qu'elle…).
export function promptSubject(subject, tense) {
  if (tense !== 'SUBJONCTIF_PRESENT') return subject;
  return startsWithVowel(subject) ? `qu'${subject}` : `que ${subject}`;
}

// Frase completa para mostrar a resposta: "je suis allé", "j'aime", "qu'il vienne".
export function fullSentence(subject, tense, form) {
  const head = tense === 'SUBJONCTIF_PRESENT' ? (startsWithVowel(subject) ? "qu'" : 'que ') : '';
  const subj = subject === 'je' && startsWithVowel(form) ? "j'" : `${subject} `;
  return head + subj + form;
}

// Escolhe o próximo verbo, dando mais chance aos que eu mais erro.
function pickVerb(miss, avoid) {
  const pool = VERBS.filter((v) => !avoid.has(v.inf));
  const weights = pool.map((v) => 1 + Math.min(6, (miss[v.inf] || 0) * 2));
  let r = Math.random() * weights.reduce((a, b) => a + b, 0);
  for (let i = 0; i < pool.length; i++) {
    r -= weights[i];
    if (r <= 0) return pool[i];
  }
  return pool[pool.length - 1];
}

export function makeQuestion({ tenses, miss = {}, avoid = new Set() }) {
  const verb = pickVerb(miss, avoid);
  const tense = pick(tenses.length ? tenses : Object.keys(TENSES));
  const subj = pick(SUBJECTS);
  const entry = verb.t[tense][subj.p];
  const answers = accepted(entry, subj.g);
  const others = typeof entry === 'object' && !Array.isArray(entry) && !subj.g
    ? accepted(entry).filter((a) => a !== answers[0])
    : answers.slice(1);
  return {
    verb: verb.inf,
    pt: verb.pt,
    tense,
    subject: subj.pr,
    answers,
    alt: others,
    choices: makeChoices(verb, tense, subj, answers),
  };
}

function makeChoices(verb, tense, subj, answers) {
  const taken = new Set(answers.map(norm));
  const pool = [];
  for (let p = 0; p < 6; p++) pool.push(accepted(verb.t[tense][p], 'm')[0]);
  for (const t of Object.keys(TENSES)) if (t !== tense) pool.push(accepted(verb.t[t][subj.p], subj.g || 'm')[0]);
  const wrong = [];
  for (const c of shuffle(pool)) {
    if (!taken.has(norm(c))) { taken.add(norm(c)); wrong.push(c); }
    if (wrong.length === 3) break;
  }
  return shuffle([answers[0], ...wrong]);
}

// ---------- Conferência ----------

export function norm(s) {
  return String(s).normalize('NFC').toLowerCase()
    .replace(/[’‘`´]/g, "'")
    .replace(/\s*'\s*/g, "'")
    .replace(/\s+/g, ' ')
    .trim();
}

const deaccent = (s) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/œ/g, 'oe');

// Tira "que" e o pronome sujeito do começo, se a pessoa digitou.
function stripSubject(s) {
  return s.replace(/^(que |qu')/, '').replace(/^(je |j'|tu |il |elle |on |nous |vous |ils |elles )/, '');
}

// Resultado: 'ok' (certo), 'accent' (certo, só errou acento) ou 'wrong'.
export function check(q, input) {
  const n = norm(input);
  if (!n) return 'wrong';
  const cands = [n, stripSubject(n)];
  const all = q.answers.map(norm);
  if (cands.some((c) => all.includes(c))) return 'ok';
  const loose = all.map(deaccent);
  if (cands.some((c) => loose.includes(deaccent(c)))) return 'accent';
  return 'wrong';
}

export const VERB_COUNT = VERBS.length;
