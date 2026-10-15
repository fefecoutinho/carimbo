// Palavras francesas frequentes com tradução para o português (ordem aproximada de frequência).
// Formato: "francês|português" ou "francês|português|observação".
const RAW = `
être|ser / estar
avoir|ter
faire|fazer
dire|dizer
aller|ir
voir|ver
savoir|saber
pouvoir|poder
vouloir|querer
venir|vir
devoir|dever / ter que
prendre|pegar / tomar
le temps|o tempo
la vie|a vida
le jour|o dia
l'homme|o homem|masc.
la femme|a mulher / a esposa
l'enfant|a criança|masc. ou fem.
le monde|o mundo
la main|a mão
la chose|a coisa
oui|sim
non|não
merci|obrigado / obrigada
bonjour|bom dia / olá
au revoir|tchau / até logo
s'il vous plaît|por favor
pardon|desculpa / com licença
d'accord|tá bom / de acordo
très|muito (+ adjetivo)
beaucoup|muito / bastante
peu|pouco
trop|demais
aussi|também
encore|ainda / de novo
déjà|já
toujours|sempre / ainda
jamais|nunca
souvent|frequentemente
parfois|às vezes
maintenant|agora
aujourd'hui|hoje
hier|ontem
demain|amanhã
bientôt|em breve
tard|tarde
tôt|cedo
ici|aqui
là|lá / aí
loin|longe
près|perto
bien|bem
mal|mal
mieux|melhor (advérbio)
peut-être|talvez
vraiment|realmente / de verdade
ensemble|juntos
ensuite|depois / em seguida
alors|então
mais|mas
et|e
ou|ou
où|onde
parce que|porque
pourquoi|por quê
comment|como
quand|quando
qui|quem
quoi|o quê
combien|quanto
avec|com
sans|sem
pour|para
chez|na casa de
dans|dentro de / em
sur|sobre / em cima de
sous|embaixo de
devant|na frente de
derrière|atrás de
entre|entre
avant|antes
après|depois
pendant|durante
depuis|desde / há (tempo)
contre|contra
vers|em direção a / por volta de
quelque chose|alguma coisa
quelqu'un|alguém
personne|ninguém
rien|nada
tout le monde|todo mundo
plusieurs|vários
chaque|cada
autre|outro
même|mesmo
seul|sozinho / único
tout|tudo / todo
la maison|a casa
le pays|o país
la ville|a cidade
l'année|o ano|fem.
le mois|o mês
la semaine|a semana
l'heure|a hora|fem.
la minute|o minuto
le matin|a manhã
le soir|a noite (início) / o fim de tarde
la nuit|a noite
le travail|o trabalho
l'eau|a água|fem.
le pain|o pão
le café|o café
le vin|o vinho
la bière|a cerveja
le lait|o leite
la viande|a carne
le poisson|o peixe
le fromage|o queijo
la pomme|a maçã
le fruit|a fruta
le légume|o legume
le sucre|o açúcar
le sel|o sal
l'œuf|o ovo|masc.
le riz|o arroz
le gâteau|o bolo
la table|a mesa
la chaise|a cadeira
le lit|a cama
la porte|a porta
la fenêtre|a janela
la chambre|o quarto
la cuisine|a cozinha
la salle de bain|o banheiro
le livre|o livro
le mot|a palavra
la langue|a língua
la question|a pergunta
la réponse|a resposta
l'ami|o amigo|masc.
l'amie|a amiga|fem.
la famille|a família
le père|o pai
la mère|a mãe
le frère|o irmão
la sœur|a irmã
le fils|o filho
la fille|a filha / a menina
le garçon|o menino / o garçom
les parents|os pais
le mari|o marido
le chien|o cachorro
le chat|o gato
l'oiseau|o pássaro|masc.
le cheval|o cavalo
la voiture|o carro
le train|o trem
l'avion|o avião|masc.
le vélo|a bicicleta
le bus|o ônibus
la rue|a rua
la route|a estrada
le chemin|o caminho
la mer|o mar
la plage|a praia
la montagne|a montanha
le ciel|o céu
le soleil|o sol
la lune|a lua
l'étoile|a estrela|fem.
la pluie|a chuva
le vent|o vento
la neige|a neve
l'arbre|a árvore|masc.
la fleur|a flor
le feu|o fogo
la terre|a terra
l'argent|o dinheiro / a prata|masc.
le prix|o preço / o prêmio
le magasin|a loja
le marché|o mercado / a feira
l'école|a escola|fem.
le professeur|o professor
l'élève|o aluno / a aluna
le bureau|o escritório / a escrivaninha
l'entreprise|a empresa|fem.
le patron|o chefe / o patrão
le médecin|o médico
l'hôpital|o hospital|masc.
la santé|a saúde
le corps|o corpo
la tête|a cabeça
l'œil|o olho|masc.
les yeux|os olhos
la bouche|a boca
le nez|o nariz
l'oreille|a orelha|fem.
le cœur|o coração
le pied|o pé
le bras|o braço
la jambe|a perna
le dos|as costas
les cheveux|o cabelo
la voix|a voz
le nom|o nome
l'histoire|a história|fem.
la musique|a música
le film|o filme
la chanson|a canção / a música
le jeu|o jogo
le sport|o esporte
la fête|a festa
le cadeau|o presente
le voyage|a viagem
les vacances|as férias
le téléphone|o telefone
l'ordinateur|o computador|masc.
le journal|o jornal
la lettre|a carta / a letra
l'idée|a ideia|fem.
le problème|o problema
la raison|a razão
la vérité|a verdade
l'amour|o amor|masc.
la peur|o medo
la joie|a alegria
le bonheur|a felicidade
la guerre|a guerra
la paix|a paz
la loi|a lei
la force|a força
la place|o lugar / a praça
le côté|o lado
le moment|o momento
la fois|a vez
le début|o começo
la fin|o fim
le besoin|a necessidade
l'envie|a vontade|fem.
la partie|a parte / a partida
le bruit|o barulho
la couleur|a cor
la taille|o tamanho / a altura
le vêtement|a roupa
la chemise|a camisa
le pantalon|a calça
la chaussure|o sapato
la robe|o vestido
le sac|a bolsa / a sacola
la clé|a chave
le verre|o copo / o vidro
l'assiette|o prato|fem.
le couteau|a faca
la fourchette|o garfo
la cuillère|a colher
le repas|a refeição
le petit-déjeuner|o café da manhã
le déjeuner|o almoço
le dîner|o jantar
la gare|a estação de trem
le quartier|o bairro
la campagne|o campo / o interior
le jardin|o jardim
le mur|a parede / o muro
l'escalier|a escada|masc.
le coin|o canto / a esquina
le visage|o rosto
le sourire|o sorriso
la personne|a pessoa
les gens|as pessoas
la société|a sociedade / a empresa
le roi|o rei
la reine|a rainha
trouver|encontrar / achar
donner|dar
parler|falar
aimer|amar / gostar
passer|passar
mettre|pôr / colocar
penser|pensar
croire|acreditar / achar
demander|perguntar / pedir
rester|ficar
comprendre|entender
attendre|esperar
partir|partir / ir embora
sortir|sair
arriver|chegar
connaître|conhecer
sentir|sentir
tenir|segurar
entendre|ouvir
chercher|procurar
commencer|começar
finir|terminar
écrire|escrever
lire|ler
manger|comer
boire|beber
dormir|dormir
ouvrir|abrir
fermer|fechar
jouer|jogar / brincar / tocar
travailler|trabalhar
acheter|comprar
payer|pagar
vivre|viver
mourir|morrer
perdre|perder
gagner|ganhar
apprendre|aprender
oublier|esquecer
montrer|mostrar
regarder|olhar / assistir
écouter|escutar
appeler|chamar / ligar
aider|ajudar
marcher|andar / caminhar
courir|correr
tomber|cair
monter|subir
descendre|descer
entrer|entrar
rentrer|voltar (para casa)
revenir|voltar
devenir|tornar-se
changer|mudar / trocar
essayer|tentar / experimentar
utiliser|usar
laisser|deixar
porter|levar / usar (roupa)
envoyer|enviar
recevoir|receber
répondre|responder
vendre|vender
choisir|escolher
décider|decidir
expliquer|explicar
raconter|contar (uma história)
rire|rir
pleurer|chorar
se souvenir|lembrar-se
s'asseoir|sentar-se
se lever|levantar-se
se coucher|deitar-se
habiter|morar
voyager|viajar
nager|nadar
chanter|cantar
danser|dançar
cuisiner|cozinhar
nettoyer|limpar
laver|lavar
conduire|dirigir
préférer|preferir
espérer|ter esperança / esperar que
suivre|seguir
arrêter|parar
continuer|continuar
garder|guardar / manter
rencontrer|encontrar (alguém) / conhecer
visiter|visitar (um lugar)
offrir|oferecer / dar de presente
sembler|parecer
compter|contar (números)
manquer|faltar / sentir falta
casser|quebrar
réparer|consertar
préparer|preparar
dessiner|desenhar
étudier|estudar
enseigner|ensinar
réussir|conseguir / ter sucesso
bon|bom
bonne|boa
mauvais|ruim / mau
grand|grande / alto
petit|pequeno
beau|bonito
belle|bonita
joli|bonito / lindo
nouveau|novo
vieux|velho
jeune|jovem
long|longo / comprido
court|curto
haut|alto
bas|baixo
gros|grande / gordo
mince|magro
chaud|quente
froid|frio
facile|fácil
difficile|difícil
vrai|verdadeiro
faux|falso / errado
plein|cheio
vide|vazio
propre|limpo / próprio
sale|sujo
riche|rico
pauvre|pobre
heureux|feliz
triste|triste
content|contente
fatigué|cansado
malade|doente
fort|forte
faible|fraco
rapide|rápido
lent|lento
cher|caro / querido
important|importante
possible|possível
premier|primeiro
dernier|último
prochain|próximo
blanc|branco
noir|preto
rouge|vermelho
bleu|azul
vert|verde
jaune|amarelo
gris|cinza
ouvert|aberto
fermé|fechado
libre|livre
prêt|pronto
sûr|seguro / certo
drôle|engraçado
gentil|gentil / legal
méchant|malvado
dangereux|perigoso
célèbre|famoso
étrange|estranho
meilleur|melhor (adjetivo)
pire|pior
un|um
deux|dois
trois|três
quatre|quatro
cinq|cinco
six|seis
sept|sete
huit|oito
neuf|nove
dix|dez
vingt|vinte
cent|cem
mille|mil
lundi|segunda-feira
mardi|terça-feira
mercredi|quarta-feira
jeudi|quinta-feira
vendredi|sexta-feira
samedi|sábado
dimanche|domingo
`;

export const WORDS = RAW.trim().split('\n').map((line) => {
  const [fr, pt, note] = line.split('|');
  return { fr, pt, note: note || '' };
});
