// Folhas que sobem de baixo: marcar o dia e editar marcadores.
import * as store from './store.js';
import { openSheet, closeSheet, esc, toast } from './ui.js';
import { pop, haptic } from './fx.js';
import { searchCovers, saveCover, coverSrc } from './covers.js';
import { parse, today, addDays, WEEKDAYS, shortDate, fmtNumber, parseNumber } from './dates.js';

export function dayLabel(key) {
  if (key === today()) return 'Hoje';
  if (key === addDays(today(), -1)) return 'Ontem';
  if (key === addDays(today(), 1)) return 'Amanhã';
  return `${WEEKDAYS[parse(key).getDay()]}, ${shortDate(key)}`;
}

function head(t, key, sub) {
  return `<div class="sheet-head">
    <div class="icon">${esc(t.icon)}</div>
    <div><h2>${esc(t.name)}</h2><div class="sub">${esc(sub || dayLabel(key))}</div></div>
  </div>`;
}

const tagHTML = (letter, color, on) => `<span class="tag ${on ? 'on' : ''}" style="--c:${esc(color)}"><span>${esc(letter)}</span></span>`;

// Abre a folha certa para marcar `t` no dia `key`.
// onDone(trackerId, stamped) é chamado depois de salvar (stamped=false ao apagar).
export function openLog(key, t, onDone) {
  const open = { stamp: stampSheet, number: numberSheet, text: textSheet, book: bookSheet }[t.kind];
  open?.(key, t, onDone);
}

function wireCommon(sheet, key, t, onDone, getValue) {
  sheet.addEventListener('click', (e) => {
    const act = e.target.closest('[data-act]')?.dataset.act;
    if (act === 'save') {
      const v = getValue();
      if (v === undefined) return;
      haptic(true);
      store.setEntry(key, t.id, v);
      closeSheet();
      onDone(t.id, store.hasEntry(t, v));
    } else if (act === 'remove') {
      haptic();
      pop(false);
      store.setEntry(key, t.id, null);
      closeSheet();
      onDone(t.id, false);
    }
  });
}

function stampSheet(key, t, onDone) {
  const cur = store.entry(key, t.id);
  const selected = new Set(cur?.o || []);
  const opts = t.options || [];
  const html = `${head(t, key)}
    ${opts.length ? `<div class="field-label">O que você fez?</div>
    <div class="options">${opts.map((o) => `<button class="opt ${selected.has(o.id) ? 'on' : ''}" data-opt="${esc(o.id)}">
        ${tagHTML(o.letter || o.label[0], t.color, selected.has(o.id))}
        <span class="label">${esc(o.label)}</span></button>`).join('')}</div>
    <p class="field-label" style="margin-top:-6px">Pode escolher mais de um — ou nenhum, só pra marcar que fez.</p>`
    : '<p class="field-label">Toque em carimbar para marcar o dia.</p>'}
    <button class="btn" data-act="save" style="--c:${esc(t.color)}">CARIMBAR</button>
    ${cur ? '<button class="btn ghost danger" data-act="remove">Tirar o carimbo</button>' : ''}`;

  openSheet(html, {
    color: t.color,
    onMount(sheet) {
      sheet.addEventListener('click', (e) => {
        const b = e.target.closest('[data-opt]');
        if (!b) return;
        const id = b.dataset.opt;
        const on = !selected.has(id);
        if (on) selected.add(id); else selected.delete(id);
        b.classList.toggle('on', on);
        b.querySelector('.tag').classList.toggle('on', on);
        pop(on);
        haptic();
      });
      wireCommon(sheet, key, t, onDone, () => ({ o: opts.filter((o) => selected.has(o.id)).map((o) => o.id) }));
    },
  });
}

