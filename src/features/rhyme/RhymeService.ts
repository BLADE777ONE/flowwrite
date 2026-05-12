// src/features/rhyme/RhymeService.ts
// Serviço principal de análise de rimas para FlowWriter
//
// LIMITAÇÕES DO MVP:
// - Análise heurística, não usa corpus linguístico real
// - Classificação rich/poor é aproximada (sem POS tagger)
// - Rimas multissilábicas detectadas por heurística de vogais
// - Suficiente para composição musical, não para análise acadêmica

import { RhymeAnalysis, RhymeMatch, RhymeChain, RhymeSuggestion } from '../../shared/types/Rhyme'
import {
  normalizeText, toPhoneticKey, extractRhymeNucleus,
  extractEndWord, splitLines, hasAssonance, detectAlliteration,
  removeAccents
} from './phoneticUtils'
import { phoneticSimilarity, rhymeNucleusSimilarity } from '../../shared/utils/stringSimilarity'
import {
  classifyRhymeType, detectRhymeScheme,
  getRhymeColor, getRhymeLabel
} from './rhymeScoring'
import { lookupDictionary } from './rhymeDictionary'

// Thresholds de similaridade
const THRESHOLD_EXACT = 0.88
const THRESHOLD_APPROX = 0.60
const THRESHOLD_ASSONANCE = 0.40

let matchIdCounter = 0
const nextId = () => `rm_${++matchIdCounter}`

/**
 * Analisa rimas completas de um texto
 */
