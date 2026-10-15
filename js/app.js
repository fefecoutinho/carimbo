// Ponto de partida do app: céu, abas, telas e modo offline.
import * as store from './store.js';
import { today } from './dates.js';
import { icons } from './ui.js';
import { unlockAudio, pop, haptic } from './fx.js';
import { nav, setRenderer } from './nav.js';
import { renderToday, leaveToday } from './screens/today.js';
import { renderMonth } from './screens/month.js';
import { renderProgress } from './screens/progress.js';
import { renderSettings } from './screens/settings.js';

const TABS = [
  { id: 'today', label: 'Hoje', icon: icons.today, render: renderToday },
  { id: 'month', label: 'Mês', icon: icons.month, render: renderMonth },
  { id: 'progress', label: 'Progresso', icon: icons.progress, render: renderProgress },
  { id: 'settings', label: 'Ajustes', icon: icons.settings, render: renderSettings },
];

// Céu muda com a hora do dia, como num app de clima.
const SKIES = [
  { from: 0, sky1: '#0d0a2e', sky2: '#2b1b7a', sky3: '#6b3bd6', stars: 1, theme: '#0d0a2e' },
  { from: 5, sky1: '#3b2a8f', sky2: '#ff8a5c', sky3: '#ffd36b', stars: 0, theme: '#3b2a8f' },
  { from: 8, sky1: '#1f4fd8', sky2: '#3fa3ff', sky3: '#9be7ff', stars: 0, theme: '#1f4fd8' },
  { from: 16, sky1: '#3a1f8f', sky2: '#ff5f7e', sky3: '#ffb86b', stars: 0, theme: '#3a1f8f' },
  { from: 19, sky1: '#1a0f52', sky2: '#5b2bd1', sky3: '#ff4fb8', stars: 0.6, theme: '#1a0f52' },
  { from: 22, sky1: '#0d0a2e', sky2: '#2b1b7a', sky3: '#6b3bd6', stars: 1, theme: '#0d0a2e' },
];

function paintSky() {
  const h = new Date().getHours();
  const s = [...SKIES].reverse().find((x) => h >= x.from);
  const r = document.documentElement.style;
  r.setProperty('--sky1', s.sky1);
  r.setProperty('--sky2', s.sky2);
  r.setProperty('--sky3', s.sky3);
  r.setProperty('--stars', s.stars);
  document.querySelector('meta[name=theme-color]').content = s.theme;
}

const app = document.getElementById('app');
const appbar = document.getElementById('appbar');

// O fundo da barra aparece aos poucos conforme a tela rola.
function updateBar() {
  const p = Math.max(0, Math.min(1, window.scrollY / 60));
  appbar.style.setProperty('--p', p.toFixed(3));
}
window.addEventListener('scroll', updateBar, { passive: true });
const tabs = document.getElementById('tabs');

function renderTabs() {
  tabs.innerHTML = TABS.map((t) => `<button class="${nav.tab === t.id ? 'on' : ''}" data-tab="${t.id}" aria-label="${t.label}">${t.icon}<span>${t.label}</span></button>`).join('');
}

let shown = null;
function render() {
  if (shown === 'today' && nav.tab !== 'today') leaveToday();
  const changed = shown !== nav.tab;
  shown = nav.tab;
  renderTabs();
  TABS.find((t) => t.id === nav.tab).render(app);
  if (changed) window.scrollTo(0, 0);
  updateBar();
}
setRenderer(render);

tabs.addEventListener('click', (e) => {
  const b = e.target.closest('[data-tab]');
  if (!b) return;
  if (b.dataset.tab === nav.tab && nav.tab === 'today') {
    window.scrollTo({ top: 0, behavior: 'smooth' });
    return;
  }
  pop();
  haptic();
  nav.tab = b.dataset.tab;
  render();
});

// A tela "Hoje" se atualiza sozinha; as outras são redesenhadas quando os dados mudam.
store.subscribe(() => {
  if (nav.tab !== 'today') render();
});

// Virou o dia com o app aberto: volta para a nova data.
let lastToday = today();
function checkNewDay() {
  paintSky();
  const t = today();
  if (t !== lastToday) {
    if (nav.date === lastToday) nav.date = t;
    lastToday = t;
    render();
  }
}
document.addEventListener('visibilitychange', () => { if (!document.hidden) checkNewDay(); });
setInterval(checkNewDay, 60_000);

async function start() {
  paintSky();
  unlockAudio();
  store.requestPersistence();
  // Espera as fontes para a folha 3D já nascer com a letra certa.
  await Promise.race([
    Promise.all([document.fonts.load('900 40px Unbounded'), document.fonts.load('700 40px Caveat')]),
    new Promise((r) => setTimeout(r, 1500)),
  ]).catch(() => {});
  render();
}
start();

if ('serviceWorker' in navigator && location.protocol === 'https:') {
  // Quando sai uma versão nova, recarrega uma vez para usá-la.
  const hadController = !!navigator.serviceWorker.controller;
  navigator.serviceWorker.register('sw.js').catch((e) => console.warn('SW', e));
  let reloaded = false;
  navigator.serviceWorker.addEventListener('controllerchange', () => {
    if (reloaded || !hadController) return;
    reloaded = true;
    location.reload();
  });
}
