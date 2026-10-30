// Som, vibração e explosões de tinta — o "prazer de marcar".
import { prefs } from './store.js';

let audio;
function ctx() {
  if (!audio) {
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return null;
    audio = new AC();
  }
  if (audio.state === 'suspended') audio.resume();
  return audio;
}

// Desbloqueia o áudio no primeiro toque (exigência do iPhone).
export function unlockAudio() {
  const once = () => { ctx(); window.removeEventListener('pointerdown', once); };
  window.addEventListener('pointerdown', once);
}

function noise(ac, duration) {
  const buf = ac.createBuffer(1, Math.ceil(ac.sampleRate * duration), ac.sampleRate);
  const ch = buf.getChannelData(0);
  for (let i = 0; i < ch.length; i++) ch[i] = (Math.random() * 2 - 1) * (1 - i / ch.length) ** 2;
  const src = ac.createBufferSource();
  src.buffer = buf;
  return src;
}

const lulaOn = () => prefs().theme === 'lula';

// "Tum!" do carimbo batendo no papel.
export function thump() {
  if (!prefs().sound) return;
  if (lulaOn()) { surdo(); return; }
  const ac = ctx();
  if (!ac) return;
  const t = ac.currentTime;

  const osc = ac.createOscillator();
  const g = ac.createGain();
  osc.type = 'sine';
  osc.frequency.setValueAtTime(190, t);
  osc.frequency.exponentialRampToValueAtTime(45, t + 0.16);
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(0.9, t + 0.005);
  g.gain.exponentialRampToValueAtTime(0.0001, t + 0.22);
  osc.connect(g).connect(ac.destination);
  osc.start(t);
  osc.stop(t + 0.25);

  const n = noise(ac, 0.07);
  const bp = ac.createBiquadFilter();
  bp.type = 'bandpass';
  bp.frequency.value = 1400;
  bp.Q.value = 0.8;
  const ng = ac.createGain();
  ng.gain.value = 0.35;
  n.connect(bp).connect(ng).connect(ac.destination);
  n.start(t);
}

// "Pop" curtinho para seleções.
export function pop(up = true) {
  if (!prefs().sound) return;
  const ac = ctx();
  if (!ac) return;
  const t = ac.currentTime;
  const osc = ac.createOscillator();
  const g = ac.createGain();
  osc.type = 'triangle';
  osc.frequency.setValueAtTime(up ? 520 : 700, t);
  osc.frequency.exponentialRampToValueAtTime(up ? 900 : 380, t + 0.07);
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(0.18, t + 0.005);
  g.gain.exponentialRampToValueAtTime(0.0001, t + 0.09);
  osc.connect(g).connect(ac.destination);
  osc.start(t);
  osc.stop(t + 0.1);
}

// "Swooosh" suave: ruído filtrado que sobe e desce, com um brilho no final.
export function swoosh() {
  if (!prefs().sound) return;
  if (lulaOn()) { batucada(); return; }
  const ac = ctx();
  if (!ac) return;
  const t = ac.currentTime;
  const dur = 0.42;

  const buf = ac.createBuffer(1, Math.ceil(ac.sampleRate * dur), ac.sampleRate);
  const ch = buf.getChannelData(0);
  for (let i = 0; i < ch.length; i++) ch[i] = Math.random() * 2 - 1;
  const src = ac.createBufferSource();
  src.buffer = buf;

  const bp = ac.createBiquadFilter();
  bp.type = 'bandpass';
  bp.Q.value = 0.9;
  bp.frequency.setValueAtTime(140, t);
  bp.frequency.exponentialRampToValueAtTime(1000, t + dur * 0.55);
  bp.frequency.exponentialRampToValueAtTime(380, t + dur);

  const g = ac.createGain();
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(0.9, t + dur * 0.4);
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  src.connect(bp).connect(g).connect(ac.destination);
  src.start(t);

  // Pequeno "plim" no fim, para soar satisfatório.
  const osc = ac.createOscillator();
  const og = ac.createGain();
  osc.type = 'sine';
  osc.frequency.setValueAtTime(330, t + dur * 0.5);
  osc.frequency.exponentialRampToValueAtTime(494, t + dur * 0.8);
  og.gain.setValueAtTime(0.0001, t + dur * 0.5);
  og.gain.exponentialRampToValueAtTime(0.16, t + dur * 0.6);
  og.gain.exponentialRampToValueAtTime(0.0001, t + dur + 0.15);
  osc.connect(og).connect(ac.destination);
  osc.start(t + dur * 0.5);
  osc.stop(t + dur + 0.2);
}