export function analyzeRhymes(text: string): RhymeAnalysis {
  const lines = splitLines(text)
  if (lines.length === 0) {
    return emptyAnalysis()
  }

  // Extrai última palavra significativa de cada linha
  const endWords = lines.map(extractEndWord)
  const phoneticKeys = endWords.map(toPhoneticKey)
  const rhymeNuclei = endWords.map(extractRhymeNucleus)

  // ─── Detectar rimas finais ───────────────────────────────────────────────────
  const matches: RhymeMatch[] = []
  const lineLabels: (string | null)[] = new Array(lines.length).fill(null)
  const chains: Map<string, RhymeChain> = new Map()
  let chainIndex = 0

  for (let i = 0; i < lines.length; i++) {
    for (let j = i + 1; j < lines.length; j++) {
      if (!endWords[i] || !endWords[j]) continue
      if (endWords[i] === endWords[j]) continue // mesma palavra não conta

      const nucleusSimilarity = rhymeNucleusSimilarity(rhymeNuclei[i], rhymeNuclei[j])
      const fullSimilarity = phoneticSimilarity(phoneticKeys[i], phoneticKeys[j])
      const score = Math.max(nucleusSimilarity, fullSimilarity * 0.8)

      if (score < THRESHOLD_ASSONANCE) continue

      const rhymeType = classifyRhymeType(score, endWords[i], endWords[j], false)

      // Agrupar em cadeias (cluster de rimas)
      let chainLabel: string
      const existingChain = findChainForWord(chains, endWords[i]) ||
        findChainForWord(chains, endWords[j])

      if (existingChain) {
        chainLabel = existingChain.label
        if (!existingChain.words.includes(endWords[j])) {
          existingChain.words.push(endWords[j])
          existingChain.lines.push(j)
        }
        if (!existingChain.words.includes(endWords[i])) {
          existingChain.words.push(endWords[i])
          existingChain.lines.push(i)
        }
      } else {
        chainLabel = getRhymeLabel(chainIndex)
        const color = getRhymeColor(chainIndex)
        chains.set(chainLabel, {
          id: `chain_${chainIndex}`,
          label: chainLabel,
          color,
          words: [endWords[i], endWords[j]],
          lines: [i, j],
          type: rhymeType
        })
        chainIndex++
      }

      if (!lineLabels[i]) lineLabels[i] = chainLabel
      if (!lineLabels[j]) lineLabels[j] = chainLabel

      const chain = chains.get(chainLabel)!
      matches.push({
        id: nextId(),
        sourceWord: endWords[i],
        targetWord: endWords[j],
        sourceLine: i,
        targetLine: j,
        score,
        type: rhymeType,
        rhymeClass: chainLabel,
        color: chain.color,
        phoneticSource: phoneticKeys[i],
        phoneticTarget: phoneticKeys[j],
        isInternal: false
      })
    }
  }

  // ─── Detectar rimas internas ─────────────────────────────────────────────────
  const internalRhymes = detectInternalRhymes(lines)

  // ─── Detectar assonâncias ────────────────────────────────────────────────────
  const assonanceMatches = detectAssonanceMatches(lines, endWords, phoneticKeys)

  // ─── Detectar aliterações ────────────────────────────────────────────────────
  const alliterationMatches = detectAlliterationMatches(lines)

  // ─── Rimas multissilábicas ───────────────────────────────────────────────────
  const multisyllabicMatches = matches.filter(m => m.type === 'multisyllabic')

  // ─── Esquema de rimas ────────────────────────────────────────────────────────
  const scheme = detectRhymeScheme(lineLabels)

  // ─── Density ────────────────────────────────────────────────────────────────
  const linesWithRhyme = new Set([
    ...matches.flatMap(m => [m.sourceLine, m.targetLine])
  ]).size
  const rhymeDensity = lines.length > 0 ? linesWithRhyme / lines.length : 0

  // ─── Sugestões ──────────────────────────────────────────────────────────────
  const suggestions = generateSuggestions(endWords, lines.length)

  return {
    scheme,
    matches,
    chains: Array.from(chains.values()),
    rhymeDensity,
    internalRhymes,
    multisyllabicMatches,
    assonanceMatches,
    alliterationMatches,
    suggestions,
    endWords
  }
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function findChainForWord(chains: Map<string, RhymeChain>, word: string): RhymeChain | null {
  for (const chain of chains.values()) {
    if (chain.words.includes(word)) return chain
  }
  return null
}

function detectInternalRhymes(lines: string[]): RhymeMatch[] {
  const internal: RhymeMatch[] = []

  for (let lineIdx = 0; lineIdx < lines.length; lineIdx++) {
    const words = normalizeText(lines[lineIdx])
      .split(/\s+/)
      .filter(w => w.length > 3)

    for (let i = 0; i < words.length; i++) {
      for (let j = i + 2; j < words.length; j++) { // pular palavras adjacentes
        const keyI = toPhoneticKey(words[i])
        const keyJ = toPhoneticKey(words[j])
        const score = phoneticSimilarity(keyI, keyJ)

        if (score >= THRESHOLD_APPROX) {
          internal.push({
            id: nextId(),
            sourceWord: words[i],
            targetWord: words[j],
            sourceLine: lineIdx,
            targetLine: lineIdx,
            score,
            type: 'internal',
            rhymeClass: 'INT',
            color: '#a78bfa',
            phoneticSource: keyI,
            phoneticTarget: keyJ,
            isInternal: true
          })
        }
      }
    }
  }

  return internal
}

function detectAssonanceMatches(
  lines: string[],
  endWords: string[],
  phoneticKeys: string[]
): RhymeMatch[] {
  const assonance: RhymeMatch[] = []

  for (let i = 0; i < lines.length; i++) {
    for (let j = i + 1; j < lines.length; j++) {
      if (!endWords[i] || !endWords[j]) continue
      if (hasAssonance(phoneticKeys[i], phoneticKeys[j])) {
        const score = phoneticSimilarity(phoneticKeys[i], phoneticKeys[j])
        if (score >= 0.35 && score < THRESHOLD_APPROX) {
          assonance.push({
            id: nextId(),
            sourceWord: endWords[i],
            targetWord: endWords[j],
            sourceLine: i,
            targetLine: j,
            score,
            type: 'assonance',
            rhymeClass: 'ASS',
            color: '#64748b',
            phoneticSource: phoneticKeys[i],
            phoneticTarget: phoneticKeys[j],
            isInternal: false
          })
        }
      }
    }
  }

  return assonance
}

function detectAlliterationMatches(lines: string[]): RhymeMatch[] {
  const results: RhymeMatch[] = []

  for (let i = 0; i < lines.length; i++) {
    const consonant = detectAlliteration(lines[i])
    if (consonant) {
      results.push({
        id: nextId(),
        sourceWord: consonant,
        targetWord: lines[i].substring(0, 40),
        sourceLine: i,
        targetLine: i,
        score: 1.0,
        type: 'alliteration',
        rhymeClass: 'ALL',
        color: '#fbbf24',
        phoneticSource: consonant,
        phoneticTarget: consonant,
        isInternal: true
      })
    }
  }

  return results
}

function generateSuggestions(endWords: string[], lineCount: number): RhymeSuggestion[] {
  // Sugerir para as últimas 3 palavras sem rima detectada
  const suggestions: RhymeSuggestion[] = []
  const recent = endWords.slice(-5).filter(Boolean)

  for (const word of recent) {
    const dictSuggestions = lookupDictionary(word)
    if (dictSuggestions.length > 0) {
      suggestions.push({
        forWord: word,
        suggestions: dictSuggestions.slice(0, 6),
        phoneticKey: toPhoneticKey(word)
      })
    }
  }

  return suggestions
}

function emptyAnalysis(): RhymeAnalysis {
  return {
    scheme: 'free',
    matches: [],
    chains: [],
    rhymeDensity: 0,
    internalRhymes: [],
    multisyllabicMatches: [],
    assonanceMatches: [],
    alliterationMatches: [],
    suggestions: [],
    endWords: []
  }
}
