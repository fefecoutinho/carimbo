// Temas do app: cada um muda o fundo e o material do carimbo 3D.
// Os fundos ficam em css/app.css (body[data-theme=…] #sky e .tprev.…).

export const THEMES = [
  { id: 'ceu', name: 'Céu', desc: 'Muda de cor com a hora do dia', stamp: 'toy' },
  { id: 'madeira', name: 'Madeira', desc: 'Mesa de marceneiro e carimbo de madeira', stamp: 'wood', sky: ['#2a1609', '#6e3d1b', '#d08a45'] },
  { id: 'ouro', name: 'Ouro', desc: 'Carimbo de ouro maciço. Puro luxo', stamp: 'gold', sky: ['#120d05', '#4a3510', '#f2c14e'] },
  { id: 'cromo', name: 'Cromo', desc: 'Todas as cores, girando sem parar', stamp: 'chroma', sky: ['#14062e', '#ff3b8a', '#2fd1ff'] },
  { id: 'opala', name: 'Opala', desc: 'Perolado e iridescente', stamp: 'opal', sky: ['#0e1630', '#3c5a8c', '#9fe8e0'] },
  { id: 'monstro', name: 'Monstro', desc: 'O carimbo ganhou olhos. Ele te observa', stamp: 'monster', sky: ['#1a0b3a', '#3d1a78', '#7cff6b'] },
  // Mantém o id 'grafite' para quem já tinha escolhido o tema antigo.
  { id: 'grafite', name: 'Noir', desc: 'Preto profundo com uma onda líquida animada', stamp: 'graphite', sky: ['#020208', '#0a0f3a', '#3a2bd6'] },
  { id: 'brasil', name: 'Brasil', desc: 'Verde, amarelo e o céu estrelado da bandeira', stamp: 'brasil', sky: ['#00401c', '#007a33', '#ffdf00'] },
  { id: 'franca', name: 'França', desc: 'Paris à noite, bleu, blanc, rouge', stamp: 'franca', sky: ['#060818', '#0a1030', '#ef4135'] },
];

export const themeById = (id) => THEMES.find((t) => t.id === id) || THEMES[0];
