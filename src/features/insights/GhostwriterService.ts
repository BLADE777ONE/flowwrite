// src/features/insights/GhostwriterService.ts
// Modo Ghostwriter — sugere próximo verso com base no estilo da letra atual
// 100% local, sem IA online. Análise heurística de padrões.

import { RhymeAnalysis, RhymeChain } from '../../shared/types/Rhyme'
import { MetricsAnalysis, FlowSpeed } from '../../shared/types/Metrics'
import { findRhymesTyped } from '../rhyme/RhymeService'

export interface GhostwriterSuggestion {
  targetEndRhyme: string          // palavra sugerida para terminar o verso
  rhymeOptions: string[]          // alternativas de rima
  targetSyllables: number         // contagem alvo de sílabas
  flowSpeed: FlowSpeed            // velocidade de flow recomendada
  styleHints: string[]            // dicas de construção
  templateStarters: string[]      // inícios de verso sugeridos
  nextRhymeClass: string | null   // qual cadeia de rima continuar (A, B, C…)
}

const CONNECTORS_BY_VIBE: Record<string, string[]> = {
  trap:      ['Sinto que', 'No meu mundo', 'Desde sempre', 'Tô de volta', 'Me olha', 'Não para', 'E agora'],
  drill:     ['Direto ao ponto', 'Sem filtro', 'Na correria', 'Slide rápido', 'Olha o que'],
  boombap:   ['Escuta bem', 'Deixa eu te dizer', 'Reflita', 'Palavra de honra', 'Passo a passo'],
  melodico:  ['Sinto no ar', 'Deixa fluir', 'Mais uma vez', 'Te vejo', 'Sonho acordado'],
  default:   ['E então', 'Do jeito que', 'Nessa linha', 'Seguindo o flow', 'Olha pra mim'],
}

const RHYME_BRIDGES: Record<string, string[]> = {
  // palavras de alta rimabilidade que servem para fechar cadeias difíceis
  default: ['sinal', 'final', 'real', 'total', 'capital', 'especial', 'brutal', 'vital',
            'nação', 'coração', 'missão', 'situação', 'posição', 'sensação',
            'fundo', 'mundo', 'segundo', 'profundo',
            'vida', 'saída', 'vinda', 'descida']
}

/**
 * Dado o texto atual e a análise, gera sugestões para o próximo verso
 */
