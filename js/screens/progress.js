// Tela "Progresso": gráfico do peso, contagem de treinos, livros e kanji.
import * as store from '../store.js';
import { today, addDays, parse, monthOf, shortDate, fmtNumber, MONTHS } from '../dates.js';
import { esc } from '../ui.js';
import { pop, haptic } from '../fx.js';
import { TENSES } from '../learn/conj.js';
import { deckStats } from '../learn/vocab.js';

const RANGES = [
  { id: '30', label: '30 dias', days: 30 },
  { id: '90', label: '3 meses', days: 90 },
  { id: '365', label: '1 ano', days: 365 },
  { id: 'all', label: 'Tudo', days: null },
];
const rangeOf = {};

const dayDiff = (a, b) => Math.round((parse(b) - parse(a)) / 86400000);

function numberPanel(t) {
  const all = Object.keys(store.getData().days).sort()
    .filter((k) => typeof store.entry(k, t.id) === 'number')
    .map((k) => ({ k, v: store.entry(k, t.id) }));
  if (!all.length) return emptyPanel(t, `Anote ${t.name.toLowerCase()} e o gráfico aparece aqui.`);

  const r = RANGES.find((x) => x.id === (rangeOf[t.id] || '30'));
  const end = today() > all[all.length - 1].k ? today() : all[all.length - 1].k;
  const start = r.days ? addDays(end, -(r.days - 1)) : all[0].k;
  const pts = all.filter((p) => p.k >= start && p.k <= end);
  const last = all[all.length - 1];
  const first = pts[0];
  const delta = pts.length > 1 ? last.v - first.v : 0;
  const vals = pts.map((p) => p.v);
  const min = Math.min(...vals);
  const max = Math.max(...vals);

  return `<div class="panel" style="--c:${esc(t.color)}">
    <div class="panel-head"><span class="icon">${esc(t.icon)}</span><h3>${esc(t.name)}</h3></div>
    <div class="stat-row">
      <div class="stat"><div class="v">${fmtNumber(last.v, 2)}<small>${esc(t.unit || '')}</small></div><div class="k">último · ${shortDate(last.k)}</div></div>
      ${pts.length > 1 ? `<div class="stat"><div class="v ${delta > 0 ? 'delta-up' : delta < 0 ? 'delta-down' : ''}">${delta > 0 ? '+' : ''}${fmtNumber(delta, 2)}</div><div class="k">no período</div></div>` : ''}
      ${pts.length > 1 ? `<div class="stat"><div class="v" style="font-size:20px;padding-top:12px">${fmtNumber(min, 1)}–${fmtNumber(max, 1)}</div><div class="k">mín–máx</div></div>` : ''}
    </div>
    ${pts.length ? chartSVG(pts, start, end, t) : '<p class="empty">Sem registros nesse período.</p>'}
    <div class="seg light" style="margin-top:12px">${RANGES.map((x) => `<button class="${x.id === r.id ? 'on' : ''}" data-range="${x.id}" data-t="${esc(t.id)}">${x.label}</button>`).join('')}</div>
  </div>`;
}

