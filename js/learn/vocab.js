// Baralho de vocabulário: cada palavra vira duas cartas (francês→português e português→francês).
import { WORDS } from './words.js';
import { newCard, LEARN_AHEAD } from './srs.js';

// Ordem das cartas novas: palavras mais frequentes primeiro; a direção inicial varia por palavra.
export const ORDER = [];
WORDS.forEach((_, i) => {
  const first = (i * 2654435761) % 7 < 4 ? 'fr' : 'pt';
  ORDER.push(`${i}:${first}`, `${i}:${first === 'fr' ? 'pt' : 'fr'}`);
});
export const TOTAL_CARDS = ORDER.length;

export function cardInfo(id) {
  const [i, dir] = id.split(':');
  const w = WORDS[Number(i)];
  return dir === 'fr'
    ? { id, dir, front: w.fr, back: w.pt, fr: w.fr, note: w.note }
    : { id, dir, front: w.pt, back: w.fr, fr: w.fr, note: w.note };
}

const sibling = (id) => {
  const [i, dir] = id.split(':');
  return `${i}:${dir === 'fr' ? 'pt' : 'fr'}`;
};

export function startOfDay(now) {
  const d = new Date(now);
  d.setHours(0, 0, 0, 0);
  return d.getTime();
}
const endOfDay = (now) => startOfDay(now) + 864e5 - 1;

export const getCard = (V, id) => V.cards[id] || newCard();
const inLearning = (c) => c.st === 'learning' || c.st === 'relearning';

// Monta a situação do baralho agora: o que está vencido e quantas novas ainda cabem hoje.
export function snapshot(V, now, todayKey) {
  const sod = startOfDay(now);
  const eod = endOfDay(now);
  const touched = (id) => (V.cards[id]?.last || 0) >= sod;

  const learning = [];
  const reviews = [];
  for (const [id, c] of Object.entries(V.cards)) {
    if (inLearning(c)) learning.push({ id, due: c.due });
    else if (c.st === 'review' && c.due <= eod && !touched(id) && !touched(sibling(id))) reviews.push({ id, due: c.due });
  }
  learning.sort((a, b) => a.due - b.due);
  reviews.sort((a, b) => a.due - b.due);

  const introduced = V.daily[todayKey]?.new || 0;
  const room = Math.max(0, (V.prefs.newPerDay || 0) - introduced);
  const news = [];
  for (const id of ORDER) {
    if (news.length >= room) break;
    if (V.cards[id] && V.cards[id].st !== 'new') continue;
    if (touched(sibling(id)) || news.some((n) => sibling(n) === id)) continue;
    news.push(id);
  }
  return { learning, reviews, news };
}

// Próxima carta a mostrar (ou null), seguindo a ordem do Anki.
export function nextCard(V, now, todayKey) {
  const { learning, reviews, news } = snapshot(V, now, todayKey);
  const dueLearning = learning.find((l) => l.due <= now);
  if (dueLearning) return { id: dueLearning.id, kind: 'learning' };
  if (reviews.length || news.length) {
    const pickNew = news.length && (!reviews.length || Math.random() < news.length / (news.length + reviews.length));
    return pickNew ? { id: news[0], kind: 'new' } : { id: reviews[0].id, kind: 'review' };
  }
  const ahead = learning.find((l) => l.due <= now + LEARN_AHEAD);
  if (ahead) return { id: ahead.id, kind: 'learning' };
  return null;
}

export function counts(V, now, todayKey) {
  const { learning, reviews, news } = snapshot(V, now, todayKey);
  return { news: news.length, learning: learning.filter((l) => l.due <= endOfDay(now)).length, reviews: reviews.length };
}

// Quando volta a ter carta em aprendizado (para a mensagem de fim de sessão).
export function nextLearningDue(V) {
  let min = Infinity;
  for (const c of Object.values(V.cards)) if (inLearning(c)) min = Math.min(min, c.due);
  return min === Infinity ? null : min;
}

export function deckStats(V, now) {
  let seen = 0;
  let mature = 0;
  for (const c of Object.values(V.cards)) {
    if (c.st === 'new') continue;
    seen++;
    if (c.st === 'review' && c.s >= 21) mature++;
  }
  return { seen, mature, total: TOTAL_CARDS, words: WORDS.length, due: counts(V, now, null).reviews };
}
