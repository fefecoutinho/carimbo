// Temas do app: cada um muda o fundo e o material do carimbo 3D.
// Os fundos ficam em css/app.css (body[data-theme=…] #sky e .tprev.…).

export const THEMES = [
  { id: 'ceu', name: 'Céu', desc: 'Muda de cor com a hora do dia', stamp: 'toy' },
  { id: 'madeira', name: 'Madeira', desc: 'Mesa de marceneiro e carimbo de madeira', stamp: 'wood', sky: ['#2a1609', '#6e3d1b', '#d08a45'] },
  { id: 'ouro', name: 'Ouro', desc: 'Carimbo de ouro maciço. Puro luxo', stamp: 'gold', sky: ['#120d05', '#4a3510', '#f2c14e'] },
  { id: 'cromo', name: 'Cromo', desc: 'Todas as cores, girando sem parar', stamp: 'chroma', sky: ['#14062e', '#ff3b8a', '#2fd1ff'] },
  { id: 'opala', name: 'Opala', desc: 'Perolado e iridescente', stamp: 'opal', sky: ['#0e1630', '#3c5a8c', '#9fe8e0'] },
  { id: 'monstro', name: 'Monstro', desc: 'O carimbo ganhou olhos. Ele te observa', stamp: 'monster', sky: ['#1a0b3a', '#3d1a78', '#7cff6b'] },
  { id: 'grafite', name: 'Grafite', desc: 'Minimalista, preto e cinza', stamp: 'graphite', sky: ['#0b0b0f', '#1c1c24', '#4a4a58'] },
];

export const themeById = (id) => THEMES.find((t) => t.id === id) || THEMES[0];
