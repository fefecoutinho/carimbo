// Tela "Hoje": a folha do dia em 3D e os botões para carimbar.
import * as store from '../store.js';
import { today, addDays, parse, WEEKDAYS, MONTHS, fmtNumber } from '../dates.js';
import { esc, icons } from '../ui.js';
import { openLog } from '../sheets.js';
import { thump, haptic, inkBurst, pop, swoosh, whoomp } from '../fx.js';
import { createStampScene, createFlatPaper } from '../scene.js';
import { nav, go } from '../nav.js';
import { themeById } from '../themes.js';

let canvas = null;
let scene = null;
let root = null;

function ensureScene() {
  if (scene) return;
  canvas = document.createElement('canvas');
  canvas.setAttribute('aria-label', 'Folha do dia');
  scene = createStampScene(canvas);
  if (!scene) {
    canvas = document.createElement('canvas');
    canvas.className = 'flat';
    scene = createFlatPaper(canvas);
  }
  wireCanvas();
  if (location.hostname === 'localhost') window.__scene = scene; // só para testes no computador
  // Fora do iPhone não precisa pedir permissão para o sensor de movimento.
  if (typeof window.DeviceOrientationEvent?.requestPermission !== 'function') startMotion();
}

// ---------- Folha que mexe com o celular ----------
let motionAsked = false;
let motionOn = false;
let baseTilt = null;

// No iPhone, o sensor só libera depois de um toque (o sistema pergunta uma vez).
function askMotion() {
  if (motionAsked || motionOn || !store.prefs().motion) return;
  const DOE = window.DeviceOrientationEvent;
  if (typeof DOE?.requestPermission !== 'function') return;
  motionAsked = true;
  DOE.requestPermission().then((s) => { if (s === 'granted') startMotion(); }).catch(() => {});
}

function startMotion() {
  if (motionOn || !window.DeviceOrientationEvent) return;
  motionOn = true;
  window.addEventListener('deviceorientation', (e) => {
    if (e.beta == null || !scene) return;
    if (!store.prefs().motion) { scene.setTilt(0, 0); return; }
    // A posição "neutra" acompanha devagar o jeito que você está segurando o celular.
    if (!baseTilt) baseTilt = { b: e.beta, g: e.gamma };
    baseTilt.b += (e.beta - baseTilt.b) * 0.008;
    baseTilt.g += (e.gamma - baseTilt.g) * 0.008;
    scene.setTilt((e.gamma - baseTilt.g) / 30, (e.beta - baseTilt.b) / 30);
  });
}

// ---------- Toque na folha (zoom) e no carimbo (girar) ----------
let gesture = null;
let lastSpinAt = 0;
let zoomed = false;
let zoomBusy = false;
let overlay = null;

function wireCanvas() {
  // Dedo no carimbo: não deixa a página rolar enquanto gira.
  canvas.addEventListener('touchstart', (e) => {
    const t = e.touches[0];
    if (!zoomed && e.touches.length === 1 && scene.pick(t.clientX, t.clientY) === 'stamp') e.preventDefault();
  }, { passive: false });

  canvas.addEventListener('pointerdown', (e) => {
    const hit = zoomed ? 'paper' : scene.pick(e.clientX, e.clientY);
    gesture = { hit, x0: e.clientX, y0: e.clientY, moved: false };
    if (hit === 'stamp' && !scene.isBusy()) {
      scene.spinStart(e.clientX, e.clientY);
      canvas.setPointerCapture?.(e.pointerId);
      haptic();
    }
  });
  canvas.addEventListener('pointermove', (e) => {
    if (!gesture) return;
    if (Math.hypot(e.clientX - gesture.x0, e.clientY - gesture.y0) > 10) gesture.moved = true;
    if (gesture.hit === 'stamp') scene.spinMove(e.clientX, e.clientY);
  });
  const end = (e) => {
    if (!gesture) return;
    const g = gesture;
    gesture = null;
    if (e.type === 'pointerup') askMotion();
    if (g.hit === 'stamp') {
      lastSpinAt = performance.now();
      if (scene.spinEnd() > 8) pop();
      return;
    }
    if (e.type === 'pointerup' && !g.moved && g.hit === 'paper') toggleZoom();
  };
  canvas.addEventListener('pointerup', end);
  canvas.addEventListener('pointercancel', end);
}

function toggleZoom() {
  if (zoomBusy || scene.isBusy()) return;
  zoomBusy = true;
  if (zoomed) closeZoom();
  else openZoom();
}