function chartSVG(pts, start, end, t) {
  const W = 340;
  const H = 170;
  const padL = 6;
  const padR = 44;
  const padT = 14;
  const padB = 24;
  const span = Math.max(1, dayDiff(start, end));
  const vals = pts.map((p) => p.v);
  let lo = Math.min(...vals);
  let hi = Math.max(...vals);
  if (hi - lo < 1) { const m = (hi + lo) / 2; lo = m - 0.5; hi = m + 0.5; }
  const pad = (hi - lo) * 0.12;
  lo -= pad;
  hi += pad;
  const x = (k) => padL + (dayDiff(start, k) / span) * (W - padL - padR);
  const y = (v) => padT + (1 - (v - lo) / (hi - lo)) * (H - padT - padB);
  const xy = pts.map((p) => [x(p.k), y(p.v)]);

  let line = `M${xy[0][0].toFixed(1)},${xy[0][1].toFixed(1)}`;
  for (let i = 1; i < xy.length; i++) {
    const [x0, y0] = xy[i - 1];
    const [x1, y1] = xy[i];
    const cx = (x0 + x1) / 2;
    line += ` C${cx.toFixed(1)},${y0.toFixed(1)} ${cx.toFixed(1)},${y1.toFixed(1)} ${x1.toFixed(1)},${y1.toFixed(1)}`;
  }
  const area = `${line} L${xy[xy.length - 1][0].toFixed(1)},${H - padB} L${xy[0][0].toFixed(1)},${H - padB} Z`;
  const gid = `g${t.id.replace(/\W/g, '')}`;
  const lastP = xy[xy.length - 1];
  const grid = [hi - pad, (hi + lo) / 2, lo + pad];

  return `<svg class="chart" viewBox="0 0 ${W} ${H}" role="img" aria-label="Gráfico de ${esc(t.name)}">
    <defs><linearGradient id="${gid}" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#fff" stop-opacity=".35"/><stop offset="1" stop-color="#fff" stop-opacity="0"/></linearGradient></defs>
    ${grid.map((g) => `<line x1="${padL}" x2="${W - padR}" y1="${y(g).toFixed(1)}" y2="${y(g).toFixed(1)}" stroke="rgba(255,255,255,.14)" stroke-dasharray="3 5"/>
      <text x="${W - padR + 8}" y="${(y(g) + 4).toFixed(1)}">${fmtNumber(g, 1)}</text>`).join('')}
    <path d="${area}" fill="url(#${gid})"/>
    <path d="${line}" fill="none" stroke="#fff" stroke-width="3.5" stroke-linecap="round" stroke-linejoin="round"/>
    ${xy.length <= 45 ? xy.map(([px, py]) => `<circle cx="${px.toFixed(1)}" cy="${py.toFixed(1)}" r="3" fill="#fff"/>`).join('') : ''}
    <circle cx="${lastP[0].toFixed(1)}" cy="${lastP[1].toFixed(1)}" r="7" fill="${esc(t.color)}" stroke="#fff" stroke-width="3"/>
    <text x="${padL}" y="${H - 4}">${shortDate(start)}</text>
    <text x="${W - padR}" y="${H - 4}" text-anchor="end">${shortDate(end)}</text>
  </svg>`;
}

function stampPanel(t) {
  const days = Object.keys(store.getData().days).filter((k) => store.hasEntry(t, store.entry(k, t.id)));
  if (!days.length) return emptyPanel(t, 'Carimbe o primeiro dia e as contas aparecem aqui.');
  const month = monthOf(today());
  const inMonth = days.filter((k) => k.startsWith(month));
  const weekStart = addDays(today(), -parse(today()).getDay());
  const inWeek = days.filter((k) => k >= weekStart && k <= today());
  const inYear = days.filter((k) => k.startsWith(today().slice(0, 4)));

  const counts = (t.options || []).map((o) => ({ o, n: inMonth.filter((k) => (store.entry(k, t.id).o || []).includes(o.id)).length }));
  const maxN = Math.max(1, ...counts.map((c) => c.n));

  // Últimas 18 semanas, de domingo a sábado.
  const set = new Set(days);
  const weeks = 18;
  const startHeat = addDays(weekStart, -7 * (weeks - 1));
  let heat = '';
  for (let i = 0; i < weeks * 7; i++) {
    const k = addDays(startHeat, i);
    heat += `<i class="${k > today() ? 'future' : set.has(k) ? 'on' : ''}"></i>`;
  }

  return `<div class="panel" style="--c:${esc(t.color)}">
    <div class="panel-head"><span class="icon">${esc(t.icon)}</span><h3>${esc(t.name)}</h3></div>
    <div class="stat-row">
      <div class="stat"><div class="v">${inMonth.length}</div><div class="k">em ${MONTHS[parse(today()).getMonth()].toLowerCase()}</div></div>
      <div class="stat"><div class="v">${inWeek.length}</div><div class="k">nesta semana</div></div>
      <div class="stat"><div class="v">${inYear.length}</div><div class="k">em ${today().slice(0, 4)}</div></div>
    </div>
    ${counts.length && inMonth.length ? `<div class="bars">${counts.map(({ o, n }) => `<div class="bar">
      <span class="tag-mini" style="--c:${esc(t.color)}">${esc(o.letter)}</span>
      <div class="track"><div class="fill" style="width:${(n / maxN) * 100}%"></div></div>
      <span>${n}×</span></div>`).join('')}</div>` : ''}
    <div class="heat" aria-label="Últimas ${weeks} semanas">${heat}</div>
  </div>`;
}

