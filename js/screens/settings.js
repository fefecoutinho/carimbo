// Tela "Ajustes": meus marcadores, som/vibração e backup.
import * as store from '../store.js';
import { esc, icons, toast } from '../ui.js';
import { openEditor } from '../sheets.js';
import { pop, haptic } from '../fx.js';
import { nav } from '../nav.js';
import { THEMES } from '../themes.js';

export const VERSION = '1.5.0';

const isStandalone = () => window.matchMedia('(display-mode: standalone)').matches || navigator.standalone === true;

function kindLine(t) {
  if (t.kind === 'stamp') {
    const letters = (t.options || []).map((o) => o.letter).join(' · ');
    return `Carimbo${letters ? ` — ${letters}` : ''}`;
  }
  if (t.kind === 'number') return `Número${t.unit ? ` (${t.unit})` : ''}`;
  if (t.kind === 'text') return t.style === 'big' ? 'Texto grande' : 'Anotação';
  return 'Livro';
}

async function exportBackup() {
  const json = store.exportJSON();
  const name = `carimbo-backup-${new Date().toISOString().slice(0, 10)}.json`;
  const file = new File([json], name, { type: 'application/json' });
  try {
    if (navigator.canShare?.({ files: [file] })) {
      await navigator.share({ files: [file], title: 'Backup do Carimbo' });
      return;
    }
  } catch (e) {
    if (e.name === 'AbortError') return;
  }
  const a = document.createElement('a');
  a.href = URL.createObjectURL(file);
  a.download = name;
  a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 2000);
}

export function renderSettings(el) {
  const ts = store.trackers();
  const p = store.prefs();
  el.innerHTML = `<section class="screen">
    <div class="topbar"><div class="eyebrow">Do seu jeito</div></div>
    <h1 class="h-display" style="font-size:clamp(34px,11vw,48px);margin:4px 0 4px">Ajustes</h1>

    <div class="group-title">Meus marcadores</div>
    <div class="panel">
      ${ts.map((t, i) => `<div class="trow">
        <button class="icon" style="--c:${esc(t.color)}" data-edit="${esc(t.id)}" aria-label="Editar ${esc(t.name)}">${esc(t.icon)}</button>
        <button class="grow" style="text-align:left" data-edit="${esc(t.id)}">
          <div class="t-name">${esc(t.name)}</div><div class="t-kind">${esc(kindLine(t))}</div></button>
        <button class="mini" data-move="${esc(t.id)}" data-dir="-1" ${i === 0 ? 'disabled' : ''} aria-label="Subir">${icons.up}</button>
        <button class="mini" data-move="${esc(t.id)}" data-dir="1" ${i === ts.length - 1 ? 'disabled' : ''} aria-label="Descer">${icons.down}</button>
      </div>`).join('')}
      <div class="trow"><button class="pill solid" data-act="new" style="width:100%;justify-content:center">+ Novo marcador</button></div>
    </div>

    <div class="group-title">Tema</div>
    <div class="themes">${THEMES.map((th) => `<button class="theme ${p.theme === th.id ? 'on' : ''}" data-theme-pick="${th.id}">
      <span class="tprev ${th.id}"><span class="tstamp ${th.id}"></span></span>
      <span class="t-name">${th.name}</span><span class="t-kind">${th.desc}</span>
    </button>`).join('')}</div>

    <div class="group-title">Sensações</div>
    <div class="panel">
      <div class="trow"><div class="grow"><div class="t-name">🔊 Som ao carimbar</div><div class="t-kind">Respeita o modo silencioso do iPhone</div></div>
        <button class="toggle ${p.sound ? 'on' : ''}" data-pref="sound" aria-label="Som"></button></div>
      <div class="trow"><div class="grow"><div class="t-name">📳 Vibração</div><div class="t-kind">Toque leve ao marcar</div></div>
        <button class="toggle ${p.haptics ? 'on' : ''}" data-pref="haptics" aria-label="Vibração"></button></div>
      <div class="trow"><div class="grow"><div class="t-name">📱 Folha mexe com o celular</div><div class="t-kind">A folha da tela Hoje inclina junto com o iPhone</div></div>
        <button class="toggle ${p.motion ? 'on' : ''}" data-pref="motion" aria-label="Folha mexe com o celular"></button></div>
    </div>

    <div class="group-title">Backup</div>
    <div class="panel">
      <p class="t-kind" style="margin:0 0 12px;font-weight:700;opacity:.85">Seus dados ficam só neste iPhone. Faça um backup de vez em quando (dá pra salvar no app Arquivos ou no iCloud Drive).</p>
      <button class="pill solid" data-act="export" style="width:100%;justify-content:center;margin-bottom:10px">⬇️ Exportar backup</button>
      <button class="pill" data-act="import" style="width:100%;justify-content:center">⬆️ Restaurar de um backup</button>
      <input type="file" accept="application/json,.json" hidden>
    </div>

    ${isStandalone() ? '' : `<div class="group-title">Instalar no iPhone</div>
    <div class="panel"><p class="t-kind" style="margin:0;font-weight:700;opacity:.9;line-height:1.5">
      No Safari, toque em <b>Compartilhar</b> (o quadrado com a setinha) → <b>Adicionar à Tela de Início</b>. O Carimbo vira um app com ícone e funciona até sem internet.</p></div>`}

    <p class="footer-note">Carimbo v${VERSION} · feito sob medida pra você</p>
  </section>`;

  const screen = el.querySelector('.screen');
  const fileInput = screen.querySelector('input[type=file]');

  screen.addEventListener('click', (e) => {
    const b = e.target.closest('button');
    if (!b) return;
    const d = b.dataset;
    if (d.themePick) {
      if (store.prefs().theme === d.themePick) return;
      store.setPref('theme', d.themePick);
      pop(true);
      haptic(true);
      toast(`Tema ${THEMES.find((t) => t.id === d.themePick).name} ✨`);
    } else if (d.edit) { pop(); haptic(); openEditor(store.tracker(d.edit)); }
    else if (d.move) { store.moveTracker(d.move, Number(d.dir)); pop(); haptic(); }
    else if (d.pref) { store.setPref(d.pref, !store.prefs()[d.pref]); pop(store.prefs()[d.pref]); haptic(); }
    else if (d.act === 'new') { pop(); haptic(); openEditor(null); }
    else if (d.act === 'export') exportBackup();
    else if (d.act === 'import') fileInput.click();
  });

  fileInput.addEventListener('change', async () => {
    const f = fileInput.files[0];
    fileInput.value = '';
    if (!f) return;
    if (!confirm('Restaurar esse backup? Tudo que está no app agora será substituído.')) return;
    try {
      store.importJSON(await f.text());
      toast('Backup restaurado ✨');
    } catch (err) {
      toast(err.message || 'Não deu pra ler esse arquivo');
    }
  });

  if (nav.openNew) {
    nav.openNew = false;
    openEditor(null);
  }
}
