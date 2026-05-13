// src/features/cliches/ClicheService.ts

import { ClicheAnalysis, ClicheMatch, ClicheSeverity } from '../../shared/types/Metrics'
import { normalizeText } from '../rhyme/phoneticUtils'

interface ClicheEntry {
  phrase: string
  severity: ClicheSeverity
  alternatives: string[]
  suggestion: string
}

// Dicionário de clichês do rap/trap BR com alternativas criativas
const CLICHE_DICTIONARY: ClicheEntry[] = [
  {
    phrase: 'vim do nada',
    severity: 'high',
    alternatives: ['surgido do concreto', 'criado pelo asfalto', 'moldado pelo silêncio'],
    suggestion: 'Especifique de onde: mencione um lugar real ou uma situação concreta'
  },
  {
    phrase: 'hoje to no topo',
    severity: 'high',
    alternatives: ['o altitude me deixou sordo', 'respiro ar que nunca imaginei', 'o mapa não tinha este endereço'],
    suggestion: 'Descreva o que "topo" significa para você especificamente'
  },
  {
    phrase: 'falsos amigos',
    severity: 'high',
    alternatives: ['espelhos que mudam de reflexo', 'vozes que somem com o barulho', 'mãos que não aparecem na queda'],
    suggestion: 'Narre uma situação real de traição ao invés de nomear'
  },
  {
    phrase: 'querem minha queda',
    severity: 'high',
    alternatives: ['constroem valas no meu caminho', 'rezam pela chuva nas minhas sementes', 'fotografam meu tropeço'],
    suggestion: 'Mostre como sabotam — não diga que querem sua queda, mostre a ação'
  },
  {
    phrase: 'contando dinheiro',
    severity: 'medium',
    alternatives: ['números que o passado não escrevia', 'papel que cheira a jornada', 'a aritmética do impossível'],
    suggestion: 'Descreva a sensação, não o ato mecânico'
  },
  {
    phrase: 'minha ex ligando',
    severity: 'high',
    alternatives: ['o passado discou sem pedir licença', 'um número que deveria ser esquecido', 'o histórico de erros chamando de volta'],
    suggestion: 'Evite esse clichê — use a emoção real por trás da chamada'
  },
  {
    phrase: 'vida louca',
    severity: 'medium',
    alternatives: ['caos com ritmo próprio', 'tempestade com horário marcado', 'roteiro sem ensaio'],
    suggestion: 'Especifique o que é louco na sua vida'
  },
  {
    phrase: 'fe em deus',
    severity: 'medium',
    alternatives: ['conversa com o silêncio que responde', 'oração que virou cimento', 'o sagrado que mora no peito'],
    suggestion: 'Espiritualidade profunda merece imagens mais poéticas'
  },
  {
    phrase: 'olha onde eu cheguei',
    severity: 'high',
    alternatives: ['o GPS não conhecia este destino', 'cheguei onde o mapa terminava', 'este endereço não existia no sistema'],
    suggestion: 'Mostre onde chegou — não aponte, descreva o local'
  },
  {
    phrase: 'to no corre',
    severity: 'medium',
    alternatives: ['costurando o dia com fio de nylon', 'navegando entre as horas', 'arquitetando o amanhã agora'],
    suggestion: 'Especifique o que é o seu corre'
  },
  {
    phrase: 'mente blindada',
    severity: 'high',
    alternatives: ['pensamento à prova de ruído', 'cognição que não pede desconto', 'foco que não negocia'],
    suggestion: 'Blindada contra o quê? Especifique o inimigo mental'
  },
  {
    phrase: 'coracao gelado',
    severity: 'medium',
    alternatives: ['empatia em manutenção', 'o calor saiu pela última porta', 'afeto em modo econômico'],
    suggestion: 'O que resfriou? Conte a história do gelo'
  },
  {
    phrase: 'varios querem me ver cair',
    severity: 'high',
    alternatives: ['audiência aguardando meu equilíbrio falhar', 'plateia silenciosa torcendo pela gravidade', 'olhares que pedem roteiro de queda'],
    suggestion: 'Particularize: quem? Como você sabe?'
  },
  {
    phrase: 'minha mente ta pesada',
    severity: 'medium',
    alternatives: ['o peso específico dos pensamentos', 'cognição carregando tonelagem', 'o crânio como depósito de conflito'],
    suggestion: 'Descreva o que está pesando — o concreto sempre supera o abstrato'
  },
  {
    phrase: 'eu nao paro',
    severity: 'low',
    alternatives: ['a exaustão pede permissão e eu não abro a porta', 'pausa não consta no vocabulário', 'em looping infinito'],
    suggestion: 'Mostre o que te faz não parar'
  },
  {
    phrase: 'sigo firme',
    severity: 'low',
    alternatives: ['a rota permanece ativa em qualquer tempo', 'o curso não negocia com obstáculos', 'movimento sem cláusula de contingência'],
    suggestion: 'Firme apesar de quê? Adicione o contexto'
  },
  {
    phrase: 'minha tropa',
    severity: 'medium',
    alternatives: ['os que entendem sem precisar explicar', 'quem compartilha o mesmo endereço de origem', 'círculo que não muda de forma com o tempo'],
    suggestion: 'Quem é sua tropa especificamente? Descreva-os'
  },
  {
    phrase: 'subi de nivel',
    severity: 'high',
    alternatives: ['o andar onde moro agora não existia no projeto original', 'a escala que eles disseram ser impossível', 'altitude que o plano não previa'],
    suggestion: 'Que nível? Descreva a diferença concreta'
  }
]

/**
 * Analisa clichês em um texto
 */
export function analyzeCliches(text: string): ClicheAnalysis {
  const lines = text.split('\n').map(l => l.trim()).filter(Boolean)
  const matches: ClicheMatch[] = []

  for (let lineIdx = 0; lineIdx < lines.length; lineIdx++) {
    const normalizedLine = normalizeText(lines[lineIdx])

    for (const entry of CLICHE_DICTIONARY) {
      const normalizedPhrase = normalizeText(entry.phrase)

      if (normalizedLine.includes(normalizedPhrase)) {
        matches.push({
          phrase: entry.phrase,
          lineIndex: lineIdx,
          severity: entry.severity,
          suggestion: entry.suggestion,
          alternatives: entry.alternatives
        })
      }
    }
  }

  const clicheDensity = lines.length > 0 ? matches.length / lines.length : 0

  // Score: começa em 100, desconta por clichê e severidade
  const penalty = matches.reduce((acc, m) => {
    const weights = { high: 15, medium: 8, low: 3 }
    return acc + weights[m.severity]
  }, 0)

  const score = Math.max(0, 100 - penalty)

  return {
    matches,
    totalCliches: matches.length,
    clicheDensity,
    score
  }
}
