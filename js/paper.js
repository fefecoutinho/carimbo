// Desenha a "folha do dia" num canvas: o número do dia, os carimbos, o peso,
// o kanji, os livros e os eventos — como na folha de papel impressa.
import { trackers, day, hasEntry, learnDay } from './store.js';
import { parse, fmtNumber } from './dates.js';

export const SIZE = 1024;
const INK = '#2b2640';
const HAND = '"Caveat", "Bradley Hand", "Marker Felt", cursive';
const BOLD = '"Unbounded", system-ui, sans-serif';

function rng(seedStr) {
  let h = 1779033703 ^ seedStr.length;
  for (let i = 0; i < seedStr.length; i++) {
    h = Math.imul(h ^ seedStr.charCodeAt(i), 3432918353);
    h = (h << 13) | (h >>> 19);
  }
  return () => {
    h = Math.imul(h ^ (h >>> 16), 2246822507);
    h = Math.imul(h ^ (h >>> 13), 3266489909);
    return ((h ^= h >>> 16) >>> 0) / 4294967296;
  };
}

export function hexA(hex, a) {
  const n = parseInt(hex.slice(1), 16);
  return `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},${a})`;
}

// Lista de "marcas" do dia, já com tamanho e posição.
export function layout(key) {
  const d = day(key);
  const list = trackers();
  const marks = [];
  const crossBy = list.find((t) => t.kind === 'stamp' && t.cross && hasEntry(t, d[t.id]));

  // Carimbos (etiquetas em formato de casinha), fluindo da esquerda.
  const tags = [];
  for (const t of list.filter((x) => x.kind === 'stamp' && hasEntry(x, d[x.id]))) {
    const chosen = (d[t.id].o || []).map((oid) => t.options?.find((o) => o.id === oid)).filter(Boolean);
    if (chosen.length) chosen.forEach((o) => tags.push({ t, letter: o.letter || o.label[0] }));
    else if (!t.cross) tags.push({ t, letter: '✓' });
  }
  const area = { x: 64, y: 270, w: 610, h: 430 };
  const per = tags.length <= 6 ? 3 : 4;
  const tw = Math.min(185, (area.w - (per - 1) * 22) / per);
  const th = tw * 1.12;
  tags.forEach((tag, i) => {
    const col = i % per;
    const row = Math.floor(i / per);
    marks.push({
      kind: 'tag', t: tag.t, letter: tag.letter,
      x: area.x + col * (tw + 22), y: area.y + row * (th + 24), w: tw, h: th,
    });
  });

  // Textos grandes (kanji) à direita; anotações embaixo à esquerda.
  const bigs = list.filter((t) => t.kind === 'text' && t.style === 'big' && hasEntry(t, d[t.id]));
  bigs.forEach((t, i) => {
    const h = 380 / bigs.length;
    marks.push({ kind: 'big', t, text: String(d[t.id]), x: 690, y: 280 + i * h, w: 270, h });
  });
  const notes = list.filter((t) => t.kind === 'text' && t.style !== 'big' && hasEntry(t, d[t.id]));
  notes.forEach((t, i) => {
    marks.push({ kind: 'note', t, text: String(d[t.id]), x: 64, y: 730 + i * 96, w: 600, h: 84 });
  });

  // Francês praticado: bandeirinha + placar embaixo à esquerda.
  const l = learnDay(key);
  if (l) {
    marks.push({ kind: 'learn', t: { id: 'learn', color: '#2f5bff' }, text: `${l.ok}/${l.n}`, x: 64, y: Math.min(730 + notes.length * 96, 900), w: 300, h: 90 });
  }

  // Números (peso) embaixo à direita.
  const nums = list.filter((t) => t.kind === 'number' && hasEntry(t, d[t.id]));
  nums.forEach((t, i) => {
    marks.push({ kind: 'num', t, text: fmtNumber(d[t.id], 2), x: 690, y: 930 - (nums.length - i) * 110, w: 280, h: 100 });
  });

  // Livros: nuvenzinha no canto de cima.
  const bookEvents = [];
  for (const t of list.filter((x) => x.kind === 'book' && hasEntry(x, d[x.id]))) {
    for (const ev of d[t.id]) bookEvents.push({ t, ev });
  }
  bookEvents.slice(0, 2).forEach((b, i) => {
    const h = bookEvents.length > 1 ? 100 : 170;
    marks.push({ kind: 'book', t: b.t, ev: b.ev, x: 400, y: 50 + i * (h + 12), w: 570, h });
  });

  return { marks, crossBy };
}

