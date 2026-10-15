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

// "Tum!" do carimbo batendo no papel.
export function thump() {
  if (!prefs().sound) return;
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
  bp.Q.value = 1.4;
  bp.frequency.setValueAtTime(380, t);
  bp.frequency.exponentialRampToValueAtTime(3400, t + dur * 0.55);
  bp.frequency.exponentialRampToValueAtTime(1200, t + dur);

  const g = ac.createGain();
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(0.55, t + dur * 0.4);
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  src.connect(bp).connect(g).connect(ac.destination);
  src.start(t);

  // Pequeno "plim" no fim, para soar satisfatório.
  const osc = ac.createOscillator();
  const og = ac.createGain();
  osc.type = 'sine';
  osc.frequency.setValueAtTime(1046, t + dur * 0.5);
  osc.frequency.exponentialRampToValueAtTime(1568, t + dur * 0.8);
  og.gain.setValueAtTime(0.0001, t + dur * 0.5);
  og.gain.exponentialRampToValueAtTime(0.12, t + dur * 0.6);
  og.gain.exponentialRampToValueAtTime(0.0001, t + dur + 0.15);
  osc.connect(og).connect(ac.destination);
  osc.start(t + dur * 0.5);
  osc.stop(t + dur + 0.2);
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
