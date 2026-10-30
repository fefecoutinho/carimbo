// Tema "Faz o L": bordões conhecidos do Lula e frases do app no clima de comício.
import * as store from './store.js';

export const isLula = () => store.prefs().theme === 'lula';

// Bordões e frases famosas (curtas) do Lula e das campanhas do PT.
export const BORDOES = [
  'Companheiros e companheiras!',
  'Nunca antes na história deste país…',
  'A esperança venceu o medo.',
  'O Brasil voltou.',
  'Sem medo de ser feliz.',
  'Picanha e cervejinha no fim de semana!',
  'Café da manhã, almoço e jantar.',
  'Faz o L!',
];

let last = -1;
export function bordao() {
  let i;
  do i = Math.floor(Math.random() * BORDOES.length); while (i === last && BORDOES.length > 1);
  last = i;
  return BORDOES[i];
}

// Frase que aparece embaixo da folha na tela Hoje.
export function lulaQuip({ done, total, isToday, future }) {
  if (future) return 'Companheiro, esse dia ainda não chegou.';
  if (!done) return isToday ? 'Companheiros e companheiras, a folha tá em branco. Bora carimbar?' : 'Esqueceu, companheiro? Ainda dá tempo.';
  if (done >= total) return 'Folha completa! Nunca antes na história deste dia. ⭐';
  if (done >= 3) return 'A esperança venceu o medo. E a preguiça também.';
  return isToday ? 'Já tem tinta nessa folha. Faz o L e continua!' : 'Tem tinta nesse dia, companheiro.';
}
