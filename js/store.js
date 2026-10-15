// Dados do app: marcadores (o que eu acompanho) e dias (o que eu marquei).
// Tudo fica salvo só neste aparelho (localStorage).

const KEY = 'carimbo:v1';

export const PALETTE = [
  '#ff3b5c', '#ff7a1f', '#ffc21a', '#1fc77e', '#14b8c4',
  '#2f7bff', '#6a4bff', '#b44bff', '#ff4fb8', '#3a3550',
];

export const KINDS = {
  stamp: { label: 'Carimbo', hint: 'Fiz ou não fiz — e o quê (ex.: treino, cardio)' },
  number: { label: 'Número', hint: 'Um valor por dia (ex.: peso)' },
  text: { label: 'Texto', hint: 'Uma anotação (ex.: kanji do dia, evento)' },
  book: { label: 'Livro', hint: 'Comecei / terminei um livro' },
};

const DEFAULT_TRACKERS = [
  {
    id: 'treino', name: 'Treino', icon: '🏋️', color: '#ff3b5c', kind: 'stamp', cross: true,
    options: [
      { id: 'peito', label: 'Peito', letter: 'P' },
      { id: 'costas', label: 'Costas', letter: 'C' },
      { id: 'ombro', label: 'Ombro', letter: 'O' },
      { id: 'perna', label: 'Perna', letter: 'L' },
    ],
  },
  {
    id: 'cardio', name: 'Cardio', icon: '🎾', color: '#1fc77e', kind: 'stamp', cross: false,
    options: [
      { id: 'esteira', label: 'Esteira', letter: 'E' },
      { id: 'tenis', label: 'Tênis', letter: 'T' },
      { id: 'natacao', label: 'Natação', letter: 'N' },
    ],
  },
  { id: 'peso', name: 'Peso', icon: '⚖️', color: '#2f7bff', kind: 'number', unit: 'kg' },
  { id: 'livros', name: 'Livros', icon: '📚', color: '#ff7a1f', kind: 'book' },
  { id: 'kanji', name: 'Kanji do dia', icon: '✍️', color: '#3a3550', kind: 'text', style: 'big' },
  { id: 'evento', name: 'Evento', icon: '⭐', color: '#b44bff', kind: 'text', style: 'note' },
];

function freshData() {
  return {
    v: 1,
    prefs: { sound: true, haptics: true },
    trackers: structuredClone(DEFAULT_TRACKERS),
    days: {},
    learn: freshLearn(),
  };
}

// Aprendizado (francês): dias praticados, acertos por tempo verbal e verbos que mais erro.
export const DEFAULT_TENSES = ['PRESENT', 'PASSE_COMPOSE', 'IMPARFAIT', 'FUTUR', 'CONDITIONNEL_PRESENT', 'SUBJONCTIF_PRESENT'];
function freshLearn() {
  return { days: {}, stats: {}, miss: {}, best: 0, prefs: { tenses: [...DEFAULT_TENSES], mode: 'type' } };
}

let data = load();

function load() {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) return normalize(JSON.parse(raw));
  } catch (e) {
    console.warn('Falha ao ler dados', e);
  }
  return freshData();
}

function normalize(d) {
  const base = freshData();
  if (!d || typeof d !== 'object') return base;
  return {
    v: 1,
    prefs: { ...base.prefs, ...(d.prefs || {}) },
    trackers: Array.isArray(d.trackers) ? d.trackers : base.trackers,
    days: d.days && typeof d.days === 'object' ? d.days : {},
    learn: normalizeLearn(d.learn),
  };
}

function normalizeLearn(l) {
  const base = freshLearn();
  if (!l || typeof l !== 'object') return base;
  return {
    days: l.days || {},
    stats: l.stats || {},
    miss: l.miss || {},
    best: l.best || 0,
    prefs: { ...base.prefs, ...(l.prefs || {}) },
  };
}

const listeners = new Set();
export function subscribe(fn) { listeners.add(fn); return () => listeners.delete(fn); }

function save() {
  try {
    localStorage.setItem(KEY, JSON.stringify(data));
  } catch (e) {
    console.error('Falha ao salvar', e);
  }
  listeners.forEach((fn) => fn());
}

// Pede ao iPhone para não apagar os dados do app por falta de espaço.
export function requestPersistence() {
  try { navigator.storage?.persist?.(); } catch { /* sem suporte */ }
}

// ---------- Leitura ----------

export const getData = () => data;
export const trackers = () => data.trackers;
export const prefs = () => data.prefs;
export const tracker = (id) => data.trackers.find((t) => t.id === id);
export const day = (key) => data.days[key] || {};
export const entry = (key, trackerId) => data.days[key]?.[trackerId];