function openZoom() {
  const r = canvas.getBoundingClientRect();
  overlay = document.createElement('div');
  overlay.className = 'paper-zoom';
  document.body.append(overlay);
  Object.assign(canvas.style, {
    position: 'fixed', inset: 'auto', left: `${r.left}px`, top: `${r.top}px`,
    width: `${r.width}px`, height: `${r.height}px`, zIndex: '46',
  });
  document.body.append(canvas);
  canvas.getBoundingClientRect();
  canvas.classList.add('zooming');
  requestAnimationFrame(() => {
    Object.assign(canvas.style, { left: '0px', top: '0px', width: '100vw', height: '100dvh' });
    overlay.classList.add('show');
  });
  zoomed = true;
  whoomp(true);
  haptic(true);
  scene.setZoom(true).then(() => { zoomBusy = false; });
}

function closeZoom() {
  const hero = root?.querySelector('.hero');
  const r = hero?.getBoundingClientRect();
  if (r) Object.assign(canvas.style, { left: `${r.left}px`, top: `${r.top}px`, width: `${r.width}px`, height: `${r.height}px` });
  overlay?.classList.remove('show');
  whoomp(false);
  haptic();
  scene.setZoom(false).then(() => {
    canvas.classList.remove('zooming');
    canvas.removeAttribute('style');
    if (hero?.isConnected) hero.prepend(canvas);
    overlay?.remove();
    overlay = null;
    zoomed = false;
    zoomBusy = false;
  });
}

export function leaveToday() {
  scene?.setActive(false);
}

function streak() {
  let k = today();
  if (!store.doneCount(k)) k = addDays(k, -1);
  let n = 0;
  while (store.doneCount(k) > 0) { n++; k = addDays(k, -1); }
  return n;
}

function quip(key) {
  const done = store.doneCount(key);
  const total = store.trackers().length;
  const isToday = key === today();
  if (key > today()) return done ? 'Anotado no futuro. Organizado, hein.' : 'Esse dia ainda não chegou. Dá pra deixar um evento marcado.';
  if (!done) return isToday ? 'Folha em branco. Bora sujar ela de tinta?' : 'Esqueceu de marcar? Ainda dá tempo.';
  if (done >= total) return 'Folha completa. Lendário. 🏆';
  if (done >= 3) return 'Isso sim é um dia bem carimbado.';
  return isToday ? 'Já tem tinta nessa folha. Continua!' : 'Tem tinta nesse dia.';
}

function cardValue(t, v) {
  if (!store.hasEntry(t, v)) {
    const hint = {
      stamp: 'Toque para carimbar',
      number: (() => { const l = store.lastNumberBefore(t.id, nav.date); return l != null ? `Último: ${fmtNumber(l, 2)} ${t.unit || ''}` : 'Toque para anotar'; })(),
      text: t.style === 'big' ? 'Qual é o de hoje?' : 'Algo pra lembrar?',
      book: 'Comecei ou terminei?',
    }[t.kind];
    return `<div class="val hint">${esc(hint)}</div>`;
  }
  if (t.kind === 'stamp') {
    const labels = (v.o || []).map((id) => t.options?.find((o) => o.id === id)?.label).filter(Boolean);
    return `<div class="val">${esc(labels.length ? labels.join(' + ') : 'Feito!')}</div>`;
  }
  if (t.kind === 'number') return `<div class="val">${esc(fmtNumber(v, 2))} <small style="font-size:12px">${esc(t.unit || '')}</small></div>`;
  if (t.kind === 'text') return `<div class="val ${t.style === 'big' ? 'big' : ''}">${esc(v)}</div>`;
  if (t.kind === 'book') {
    const ev = v[v.length - 1];
    return `<div class="val">${ev.a === 'finish' ? 'Terminei' : 'Comecei'} ${esc(ev.t)}${v.length > 1 ? ` +${v.length - 1}` : ''}</div>`;
  }
  return '';
}

function cardsHTML(justId) {
  const d = store.day(nav.date);
  return store.trackers().map((t) => {
    const v = d[t.id];
    const done = store.hasEntry(t, v);
    return `<button class="card ${done ? 'done' : ''} ${justId === t.id ? 'just' : ''}" style="--c:${esc(t.color)}" data-t="${esc(t.id)}">
      <div class="icon">${esc(t.icon)}</div>
      ${done ? '<div class="seal">✓</div>' : ''}
      <div><div class="name">${esc(t.name)}</div>${cardValue(t, v)}</div>
    </button>`;
  }).join('') + learnCardHTML() + '<button class="card add" data-act="new">+ Novo marcador</button>';
}

