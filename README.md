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
| `js/screens/learn.js` | Aba Aprender (jogo Conjugaison) |
| `js/learn/` | Motor do jogo e conjugações (geradas por `tools/gen-verbs.cjs`) |
| `sw.js` | Modo offline — **mude `VERSION` a cada atualização** |

## Rodar no computador

```sh
npx http-server -c-1 .
```

## Conjugações em francês

`js/learn/verbs.js` é gerado (não edite à mão):

```sh
npm install --no-save french-verbs@5.4.0 french-verbs-lefff@3.4.0
node tools/gen-verbs.cjs js/learn/verbs.js
```

## Créditos

- [three.js](https://threejs.org) (MIT) — `vendor/THREE-LICENSE`
- Conjugações: [french-verbs](https://www.npmjs.com/package/french-verbs) e
  [french-verbs-lefff](https://www.npmjs.com/package/french-verbs-lefff) (Apache-2.0),
  com dados do [Lefff](https://almanach.inria.fr/software_and_resources/custom/Lefff-en.html)
- Fontes [Unbounded](https://github.com/googlefonts/unbounded) e
  [Caveat](https://github.com/googlefonts/caveat) (SIL OFL) — `fonts/`
