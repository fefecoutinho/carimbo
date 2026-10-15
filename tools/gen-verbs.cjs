// Gera js/learn/verbs.js a partir do french-verbs + Lefff (Apache-2.0).
const FV = require('french-verbs');
const L = require('french-verbs-lefff/dist/conjugations.json');
const fs = require('fs');

const LIST = [
  ['être','ser / estar'],['avoir','ter'],['aller','ir'],['faire','fazer'],['dire','dizer'],['pouvoir','poder'],
  ['vouloir','querer'],['savoir','saber'],['voir','ver'],['venir','vir'],['devoir','dever'],['prendre','pegar / tomar'],
  ['mettre','pôr / colocar'],['donner','dar'],['parler','falar'],['trouver','encontrar'],['penser','pensar'],
  ['aimer','amar / gostar'],['passer','passar'],['croire','acreditar'],['partir','partir / ir embora'],['tenir','segurar'],
  ['comprendre','entender'],['connaître','conhecer'],['demander','pedir / perguntar'],['rendre','devolver'],
  ['attendre','esperar (aguardar)'],['sortir','sair'],['vivre','viver'],['entendre','ouvir'],['écrire','escrever'],
  ['lire','ler'],['boire','beber'],['manger','comer'],['dormir','dormir'],['ouvrir','abrir'],['finir','terminar'],
  ['choisir','escolher'],['réussir','conseguir / ter sucesso'],['grandir','crescer'],['commencer','começar'],
  ['jouer','jogar / brincar'],['travailler','trabalhar'],['regarder','olhar / assistir'],['écouter','escutar'],
  ['chercher','procurar'],['arriver','chegar'],['rester','ficar'],['tomber','cair'],['entrer','entrar'],
  ['monter','subir'],['descendre','descer'],['naître','nascer'],['mourir','morrer'],['devenir','tornar-se'],
  ['revenir','voltar'],['retourner','retornar'],['rentrer','voltar (para casa)'],['acheter','comprar'],
  ['appeler','chamar / ligar'],['payer','pagar'],['envoyer','enviar'],['essayer','tentar'],['préférer','preferir'],
  ['espérer','esperar (ter esperança)'],['courir','correr'],['recevoir','receber'],['apprendre','aprender'],
  ['perdre','perder'],['vendre','vender'],['répondre','responder'],['suivre','seguir'],['offrir','oferecer'],
  ['sentir','sentir'],['servir','servir'],['plaire','agradar'],['rire','rir'],['conduire','dirigir'],
  ['construire','construir'],['peindre','pintar'],['craindre','temer'],['voyager','viajar'],['nager','nadar'],
  ['aider','ajudar'],['oublier','esquecer'],['montrer','mostrar'],['habiter','morar'],['étudier','estudar'],
  ['changer','mudar'],['laisser','deixar'],['porter','levar / vestir'],['utiliser','usar'],['découvrir','descobrir'],
  ['sourire','sorrir'],['battre','bater'],['mentir','mentir'],['obtenir','obter'],['permettre','permitir'],
  ['promettre','prometer'],['se lever','levantar-se'],["s'appeler",'chamar-se'],['se souvenir','lembrar-se'],
  ['se coucher','deitar-se'],['se promener','passear'],["s'habiller",'vestir-se'],['se réveiller','acordar'],
  ['se dépêcher','apressar-se'],["s'amuser",'divertir-se'],
];

const TENSES = ['PRESENT','PASSE_COMPOSE','IMPARFAIT','FUTUR','CONDITIONNEL_PRESENT','SUBJONCTIF_PRESENT','PLUS_QUE_PARFAIT'];
const COMPOUND = new Set(['PASSE_COMPOSE','PLUS_QUE_PARFAIT']);
const BOTH = { monter:'ETRE', descendre:'ETRE', sortir:'ETRE', rentrer:'ETRE', retourner:'ETRE', passer:'AVOIR' };

const out = [];
for (const [inf, pt] of LIST) {
  const pron = /^(se |s')/.test(inf);
  const base = inf.replace(/^se |^s'/, '');
  if (!L[base]) { console.error('MISSING', inf); continue; }
  const etre = pron || FV.alwaysAuxEtre(base);
  const primary = BOTH[base] || (etre ? 'ETRE' : 'AVOIR');
  const auxes = BOTH[base] ? [primary, primary === 'ETRE' ? 'AVOIR' : 'ETRE'] : [primary];
  const t = {};
  for (const tense of TENSES) {
    t[tense] = [];
    for (let p = 0; p < 6; p++) {
      if (!COMPOUND.has(tense)) { t[tense].push(FV.getConjugation(L, inf, tense, p, {})); continue; }
      const num = p >= 3 ? 'P' : 'S';
      const forms = (g) => {
        const r = [];
        for (const aux of auxes) {
          const opts = aux === 'ETRE' ? { aux, agreeGender: g, agreeNumber: num } : { aux };
          const f = FV.getConjugation(L, inf, tense, p, opts);
          if (!r.includes(f)) r.push(f);
        }
        return r;
      };
      const m = forms('M'); const f = forms('F');
      if (m.join() === f.join()) t[tense].push(m.length === 1 ? m[0] : m);
      else t[tense].push({ m, f });
    }
  }
  out.push({ inf, pt, t });
}
const header = `// Conjugações geradas a partir de french-verbs + french-verbs-lefff (Apache-2.0, dados do Lefff).
// Não edite à mão: regenere com o script de geração.
// Cada pessoa (je, tu, il/elle, nous, vous, ils/elles) é: "forma" | ["forma", "variante aceita"] | { m: [...], f: [...] } (concordância com être).
`;
fs.writeFileSync(process.argv[2], header + 'export const VERBS = ' + JSON.stringify(out) + ';\n');
console.log('verbs', out.length);
