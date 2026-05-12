// src/features/metrics/elisionUtils.ts
// Detecta elisões poéticas em PT-BR para ajuste de contagem silábica

import { canElide } from './syllableUtils'

export interface ElisionInfo {
  word1: string
  word2: string
  position: number   // índice da primeira palavra
  description: string
}

/**
 * Detecta todas as elisões possíveis em uma linha
 * Elisão: última vogal de palavra + primeira vogal da próxima
 */
export function detectElisions(line: string): ElisionInfo[] {
  const words = line.trim().split(/\s+/)
  const elisions: ElisionInfo[] = []

  for (let i = 0; i < words.length - 1; i++) {
    if (canElide(words[i], words[i + 1])) {
      elisions.push({
        word1: words[i],
        word2: words[i + 1],
        position: i,
        description: `"${words[i]}" + "${words[i + 1]}" → fusão vocálica`
      })
    }
  }

  return elisions
}

/**
 * Casos especiais de elisão muito comuns no rap BR
 */
export const COMMON_RAP_ELISIONS: string[] = [
  'minha alma → mi-nhal-ma',
  'vida inteira → vi-da-in-tei-ra',
  'mente aberta → men-ta-ber-ta',
  'noite escura → noi-tes-cu-ra',
  'que eu → queu',
  'de onde → donde',
  'pela estrada → pe-les-tra-da'
]
