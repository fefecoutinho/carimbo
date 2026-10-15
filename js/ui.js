// Utilidades de interface: escape de texto, ícones, toast e bottom sheets.

export const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

export const icons = {
  today: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M4 10.5 12 4l8 6.5V20H4z"/><path d="M9.5 20v-5h5v5"/></svg>',
  month: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><rect x="3.5" y="5" width="17" height="15" rx="3"/><path d="M3.5 10h17M8 3v4M16 3v4"/><path d="m8.5 13.5 3 3M11.5 13.5l-3 3"/></svg>',
  progress: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M4 19 9.5 12l4 3.5L20 6"/><path d="M15 6h5v5"/></svg>',
  learn: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M2.5 9.5 12 5l9.5 4.5L12 14z"/><path d="M6.5 11.6V16c0 1.4 2.5 3 5.5 3s5.5-1.6 5.5-3v-4.4"/><path d="M21.5 9.5v5"/></svg>',
  settings: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M4 7h10M18 7h2M4 17h2M10 17h10"/><circle cx="16" cy="7" r="2.2"/><circle cx="8" cy="17" r="2.2"/></svg>',
  left: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><path d="m14.5 5-7 7 7 7"/></svg>',
  right: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><path d="m9.5 5 7 7-7 7"/></svg>',
  up: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><path d="m5 15 7-7 7 7"/></svg>',
  down: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><path d="m5 9 7 7 7-7"/></svg>',
};

// X desenhado à mão por cima do número do dia (como na folha).
export const handX = (color) => `<svg viewBox="0 0 20 20" preserveAspectRatio="none"><path d="M2 3 Q10 9 18 17 M17 2 Q9 10 3 18" stroke="${esc(color)}" stroke-width="2.6" stroke-linecap="round" fill="none"/></svg>`;

let toastTimer;
export function toast(msg) {
  const el = document.getElementById('toast');
  el.textContent = msg;
  el.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => el.classList.remove('show'), 2200);
}

// ---------- Bottom sheet ----------
let current = null;

export function openSheet(html, { color = '#2b2640', onMount, onClose } = {}) {
  closeSheet(true);
  const root = document.getElementById('sheet-root');
  const backdrop = document.createElement('div');
  backdrop.className = 'backdrop';
  const sheet = document.createElement('div');
  sheet.className = 'sheet';
  sheet.setAttribute('role', 'dialog');
  sheet.setAttribute('aria-modal', 'true');
  sheet.style.setProperty('--c', color);
  sheet.innerHTML = `<div class="grab"></div>${html}`;
  root.append(backdrop, sheet);
  current = { backdrop, sheet, onClose };
  backdrop.addEventListener('click', () => closeSheet());
  enableSwipeDown(sheet);
  onMount?.(sheet);
  return sheet;
}

export function closeSheet(immediate = false) {
  if (!current) return;
  const { backdrop, sheet, onClose } = current;
  current = null;
  document.activeElement?.blur?.();
  if (immediate) {
    backdrop.remove();
    sheet.remove();
  } else {
    backdrop.classList.add('out');
    sheet.classList.add('out');
    setTimeout(() => { backdrop.remove(); sheet.remove(); }, 240);
  }
  onClose?.();
}

function enableSwipeDown(sheet) {
  let startY = null;
  let dy = 0;
  sheet.addEventListener('touchstart', (e) => {
    if (sheet.scrollTop > 0 || e.target.closest('input, textarea')) return;
    startY = e.touches[0].clientY;
    dy = 0;
  }, { passive: true });
  sheet.addEventListener('touchmove', (e) => {
    if (startY === null) return;
    dy = Math.max(0, e.touches[0].clientY - startY);
    sheet.style.transform = `translateY(${dy}px)`;
    sheet.style.transition = 'none';
  }, { passive: true });
  sheet.addEventListener('touchend', () => {
    if (startY === null) return;
    startY = null;
    sheet.style.transition = 'transform 0.25s ease';
    if (dy > 110) closeSheet();
    else sheet.style.transform = '';
  });
}

export const isSheetOpen = () => !!current;