// Centro (em pixels do canvas) onde a marca de um marcador foi desenhada.
export function anchorFor(key, trackerId) {
  const { marks, crossBy } = layout(key);
  const own = marks.filter((m) => m.t.id === trackerId);
  if (own.length) {
    const m = own[own.length - 1];
    return { x: m.x + m.w / 2, y: m.y + m.h / 2 };
  }
  if (crossBy && crossBy.id === trackerId) return { x: 170, y: 150 };
  return { x: SIZE / 2, y: SIZE / 2 };
}

function tagPath(ctx, x, y, w, h) {
  const roof = h * 0.26;
  ctx.beginPath();
  ctx.moveTo(x, y + roof);
  ctx.lineTo(x + w / 2, y);
  ctx.lineTo(x + w, y + roof);
  ctx.lineTo(x + w, y + h);
  ctx.lineTo(x, y + h);
  ctx.closePath();
}

function grunge(ctx, x, y, w, h, rand, amount = 60) {
  ctx.save();
  ctx.globalCompositeOperation = 'destination-out';
  for (let i = 0; i < amount; i++) {
    ctx.globalAlpha = 0.25 + rand() * 0.5;
    ctx.beginPath();
    ctx.arc(x + rand() * w, y + rand() * h, 1 + rand() * 4, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
}

function handX(ctx, cx, cy, r, color, rand) {
  ctx.save();
  ctx.strokeStyle = color;
  ctx.lineWidth = 15;
  ctx.lineCap = 'round';
  const j = () => (rand() - 0.5) * 18;
  ctx.beginPath();
  ctx.moveTo(cx - r + j(), cy - r + j());
  ctx.quadraticCurveTo(cx + j(), cy + j(), cx + r + j(), cy + r + j());
  ctx.moveTo(cx + r + j(), cy - r + j());
  ctx.quadraticCurveTo(cx + j(), cy + j(), cx - r + j(), cy + r + j());
  ctx.stroke();
  ctx.restore();
}

function fitText(ctx, text, maxW, size, family, weight = 700) {
  let s = size;
  ctx.font = `${weight} ${s}px ${family}`;
  while (ctx.measureText(text).width > maxW && s > 18) {
    s -= 4;
    ctx.font = `${weight} ${s}px ${family}`;
  }
  return s;
}

function cloud(ctx, x, y, w, h, rand) {
  ctx.beginPath();
  const bumpsX = Math.max(3, Math.round(w / 90));
  const bumpsY = Math.max(1, Math.round(h / 90));
  const pts = [];
  for (let i = 0; i <= bumpsX; i++) pts.push([x + (w * i) / bumpsX, y]);
  for (let i = 1; i <= bumpsY; i++) pts.push([x + w, y + (h * i) / bumpsY]);
  for (let i = bumpsX - 1; i >= 0; i--) pts.push([x + (w * i) / bumpsX, y + h]);
  for (let i = bumpsY - 1; i >= 1; i--) pts.push([x, y + (h * i) / bumpsY]);
  const cx = x + w / 2;
  const cy = y + h / 2;
  ctx.moveTo(pts[0][0], pts[0][1]);
  for (let i = 1; i <= pts.length; i++) {
    const [px, py] = pts[i - 1];
    const [nx, ny] = pts[i % pts.length];
    const mx = (px + nx) / 2;
    const my = (py + ny) / 2;
    const push = 0.28 + rand() * 0.1;
    ctx.quadraticCurveTo(mx + (mx - cx) * push, my + (my - cy) * push * 1.4, nx, ny);
  }
  ctx.closePath();
}

export function drawDay(ctx, key) {
  const S = SIZE;
  const rand = rng(key);

  // Papel
  ctx.clearRect(0, 0, S, S);
  ctx.fillStyle = '#fbf7ee';
  ctx.fillRect(0, 0, S, S);
  for (let i = 0; i < 2600; i++) {
    ctx.fillStyle = `rgba(80,60,40,${rand() * 0.035})`;
    ctx.fillRect(rand() * S, rand() * S, 2, 2);
  }
  ctx.strokeStyle = 'rgba(43,38,64,0.12)';
  ctx.lineWidth = 6;
  ctx.strokeRect(24, 24, S - 48, S - 48);

  const { marks, crossBy } = layout(key);

  // Número do dia (riscado com X se treinou)
  const dnum = String(parse(key).getDate());
  ctx.fillStyle = INK;
  ctx.font = `900 170px ${BOLD}`;
  ctx.textBaseline = 'top';
  ctx.textAlign = 'left';
  ctx.fillText(dnum, 70, 62);
  if (crossBy) handX(ctx, 70 + ctx.measureText(dnum).width / 2, 150, 105, crossBy.color, rand);

  for (const m of marks) {
    const r = rng(key + m.t.id + (m.letter || '') + m.x);
    ctx.save();
    const cx = m.x + m.w / 2;
    const cy = m.y + m.h / 2;
    ctx.translate(cx, cy);
    ctx.rotate((r() - 0.5) * (m.kind === 'num' || m.kind === 'note' ? 0.08 : 0.16));
    ctx.translate(-cx, -cy);

    if (m.kind === 'tag') {
      tagPath(ctx, m.x, m.y, m.w, m.h);
      ctx.fillStyle = hexA(m.t.color, 0.2);
      ctx.fill();
      ctx.lineWidth = m.w * 0.09;
      ctx.lineJoin = 'round';
      ctx.strokeStyle = m.t.color;
      ctx.stroke();
      ctx.fillStyle = m.t.color;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.font = `900 ${m.w * 0.5}px ${BOLD}`;
      ctx.fillText(m.letter, cx, m.y + m.h * 0.62);
      grunge(ctx, m.x - 10, m.y - 10, m.w + 20, m.h + 20, r);
    } else if (m.kind === 'big') {
      ctx.fillStyle = m.t.color;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      fitText(ctx, m.text, m.w, Math.min(230, m.h * 0.85), `${HAND}, "Hiragino Mincho ProN", serif`, 700);
      ctx.fillText(m.text, cx, cy);
    } else if (m.kind === 'note') {
      ctx.fillStyle = INK;
      ctx.textAlign = 'left';
      ctx.textBaseline = 'middle';
      const size = fitText(ctx, m.text, m.w - 40, 66, HAND);
      const tw = ctx.measureText(m.text).width;
      ctx.strokeStyle = m.t.color;
      ctx.lineWidth = 6;
      ctx.strokeRect(m.x, m.y + 4, tw + 36, m.h - 8);
      ctx.fillText(m.text, m.x + 18, cy + size * 0.05);
    } else if (m.kind === 'num') {
      ctx.fillStyle = m.t.color;
      ctx.textAlign = 'right';
      ctx.textBaseline = 'middle';
      fitText(ctx, m.text, m.w, 104, HAND);
      ctx.fillText(m.text, m.x + m.w, cy);
    } else if (m.kind === 'learn') {
      ctx.textBaseline = 'middle';
      ctx.textAlign = 'left';
      ctx.font = '72px "Apple Color Emoji", "Noto Color Emoji", system-ui, sans-serif';
      ctx.fillText('🇫🇷', m.x, cy);
      ctx.fillStyle = m.t.color;
      ctx.font = `700 76px ${HAND}`;
      ctx.fillText(m.text, m.x + 104, cy + 4);
    } else if (m.kind === 'book') {
      cloud(ctx, m.x + 20, m.y + 14, m.w - 40, m.h - 28, r);
      ctx.fillStyle = hexA(m.t.color, 0.1);
      ctx.fill();
      ctx.strokeStyle = m.t.color;
      ctx.lineWidth = 7;
      ctx.stroke();
      const done = m.ev.a === 'finish';
      const label = done ? `✓ ${m.ev.t} ✓` : `Início: ${m.ev.t}`;
      ctx.fillStyle = INK;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      fitText(ctx, label, m.w - 110, m.h > 120 ? 72 : 52, HAND);
      if (done) {
        const tw = ctx.measureText(label).width;
        const inner = ctx.measureText(m.ev.t).width;
        ctx.fillText(m.ev.t, cx, cy);
        ctx.fillStyle = '#1fb36b';
        ctx.fillText('✓', cx - tw / 2 + (tw - inner) / 4, cy);
        ctx.fillText('✓', cx + tw / 2 - (tw - inner) / 4, cy);
      } else {
        ctx.fillText(label, cx, cy);
      }
    }
    ctx.restore();
  }
}
