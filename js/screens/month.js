// Tela "Mês": a folha do calendário, como a impressa.
import * as store from '../store.js';
import { today, addMonths, monthLabel, monthGrid, WEEKDAYS_SHORT, fmtNumber } from '../dates.js';
import { esc, icons, handX, openSheet, closeSheet, toast } from '../ui.js';
import { pop, haptic } from '../fx.js';
import { coverSrc } from '../covers.js';
import { nav, go } from '../nav.js';

function cellHTML(c) {
  const d = store.day(c.key);
  const ts = store.trackers();
  const cross = ts.find((t) => t.kind === 'stamp' && t.cross && store.hasEntry(t, d[t.id]));

  const tags = [];
  for (const t of ts.filter((x) => x.kind === 'stamp' && store.hasEntry(x, d[x.id]))) {
    const chosen = (d[t.id].o || []).map((id) => t.options?.find((o) => o.id === id)).filter(Boolean);
    if (chosen.length) chosen.forEach((o) => tags.push(`<span class="tag-mini" style="--c:${esc(t.color)}">${esc(o.letter)}</span>`));
    else if (!t.cross) tags.push(`<span class="tag-mini" style="--c:${esc(t.color)}">✓</span>`);
  }
  const big = ts.find((t) => t.kind === 'text' && t.style === 'big' && store.hasEntry(t, d[t.id]));
  const note = ts.find((t) => t.kind === 'text' && t.style !== 'big' && store.hasEntry(t, d[t.id]));
  const num = ts.find((t) => t.kind === 'number' && store.hasEntry(t, d[t.id]));
  const learned = store.learnDay(c.key);
  const books = ts.filter((t) => t.kind === 'book' && store.hasEntry(t, d[t.id])).flatMap((t) => d[t.id]);

  const cls = ['cal-cell', c.inMonth ? '' : 'out', c.key === today() ? 'today' : ''].join(' ');
  return `<button class="${cls}" data-day="${c.key}" aria-label="Dia ${c.day}">
    <span class="n">${c.day}${cross ? handX(cross.color) : ''}</span>
    ${tags.length || learned ? `<span class="tags">${tags.slice(0, 4).join('')}${learned ? '<span class="fr-mini" title="Praticou francês">🇫🇷</span>' : ''}</span>` : ''}
    ${big ? `<span class="big" style="color:${esc(big.color)}">${esc(d[big.id])}</span>` : ''}
    ${books.length ? `<span class="book">${books.map((b) => (coverSrc(b.c)
      ? `<img class="cal-cover ${b.a}" src="${esc(coverSrc(b.c))}" alt="">`
      : (b.a === 'finish' ? '✅' : '📖'))).join('')}</span>` : ''}
    ${note ? `<span class="note" style="--c:${esc(note.color)}">${esc(d[note.id])}</span>` : ''}
    ${num ? `<span class="num" style="color:${esc(num.color)}">${esc(fmtNumber(d[num.id], 1))}</span>` : ''}
  </button>`;
}

function summaryHTML(month) {
  const keys = Object.keys(store.getData().days).filter((k) => k.startsWith(month)).sort();
  return store.trackers().map((t) => {
    const withVal = keys.filter((k) => store.hasEntry(t, store.entry(k, t.id)));
    if (!withVal.length) return '';
    let txt;
    if (t.kind === 'number') txt = `${fmtNumber(store.entry(withVal[withVal.length - 1], t.id), 1)} ${t.unit || ''}`;
    else if (t.kind === 'book') {
      const fin = withVal.flatMap((k) => store.entry(k, t.id)).filter((e) => e.a === 'finish').length;
      txt = fin ? `${fin} lido${fin > 1 ? 's' : ''}` : `${withVal.length}`;
    } else txt = `${withVal.length} ${withVal.length === 1 ? 'dia' : 'dias'}`;
    return `<span class="pill">${esc(t.icon)} ${esc(txt.trim())}</span>`;
  }).join('') + learnSummary(month);
}

function learnSummary(month) {
  const n = Object.keys(store.learn().days).filter((k) => k.startsWith(`${month}-`)).length;
  return n ? `<span class="pill">🇫🇷 ${n} ${n === 1 ? 'dia' : 'dias'}</span>` : '';
}