function textPanel(t) {
  const entries = Object.keys(store.getData().days).sort().reverse()
    .map((k) => ({ k, v: store.entry(k, t.id) }))
    .filter((e) => store.hasEntry(t, e.v));
  if (!entries.length) return emptyPanel(t, t.style === 'big' ? 'Anote o primeiro e ele aparece aqui.' : 'Suas anotações aparecem aqui.');
  if (t.style === 'big') {
    return `<div class="panel" style="--c:${esc(t.color)}">
      <div class="panel-head"><span class="icon">${esc(t.icon)}</span><h3>${esc(t.name)}</h3></div>
      <div class="stat-row"><div class="stat"><div class="v">${entries.length}</div><div class="k">no total</div></div></div>
      <div class="glyphs">${entries.slice(0, 60).map((e) => `<span title="${esc(shortDate(e.k))}">${esc(e.v)}</span>`).join('')}</div>
    </div>`;
  }
  return `<div class="panel" style="--c:${esc(t.color)}">
    <div class="panel-head"><span class="icon">${esc(t.icon)}</span><h3>${esc(t.name)}</h3></div>
    ${entries.slice(0, 8).map((e) => `<div class="note-row"><span class="d">${esc(shortDate(e.k))}</span><span>${esc(e.v)}</span></div>`).join('')}
  </div>`;
}

function bookPanel(t) {
  const list = store.books();
  if (!list.length) return emptyPanel(t, 'Quando começar ou terminar um livro, ele aparece aqui.');
  const year = today().slice(0, 4);
  const finishedYear = list.filter((b) => b.finish?.startsWith(year)).length;
  const sorted = list.sort((a, b) => ((b.finish || b.start || '') > (a.finish || a.start || '') ? 1 : -1));
  return `<div class="panel" style="--c:${esc(t.color)}">
    <div class="panel-head"><span class="icon">${esc(t.icon)}</span><h3>${esc(t.name)}</h3></div>
    <div class="stat-row">
      <div class="stat"><div class="v">${finishedYear}</div><div class="k">lidos em ${year}</div></div>
      <div class="stat"><div class="v">${store.readingNow().length}</div><div class="k">lendo agora</div></div>
    </div>
    ${sorted.slice(0, 12).map((b) => `<div class="book-row">
      <div><div class="b-title">${esc(b.title)}</div>
      <div class="b-dates">${b.start ? `de ${shortDate(b.start)}` : ''}${b.finish ? ` até ${shortDate(b.finish)}` : ''}</div></div>
      <span class="b-badge ${b.finish ? 'done' : ''}">${b.finish ? 'Lido ✓' : 'Lendo'}</span></div>`).join('')}
  </div>`;
}

function emptyPanel(t, msg) {
  return `<div class="panel" style="--c:${esc(t.color)}">
    <div class="panel-head"><span class="icon">${esc(t.icon)}</span><h3>${esc(t.name)}</h3></div>
    <p class="empty">${esc(msg)}</p></div>`;
}

