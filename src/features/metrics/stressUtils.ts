// src/features/metrics/stressUtils.ts
// Estimativa de palavras tônicas e acentos em um verso

import { estimateTonicity } from '../rhyme/phoneticUtils'
import { StressWord } from '../../shared/types/Metrics'

// Palavras funcionais (átonas por natureza)
const FUNCTION_WORDS = new Set([
  'o', 'a', 'os', 'as', 'um', 'uma', 'uns', 'umas',
  'de', 'do', 'da', 'dos', 'das', 'em', 'no', 'na', 'nos', 'nas',
  'por', 'para', 'pra', 'pro', 'com', 'sem', 'sob', 'sobre', 'entre',
  'e', 'ou', 'mas', 'que', 'se', 'nem', 'já', 'ainda',
  'me', 'te', 'se', 'nos', 'vos', 'lhe', 'lhes',
  'eu', 'tu', 'ele', 'ela', 'nós', 'vós', 'eles', 'elas'
])

/**
 * Identifica palavras com peso tônico forte em um verso
 * Retorna lista de StressWord ordenada por posição
 */
export function estimateStressWords(line: string): StressWord[] {
  const words = line.trim().split(/\s+/)
  const result: StressWord[] = []

  for (let i = 0; i < words.length; i++) {
    const word = words[i].toLowerCase().replace(/[^a-záéíóúâêôãõ]/gi, '')
    if (!word || word.length < 2) continue

    let stress: 'strong' | 'medium' | 'weak' = 'weak'

    // Palavras funcionais = fraco
    if (FUNCTION_WORDS.has(word)) {
      stress = 'weak'
    }
    // Oxítonas = forte (acento na última)
    else if (estimateTonicity(word) === 'oxytone') {
      stress = 'strong'
    }
    // Proparoxítonas = forte (acento marcado)
    else if (estimateTonicity(word) === 'proparoxytone') {
      stress = 'strong'
    }
    // Palavras longas paroxítonas = médio
    else if (word.length >= 4) {
      stress = 'medium'
    }
    else {
      stress = 'weak'
    }

    result.push({ word: words[i], position: i, stress })
  }

  return result
}

/**
 * Sugere pontos de respiração em um verso
 * Baseado em: vírgulas, pontos, e posição após sílaba forte
 */
export function suggestBreathPoints(line: string, syllableCount: number): number[] {
  const words = line.split(/\s+/)
  const breathPoints: number[] = []

  for (let i = 0; i < words.length; i++) {
    const word = words[i]
    // Vírgula ou ponto = pausa natural
    if (/[,;.!?\/|]/.test(word)) {
      breathPoints.push(i)
    }
  }

  // Se linha for longa (>14 síl), sugerir pausa no meio
  if (syllableCount > 14 && breathPoints.length === 0) {
    breathPoints.push(Math.floor(words.length / 2))
  }

  return breathPoints
}
