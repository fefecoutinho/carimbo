// Ponto de partida do app: céu, abas, telas e modo offline.
import * as store from './store.js';
import { today } from './dates.js';
import { icons } from './ui.js';
import { themeById } from './themes.js';
import { unlockAudio, pop, haptic } from './fx.js';
import { nav, setRenderer } from './nav.js';
import { renderToday, leaveToday } from './screens/today.js';
import { renderMonth } from './screens/month.js';
import { renderProgress } from './screens/progress.js';
import { renderSettings } from './screens/settings.js';
import { renderLearn, leaveLearn } from './screens/learn.js';

const TABS = [
  { id: 'today', label: 'Hoje', icon: icons.today, render: renderToday },
  { id: 'month', label: 'Mês', icon: icons.month, render: renderMonth },
  { id: 'learn', label: 'Aprender', icon: icons.learn, render: renderLearn },
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
  const theme = themeById(store.prefs().theme);
  document.body.dataset.theme = theme.id;
  const h = new Date().getHours();
  const s = theme.sky
    ? { sky1: theme.sky[0], sky2: theme.sky[1], sky3: theme.sky[2], stars: 0, theme: theme.sky[0] }
    : [...SKIES].reverse().find((x) => h >= x.from);
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

// Barra de abas (vidro líquido): criada uma vez, com uma "lente" que desliza até a aba atual.
tabs.innerHTML = '<span class="lens"></span>' + TABS.map((t) => `<button data-tab="${t.id}" aria-label="${t.label}">${t.icon}<span>${t.label}</span></button>`).join('');
const lens = tabs.querySelector('.lens');
const tabBtns = [...tabs.querySelectorAll('button')];
let dragX = null;

function placeLens() {
  const btn = tabBtns.find((b) => b.dataset.tab === nav.tab);
  if (!btn) return;
  lens.style.width = `${btn.offsetWidth}px`;
  const x = dragX !== null
    ? Math.max(0, Math.min(tabs.clientWidth - btn.offsetWidth - 12, dragX - btn.offsetWidth / 2 - 6)) + 6
    : btn.offsetLeft;
  lens.style.transform = `translateX(${x}px)`;
}

function renderTabs() {
  for (const b of tabBtns) b.classList.toggle('on', b.dataset.tab === nav.tab);
  placeLens();
}
window.addEventListener('resize', placeLens);

let shown = null;
function render() {
  if (shown === 'today' && nav.tab !== 'today') leaveToday();
  if (shown === 'learn' && nav.tab !== 'learn') leaveLearn();
  const changed = shown !== nav.tab;
  shown = nav.tab;
  renderTabs();
  if (nav.tab !== 'today') document.getElementById('streak').style.display = 'none';
  TABS.find((t) => t.id === nav.tab).render(app);
  if (changed) window.scrollTo(0, 0);
  updateBar();
}
setRenderer(render);

function selectTab(id, { drag = false } = {}) {
  if (id === nav.tab) {
    if (!drag && id === 'today') window.scrollTo({ top: 0, behavior: 'smooth' });
    return;
  }
  pop();
  haptic();
  nav.tab = id;
  render();
}

// Toque numa aba, ou segure e arraste o dedo pela barra para passar de uma aba a outra.
let pressing = false;
const tabAt = (x) => {
  const r = tabs.getBoundingClientRect();
  const rel = Math.max(0, Math.min(r.width - 1, x - r.left));
  // A aba mais próxima do dedo (assim as frestas entre as abas não atrapalham).
  return tabBtns.reduce((best, b) => (Math.abs(rel - (b.offsetLeft + b.offsetWidth / 2)) < Math.abs(rel - (best.offsetLeft + best.offsetWidth / 2)) ? b : best));
};
tabs.addEventListener('pointerdown', (e) => {
  if (e.button > 0) return;
  pressing = true;
  tabs.setPointerCapture?.(e.pointerId);
  tabs.classList.add('dragging');
  dragX = e.clientX - tabs.getBoundingClientRect().left;
  selectTab(tabAt(e.clientX).dataset.tab, { drag: true });
  placeLens();
});
tabs.addEventListener('pointermove', (e) => {
  if (!pressing) return;
  dragX = e.clientX - tabs.getBoundingClientRect().left;
  selectTab(tabAt(e.clientX).dataset.tab, { drag: true });
  placeLens();
});
const release = (e) => {
  if (!pressing) return;
  pressing = false;
  dragX = null;
  tabs.classList.remove('dragging');
  placeLens();
  if (e.type === 'pointerup' && nav.tab === 'today' && tabAt(e.clientX).dataset.tab === 'today' && window.scrollY > 0) {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }
};
tabs.addEventListener('pointerup', release);
tabs.addEventListener('pointercancel', release);
tabs.addEventListener('contextmenu', (e) => e.preventDefault());
// Teclado / leitor de tela (clique sem ponteiro).
tabs.addEventListener('click', (e) => {
  const b = e.target.closest('[data-tab]');
  if (b && e.detail === 0) selectTab(b.dataset.tab);
});

// As telas "Hoje" e "Aprender" se atualizam sozinhas; as outras são redesenhadas quando os dados mudam.
store.subscribe(() => {
  paintSky();
  if (nav.tab !== 'today' && nav.tab !== 'learn') render();
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
