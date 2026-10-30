// Dias sem aula: feriados nacionais, de São Paulo (estado) e de São Caetano do Sul (campus do Mauá),
// mais os dias que você marcar/desmarcar à mão.
import * as store from './store.js';

const pad = (n) => String(n).padStart(2, '0');
const key = (y, m, d) => `${y}-${pad(m)}-${pad(d)}`;

// Domingo de Páscoa (algoritmo de Meeus/Jones/Butcher).
function easter(y) {
  const a = y % 19;
  const b = Math.floor(y / 100);
  const c = y % 100;
  const d = Math.floor(b / 4);
  const e = b % 4;
  const f = Math.floor((b + 8) / 25);
  const g = Math.floor((b - f + 1) / 3);
  const h = (19 * a + b - d - g + 15) % 30;
  const i = Math.floor(c / 4);
  const k = c % 4;
  const l = (32 + 2 * e + 2 * i - h - k) % 7;
  const m = Math.floor((a + 11 * h + 22 * l) / 451);
  const month = Math.floor((h + l - 7 * m + 114) / 31);
  const day = ((h + l - 7 * m + 114) % 31) + 1;
  return new Date(y, month - 1, day);
}

function shift(date, days) {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return key(d.getFullYear(), d.getMonth() + 1, d.getDate());
}

const cache = new Map();
export function holidaysOf(y) {
  if (cache.has(y)) return cache.get(y);
  const e = easter(y);
  const list = {
    [key(y, 1, 1)]: 'Confraternização Universal',
    [shift(e, -48)]: 'Carnaval',
    [shift(e, -47)]: 'Carnaval',
    [shift(e, -2)]: 'Sexta-feira Santa',
    [key(y, 4, 21)]: 'Tiradentes',
    [key(y, 5, 1)]: 'Dia do Trabalho',
    [shift(e, 60)]: 'Corpus Christi',
    [key(y, 7, 9)]: 'Revolução Constitucionalista (SP)',
    [key(y, 7, 28)]: 'Aniversário de São Caetano do Sul',
    [key(y, 9, 7)]: 'Independência do Brasil',
    [key(y, 10, 12)]: 'Nossa Senhora Aparecida',
    [key(y, 11, 2)]: 'Finados',
    [key(y, 11, 15)]: 'Proclamação da República',
    [key(y, 11, 20)]: 'Consciência Negra',
    [key(y, 12, 25)]: 'Natal',
  };
  cache.set(y, list);
  return list;
}

// Dia sem aula? Devolve { name, auto } ou null. Marcações manuais têm prioridade.
export function offDay(k) {
  const manual = store.getData().offdays?.[k];
  if (manual === false) return null;
  if (manual) return { name: manual, auto: false };
  if (!store.prefs().holidays) return null;
  const name = holidaysOf(Number(k.slice(0, 4)))[k];
  if (!name) return null;
  // Feriado no sábado ou domingo não conta: já não teria aula.
  const dow = new Date(Number(k.slice(0, 4)), Number(k.slice(5, 7)) - 1, Number(k.slice(8, 10))).getDay();
  return dow === 0 || dow === 6 ? null : { name, auto: true };
}

export function nextOffDay(fromKey, maxDays = 370) {
  const d = new Date(Number(fromKey.slice(0, 4)), Number(fromKey.slice(5, 7)) - 1, Number(fromKey.slice(8, 10)));
  for (let i = 1; i <= maxDays; i++) {
    d.setDate(d.getDate() + 1);
    const k = key(d.getFullYear(), d.getMonth() + 1, d.getDate());
    const o = offDay(k);
    if (o) return { key: k, ...o, inDays: i };
  }
  return null;
}
