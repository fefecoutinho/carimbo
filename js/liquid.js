// Fundo "líquido" animado do tema Noir: uma onda de seda/lava escura com reflexos,
// calculada na placa de vídeo (WebGL). Leve: desenha em meia resolução e a 30 quadros por segundo.

const VERT = `
attribute vec2 p;
void main() { gl_Position = vec4(p, 0.0, 1.0); }
`;

const FRAG = `
precision highp float;
uniform vec2 res;
uniform float t;

float hash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
float noise(vec2 p) {
  vec2 i = floor(p), f = fract(p);
  vec2 u = f * f * (3.0 - 2.0 * f);
  return mix(mix(hash(i), hash(i + vec2(1, 0)), u.x), mix(hash(i + vec2(0, 1)), hash(i + vec2(1, 1)), u.x), u.y);
}
float fbm(vec2 p) {
  float v = 0.0, a = 0.5;
  for (int i = 0; i < 4; i++) { v += a * noise(p); p *= 2.03; a *= 0.5; }
  return v;
}

// Altura da "seda": ondas largas, deformadas devagar pelo ruído.
float height(vec2 p) {
  vec2 w = vec2(fbm(p * 0.7 + vec2(0.0, t * 0.035)), fbm(p * 0.7 + vec2(5.2, -t * 0.03)));
  float a = sin(p.x * 1.35 - p.y * 0.55 + w.x * 3.2 + t * 0.16);
  float b = sin(p.x * 0.7 + p.y * 1.1 + w.y * 2.6 - t * 0.11);
  return 0.55 * a + 0.35 * b + 0.25 * fbm(p * 1.4 + w * 1.5);
}

void main() {
  vec2 uv = gl_FragCoord.xy / res;
  vec2 p = (gl_FragCoord.xy - 0.5 * res) / res.y * 2.4;
  p.y -= 0.35;

  float e = 0.012;
  float h = height(p);
  float hx = height(p + vec2(e, 0.0)) - h;
  float hy = height(p + vec2(0.0, e)) - h;
  vec3 n = normalize(vec3(-hx / e * 0.32, -hy / e * 0.32, 1.0));

  vec3 L = normalize(vec3(-0.45, 0.65, 0.62));
  vec3 V = vec3(0.0, 0.0, 1.0);
  float diff = max(dot(n, L), 0.0);
  float spec = pow(max(dot(reflect(-L, n), V), 0.0), 36.0);
  float rim = pow(1.0 - max(n.z, 0.0), 2.2);

  // Cores da referência: preto-azulado, azul ultramarino e um brilho violeta.
  vec3 deep = vec3(0.004, 0.006, 0.03);
  vec3 blue = vec3(0.05, 0.12, 0.62);
  vec3 violet = vec3(0.36, 0.22, 0.95);
  float hn = smoothstep(-0.9, 0.9, h);
  vec3 base = mix(deep, blue, hn * 0.9);
  vec3 col = base * (0.25 + 0.95 * diff) + violet * rim * 0.55 + vec3(0.55, 0.65, 1.0) * spec * 0.55;

  // Horizonte violeta suave e topo bem escuro, como na foto.
  float horizon = exp(-pow((uv.y - 0.56) * 4.2, 2.0));
  col += violet * horizon * 0.22 * (1.0 - hn);
  col = mix(col, deep, smoothstep(0.62, 1.0, uv.y) * 0.92);
  // Vinheta para o texto ficar sempre legível.
  col *= 0.86 - 0.25 * length(uv - vec2(0.5, 0.45));
  gl_FragColor = vec4(col, 1.0);
}
`;

let state = null;

function compile(gl, type, src) {
  const s = gl.createShader(type);
  gl.shaderSource(s, src);
  gl.compileShader(s);
  if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(s));
  return s;
}

export function startLiquid() {
  if (state) return;
  const canvas = document.createElement('canvas');
  canvas.id = 'liquid';
  canvas.setAttribute('aria-hidden', 'true');
  const gl = canvas.getContext('webgl', { antialias: false, alpha: false, powerPreference: 'low-power' });
  if (!gl) return; // sem WebGL: fica o gradiente do CSS
  try {
    const prog = gl.createProgram();
    gl.attachShader(prog, compile(gl, gl.VERTEX_SHADER, VERT));
    gl.attachShader(prog, compile(gl, gl.FRAGMENT_SHADER, FRAG));
    gl.linkProgram(prog);
    gl.useProgram(prog);
    const buf = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buf);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
    const loc = gl.getAttribLocation(prog, 'p');
    gl.enableVertexAttribArray(loc);
    gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);
    state = { canvas, gl, uRes: gl.getUniformLocation(prog, 'res'), uT: gl.getUniformLocation(prog, 't'), raf: 0, last: 0, t0: performance.now() };
  } catch (e) {
    console.warn('Fundo líquido indisponível', e);
    return;
  }
  document.getElementById('sky').append(canvas);
  const resize = () => {
    const scale = 0.5; // meia resolução: fica macio e economiza bateria
    canvas.width = Math.max(1, Math.round(window.innerWidth * scale));
    canvas.height = Math.max(1, Math.round(window.innerHeight * scale));
    state.gl.viewport(0, 0, canvas.width, canvas.height);
  };
  state.resize = resize;
  window.addEventListener('resize', resize);
  resize();
  const frame = (now) => {
    if (!state) return;
    state.raf = requestAnimationFrame(frame);
    if (document.hidden || now - state.last < 33) return; // ~30 fps
    state.last = now;
    const { gl: g } = state;
    g.uniform2f(state.uRes, canvas.width, canvas.height);
    g.uniform1f(state.uT, (now - state.t0) / 1000);
    g.drawArrays(g.TRIANGLES, 0, 3);
  };
  state.raf = requestAnimationFrame(frame);
}

export function stopLiquid() {
  if (!state) return;
  cancelAnimationFrame(state.raf);
  window.removeEventListener('resize', state.resize);
  state.gl.getExtension('WEBGL_lose_context')?.loseContext();
  state.canvas.remove();
  state = null;
}
