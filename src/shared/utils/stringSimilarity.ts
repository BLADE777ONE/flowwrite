// src/shared/utils/stringSimilarity.ts
// Levenshtein adaptado para comparação fonética

/**
 * Distância de Levenshtein entre duas strings
 * Complexidade: O(m*n) — aceitável para palavras curtas
 */
export function levenshteinDistance(a: string, b: string): number {
  const m = a.length
  const n = b.length

  // Criar matrix de distâncias
  const dp: number[][] = Array.from({ length: m + 1 }, (_, i) =>
    Array.from({ length: n + 1 }, (_, j) => (i === 0 ? j : j === 0 ? i : 0))
  )

  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      if (a[i - 1] === b[j - 1]) {
        dp[i][j] = dp[i - 1][j - 1]
      } else {
        dp[i][j] = 1 + Math.min(
          dp[i - 1][j],     // deleção
          dp[i][j - 1],     // inserção
          dp[i - 1][j - 1]  // substituição
        )
      }
    }
  }

  return dp[m][n]
}

/**
 * Score de similaridade fonética entre 0 e 1
 * 1.0 = idêntico, 0.0 = completamente diferente
 *
 * Fórmula: 1 - (distância / max_comprimento)
 * Penalidade reduzida para pares fonéticos próximos em PT-BR
 */
export function phoneticSimilarity(phoneticA: string, phoneticB: string): number {
  if (phoneticA === phoneticB) return 1.0
  if (!phoneticA || !phoneticB) return 0.0

  const maxLen = Math.max(phoneticA.length, phoneticB.length)
  if (maxLen === 0) return 1.0

  const distance = levenshteinDistance(phoneticA, phoneticB)

  // Score base
  let score = 1 - distance / maxLen

  // Bônus: se terminações coincidem (últimos 3+ chars), aumentar score
  const tail = 3
  if (phoneticA.length >= tail && phoneticB.length >= tail) {
    const endA = phoneticA.slice(-tail)
    const endB = phoneticB.slice(-tail)
    if (endA === endB) score = Math.min(1, score + 0.15)
  }

  // Bônus para terminações de 4 chars (rimas mais ricas)
  const tail4 = 4
  if (phoneticA.length >= tail4 && phoneticB.length >= tail4) {
    const endA4 = phoneticA.slice(-tail4)
    const endB4 = phoneticB.slice(-tail4)
    if (endA4 === endB4) score = Math.min(1, score + 0.1)
  }

  return Math.max(0, Math.min(1, score))
}

/**
 * Similaridade de núcleo rímico — compara apenas a terminação fonética
 * Mais específico que a similaridade geral
 */
export function rhymeNucleusSimilarity(nucleus1: string, nucleus2: string): number {
  if (nucleus1 === nucleus2) return 1.0
  if (!nucleus1 || !nucleus2) return 0.0

  const distance = levenshteinDistance(nucleus1, nucleus2)
  const maxLen = Math.max(nucleus1.length, nucleus2.length)

  return Math.max(0, 1 - distance / maxLen)
}

/**
 * Classifica o score de similaridade em categoria de rima
 */
export function classifyRhymeScore(score: number): 'exact' | 'approximate' | 'assonance' | 'none' {
  if (score >= 0.9) return 'exact'
  if (score >= 0.65) return 'approximate'
  if (score >= 0.45) return 'assonance'
  return 'none'
}
