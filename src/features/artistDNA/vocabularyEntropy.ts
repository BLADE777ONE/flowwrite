// src/features/artistDNA/vocabularyEntropy.ts
// Cálculo de entropia de vocabulário (diversidade léxica)

import { normalizeText } from '../rhyme/phoneticUtils'

// Stopwords para ignorar no cálculo de entropia
const STOPWORDS = new Set([
  'o', 'a', 'os', 'as', 'um', 'uma', 'de', 'do', 'da', 'que', 'e', 'em',
  'no', 'na', 'por', 'para', 'com', 'se', 'pra', 'pro', 'mais', 'mas',
  'ou', 'me', 'te', 'eu', 'tu', 'ele', 'ela', 'meu', 'minha', 'seu', 'sua',
  'nos', 'nas', 'dos', 'das', 'num', 'nao', 'so', 'ja', 'ai', 'ah', 'eh'
])

/**
 * Calcula entropia de Shannon simplificada para vocabulário
 * Retorna valor entre 0 e 1
 * 0 = usa sempre as mesmas palavras
 * 1 = vocabulário muito diverso
 */
export function calculateVocabularyEntropy(text: string): number {
  const words = extractContentWords(text)
  if (words.length === 0) return 0

  const totalWords = words.length

  // Contar frequência de cada palavra
  const freq: Record<string, number> = {}
  for (const word of words) {
    freq[word] = (freq[word] || 0) + 1
  }

  const uniqueWords = Object.keys(freq).length

  // Shannon Entropy: H = -Σ p(i) * log2(p(i))
  let entropy = 0
  for (const count of Object.values(freq)) {
    const p = count / totalWords
    entropy -= p * Math.log2(p)
  }

  // Normalizar: dividir pelo log2 do vocab total
  const maxEntropy = Math.log2(uniqueWords) || 1
  const normalized = entropy / maxEntropy

  return Math.min(1, Math.max(0, normalized))
}

/**
 * Extrai palavras de conteúdo (sem stopwords, min 3 chars)
 */
export function extractContentWords(text: string): string[] {
  return normalizeText(text)
    .split(/\s+/)
    .filter(w => w.length >= 3 && !STOPWORDS.has(w))
}

/**
 * Detecta palavras "saturadas" (usadas excessivamente)
 */
export function findSaturatedWords(
  text: string,
  threshold = 0.03  // 3% das palavras = saturado
): string[] {
  const words = extractContentWords(text)
  if (words.length < 20) return []

  const freq: Record<string, number> = {}
  for (const word of words) {
    freq[word] = (freq[word] || 0) + 1
  }

  return Object.entries(freq)
    .filter(([, count]) => count / words.length > threshold)
    .sort((a, b) => b[1] - a[1])
    .map(([word]) => word)
    .slice(0, 10)
}

/**
 * Retorna as N palavras mais frequentes com contagem
 */
export function getTopWords(text: string, n = 20): { word: string; count: number; percentage: number }[] {
  const words = extractContentWords(text)
  const total = words.length
  if (total === 0) return []

  const freq: Record<string, number> = {}
  for (const word of words) {
    freq[word] = (freq[word] || 0) + 1
  }

  return Object.entries(freq)
    .sort((a, b) => b[1] - a[1])
    .slice(0, n)
    .map(([word, count]) => ({
      word,
      count,
      percentage: Math.round((count / total) * 100 * 10) / 10
    }))
}