// Vento leve batendo numa folha de papel: sopro suave + um farfalhar bem delicado.
export function whoomp(open = true) {
  if (!prefs().sound) return;
  const ac = ctx();
  if (!ac) return;
  const t = ac.currentTime;
  const dur = 0.55;

  // Sopro: ruído com envelope em sino e um tremor leve, como ar passando pelo papel.
  const len = Math.ceil(ac.sampleRate * dur);
  const buf = ac.createBuffer(1, len, ac.sampleRate);
  const ch = buf.getChannelData(0);
  let flutter = 1;
  for (let i = 0; i < len; i++) {
    const p = i / len;
    if (i % 260 === 0) flutter = 0.65 + Math.random() * 0.35;
    ch[i] = (Math.random() * 2 - 1) * Math.sin(Math.PI * p) ** 1.6 * flutter;
  }
  const src = ac.createBufferSource();
  src.buffer = buf;
  const hp = ac.createBiquadFilter();
  hp.type = 'highpass';
  hp.frequency.value = 500;
  const bp = ac.createBiquadFilter();
  bp.type = 'bandpass';
  bp.Q.value = 0.6;
  bp.frequency.setValueAtTime(open ? 1100 : 2600, t);
  bp.frequency.exponentialRampToValueAtTime(open ? 2600 : 1100, t + dur);
  const g = ac.createGain();
  g.gain.value = 0.1;
  src.connect(hp).connect(bp).connect(g).connect(ac.destination);
  src.start(t);

  // Farfalhar: alguns estalinhos de papel bem baixinhos.
  for (let i = 0; i < 5; i++) {
    const at = t + 0.08 + Math.random() * dur * 0.6;
    const c = noise(ac, 0.025);
    const f = ac.createBiquadFilter();
    f.type = 'bandpass';
    f.frequency.value = 3000 + Math.random() * 2500;
    f.Q.value = 1.2;
    const cg = ac.createGain();
    cg.gain.value = 0.025 + Math.random() * 0.025;
    c.connect(f).connect(cg).connect(ac.destination);
    c.start(at);
  }
}

// Notas curtas e suaves (tom médio, nada agudo).
function notes(freqs, { type = 'triangle', gap = 0.09, len = 0.22, vol = 0.22 } = {}) {
  if (!prefs().sound) return;
  const ac = ctx();
  if (!ac) return;
  const t0 = ac.currentTime;
  freqs.forEach((f, i) => {
    const t = t0 + i * gap;
    const osc = ac.createOscillator();
    const g = ac.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(f, t);
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(vol, t + 0.012);
    g.gain.exponentialRampToValueAtTime(0.0001, t + len);
    osc.connect(g).connect(ac.destination);
    osc.start(t);
    osc.stop(t + len + 0.02);
  });
}

// Acerto: arpejo subindo (sol – si – ré).
export const success = () => notes([392, 494, 587, 784], { gap: 0.075, len: 0.28, vol: 0.2 });
// Quase (só o acento): duas notas neutras.
export const almost = () => notes([440, 523], { gap: 0.1, len: 0.22, vol: 0.18 });
// Erro: duas notas graves descendo.
export const fail = () => notes([220, 165], { type: 'sine', gap: 0.13, len: 0.3, vol: 0.32 });
// Carta lembrada: duas notinhas curtas.
export const ding = () => notes([494, 659], { gap: 0.07, len: 0.22, vol: 0.16 });
// Fim de rodada: fanfarra curtinha.
export const fanfare = () => {
  notes([392, 494, 587, 784, 587, 784], { gap: 0.09, len: 0.3, vol: 0.18 });
  if (lulaOn()) cheer();
};

// ---------- Sons do tema "Faz o L": clima de comício ----------
// Batida de surdo (o tambor grave da bateria de escola de samba).
function drum(ac, t, { from = 120, to = 52, len = 0.55, vol = 0.85 } = {}) {
  const osc = ac.createOscillator();
  const g = ac.createGain();
  osc.type = 'sine';
  osc.frequency.setValueAtTime(from, t);
  osc.frequency.exponentialRampToValueAtTime(to, t + 0.12);
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(vol, t + 0.006);
  g.gain.exponentialRampToValueAtTime(0.0001, t + len);
  osc.connect(g).connect(ac.destination);
  osc.start(t);
  osc.stop(t + len + 0.05);
  // Pele do tambor: um "tapa" curtinho.
  const n = noise(ac, 0.04);
  const lp = ac.createBiquadFilter();
  lp.type = 'lowpass';
  lp.frequency.value = 900;
  const ng = ac.createGain();
  ng.gain.value = vol * 0.5;
  n.connect(lp).connect(ng).connect(ac.destination);
  n.start(t);
}

// Tamborim: batida seca e curta.
function tamborim(ac, t, vol = 0.22) {
  const n = noise(ac, 0.05);
  const bp = ac.createBiquadFilter();
  bp.type = 'bandpass';
  bp.frequency.value = 800;
  bp.Q.value = 2.5;
  const g = ac.createGain();
  g.gain.value = vol;
  n.connect(bp).connect(g).connect(ac.destination);
  n.start(t);
  const osc = ac.createOscillator();
  const og = ac.createGain();
  osc.type = 'triangle';
  osc.frequency.value = 620;
  og.gain.setValueAtTime(vol * 0.6, t);
  og.gain.exponentialRampToValueAtTime(0.0001, t + 0.06);
  osc.connect(og).connect(ac.destination);
  osc.start(t);
  osc.stop(t + 0.08);
}