function numberSheet(key, t, onDone) {
  const cur = store.entry(key, t.id);
  const last = store.lastNumberBefore(t.id, key);
  const start = cur ?? last ?? '';
  const step = t.step || 0.1;
  const html = `${head(t, key)}
    <div class="field">
      <div class="stepper">
        <button class="step" data-step="-1" aria-label="Diminuir">−</button>
        <input class="input huge" inputmode="decimal" enterkeyhint="done" value="${start === '' ? '' : esc(fmtNumber(start, 2))}" placeholder="0" aria-label="${esc(t.name)}">
        <button class="step" data-step="1" aria-label="Aumentar">+</button>
      </div>
      <div class="field-label" style="text-align:center;margin-top:10px">${esc(t.unit || '')}${last != null && cur == null ? ` · último: ${esc(fmtNumber(last, 2))}` : ''}</div>
    </div>
    <button class="btn" data-act="save" style="--c:${esc(t.color)}">CARIMBAR</button>
    ${cur != null ? '<button class="btn ghost danger" data-act="remove">Apagar</button>' : ''}`;

  openSheet(html, {
    color: t.color,
    onMount(sheet) {
      const input = sheet.querySelector('input');
      sheet.addEventListener('click', (e) => {
        const b = e.target.closest('[data-step]');
        if (!b) return;
        const n = parseNumber(input.value) ?? 0;
        const next = Math.round((n + Number(b.dataset.step) * step) * 100) / 100;
        input.value = fmtNumber(next, 2);
        pop(Number(b.dataset.step) > 0);
        haptic();
      });
      input.addEventListener('keydown', (e) => { if (e.key === 'Enter') sheet.querySelector('[data-act=save]').click(); });
      wireCommon(sheet, key, t, onDone, () => {
        const n = parseNumber(input.value);
        if (n === null) { toast('Digite um número'); return undefined; }
        return n;
      });
    },
  });
}

function recentTexts(t, max = 8) {
  const seen = new Set();
  const out = [];
  for (const k of Object.keys(store.getData().days).sort().reverse()) {
    const v = store.entry(k, t.id);
    if (typeof v === 'string' && v.trim() && !seen.has(v.trim().toLowerCase())) {
      seen.add(v.trim().toLowerCase());
      out.push(v.trim());
      if (out.length >= max) break;
    }
  }
  return out;
}

function textSheet(key, t, onDone) {
  const cur = store.entry(key, t.id) || '';
  const big = t.style === 'big';
  const recent = big ? [] : recentTexts(t, 6);
  const html = `${head(t, key)}
    <div class="field">
      <input class="input ${big ? 'handwrite' : ''}" value="${esc(cur)}" maxlength="${big ? 12 : 60}"
        placeholder="${big ? '火' : 'Ex.: show de um amigo'}" enterkeyhint="done" autocomplete="off" aria-label="${esc(t.name)}">
    </div>
    ${recent.length ? `<div class="field"><div class="field-label">Usados recentemente</div>
      <div class="chips">${recent.map((r) => `<button class="chip" data-fill="${esc(r)}">${esc(r)}</button>`).join('')}</div></div>` : ''}
    <button class="btn" data-act="save" style="--c:${esc(t.color)}">CARIMBAR</button>
    ${cur ? '<button class="btn ghost danger" data-act="remove">Apagar</button>' : ''}`;

  openSheet(html, {
    color: t.color,
    onMount(sheet) {
      const input = sheet.querySelector('input');
      sheet.addEventListener('click', (e) => {
        const c = e.target.closest('[data-fill]');
        if (c) { input.value = c.dataset.fill; pop(); haptic(); }
      });
      input.addEventListener('keydown', (e) => { if (e.key === 'Enter') sheet.querySelector('[data-act=save]').click(); });
      wireCommon(sheet, key, t, onDone, () => {
        const v = input.value.trim();
        if (!v) { toast('Escreve alguma coisa 🙂'); return undefined; }
        return v;
      });
    },
  });
}

