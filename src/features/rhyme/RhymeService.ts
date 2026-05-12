// Motor de rimas em TypeScript puro — zero dependências externas
// Algoritmo: matching por sufixo fonético normalizado (sem acentos)

const WORD_BANK: readonly string[] = [
  // -ão
  'coração','situação','irmão','missão','ladrão','campeão',
  'paixão','traição','solidão','nação','razão','visão',
  'prisão','função','atenção','emoção','lição','ação',
  'condição','relação','conexão','proteção','evolução',
  'revolução','geração','tentação','vocação','ambição',
  'respiração','celebração','comunicação','desolação',
  'inspiração','admiração','motivação','contemplação',

  // -ada
  'nada','calada','estrada','quebrada','madrugada',
  'jornada','chegada','jogada','passada','chamada',
  'virada','pancada','facada','morada','temporada',
  'barricada','forçada','bofetada','pisada','parada',
  'tomada','punhalada','fumada','pegada','escapada',
  'marcada','sonhada','largada','encruzilhada','traçada',

  // -eiro
  'dinheiro','parceiro','guerreiro','verdadeiro','primeiro',
  'inteiro','rasteiro','mensageiro','feiticeiro','bandoleiro',
  'forasteiro','cavaleiro','companheiro','passageiro',
  'aventureiro','pedreiro','ferreiro','marinheiro',
  'motoqueiro','funkeiro','pagodeiro','cabeleireiro',
  'prisioneiro','mineiro','mochileiro',

  // -ia
  'fria','melodia','magia','covardia','alegria',
  'ousadia','fantasia','harmonia','agonia','ironia',
  'energia','utopia','euforia','poesia','teoria',
  'galeria','vitória','memória','história','glória',
  'trajetória','heresia',

  // -ente
  'frente','gente','corrente','semente','quente',
  'diferente','presente','recente','consciente',
  'inocente','urgente','evidente','independente',
  'transparente','aparente','impaciente','fluente',
  'frequente','persistente','resistente','contente',
  'decente','potente','vivente',

  // -ura
  'altura','cultura','mistura','criatura','loucura',
  'abertura','pintura','aventura','ternura','doçura',
  'estrutura','ruptura','cobertura','futura','natura',
  'escultura','conjuntura','armadura','fritura',

  // -ido / -ida
  'seguido','perdido','ferido','vivido','decidido',
  'escolhido','sofrido','batido','sentido','partido',
  'conhecido','envolvido','sumido','nascido','esquecido',
  'fugido','recebido','definido',
  'vida','saída','partida','corrida','comida',
  'bebida','medida','querida','avenida','ferida',
  'despedida','guarida',

  // -or
  'amor','calor','dor','valor','melhor','maior',
  'menor','cor','flor','terror','favor','humor',
  'senhor','cantor','doutor','motor','exterior',
  'interior','inferior','superior','produtor','autor',
  'governador','trabalhador','sonhador','lutador',
  'vencedor',

  // -al
  'real','igual','final','sinal','local','fatal',
  'leal','mental','total','original','nacional',
  'global','brutal','digital','natural','marginal',
  'racional','pessoal','especial','genial','atual',
  'virtual','criminal','profissional','emocional',
  'intelectual','espiritual','cultural','animal',

  // -eza
  'beleza','tristeza','riqueza','natureza','firmeza',
  'leveza','pobreza','certeza','pureza','nobreza',
  'fraqueza','dureza','realeza','delicadeza',

  // -agem
  'viagem','passagem','coragem','mensagem','linguagem',
  'imagem','montagem','vantagem','homenagem','garagem',
  'bagagem','personagem','reportagem',

  // -oso / -osa
  'famoso','poderoso','perigoso','gostoso','amoroso',
  'nervoso','misterioso','generoso','valeroso','vitorioso',
  'orgulhoso','glorioso','precioso','ansioso','curioso',
  'formosa','grandiosa','venenosa','dolorosa','saborosa',

  // -ando / -endo / -indo
  'falando','caminhando','pensando','lutando','buscando',
  'chegando','gritando','contando','tentando','errando',
  'acertando','mandando','guardando','ganhando','sangrando',
  'subindo','sofrendo','fugindo','saindo','caindo',
  'correndo','seguindo','vivendo','crescendo','descendo',

  // -inho / -ino / -ano
  'caminho','sozinho','vizinho','carinho','novinho',
  'destino','latino','masculino','clandestino','menino',
  'queridinho','gatinho','bonzinho',
  'plano','humano','urbano','soberano','americano',

  // -ima / -ama
  'rima','clima','prima','cima','vítima','última',
  'fama','chama','drama','grama','programa','trama',
  'panorama','cama','dama',

  // -ade
  'saudade','verdade','cidade','vontade','liberdade',
  'amizade','lealdade','crueldade','felicidade','realidade',
  'identidade','oportunidade','necessidade','eternidade',
  'capacidade','autoridade',

  // -ela / -elo
  'belo','gelo','cabelo','modelo','apelo','paralelo',
  'bela','janela','novela','aquarela','canela',
  'favela','viela',

  // -ar
  'lugar','olhar','amar','falar','chamar','ficar',
  'buscar','voltar','andar','cantar','lutar','gritar',
  'sonhar','tentar','entrar','passar','ganhar','esperar',
  'bailar','encarar','superar','despertar','conquistar',

  // -undo
  'mundo','fundo','segundo','profundo','imundo','vagabundo',

  // -alho / -ilha / -ilho
  'brilho','trilho','filho','vermelho','espelho',
  'trabalho','orgulho','conselho','maravilha',

  // -ito / -ita
  'bonito','bendito','maldito','espírito','infinito',
  'bonita','maldita','bendita',

  // -orte / -arte / -oite
  'forte','sorte','morte','norte','porte',
  'parte','arte','marte',
  'noite',
]

function normalize(word: string): string {
  return word
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z]/g, '')
}

export function findRhymes(input: string, limit = 10): string[] {
  if (!input || input.length < 2) return []
  const normInput = normalize(input)

  for (const suffixLen of [4, 3, 2]) {
    if (normInput.length < suffixLen) continue
    const suffix = normInput.slice(-suffixLen)
    const matches = WORD_BANK.filter(w => {
      const n = normalize(w)
      return n !== normInput && n.slice(-suffixLen) === suffix
    })
    if (matches.length >= 3) return matches.slice(0, limit)
  }

  return []
}