// Carimbo no tema Faz o L: "TUM" de surdo.
function surdo() {
  const ac = ctx();
  if (!ac) return;
  drum(ac, ac.currentTime);
}

// "Voltar pra hoje" no tema Faz o L: uma viradinha de batucada.
function batucada() {
  const ac = ctx();
  if (!ac) return;
  const t = ac.currentTime;
  [0, 0.11, 0.22, 0.29, 0.4].forEach((d, i) => tamborim(ac, t + d, i === 4 ? 0.28 : 0.2));
  drum(ac, t, { from: 150, to: 70, len: 0.3, vol: 0.5 });
  drum(ac, t + 0.44, { len: 0.6, vol: 0.85 });
}

// Torcida de comício: uma multidão gritando "êêê", que cresce e some.
export function cheer() {
  if (!prefs().sound) return;
  const ac = ctx();
  if (!ac) return;
  const t = ac.currentTime;
  const dur = 1.6;
  const len = Math.ceil(ac.sampleRate * dur);
  const buf = ac.createBuffer(1, len, ac.sampleRate);
  const ch = buf.getChannelData(0);
  for (let i = 0; i < len; i++) ch[i] = Math.random() * 2 - 1;
  const out = ac.createGain();
  out.gain.setValueAtTime(0.0001, t);
  out.gain.exponentialRampToValueAtTime(0.5, t + 0.35);
  out.gain.setValueAtTime(0.5, t + 0.8);
  out.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  out.connect(ac.destination);
  // Várias "vozes" (formantes da vogal ê) levemente desafinadas entre si.
  for (const [f, q, v] of [[520, 6, 0.5], [610, 7, 0.4], [1900, 5, 0.25], [2300, 6, 0.18], [480, 5, 0.35]]) {
    const src = ac.createBufferSource();
    src.buffer = buf;
    const bp = ac.createBiquadFilter();
    bp.type = 'bandpass';
    bp.Q.value = q;
    bp.frequency.setValueAtTime(f * 0.92, t);
    bp.frequency.linearRampToValueAtTime(f * 1.05, t + 0.5);
    bp.frequency.linearRampToValueAtTime(f, t + dur);
    const g = ac.createGain();
    g.gain.value = v;
    src.connect(bp).connect(g).connect(out);
    src.start(t, Math.random() * 0.3);
  }
}

// Vibração: no iPhone (Safari 18+) um <input switch> escondido dá um toque leve.
let hapticLabel;
export function haptic(strong = false) {
  if (!prefs().haptics) return;
  if (navigator.vibrate) { navigator.vibrate(strong ? 22 : 10); return; }
  if (!hapticLabel) {
    const input = document.createElement('input');
    input.type = 'checkbox';
    input.setAttribute('switch', '');
    input.id = 'haptic-switch';
    hapticLabel = document.createElement('label');
    hapticLabel.htmlFor = input.id;
    const box = document.createElement('div');
    box.style.cssText = 'position:fixed;width:1px;height:1px;overflow:hidden;opacity:0;pointer-events:none;left:-10px;top:-10px';
    box.append(input, hapticLabel);
    document.body.append(box);
  }
  hapticLabel.click();
}

// Explosão de gotinhas de tinta saindo de um ponto da tela.
export function inkBurst(x, y, color, count = 16) {
  const layer = document.createElement('div');
  layer.className = 'burst';
  layer.style.left = `${x}px`;
  layer.style.top = `${y}px`;
  for (let i = 0; i < count; i++) {
    const p = document.createElement('i');
    const ang = (Math.PI * 2 * i) / count + Math.random() * 0.4;
    const dist = 50 + Math.random() * 70;
    const size = 6 + Math.random() * 10;
    p.style.cssText = `--dx:${Math.cos(ang) * dist}px;--dy:${Math.sin(ang) * dist * 0.6 - 10}px;width:${size}px;height:${size}px;background:${color};animation-delay:${Math.random() * 40}ms`;
    layer.append(p);
  }
  document.body.append(layer);
  setTimeout(() => layer.remove(), 900);
}

// Fala uma palavra em francês com a voz do iPhone.
export function speakFr(text) {
  try {
    const synth = window.speechSynthesis;
    if (!synth) return;
    synth.cancel();
    const u = new SpeechSynthesisUtterance(text);
    u.lang = 'fr-FR';
    u.rate = 0.9;
    const v = synth.getVoices().find((x) => x.lang?.startsWith('fr'));
    if (v) u.voice = v;
    synth.speak(u);
  } catch { /* sem voz disponível */ }
}