function bookSheet(key, t, onDone) {
  const events = [...(store.entry(key, t.id) || [])];
  let action = 'start';
  let typed = '';
  let results = [];
  let selected = null; // { title, author, url } ou { id } de uma capa já salva
  let searching = false;
  let ctrl = null;
  let timer = null;
  let saving = false;
  let editing = -1;

  const coverThumb = (id) => {
    const src = coverSrc(id);
    return src ? `<img class="mini-cover" src="${esc(src)}" alt="">` : `<span>📖</span>`;
  };

  const coversHTML = () => {
    if (typed.trim().length < 2) return '<p class="field-label" style="margin:0">Digite o nome e eu procuro a capa 🔎</p>';
    if (searching && !results.length) return '<div class="cover-row">' + '<span class="cover-skel"></span>'.repeat(4) + '</div>';
    if (!results.length) return '<p class="field-label" style="margin:0">Não achei capa pra esse nome. Tenta o título original ou com o autor — ou carimba sem capa mesmo.</p>';
    return `<div class="cover-row">${results.map((r, i) => {
      const on = selected && (selected.url ? selected.url === r.url : false);
      return `<button class="cover-opt ${on ? 'on' : ''}" data-cover="${i}" aria-label="${esc(r.title)}">
        <img src="${esc(r.url)}" alt="" loading="lazy" referrerpolicy="no-referrer">
        <span class="c-title">${esc(r.title)}</span><span class="c-author">${esc(r.author)}</span></button>`;
    }).join('')}</div>`;
  };

  const render = (sheet) => {
    const reading = store.readingNow();
    const suggestions = action === 'finish' ? reading : [];
    sheet.innerHTML = `<div class="grab"></div>${head(t, key)}
      ${events.length ? `<div class="field">${events.map((ev, i) => (i === editing
        ? `<div class="list-row">${coverThumb(ev.c)}
          <input class="input edit-title" value="${esc(ev.t)}" maxlength="80" enterkeyhint="done" autocomplete="off" aria-label="Novo nome" style="min-height:44px;padding:6px 12px;font-size:16px">
          <button class="x-btn" data-saveedit="${i}" aria-label="Salvar nome" style="background:var(--c);color:#fff">✓</button></div>`
        : `<div class="list-row">
          ${coverThumb(ev.c)}
          <div class="grow">${ev.a === 'finish' ? 'Terminei' : 'Comecei'} <b>${esc(ev.t)}</b></div>
          <button class="x-btn" data-edit="${i}" aria-label="Editar nome">✎</button>
          <button class="x-btn" data-del="${i}" aria-label="Remover">×</button></div>`)).join('')}</div>` : ''}
      <div class="field"><div class="seg">
        <button class="${action === 'start' ? 'on' : ''}" data-action="start">📖 Comecei</button>
        <button class="${action === 'finish' ? 'on' : ''}" data-action="finish">✅ Terminei</button>
      </div></div>
      <div class="field">
        <input class="input" placeholder="Nome do livro" maxlength="80" enterkeyhint="done" autocomplete="off" aria-label="Nome do livro" value="${esc(typed)}">
      </div>
      ${suggestions.length ? `<div class="field"><div class="field-label">Lendo agora</div>
        <div class="chips">${suggestions.map((b) => `<button class="chip" data-fill="${esc(b.title)}" data-fillc="${esc(b.c || '')}">${esc(b.title)}</button>`).join('')}</div></div>` : ''}
      <div class="field"><div class="field-label">Capa</div><div class="covers">${selected?.id ? `<div class="cover-row"><span class="cover-opt on"><img src="${esc(coverSrc(selected.id))}" alt=""><span class="c-title">${esc(typed)}</span></span></div>` : coversHTML()}</div></div>
      <button class="btn" data-act="add" style="--c:${esc(t.color)}">${saving ? 'GUARDANDO A CAPA…' : 'CARIMBAR'}</button>
      ${events.length ? '<button class="btn ghost" data-act="close">Pronto</button>' : ''}`;
  };

  const refreshCovers = (sheet) => {
    const box = sheet.querySelector('.covers');
    if (box) box.innerHTML = coversHTML();
  };

  const search = (sheet) => {
    clearTimeout(timer);
    ctrl?.abort();
    results = [];
    if (typed.trim().length < 2) { searching = false; refreshCovers(sheet); return; }
    searching = true;
    refreshCovers(sheet);
    timer = setTimeout(async () => {
      ctrl = new AbortController();
      const q = typed.trim();
      const found = await searchCovers(q, ctrl.signal);
      if (q !== typed.trim()) return;
      results = found;
      searching = false;
      refreshCovers(sheet);
    }, 450);
  };

  const commit = () => {
    store.setEntry(key, t.id, events.length ? events : null);
  };

  openSheet('', {
    color: t.color,
    onMount(sheet) {
      render(sheet);
      sheet.addEventListener('input', (e) => {
        if (!e.target.matches('input')) return;
        typed = e.target.value;
        selected = null;
        search(sheet);
      });
      sheet.addEventListener('click', async (e) => {
        const el = e.target.closest('[data-action],[data-del],[data-fill],[data-act],[data-cover],[data-edit],[data-saveedit]');
        if (!el || saving) return;
        if (el.dataset.edit !== undefined) {
          editing = Number(el.dataset.edit);
          render(sheet);
          sheet.querySelector('.edit-title')?.focus();
          pop();
          haptic();
        } else if (el.dataset.saveedit !== undefined) {
          const i = Number(el.dataset.saveedit);
          const name = sheet.querySelector('.edit-title').value.trim();
          if (!name) { toast('O nome não pode ficar vazio'); return; }
          if (name !== events[i].t) store.renameBook(events[i].t, name);
          const fresh = store.entry(key, t.id) || [];
          events.length = 0;
          events.push(...fresh);
          editing = -1;
          render(sheet);
          pop(true);
          haptic(true);
          onDone(t.id, false);
        } else if (el.dataset.cover !== undefined) {
          const r = results[Number(el.dataset.cover)];
          selected = selected?.url === r.url ? null : r;
          refreshCovers(sheet);
          pop(!!selected);
          haptic();
        } else if (el.dataset.action) {
          action = el.dataset.action;
          render(sheet);
          pop();
          haptic();
        } else if (el.dataset.del !== undefined) {
          events.splice(Number(el.dataset.del), 1);
          commit();
          render(sheet);
          pop(false);
          haptic();
          onDone(t.id, false);
        } else if (el.dataset.fill) {
          typed = el.dataset.fill;
          selected = el.dataset.fillc ? { id: el.dataset.fillc } : null;
          render(sheet);
          if (!selected) search(sheet);
          pop();
        } else if (el.dataset.act === 'add') {
          const title = typed.trim();
          if (!title) { toast('Qual é o livro?'); return; }
          let c = null;
          if (selected?.id) c = selected.id;
          else if (selected) {
            saving = true;
            render(sheet);
            c = await saveCover(selected);
            saving = false;
          }
          events.push(c ? { t: title, a: action, c } : { t: title, a: action });
          commit();
          haptic(true);
          closeSheet();
          onDone(t.id, true);
        } else if (el.dataset.act === 'close') {
          closeSheet();
        }
      });
      sheet.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' && e.target.matches('.edit-title')) sheet.querySelector('[data-saveedit]').click();
        else if (e.key === 'Enter' && e.target.matches('input')) e.target.blur();
      });
    },
  });
}