function learnCardHTML() {
  const l = store.learnDay(nav.date);
  return `<button class="card ${l ? 'done' : ''}" style="--c:#2f5bff" data-act="learn">
    <div class="icon">🇫🇷</div>
    ${l ? '<div class="seal">✓</div>' : ''}
    <div><div class="name">Francês</div>${l
      ? `<div class="val">${l.ok} de ${l.n} certas</div>`
      : `<div class="val hint">${nav.date === today() ? 'Bora praticar?' : 'Não praticou nesse dia'}</div>`}</div>
  </button>`;
}

function heroDateHTML() {
  const d = parse(nav.date);
  return `<div class="eyebrow">${WEEKDAYS[d.getDay()]} · ${MONTHS[d.getMonth()]}</div>
    <div class="bignum">${d.getDate()}</div>`;
}

function update(justId) {
  if (!root) return;
  root.querySelector('.hero-date').innerHTML = heroDateHTML();
  root.querySelector('.quip').textContent = quip(nav.date);
  root.querySelector('.grid').innerHTML = cardsHTML(justId);
  const isToday = nav.date === today();
  root.querySelector('[data-act=today]').style.visibility = isToday ? 'hidden' : 'visible';
  const s = streak();
  const sp = document.getElementById('streak');
  sp.textContent = s ? `🔥 ${s} ${s === 1 ? 'dia' : 'dias'}` : '';
  sp.style.display = s ? '' : 'none';
}

function changeDay(delta) {
  if (scene.isBusy()) return;
  nav.date = addDays(nav.date, delta);
  scene.setDay(nav.date, delta);
  pop(delta > 0);
  haptic();
  update();
}

function heroInView() {
  const r = root.querySelector('.hero').getBoundingClientRect();
  return r.bottom > r.height * 0.6 && r.top > -r.height * 0.3;
}

function afterLog(trackerId, stamped) {
  const key = nav.date;
  const t = store.tracker(trackerId);
  if (!stamped || !t) { scene.redraw(); update(); return; }
  const go2 = () => scene.stamp(key, trackerId, t.color, (pt) => {
    thump();
    haptic(true);
    if (pt) inkBurst(pt.x, pt.y, t.color, 18);
    update(trackerId);
  });
  if (heroInView()) go2();
  else { window.scrollTo({ top: 0, behavior: 'smooth' }); setTimeout(go2, 380); }
}

export function renderToday(el) {
  ensureScene();
  root = el;
  el.innerHTML = `<section class="screen">
    <div class="hero">
      <div class="hero-date"></div>
      <div class="hero-nav">
        <button class="round-btn" data-act="prev" aria-label="Dia anterior">${icons.left}</button>
        <button class="pill solid" data-act="today">Voltar pra hoje</button>
        <button class="round-btn" data-act="next" aria-label="Próximo dia">${icons.right}</button>
      </div>
    </div>
    <p class="quip"></p>
    <div class="grid"></div>
  </section>`;
  const hero = el.querySelector('.hero');
  hero.prepend(canvas);
  scene.setActive(true);
  scene.setLook(themeById(store.prefs().theme).stamp);
  scene.setDay(nav.date);
  update();

  el.querySelector('.screen').addEventListener('click', (e) => {
    askMotion();
    const card = e.target.closest('[data-t]');
    if (card) {
      haptic();
      pop();
      openLog(nav.date, store.tracker(card.dataset.t), afterLog);
      return;
    }
    const act = e.target.closest('[data-act]')?.dataset.act;
    if (act === 'prev') changeDay(-1);
    else if (act === 'next') changeDay(1);
    else if (act === 'today') {
      const dir = nav.date < today() ? 1 : -1;
      nav.date = today();
      scene.setDay(nav.date, dir);
      swoosh();
      haptic();
      update();
    } else if (act === 'new') go('settings', { openNew: true });
    else if (act === 'learn') { haptic(); pop(); go('learn'); }
  });

  // Arrastar para os lados na folha troca o dia.
  let sx = null;
  let sy = null;
  hero.addEventListener('touchstart', (e) => { sx = e.touches[0].clientX; sy = e.touches[0].clientY; }, { passive: true });
  hero.addEventListener('touchend', (e) => {
    if (sx === null) return;
    if (zoomed || performance.now() - lastSpinAt < 400) { sx = null; return; }
    const dx = e.changedTouches[0].clientX - sx;
    const dy = e.changedTouches[0].clientY - sy;
    sx = null;
    if (Math.abs(dx) > 50 && Math.abs(dx) > Math.abs(dy) * 1.4) changeDay(dx < 0 ? 1 : -1);
  });
}
