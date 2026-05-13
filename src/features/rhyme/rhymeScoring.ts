// src/features/rhyme/rhymeScoring.ts
// Sistema de scoring e classificação de rimas

import { RhymeType, RhymeScheme } from '../../shared/types/Rhyme'

/**
 * Determina o tipo de rima baseado no score e contexto
 */
export function classifyRhymeType(
  score: number,
  sourceWord: string,
  targetWord: string,
  isInternal: boolean
): RhymeType {
  if (isInternal) return 'internal'

  // Detectar rima pobre: mesmos sufixos muito comuns (heurística)
  if (isPoorRhyme(sourceWord, targetWord)) return 'poor'

  // Detectar rima multissilábica (palavra longa com alta similaridade fonética)
  if (isMultisyllabic(sourceWord, targetWord, score)) return 'multisyllabic'

  // Detectar rima rica aproximada (classes diferentes)
  if (score >= 0.7 && looksRich(sourceWord, targetWord)) return 'rich'

  // Classificar pelo score
  if (score >= 0.88) return 'exact'
  if (score >= 0.65) return 'approximate'
  if (score >= 0.45) return 'assonance'

  return 'approximate'
}

/**
 * Rima pobre: terminações gramaticais muito comuns rimando entre si
 * Ex: "cantar" e "falar" (ambos verbos no infinitivo)
 */
function isPoorRhyme(a: string, b: string): boolean {
  const poorSuffixes = [
    /ando$/, /endo$/, /indo$/,   // gerúndios
    /ação$/, /ções$/,             // nominalizações
    /mente$/,                      // advérbios
    /oso$/, /osa$/,               // adjetivos
    /eiro$/, /eira$/,             // sufixos
  ]
  return poorSuffixes.some(pattern => pattern.test(a) && pattern.test(b))
}

/**
 * Rima multissilábica: ambas palavras têm 3+ sílabas e alta similaridade
 */
function isMultisyllabic(a: string, b: string, score: number): boolean {
  const countVowelGroups = (w: string) => (w.match(/[aeiouáéíóúâêôãõ]/gi) || []).length
  return score >= 0.65 && countVowelGroups(a) >= 3 && countVowelGroups(b) >= 3
}

/**
 * Heurística para detectar rima rica (classes gramaticais diferentes)
 * Limitação: sem POS tagger real. Usa terminações como indicador.
 */
function looksRich(a: string, b: string): boolean {
  const verbEndings = /[aeiou]r$/
  const nounEndings = /(ão|dade|mento|ção|eza|ura|ismo)$/
  const adjEndings = /(oso|osa|ado|ada|ível|avel)$/

  const aIsVerb = verbEndings.test(a)
  const bIsVerb = verbEndings.test(b)
  const aIsNoun = nounEndings.test(a)
  const bIsNoun = nounEndings.test(b)
  const aIsAdj = adjEndings.test(a)
  const bIsAdj = adjEndings.test(b)

  // Se classes parecem diferentes = rica
  return (aIsVerb && bIsNoun) || (aIsVerb && bIsAdj) ||
    (aIsNoun && bIsVerb) || (aIsAdj && bIsVerb)
}

// Cores para cadeias de rimas (estilo FlowWriter)
const RHYME_COLORS = [
  '#7c3aed', // A - roxo
  '#06b6d4', // B - ciano
  '#f59e0b', // C - ouro
  '#10b981', // D - verde
  '#ef4444', // E - vermelho
  '#ec4899', // F - rosa
  '#84cc16', // G - lima
  '#f97316', // H - laranja
  '#8b5cf6', // I - violeta
  '#0ea5e9', // J - azul
]

const RHYME_LABELS = 'ABCDEFGHIJ'.split('')

export function getRhymeColor(index: number): string {
  return RHYME_COLORS[index % RHYME_COLORS.length]
}

export function getRhymeLabel(index: number): string {
  return RHYME_LABELS[index % RHYME_LABELS.length]
}

/**
 * Detecta esquema de rima AABB, ABAB, ABBA, etc.
 */
export function detectRhymeScheme(lineLabels: (string | null)[]): RhymeScheme {
  const labels = lineLabels.filter(Boolean)
  if (labels.length < 2) return 'free'

  const pattern = labels.join('')

  // Padrões conhecidos
  if (/^(AB)+$/.test(pattern) || /^ABAB/.test(pattern)) return 'ABAB'
  if (/^(AA)+$/.test(pattern) || /^AABB/.test(pattern)) return 'AABB'
  if (/^ABBA/.test(pattern)) return 'ABBA'
  if (/^A+$/.test(pattern)) return 'AAAA'
  if (/^ABCB/.test(pattern)) return 'ABCB'
  if (/^AABA/.test(pattern)) return 'AABA'

  // Verificar se há algum padrão misto
  const unique = new Set(labels).size
  if (unique <= 2) return 'mixed'

  return 'free'
}