// ---------- Editor de marcadores ----------

const EMOJIS = ['🏋️', '🎾', '🏃', '🚴', '🏊', '🧘', '⚖️', '📚', '✍️', '⭐', '🎸', '🎨', '💧', '💊', '😴', '🧠', '🍎', '💰', '☕', '🎮', '📝', '❤️', '✈️', '🗾'];

export function openEditor(existing, onSaved) {
  const isNew = !existing;
  const draft = existing ? structuredClone(existing) : {
    id: store.newId('t'), name: '', icon: '⭐', color: store.PALETTE[Math.floor(Math.random() * store.PALETTE.length)],
    kind: 'stamp', cross: false, options: [], unit: '', style: 'note',
  };

  const render = (sheet) => {
    const k = draft.kind;
    sheet.style.setProperty('--c', draft.color);
    sheet.innerHTML = `<div class="grab"></div>
      <div class="sheet-head"><div class="icon">${esc(draft.icon)}</div>
        <div><h2>${isNew ? 'Novo marcador' : 'Editar marcador'}</h2><div class="sub">${esc(store.KINDS[k].hint)}</div></div></div>

      <div class="field"><label for="ed-name">Nome</label>
        <input id="ed-name" class="input" data-f="name" value="${esc(draft.name)}" maxlength="24" placeholder="Ex.: Meditação" autocomplete="off"></div>

      <div class="field"><label for="ed-icon">Ícone</label>
        <input id="ed-icon" class="input" data-f="icon" value="${esc(draft.icon)}" maxlength="4" style="width:90px;text-align:center;font-size:26px">
        <div class="emoji-row">${EMOJIS.map((e) => `<button data-emoji="${e}">${e}</button>`).join('')}</div></div>

      <div class="field"><div class="field-label">Cor</div>
        <div class="swatches">${store.PALETTE.map((c) => `<button class="swatch ${c === draft.color ? 'on' : ''}" style="--c:${c}" data-color="${c}" aria-label="Cor ${c}"></button>`).join('')}</div></div>

      <div class="field"><div class="field-label">Tipo${isNew ? '' : ' (não dá para mudar depois de criado)'}</div>
        <div class="seg">${Object.entries(store.KINDS).map(([id, v]) => `<button class="${id === k ? 'on' : ''}" data-kind="${id}" ${isNew ? '' : 'disabled'}>${v.label}</button>`).join('')}</div></div>

      ${k === 'stamp' ? `<div class="field"><div class="field-label">Tipos (letra + nome) — opcional</div>
          ${draft.options.map((o, i) => `<div class="opt-row">
            <input class="input letter" data-opt-letter="${i}" value="${esc(o.letter)}" maxlength="2" placeholder="P" aria-label="Letra">
            <input class="input" data-opt-label="${i}" value="${esc(o.label)}" maxlength="20" placeholder="Ex.: Peito" aria-label="Nome do tipo">
            <button class="x-btn" data-opt-del="${i}" aria-label="Remover tipo">×</button></div>`).join('')}
          <button class="chip" data-act="add-opt">+ Adicionar tipo</button></div>
        <div class="field list-row" style="border:0">
          <div class="grow"><b>Riscar o dia com X</b><div class="field-label" style="margin:2px 0 0">Como você fazia na folha quando treinava</div></div>
          <button class="toggle ${draft.cross ? 'on' : ''}" data-act="cross" aria-label="Riscar o dia"></button></div>` : ''}

      ${k === 'number' ? `<div class="field"><label for="ed-unit">Unidade</label>
          <input id="ed-unit" class="input" data-f="unit" value="${esc(draft.unit || '')}" maxlength="8" placeholder="Ex.: kg, km, h"></div>` : ''}

      ${k === 'text' ? `<div class="field"><div class="field-label">Estilo</div>
          <div class="seg"><button class="${draft.style === 'big' ? 'on' : ''}" data-style="big">Grande (1 símbolo)</button>
          <button class="${draft.style !== 'big' ? 'on' : ''}" data-style="note">Anotação</button></div></div>` : ''}

      <button class="btn" data-act="save" style="--c:${esc(draft.color)}">SALVAR</button>
      ${isNew ? '' : '<button class="btn ghost danger" data-act="delete">Apagar marcador</button>'}`;
  };

  openSheet('', {
    color: draft.color,
    onMount(sheet) {
      render(sheet);
      sheet.addEventListener('input', (e) => {
        const el = e.target;
        if (el.dataset.f) {
          draft[el.dataset.f] = el.value;
          if (el.dataset.f === 'icon') sheet.querySelector('.sheet-head .icon').textContent = el.value;
        }
        if (el.dataset.optLetter !== undefined) draft.options[el.dataset.optLetter].letter = el.value.toUpperCase();
        if (el.dataset.optLabel !== undefined) draft.options[el.dataset.optLabel].label = el.value;
      });
      sheet.addEventListener('click', (e) => {
        const el = e.target.closest('button');
        if (!el) return;
        const d = el.dataset;
        if (d.emoji) { draft.icon = d.emoji; render(sheet); pop(); }
        else if (d.color) { draft.color = d.color; render(sheet); pop(); haptic(); }
        else if (d.kind && isNew) { draft.kind = d.kind; render(sheet); pop(); }
        else if (d.style) { draft.style = d.style; render(sheet); pop(); }
        else if (d.optDel !== undefined) { draft.options.splice(Number(d.optDel), 1); render(sheet); pop(false); }
        else if (d.act === 'add-opt') {
          draft.options.push({ id: store.newId('o'), label: '', letter: '' });
          render(sheet);
          const inputs = sheet.querySelectorAll('[data-opt-letter]');
          inputs[inputs.length - 1]?.focus();
        } else if (d.act === 'cross') { draft.cross = !draft.cross; el.classList.toggle('on', draft.cross); pop(draft.cross); haptic(); }
        else if (d.act === 'save') save();
        else if (d.act === 'delete') {
          if (confirm(`Apagar "${existing.name}" e todas as marcas dele? Não dá para desfazer.`)) {
            store.deleteTracker(existing.id);
            closeSheet();
            toast('Marcador apagado');
            onSaved?.();
          }
        }
      });
    },
  });

  function save() {
    const name = draft.name.trim();
    if (!name) { toast('Dá um nome pro marcador'); return; }
    const t = { id: draft.id, name, icon: draft.icon.trim() || '⭐', color: draft.color, kind: draft.kind };
    if (t.kind === 'stamp') {
      t.cross = !!draft.cross;
      t.options = draft.options
        .map((o) => ({ ...o, label: o.label.trim(), letter: (o.letter.trim() || o.label.trim()[0] || '?').toUpperCase() }))
        .filter((o) => o.label);
    }
    if (t.kind === 'number') { t.unit = (draft.unit || '').trim(); if (existing?.step) t.step = existing.step; }
    if (t.kind === 'text') t.style = draft.style === 'big' ? 'big' : 'note';
    store.upsertTracker(t);
    haptic(true);
    closeSheet();
    toast(isNew ? 'Marcador criado ✨' : 'Salvo');
    onSaved?.();
  }
}
