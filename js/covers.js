// Capas de livro: busca no Google Books e no Open Library, e guarda uma cópia pequena no aparelho.
import * as store from './store.js';

const GOOGLE = (q) => `https://www.googleapis.com/books/v1/volumes?q=${encodeURIComponent(q)}&maxResults=10&printType=books&fields=items(volumeInfo(title,authors,imageLinks))`;
const OPENLIB = (q) => `https://openlibrary.org/search.json?q=${encodeURIComponent(q)}&limit=8&fields=title,author_name,cover_i`;
// Conversor público de imagens que libera o uso em canvas (para carimbar na folha 3D).
const RELAY = (url) => `https://images.weserv.nl/?url=${encodeURIComponent(url.replace(/^https?:\/\//, ''))}&w=240&output=jpg`;

async function getJSON(url, signal) {
  try {
    const r = await fetch(url, { signal });
    return r.ok ? await r.json() : {};
  } catch {
    return {};
  }
}

// Lista de capas para o título digitado: [{ title, author, url }]
export async function searchCovers(q, signal) {
  const [g, o] = await Promise.all([getJSON(GOOGLE(q), signal), getJSON(OPENLIB(q), signal)]);
  const out = [];
  const seen = new Set();
  const add = (title, author, url) => {
    if (!url || seen.has(url)) return;
    seen.add(url);
    out.push({ title: title || q, author: author || '', url });
  };
  for (const it of g.items || []) {
    const v = it.volumeInfo || {};
    const u = (v.imageLinks?.thumbnail || v.imageLinks?.smallThumbnail || '').replace(/^http:/, 'https:').replace('&edge=curl', '');
    add(v.title, v.authors?.[0], u);
  }
  for (const d of o.docs || []) {
    if (d.cover_i) add(d.title, d.author_name?.[0], `https://covers.openlibrary.org/b/id/${d.cover_i}-M.jpg`);
  }
  return out.slice(0, 12);
}

function loadImage(src, cors) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    if (cors) img.crossOrigin = 'anonymous';
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = src;
  });
}

// Reduz a capa e transforma em imagem embutida (funciona offline e pode ir pra folha 3D).
async function shrink(url) {
  const img = await loadImage(url, true);
  if (img.naturalWidth < 20) throw new Error('capa vazia');
  const w = 200;
  const h = Math.round((img.naturalHeight * w) / img.naturalWidth);
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  c.getContext('2d').drawImage(img, 0, 0, w, h);
  return c.toDataURL('image/jpeg', 0.82);
}

const withTimeout = (p, ms) => Promise.race([p, new Promise((_, rej) => setTimeout(() => rej(new Error('demorou')), ms))]);

function hash(s) {
  let h = 5381;
  for (let i = 0; i < s.length; i++) h = ((h << 5) + h + s.charCodeAt(i)) | 0;
  return `c${(h >>> 0).toString(36)}`;
}

// Salva a capa escolhida e devolve o id dela.
export async function saveCover(choice) {
  const id = hash(choice.url);
  if (store.cover(id)?.src?.startsWith('data:')) return id;
  let src = choice.url;
  try {
    src = await withTimeout(shrink(choice.url), 6000);
  } catch {
    try { src = await withTimeout(shrink(RELAY(choice.url)), 6000); } catch { /* fica só o link */ }
  }
  store.setCover(id, { t: choice.title, a: choice.author, src });
  return id;
}

export const coverSrc = (id) => (id ? store.cover(id)?.src || null : null);

// Imagem pronta para desenhar no canvas da folha (só capas guardadas no aparelho).
const cache = new Map();
let onReady = () => {};
export function onCoverReady(fn) { onReady = fn; }

export function coverImage(id) {
  const src = coverSrc(id);
  if (!src || !src.startsWith('data:')) return null;
  let img = cache.get(id);
  if (!img) {
    img = new Image();
    img.onload = () => onReady();
    img.src = src;
    cache.set(id, img);
  }
  return img.complete && img.naturalWidth ? img : null;
}
