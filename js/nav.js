// Estado de navegação: aba atual, dia aberto e mês exibido.
import { today, monthOf } from './dates.js';

export const nav = { tab: 'today', date: today(), month: monthOf(today()) };

let renderer = () => {};
export function setRenderer(fn) { renderer = fn; }

export function go(tab, patch = {}) {
  Object.assign(nav, patch, { tab });
  renderer();
}
