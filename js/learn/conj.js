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
    p: subj.p,
    g: subj.g || null,
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

// ---------- Por que errei? ----------

const PERSON = ['je', 'tu', 'il/elle', 'nous', 'vous', 'ils/elles'];
const ENDINGS = {
  IMPARFAIT: ['-ais', '-ais', '-ait', '-ions', '-iez', '-aient'],
  FUTUR: ['-ai', '-as', '-a', '-ons', '-ez', '-ont'],
  CONDITIONNEL_PRESENT: ['-ais', '-ais', '-ait', '-ions', '-iez', '-aient'],
  SUBJONCTIF_PRESENT: ['-e', '-es', '-e', '-ions', '-iez', '-ent'],
};
const AUX = {
  PASSE_COMPOSE: { avoir: ['ai', 'as', 'a', 'avons', 'avez', 'ont'], etre: ['suis', 'es', 'est', 'sommes', 'êtes', 'sont'] },
  PLUS_QUE_PARFAIT: { avoir: ['avais', 'avais', 'avait', 'avions', 'aviez', 'avaient'], etre: ['étais', 'étais', 'était', 'étions', 'étiez', 'étaient'] },
};

// Dicas para as confusões mais comuns entre tempos.
function pairTip(asked, used, ask, got) {
  const k = [asked, used].sort().join('|');
  const tips = {
    'CONDITIONNEL_PRESENT|FUTUR': 'O conditionnel usa o mesmo radical do futur, mas com as terminações do imparfait (-ais, -ait, -ions…).',
    'CONDITIONNEL_PRESENT|IMPARFAIT': `O conditionnel tem o «r» do futuro antes da terminação: «${got}» × «${ask}».`,
    'PRESENT|SUBJONCTIF_PRESENT': 'O subjonctif vem depois de «que» e usa as terminações -e, -es, -e, -ions, -iez, -ent.',
    'PASSE_COMPOSE|PLUS_QUE_PARFAIT': 'No passé composé o auxiliar fica no présent (ai, suis…); no plus-que-parfait, vai para o imparfait (avais, étais…).',
    'IMPARFAIT|PASSE_COMPOSE': 'Passé composé é uma ação pontual e concluída (auxiliar + particípio); imparfait descreve o que acontecia ou se repetia.',
    'IMPARFAIT|PRESENT': 'O imparfait sai do radical do «nous» do présent + -ais, -ait, -ions…',
    'FUTUR|PRESENT': 'O futur simples se forma com o infinitivo (ou um radical irregular) + -ai, -as, -a, -ons, -ez, -ont.',
    'IMPARFAIT|SUBJONCTIF_PRESENT': 'Com «nous» e «vous» o subjonctif costuma ficar igual ao imparfait, mas nas outras pessoas ele termina em -e, -es, -e, -ent.',
  };
  return tips[k] || FORMATION[asked] || '';
}

// Como cada tempo se forma (usado quando não há dica específica para a dupla).
const FORMATION = {
  CONDITIONNEL_PRESENT: 'O conditionnel = radical do futur + -ais, -ais, -ait, -ions, -iez, -aient.',
  FUTUR: 'O futur = infinitivo (ou radical irregular) + -ai, -as, -a, -ons, -ez, -ont.',
  IMPARFAIT: 'O imparfait = radical do «nous» do présent + -ais, -ais, -ait, -ions, -iez, -aient.',
  SUBJONCTIF_PRESENT: 'O subjonctif = radical do «ils» do présent + -e, -es, -e, -ions, -iez, -ent.',
  PASSE_COMPOSE: 'O passé composé = auxiliar (avoir ou être) no présent + particípio.',
  PLUS_QUE_PARFAIT: 'O plus-que-parfait = auxiliar (avoir ou être) no imparfait + particípio.',
};

