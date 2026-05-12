// src/features/insights/InsightService.ts

import { InsightResult } from '../../shared/types/Metrics'
import { normalizeText } from '../rhyme/phoneticUtils'

const ADLIBS_BY_VIBE: Record<string, string[]> = {
  trap: ['skrrt', 'yeah', 'uh', 'ayy', 'woo', 'brr', 'han', 'it\'s lit', 'drip', 'gang'],
  drill: ['grr', 'skit', 'woi', 'boom', 'pá', 'pow', 'back', 'slide'],
  boombap: ['uh', 'check it', 'one time', 'yo', 'word', 'real talk'],
  melodico: ['woah', 'oh', 'hey', 'hmm', 'na na', 'la la', 'yeah yeah'],
  funk: ['ei', 'vai', 'olha', 'tá bom', 'cê tá vendo', 'bum bum'],
  default: ['yeah', 'uh', 'ayy', 'han', 'woo', 'ok', 'let\'s go']
}

const ONOMATOPEIAS = ['skrrt', 'boom', 'pá', 'tum', 'brr', 'vruum', 'splash', 'pow', 'grr', 'tsss', 'uh', 'ah']

// Campos semânticos para wordplay
const SEMANTIC_WORDPLAY: Record<string, string[]> = {
  'fogo': ['raiva', 'desejo', 'perigo', 'energia', 'destruição', 'paixão', 'incêndio', 'luz'],
  'água': ['lágrima', 'chuva', 'afogamento', 'fluxo', 'pureza', 'correnteza', 'oceano', 'vazão'],
  'noite': ['segredo', 'perigo', 'solidão', 'sonho', 'silêncio', 'liberdade', 'escuridão', 'mistério'],
  'luz': ['fama', 'esperança', 'verdade', 'revelação', 'alvo', 'destino', 'divino', 'claridade'],
  'tempo': ['oportunidade', 'passado', 'pressão', 'relógio', 'urgência', 'saudade', 'ciclo'],
  'sangue': ['família', 'essência', 'sacrifício', 'herança', 'irmandade', 'intensidade'],
  'voo': ['liberdade', 'sonho', 'fuga', 'ascensão', 'alto', 'avião', 'risco'],
  'peso': ['responsabilidade', 'dívida', 'pressão', 'influência', 'qualidade', 'dificuldade'],
  'banco': ['dinheiro', 'assento', 'exclusão', 'sistema', 'acúmulo', 'espera'],
  'raiz': ['origem', 'família', 'planta', 'base', 'fundação', 'passado'],
}

/**
 * Gera insights para a última linha ou texto completo
 */
export function generateInsights(text: string, vibe = 'default'): InsightResult {
  const lines = text.split('\n').filter(Boolean)
  const lastLine = lines[lines.length - 1] || ''
  const normalizedLast = normalizeText(lastLine)

  // Ad-libs baseados na vibe
  const vibeKey = Object.keys(ADLIBS_BY_VIBE).find(k => vibe.toLowerCase().includes(k)) || 'default'
  const adlibs = ADLIBS_BY_VIBE[vibeKey] || ADLIBS_BY_VIBE.default

  // Wordplay: identificar palavras da última linha com potencial polissêmico
  const wordplayIdeas: string[] = []
  for (const [keyword, fields] of Object.entries(SEMANTIC_WORDPLAY)) {
    if (normalizedLast.includes(keyword)) {
      wordplayIdeas.push(
        `"${keyword}" pode significar: ${fields.slice(0, 3).join(', ')} — use dois sentidos na mesma barra`
      )
    }
  }

  // Se sem wordplay detectado, sugerir genérico
  if (wordplayIdeas.length === 0) {
    wordplayIdeas.push('Tente usar uma palavra que signifique duas coisas ao mesmo tempo')
    wordplayIdeas.push('Plante um sentido no verso 1 e revele o outro no verso 2 (punchline setup)')
  }

  // Sugestões para completar a última linha
  const lastLineSuggestions = generateCompletionSuggestions(lastLine)

  // Campos semânticos relacionados ao conteúdo
  const semanticFields = detectSemanticFields(normalizedLast)

  // Variações de vibe
  const vibeVariations = [
    'Versão mais agressiva: aumente densidade, reduza espaço',
    'Versão melódica: diminua sílabas, aumente espaço entre palavras fortes',
    'Versão consciente: troque gírias por imagens poéticas concretas'
  ]

  return {
    adlibs: adlibs.slice(0, 6),
    onomatopeias: ONOMATOPEIAS.slice(0, 6),
    wordplayIdeas: wordplayIdeas.slice(0, 4),
    nextWordSuggestions: lastLineSuggestions,
    semanticFields,
    vibeVariations,
    lastLineSuggestions
  }
}

function generateCompletionSuggestions(lastLine: string): string[] {
  if (!lastLine.trim()) return []
  // Heurísticas simples para sugestões de completar
  return [
    'Continue com uma imagem oposta ao que acabou de dizer',
    'Finalize com uma referência ao início da letra (loop narrativo)',
    'Use a última palavra da linha anterior como começo da próxima'
  ]
}

function detectSemanticFields(text: string): string[] {
  const fields: string[] = []
  for (const [keyword, related] of Object.entries(SEMANTIC_WORDPLAY)) {
    if (text.includes(keyword)) {
      fields.push(`${keyword} → ${related.slice(0, 3).join(' / ')}`)
    }
  }
  return fields.slice(0, 4)
}
