# Carimbo

Meu calendário de marcar o dia — treino, cardio, peso, livros, kanji, eventos e o
que mais eu quiser acompanhar. Nasceu da folha de calendário que eu imprimia e
carimbava todo dia.

- Feito como web app (PWA): instala no iPhone pelo Safari → Compartilhar →
  **Adicionar à Tela de Início** e funciona sem internet.
- Os dados ficam só no aparelho (localStorage). Use **Ajustes → Exportar backup**
  de vez em quando.
- Sem etapa de build: é HTML, CSS e JavaScript puros. Bibliotecas e fontes ficam
  em `vendor/` e `fonts/` para funcionar offline.

## Estrutura

| Pasta/arquivo | O que é |
| --- | --- |
| `index.html` | Página única do app |
| `css/app.css` | Todo o visual |
| `js/app.js` | Início, abas, céu que muda com a hora |
| `js/store.js` | Dados (marcadores e dias) e backup |
| `js/scene.js` | Cena 3D (three.js): folha do dia + carimbo |
| `js/paper.js` | Desenho da folha do dia (carimbos, X, peso, kanji…) |
| `js/sheets.js` | Telas que sobem de baixo para marcar e editar |
| `js/screens/` | Hoje, Mês, Progresso e Ajustes |
| `sw.js` | Modo offline — **mude `VERSION` a cada atualização** |

## Rodar no computador

```sh
npx http-server -c-1 .
```

## Créditos

- [three.js](https://threejs.org) (MIT) — `vendor/THREE-LICENSE`
- Fontes [Unbounded](https://github.com/googlefonts/unbounded) e
  [Caveat](https://github.com/googlefonts/caveat) (SIL OFL) — `fonts/`