function lev(a, b) {
  const m = a.length;
  const n = b.length;
  if (Math.abs(m - n) > 3) return 99;
  let prev = Array.from({ length: n + 1 }, (_, j) => j);
  for (let i = 1; i <= m; i++) {
    const cur = [i];
    for (let j = 1; j <= n; j++) cur[j] = Math.min(prev[j] + 1, cur[j - 1] + 1, prev[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
    prev = cur;
  }
  return prev[n];
}

const lastWord = (s) => s.split(' ').pop();
const dropAgreement = (s) => s.replace(/(é|i|u|t|s|is|it)(e?s?)$/, '$1').replace(/ées?$|és$/, 'é');

const FALLBACK = ['Désolé, mais non ! 😅', 'Ah non, pas du tout ! 🙈', 'Raté ! Mais tu vas y arriver 💪', 'Non, non, non… 🫣'];

// Explica, em português, o provável motivo do erro (ou devolve uma frase genérica).
export function diagnose(q, input) {
  const v = VERBS.find((x) => x.inf === q.verb);
  const raw = norm(input);
  const n = stripSubject(raw);
  const ask = q.answers[0];
  const askFull = fullSentence(q.subject, q.tense, ask);
  const T = TENSES;
  if (!v || !n) return { msg: FALLBACK[0], known: false };

  // 1. Escreveu o infinitivo.
  if (n === norm(v.inf) || n === norm(v.inf.replace(/^se |^s'/, ''))) {
    return { msg: `Você escreveu o infinitivo. Aqui precisa conjugar: «${askFull}».`, known: true };
  }

  // 2. É a forma de outra pessoa e/ou outro tempo desse mesmo verbo.
  const hits = [];
  const right = new Set(q.answers.map((a) => deaccent(norm(a))));
  for (const t of Object.keys(T)) {
    for (let p = 0; p < 6; p++) {
      for (const f of accepted(v.t[t][p])) if (!right.has(deaccent(norm(f))) && (norm(f) === n || deaccent(norm(f)) === deaccent(n))) hits.push({ t, p, f });
    }
  }
  const pick = hits.find((h) => h.t === q.tense && h.p !== q.p)
    || hits.find((h) => h.t !== q.tense && h.p === q.p)
    || hits.find((h) => h.t !== q.tense);
  if (pick) {
    const who = PERSON[pick.p];
    const asked = PERSON[q.p];
    if (pick.t === q.tense) {
      return { msg: `Essa é a forma de «${who}», não de «${asked}». Com «${q.subject}» fica «${askFull}».`, known: true };
    }
    const tip = pairTip(q.tense, pick.t, ask, pick.f);
    if (pick.p === q.p) {
      return { msg: `Você se confundiu com o ${T[pick.t].fr} (${T[pick.t].pt}). Aqui é ${T[q.tense].fr}.${tip ? ` ${tip}` : ''}`, known: true };
    }
    return { msg: `Essa é a forma do ${T[pick.t].fr} com «${who}». Pediram ${T[q.tense].fr} com «${asked}».${tip ? ` ${tip}` : ''}`, known: true };
  }

  // 3. Auxiliar trocado no passé composé / plus-que-parfait (troca o auxiliar da resposta e compara).
  const aux = AUX[q.tense];
  if (aux) {
    const swap = (a, from, to) => {
      const words = a.split(' ');
      const i = words.findIndex((w) => from.includes(w));
      if (i < 0) return null;
      words[i] = to[q.p];
      return norm(words.join(' '));
    };
    for (const a of q.answers) {
      const toAvoir = swap(a, aux.etre, aux.avoir);
      const toEtre = swap(a, aux.avoir, aux.etre);
      if (toAvoir && dropAgreement(toAvoir) === dropAgreement(n)) {
        return { msg: `«${q.verb}» usa o auxiliar être, não avoir: «${askFull}».`, known: true };
      }
      if (toEtre && dropAgreement(toEtre) === dropAgreement(n)) {
        return { msg: `«${q.verb}» usa o auxiliar avoir, não être: «${askFull}».`, known: true };
      }
    }
    // 4. Concordância com être: tudo certo, menos o -e / -s do particípio.
    const usesEtre = q.answers.some((a) => a.split(/[ ']/).some((w) => aux.etre.includes(w)));
    if (usesEtre && q.answers.some((a) => dropAgreement(norm(a)) === dropAgreement(n))) {
      const how = [q.g === 'f' ? 'feminino: +e' : '', q.p >= 3 ? 'plural: +s' : ''].filter(Boolean).join(', ');
      return { msg: `Faltou a concordância: com être, o particípio concorda com o sujeito${how ? ` (${how})` : ''}. Fica «${askFull}».`, known: true };
    }
  }

  // 5. Verbos em -ger / -cer.
  const base = q.verb.replace(/^se |^s'/, '');
  if (base.endsWith('ger') && n.replace(/g([ao])/g, 'ge$1') === norm(ask)) {
    return { msg: 'Nos verbos em -ger, o «e» fica antes de «a» e «o» para manter o som de «j»: mangeons, mangeais.', known: true };
  }
  if (base.endsWith('cer') && n.replace(/c([ao])/g, 'ç$1') === norm(ask)) {
    return { msg: 'Nos verbos em -cer, o «c» vira «ç» antes de «a» e «o» para manter o som de «s»: commençons, commençais.', known: true };
  }

  // 6. Quase: errinho de digitação.
  const best = Math.min(...q.answers.map((a) => lev(deaccent(norm(a)), deaccent(n))));
  if (best <= 1 || (best === 2 && n.length >= 7)) {
    return { msg: `Foi por pouco! Só um errinho de ortografia: «${askFull}».`, known: true };
  }

  // 7. Radical certo, terminação errada.
  const end = ENDINGS[q.tense]?.[q.p];
  if (end && norm(ask).slice(0, 3) === lastWord(n).slice(0, 3)) {
    return { msg: `O começo está certo; olha a terminação: no ${T[q.tense].fr}, «${PERSON[q.p]}» termina em ${end}.`, known: true };
  }

  return { msg: FALLBACK[Math.floor(Math.random() * FALLBACK.length)], known: false };
}