const markedDays = (month) => new Set([...Object.keys(store.getData().days), ...Object.keys(store.learn().days)]
  .filter((k) => k.startsWith(`${month}-`))).size;

function confirmClear(month, done) {
  const { name, year } = monthLabel(month);
  const n = markedDays(month);
  openSheet(`<div class="sheet-head"><div class="icon">🗑️</div>
      <div><h2>Limpar ${esc(name)}?</h2><div class="sub">${year}</div></div></div>
    <p class="field-label" style="font-size:15px;line-height:1.45;margin-bottom:18px">
      Isso apaga as marcações de <b>${n} ${n === 1 ? 'dia' : 'dias'}</b> de ${esc(name.toLowerCase())} (treino, peso, livros, francês, eventos…). Seus marcadores continuam. <b>Não dá para desfazer</b> — se quiser garantir, exporte um backup em Ajustes antes.</p>
    <button class="btn" data-act="yes" style="--c:#e0244a">APAGAR ${esc(name.toUpperCase())}</button>
    <button class="btn ghost" data-act="no">Cancelar</button>`, {
    color: '#e0244a',
    onMount(sheet) {
      sheet.addEventListener('click', (e) => {
        const a = e.target.closest('[data-act]')?.dataset.act;
        if (a === 'no') closeSheet();
        else if (a === 'yes') {
          store.clearMonth(month);
          haptic(true);
          pop(false);
          closeSheet();
          toast(`${name} limpo`);
          done();
        }
      });
    },
  });
}

export function renderMonth(el) {
  const m = monthLabel(nav.month);
  const weeks = monthGrid(nav.month);
  const summary = summaryHTML(nav.month);
  el.innerHTML = `<section class="screen">
    <div class="month-head">
      <div><div class="year">${m.year}</div><h1 class="h-display">${m.name}</h1></div>
      <div class="arrows">
        <button class="round-btn" data-act="prev" aria-label="Mês anterior">${icons.left}</button>
        <button class="round-btn" data-act="next" aria-label="Próximo mês">${icons.right}</button>
      </div>
    </div>
    <div class="summary">${summary || '<span class="pill">Nenhuma marca neste mês ainda</span>'}</div>
    <div class="cal">
      <div class="cal-week">${WEEKDAYS_SHORT.map((w) => `<div class="cal-dow">${w}</div>`).join('')}</div>
      ${weeks.map((w) => `<div class="cal-week">${w.map(cellHTML).join('')}</div>`).join('')}
    </div>
    <div class="month-foot">
      ${nav.month !== today().slice(0, 7) ? '<button class="pill" data-act="now">Ir para o mês atual</button>' : ''}
      ${markedDays(nav.month) ? '<button class="mini-link" data-act="clear">Limpar mês</button>' : ''}
    </div>
  </section>`;

  const screen = el.querySelector('.screen');
  screen.addEventListener('click', (e) => {
    const cell = e.target.closest('[data-day]');
    if (cell) {
      haptic();
      pop();
      go('today', { date: cell.dataset.day });
      return;
    }
    const act = e.target.closest('[data-act]')?.dataset.act;
    if (act === 'prev' || act === 'next') {
      nav.month = addMonths(nav.month, act === 'next' ? 1 : -1);
      haptic();
      pop(act === 'next');
      renderMonth(el);
    } else if (act === 'clear') {
      haptic();
      confirmClear(nav.month, () => renderMonth(el));
    } else if (act === 'now') {
      nav.month = today().slice(0, 7);
      renderMonth(el);
    }
  });

  let sx = null;
  let sy = null;
  const cal = el.querySelector('.cal');
  cal.addEventListener('touchstart', (e) => { sx = e.touches[0].clientX; sy = e.touches[0].clientY; }, { passive: true });
  cal.addEventListener('touchend', (e) => {
    if (sx === null) return;
    const dx = e.changedTouches[0].clientX - sx;
    const dy = e.changedTouches[0].clientY - sy;
    sx = null;
    if (Math.abs(dx) > 60 && Math.abs(dx) > Math.abs(dy) * 1.4) {
      nav.month = addMonths(nav.month, dx < 0 ? 1 : -1);
      haptic();
      renderMonth(el);
    }
  });
}