export function generateGhostwriterSuggestion(
  text: string,
  rhymeAnalysis: RhymeAnalysis,
  metricsAnalysis: MetricsAnalysis,
  vibe = 'default'
): GhostwriterSuggestion | null {
  const lines = text.split('\n').filter(Boolean)
  if (lines.length === 0) return null

  // ─── 1. Determinar a contagem de sílabas alvo ─────────────────────────────
  const targetSyllables = Math.round(metricsAnalysis.averageSyllables) || 12
  const flowSpeed       = metricsAnalysis.flowSpeed

  // ─── 2. Encontrar a cadeia de rima que mais precisa ser continuada ────────
  const nextRhymeInfo = findNextRhymeTarget(rhymeAnalysis, lines)

  // ─── 3. Sugestões de rima ─────────────────────────────────────────────────
  const { targetEndRhyme, rhymeOptions, nextRhymeClass } = nextRhymeInfo

  // ─── 4. Dicas de estilo ──────────────────────────────────────────────────
  const styleHints = buildStyleHints(rhymeAnalysis, metricsAnalysis, targetSyllables)

  // ─── 5. Inícios de verso ─────────────────────────────────────────────────
  const vibeKey = Object.keys(CONNECTORS_BY_VIBE).find(k =>
    vibe.toLowerCase().includes(k)
  ) || 'default'

  const connectors = CONNECTORS_BY_VIBE[vibeKey] || CONNECTORS_BY_VIBE.default
  const templateStarters = buildTemplateStarters(connectors, targetSyllables, rhymeOptions[0])

  return {
    targetEndRhyme,
    rhymeOptions,
    targetSyllables,
    flowSpeed,
    styleHints,
    templateStarters,
    nextRhymeClass,
  }
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function findNextRhymeTarget(
  rhymeAnalysis: RhymeAnalysis,
  lines: string[]
): { targetEndRhyme: string; rhymeOptions: string[]; nextRhymeClass: string | null } {
  const lastLine = lines[lines.length - 1] || ''
  const lastWord = extractLastWord(lastLine)

  // Olha a análise de rimas para decidir qual cadeia continuar
  const { scheme, chains, suggestions, endWords } = rhymeAnalysis
  const schemeTarget = inferSchemeTarget(rhymeAnalysis)

  // Encontra a cadeia dominante que deveria ter um próximo
  let nextChain: RhymeChain | null = null
  if (schemeTarget?.label) {
    nextChain = chains.find(c => c.label === schemeTarget.label) ?? null
  }

  if (!nextChain && (scheme === 'AABB' || scheme === 'ABAB')) {
    // Padrão alternado — precisa rimar com 1 ou 2 linhas atrás
    const targetLine = scheme === 'AABB' ? lines.length - 1 : lines.length - 2
    const targetWord = endWords[targetLine] || lastWord
    nextChain = chains.find(c => c.words.includes(targetWord)) ?? null
  } else if (!nextChain) {
    // Pega a cadeia com mais palavras (mais estabelecida)
    nextChain = chains.reduce<RhymeChain | null>(
      (best, c) => (!best || c.words.length > best.words.length) ? c : best,
      null
    )
  }

  const seedWord = schemeTarget?.word || nextChain?.words[0] || lastWord

  // Sugestões do motor de rimas para a palavra que fecha o próximo desenho.
  const rhymeSuggestion = suggestions.find(s => s.forWord === lastWord)
  const baseRhymes = seedWord
    ? findRhymesTyped(seedWord, 10).map(r => r.word)
    : rhymeSuggestion?.suggestions ?? []

  // Adiciona palavras da cadeia encontrada (exceto as já usadas)
  const chainRhymes = nextChain
    ? nextChain.words.filter(w => !lines.some(l => l.toLowerCase().includes(w)))
    : []

  // Combina e deduplica
  const allRhymes = [...new Set([...baseRhymes, ...chainRhymes, ...RHYME_BRIDGES.default])]

  return {
    targetEndRhyme: allRhymes[0] ?? seedWord ?? lastWord,
    rhymeOptions:   allRhymes.slice(0, 6),
    nextRhymeClass: schemeTarget?.label ?? nextChain?.label ?? null,
  }
}

function inferSchemeTarget(rhymeAnalysis: RhymeAnalysis): { label: string; word: string } | null {
  const currentBlock = rhymeAnalysis.schemeBlocks.at(-1)
  if (!currentBlock || currentBlock.labels.length >= 4) return null

  const labels = currentBlock.labels.filter(Boolean) as string[]
  if (labels.length < 2) return null

  const nextLabel = inferNextLabel(labels)
  if (!nextLabel) return null

  const localIndex = currentBlock.labels.findIndex(label => label === nextLabel)
  const word = currentBlock.endWords[localIndex]
  if (!word) return null

  return { label: nextLabel, word }
}

function inferNextLabel(labels: string[]): string | null {
  if (labels.length === 2) {
    if (labels[0] !== labels[1]) return labels[0] // AB -> prepara ABAB
    return null
  }

  if (labels.length === 3) {
    if (labels[0] === labels[2]) return labels[1] // ABA -> ABAB
    if (labels[1] === labels[2]) return labels[2] // ABB -> ABBB/ABBB fechado
    if (labels[0] === labels[1]) return labels[2] // AAB -> AABB
    return labels[1] // ABC -> ABCB, muito comum em quadrinha
  }

  return null
}

function extractLastWord(line: string): string {
  const words = line.trim().split(/\s+/).filter(Boolean)
  return words[words.length - 1]?.replace(/[^a-záàãâéêíóôõúüç]/gi, '') ?? ''
}

function buildStyleHints(
  rhyme: RhymeAnalysis,
  metrics: MetricsAnalysis,
  targetSyllables: number
): string[] {
  const hints: string[] = []

  if (metrics.averageSyllables < 8) {
    hints.push('Seus versos estão curtos — tente expandir para mais sílabas')
  } else if (metrics.averageSyllables > 18) {
    hints.push('Flow denso detectado — você pode respirar ou cortar')
  }

  if (rhyme.rhymeDensity < 0.5) {
    hints.push(`Tente terminar com algo que rime com "${rhyme.endWords[rhyme.endWords.length - 1]}"`)
  }

  if (rhyme.internalRhymes.length < 2) {
    hints.push('Adicione uma rima interna no meio do verso para aumentar o punch')
  }

  if (metrics.regularityScore < 60) {
    hints.push(`Alvo: ~${targetSyllables} sílabas para regularizar o flow`)
  }

  hints.push(`Velocidade atual: ${
    metrics.flowSpeed === 'slow' ? 'lento — acelere o próximo verso' :
    metrics.flowSpeed === 'very_fast' ? 'double time — talvez respirar' :
    'boa — mantenha o padrão'
  }`)

  return hints.slice(0, 4)
}

function buildTemplateStarters(
  connectors: string[],
  targetSyllables: number,
  targetRhyme: string
): string[] {
  const starters: string[] = []
  const shuffled = [...connectors].sort(() => Math.random() - 0.5)

  for (const starter of shuffled.slice(0, 3)) {
    const syllsLeft = Math.max(2, targetSyllables - starter.split(/\s+/).length * 2)
    starters.push(
      `${starter} [~${syllsLeft} sílabas] … ${targetRhyme || '___'}`
    )
  }

  return starters
}
