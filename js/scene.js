// Cena 3D: a folha do dia flutuando e um carimbo de brinquedo que desce e carimba.
import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/RoundedBoxGeometry.js';
import { RoomEnvironment } from 'three/addons/RoomEnvironment.js';
import { drawDay, SIZE, anchorFor } from './paper.js';

const P = 3.5; // lado da folha
const PAPER_TOP = 0.035;
const PAD_DROP = 0.3; // distância do centro do carimbo até a borracha
const REST = new THREE.Vector3(1.35, 1.75, -0.35);

const ease = {
  inOut: (t) => (t < 0.5 ? 4 * t * t * t : 1 - (-2 * t + 2) ** 3 / 2),
  in: (t) => t * t * t,
  outBack: (t) => 1 + 2.4 * (t - 1) ** 3 + 1.4 * (t - 1) ** 2,
  out: (t) => 1 - (1 - t) ** 3,
};

function shade(hex, amt) {
  const c = new THREE.Color(hex);
  const hsl = {};
  c.getHSL(hsl);
  c.setHSL(hsl.h, Math.min(1, hsl.s * 1.05), Math.max(0, Math.min(1, hsl.l + amt)));
  return c;
}

export function createStampScene(canvas) {
  let renderer;
  try {
    renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true, powerPreference: 'low-power' });
  } catch (e) {
    console.warn('Sem WebGL', e);
    return null;
  }
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.NeutralToneMapping;
  renderer.toneMappingExposure = 1;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;

  const scene = new THREE.Scene();
  const pmrem = new THREE.PMREMGenerator(renderer);
  scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
  scene.environmentIntensity = 0.65;

  const camera = new THREE.PerspectiveCamera(30, 1, 0.1, 100);
  const camBase = new THREE.Vector3(0, 7.4, 6.4);
  const lookAt = new THREE.Vector3(0, 0.15, -0.7);

  scene.add(new THREE.HemisphereLight(0xffffff, 0x7a5cff, 0.45));
  const sun = new THREE.DirectionalLight(0xffffff, 1.7);
  sun.position.set(2.2, 8, 3.2);
  sun.castShadow = true;
  sun.shadow.mapSize.set(1024, 1024);
  Object.assign(sun.shadow.camera, { left: -4, right: 4, top: 4, bottom: -4, near: 1, far: 20 });
  sun.shadow.bias = -0.0006;
  sun.shadow.radius = 4;
  scene.add(sun);

  // Sombra macia no "chão" invisível
  const catcher = new THREE.Mesh(new THREE.PlaneGeometry(16, 16), new THREE.ShadowMaterial({ opacity: 0.22 }));
  catcher.rotation.x = -Math.PI / 2;
  catcher.position.y = -0.7;
  catcher.receiveShadow = true;
  scene.add(catcher);

  // Folha do dia
  const paperCanvas = document.createElement('canvas');
  paperCanvas.width = paperCanvas.height = SIZE;
  const pctx = paperCanvas.getContext('2d');
  const tex = new THREE.CanvasTexture(paperCanvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = renderer.capabilities.getMaxAnisotropy();

  const paper = new THREE.Group();
  const paperBody = new THREE.Mesh(
    new RoundedBoxGeometry(P, 0.06, P, 2, 0.03),
    new THREE.MeshStandardMaterial({ color: '#e9e1d1', roughness: 0.9 }),
  );
  paperBody.castShadow = true;
  paperBody.receiveShadow = true;
  const paperTop = new THREE.Mesh(
    new THREE.PlaneGeometry(P - 0.02, P - 0.02),
    new THREE.MeshStandardMaterial({ map: tex, roughness: 0.82 }),
  );
  paperTop.rotation.x = -Math.PI / 2;
  paperTop.position.y = PAPER_TOP;
  paperTop.receiveShadow = true;
  paper.add(paperBody, paperTop);
  scene.add(paper);

  // Carimbo de brinquedo
  const stamp = new THREE.Group();
  const plastic = new THREE.MeshPhysicalMaterial({ color: '#ff3b5c', roughness: 0.32, clearcoat: 1, clearcoatRoughness: 0.12 });
  const knobMat = new THREE.MeshPhysicalMaterial({ color: '#ff7a8f', roughness: 0.25, clearcoat: 1, clearcoatRoughness: 0.08 });
  const neckMat = new THREE.MeshPhysicalMaterial({ color: '#fff4e2', roughness: 0.4, clearcoat: 0.6 });
  const rubber = new THREE.MeshStandardMaterial({ color: '#a3122c', roughness: 0.85 });

  const base = new THREE.Mesh(new RoundedBoxGeometry(1.2, 0.34, 1.2, 4, 0.12), plastic);
  const pad = new THREE.Mesh(new RoundedBoxGeometry(1.08, 0.12, 1.08, 3, 0.04), rubber);
  pad.position.y = -0.22;
  const neck = new THREE.Mesh(new THREE.CylinderGeometry(0.17, 0.26, 0.55, 40), neckMat);
  neck.position.y = 0.44;
  const knob = new THREE.Mesh(new THREE.SphereGeometry(0.4, 48, 32), knobMat);
  knob.position.y = 0.92;
  knob.scale.set(1, 0.86, 1);
  for (const m of [base, pad, neck, knob]) { m.castShadow = true; stamp.add(m); }
  stamp.position.copy(REST);
  scene.add(stamp);

  function setInk(hex) {
    plastic.color.set(hex);
    knobMat.color.copy(shade(hex, 0.12));
    rubber.color.copy(shade(hex, -0.22));
  }

  // ---------- animação ----------
  const tasks = [];
  function tween(duration, update, easing = ease.inOut) {
    return new Promise((resolve) => {
      tasks.push({ start: performance.now(), duration, update, easing, resolve });
      wake();
    });
  }

  let busy = false;
  let shake = 0;
  let squash = 0;
  let paperDip = 0;
  let currentKey = null;

  function redraw() {
    if (currentKey) drawDay(pctx, currentKey);
    tex.needsUpdate = true;
    wake();
  }

  function setDay(key, dir = 0) {
    if (!dir || !currentKey) {
      currentKey = key;
      redraw();
      return Promise.resolve();
    }
    const from = paper.position.x;
    return tween(200, (t) => { paper.position.x = from - dir * 7 * t; }, ease.in)
      .then(() => {
        currentKey = key;
        redraw();
        return tween(380, (t) => { paper.position.x = dir * 7 * (1 - t); }, ease.out);
      })
      .then(() => { paper.position.x = 0; });
  }

  function worldFromAnchor(a) {
    return new THREE.Vector3((a.x / SIZE - 0.5) * (P - 0.02), PAPER_TOP, (a.y / SIZE - 0.5) * (P - 0.02));
  }

  function toScreen(v) {
    const p = v.clone().project(camera);
    const r = canvas.getBoundingClientRect();
    return { x: r.left + ((p.x + 1) / 2) * r.width, y: r.top + ((1 - p.y) / 2) * r.height };
  }

  // Carimba a marca de um marcador. `onImpact` é chamado quando bate no papel.
  async function stampIt(key, trackerId, color, onImpact) {
    if (busy) { currentKey = key; redraw(); onImpact?.(null); return; }
    busy = true;
    setInk(color);
    const target = worldFromAnchor(anchorFor(key, trackerId));
    const above = target.clone().setY(1.35);
    const from = stamp.position.clone();
    const fromRot = stamp.rotation.clone();

    await tween(300, (t) => {
      stamp.position.lerpVectors(from, above, t);
      stamp.rotation.set(fromRot.x * (1 - t), fromRot.y * (1 - t), fromRot.z * (1 - t));
    });
    const downFrom = stamp.position.clone();
    const down = target.clone().setY(PAPER_TOP + PAD_DROP);
    await tween(110, (t) => { stamp.position.lerpVectors(downFrom, down, t); }, ease.in);

    currentKey = key;
    redraw();
    shake = 1;
    squash = 1;
    paperDip = 1;
    onImpact?.(toScreen(target));

    await tween(150, () => {});
    const upFrom = stamp.position.clone();
    await tween(520, (t) => { stamp.position.lerpVectors(upFrom, REST, t); }, ease.outBack);
    busy = false;
  }

  // ---------- loop ----------
  let wanted = true;
  let active = true;
  let raf = 0;
  let last = performance.now();
  const t0 = last;

  function frame() {
    raf = 0;
    const now = performance.now();
    const t = (now - t0) / 1000;
    const dt = Math.min((now - last) / 1000, 0.05);
    last = now;

    for (let i = tasks.length - 1; i >= 0; i--) {
      const k = tasks[i];
      const p = Math.min(1, (now - k.start) / k.duration);
      k.update(k.easing(p));
      if (p >= 1) { tasks.splice(i, 1); k.resolve(); }
    }

    if (!busy) {
      stamp.position.y = REST.y + Math.sin(t * 1.7) * 0.09;
      stamp.rotation.set(-0.12 + Math.sin(t * 1.1) * 0.04, Math.sin(t * 0.6) * 0.35, 0.22 + Math.cos(t * 0.9) * 0.05);
    }
    paper.rotation.set(Math.sin(t * 0.8) * 0.025, 0, Math.cos(t * 0.6) * 0.02);
    paper.position.y = Math.sin(t * 0.9) * 0.03 - paperDip * 0.08;

    squash = Math.max(0, squash - dt * 6);
    stamp.scale.set(1 + squash * 0.06, 1 - squash * 0.12, 1 + squash * 0.06);
    paperDip = Math.max(0, paperDip - dt * 5);
    shake = Math.max(0, shake - dt * 4);
    camera.position.set(
      camBase.x + (Math.random() - 0.5) * shake * 0.12,
      camBase.y + (Math.random() - 0.5) * shake * 0.12,
      camBase.z,
    );
    camera.lookAt(lookAt);

    renderer.render(scene, camera);
    if (active) raf = requestAnimationFrame(frame);
  }

  function wake() {
    if (!raf && active) raf = requestAnimationFrame(frame);
  }

  function resize() {
    const w = canvas.clientWidth;
    const h = canvas.clientHeight;
    if (!w || !h) return;
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    // Afasta a câmera em telas estreitas para a folha caber inteira.
    const fit = Math.max(1, 1.12 / camera.aspect);
    camBase.set(0, 7.4 * fit, 6.4 * fit);
    camera.updateProjectionMatrix();
    wake();
  }
  const ro = new ResizeObserver(resize);
  ro.observe(canvas);
  resize();

  function setActive(on) {
    wanted = on;
    active = wanted && !document.hidden;
    if (active) { last = performance.now(); wake(); }
  }
  document.addEventListener('visibilitychange', () => setActive(wanted));
  setActive(true);

  return { setDay, stamp: stampIt, redraw, setActive, isBusy: () => busy };
}

// Sem WebGL: mostra a folha desenhada em 2D.
export function createFlatPaper(canvas) {
  canvas.width = canvas.height = SIZE;
  const ctx = canvas.getContext('2d');
  let currentKey = null;
  const redraw = () => currentKey && drawDay(ctx, currentKey);
  return {
    setDay(key) { currentKey = key; redraw(); return Promise.resolve(); },
    stamp(key, _id, _color, onImpact) {
      currentKey = key; redraw();
      const r = canvas.getBoundingClientRect();
      onImpact?.({ x: r.left + r.width / 2, y: r.top + r.height / 2 });
      return Promise.resolve();
    },
    redraw,
    setActive() {},
    isBusy: () => false,
  };
}