export function hasEntry(t, value) {
  if (value === undefined || value === null) return false;
  if (t.kind === 'book') return Array.isArray(value) && value.length > 0;
  if (t.kind === 'text') return String(value).trim() !== '';
  return true;
}

export function doneCount(key) {
  const d = day(key);
  return data.trackers.filter((t) => hasEntry(t, d[t.id])).length + (learnDay(key) ? 1 : 0);
}

// ---------- Aprendizado ----------

export const learn = () => data.learn;
export const learnDay = (key) => data.learn.days[key] || null;

export function logAnswer(key, { tense, verb, ok }) {
  const L = data.learn;
  const d = L.days[key] || { n: 0, ok: 0 };
  d.n++;
  if (ok) d.ok++;
  L.days[key] = d;
  const s = L.stats[tense] || { n: 0, ok: 0 };
  s.n++;
  if (ok) s.ok++;
  L.stats[tense] = s;
  const m = L.miss[verb] || 0;
  if (ok) { if (m > 1) L.miss[verb] = m - 1; else delete L.miss[verb]; } else L.miss[verb] = m + 1;
  save();
}

export function setBest(score) {
  if (score > data.learn.best) { data.learn.best = score; save(); }
}

export function setLearnPref(name, value) {
  data.learn.prefs[name] = value;
  save();
}

// Último valor registrado antes de uma data (ex.: peso de ontem para pré-preencher).
export function lastNumberBefore(trackerId, key) {
  const keys = Object.keys(data.days).filter((k) => k < key && typeof data.days[k][trackerId] === 'number').sort();
  const k = keys[keys.length - 1];
  return k ? data.days[k][trackerId] : null;
}

// Livros: começados e terminados, montados a partir dos dias.
export function books() {
  const map = new Map();
  for (const t of data.trackers.filter((x) => x.kind === 'book')) {
    for (const [k, d] of Object.entries(data.days)) {
      for (const ev of d[t.id] || []) {
        const name = ev.t.trim();
        const id = name.toLowerCase();
        if (!map.has(id)) map.set(id, { title: name, start: null, finish: null });
        const b = map.get(id);
        if (ev.a === 'start' && (!b.start || k < b.start)) b.start = k;
        if (ev.a === 'finish' && (!b.finish || k > b.finish)) b.finish = k;
      }
    }
  }
  return [...map.values()];
}

export function readingNow() {
  return books().filter((b) => b.start && !b.finish).sort((a, b) => (a.start < b.start ? 1 : -1));
}

// ---------- Escrita ----------

export function setEntry(key, trackerId, value) {
  const t = tracker(trackerId);
  if (!t) return;
  const d = { ...(data.days[key] || {}) };
  if (hasEntry(t, value)) d[trackerId] = value;
  else delete d[trackerId];
  if (Object.keys(d).length) data.days[key] = d;
  else delete data.days[key];
  save();
}

// Apaga todas as marcações de um mês ("AAAA-MM"). Os marcadores continuam.
export function clearMonth(month) {
  let n = 0;
  for (const k of Object.keys(data.days)) {
    if (k.startsWith(`${month}-`)) { delete data.days[k]; n++; }
  }
  for (const k of Object.keys(data.learn.days)) {
    if (k.startsWith(`${month}-`)) { delete data.learn.days[k]; n++; }
  }
  if (n) save();
  return n;
}

export function setPref(name, value) {
  data.prefs[name] = value;
  save();
}

export function upsertTracker(t) {
  const i = data.trackers.findIndex((x) => x.id === t.id);
  if (i >= 0) data.trackers[i] = t;
  else data.trackers.push(t);
  save();
}

export function deleteTracker(id) {
  data.trackers = data.trackers.filter((t) => t.id !== id);
  for (const k of Object.keys(data.days)) {
    delete data.days[k][id];
    if (!Object.keys(data.days[k]).length) delete data.days[k];
  }
  save();
}

export function moveTracker(id, dir) {
  const i = data.trackers.findIndex((t) => t.id === id);
  const j = i + dir;
  if (i < 0 || j < 0 || j >= data.trackers.length) return;
  const arr = data.trackers;
  [arr[i], arr[j]] = [arr[j], arr[i]];
  save();
}

export function newId(prefix = 'm') {
  return `${prefix}${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;
}

// ---------- Backup ----------

export function exportJSON() {
  return JSON.stringify({ app: 'carimbo', exportedAt: new Date().toISOString(), ...data }, null, 2);
}

export function importJSON(text) {
  const parsed = JSON.parse(text);
  if (!parsed || parsed.app !== 'carimbo' || !Array.isArray(parsed.trackers)) {
    throw new Error('Esse arquivo não parece um backup do Carimbo.');
  }
  data = normalize(parsed);
  save();
}