function vocabBlock() {
  const V = store.vocab();
  const ds = deckStats(V, Date.now());
  if (!ds.seen) return '';
  const since = addDays(today(), -29);
  let rev = 0;
  let revOk = 0;
  for (const [k, d] of Object.entries(V.daily)) if (k >= since) { rev += d.rev || 0; revOk += d.revOk || 0; }
  return `<div class="field-label" style="color:rgba(255,255,255,.75);margin:18px 0 8px">Vocabulário</div>
    <div class="stat-row">
      <div class="stat"><div class="v">${ds.seen}</div><div class="k">cartas em estudo</div></div>
      <div class="stat"><div class="v">${ds.mature}</div><div class="k">bem fixadas</div></div>
      <div class="stat"><div class="v">${rev ? Math.round((revOk / rev) * 100) : '–'}${rev ? '<small>%</small>' : ''}</div><div class="k">lembrou nas revisões (30d)</div></div>
    </div>
    <div class="bar learn-bar" style="--c:#19c39a"><span>Baralho</span>
      <div class="track"><div class="fill" style="width:${(ds.seen / ds.total) * 100}%"></div></div><span>${Math.round((ds.seen / ds.total) * 100)}%</span></div>`;
}

function learnPanel() {
  const L = store.learn();
  const days = Object.keys(L.days);
  const head = `<div class="panel-head"><span class="icon">🇫🇷</span><h3>Francês</h3></div>`;
  if (!days.length) return `<div class="panel">${head}<p class="empty">Jogue uma rodada na aba Aprender e seu progresso aparece aqui.</p></div>`;
  const total = days.reduce((a, k) => a + L.days[k].n, 0);
  const ok = days.reduce((a, k) => a + L.days[k].ok, 0);
  const month = monthOf(today());
  const inMonth = days.filter((k) => k.startsWith(month)).length;
  const tenses = Object.keys(TENSES).filter((t) => L.stats[t]?.n);
  const review = Object.entries(L.miss).sort((a, b) => b[1] - a[1]).slice(0, 10);
  return `<div class="panel">${head}
    <div class="stat-row">
      <div class="stat"><div class="v">${inMonth}</div><div class="k">dias em ${MONTHS[parse(today()).getMonth()].toLowerCase()}</div></div>
      <div class="stat"><div class="v">${Math.round((ok / total) * 100)}<small>%</small></div><div class="k">de acerto</div></div>
      <div class="stat"><div class="v">${total}</div><div class="k">respostas</div></div>
    </div>
    ${tenses.length ? `<div class="bars">${tenses.map((t) => {
      const s = L.stats[t];
      const pct = Math.round((s.ok / s.n) * 100);
      return `<div class="bar learn-bar" style="--c:${TENSES[t].color}"><span>${esc(TENSES[t].fr)}</span>
        <div class="track"><div class="fill" style="width:${pct}%"></div></div><span>${pct}%</span></div>`;
    }).join('')}</div>` : ''}
    ${vocabBlock()}
    ${review.length ? `<div class="field-label" style="color:rgba(255,255,255,.75);margin:16px 0 8px">Verbos pra revisar</div>
      <div class="chips">${review.map(([v, n]) => `<span class="chip" style="background:rgba(255,255,255,.14);color:#fff">${esc(v)} <b style="opacity:.6">×${n}</b></span>`).join('')}</div>` : ''}
  </div>`;
}

export function renderProgress(el) {
  const panels = store.trackers().map((t) => ({
    number: numberPanel, stamp: stampPanel, text: textPanel, book: bookPanel,
  }[t.kind]?.(t) || ''));
  // Um painel só para livros, mesmo que existam vários marcadores de livro.
  const seenBook = { v: false };
  const out = panels.filter((_, i) => {
    if (store.trackers()[i].kind !== 'book') return true;
    if (seenBook.v) return false;
    seenBook.v = true;
    return true;
  });

  el.innerHTML = `<section class="screen">
    <div class="topbar"><div class="eyebrow">Seu histórico</div></div>
    <h1 class="h-display" style="font-size:clamp(34px,11vw,48px);margin:4px 0 18px">Progresso</h1>
    ${out.join('')}
    ${learnPanel()}
  </section>`;

  el.querySelector('.screen').addEventListener('click', (e) => {
    const b = e.target.closest('[data-range]');
    if (!b) return;
    rangeOf[b.dataset.t] = b.dataset.range;
    pop();
    haptic();
    const y = window.scrollY;
    renderProgress(el);
    window.scrollTo(0, y);
  });
}
