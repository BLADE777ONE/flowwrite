// src/features/metrics/syllableUtils.ts
// Contagem heurística de sílabas para PT-BR
//
// LIMITAÇÃO: Sem separação silábica real (exigiria corpus).
// Abordagem: contagem de núcleos vocálicos com ajustes para ditongos/hiatos comuns.

import { removeAccents } from '../rhyme/phoneticUtils'

// Ditongos crescentes comuns em PT-BR (contam como 1 sílaba)
const GROWING_DIPHTHONGS = ['ia', 'ie', 'io', 'ua', 'ue', 'uo', 'ei', 'ai', 'oi', 'ui', 'au', 'eu', 'ou']

// Grupos que costumam ser hiatos (contam como 2 sílabas)
const HIATUS_PATTERNS = ['ía', 'úa', 'aí', 'aú', 'oí', 'uí']

/**
 * Conta sílabas de uma palavra usando heurística de núcleos vocálicos
 */
export function countWordSyllables(word: string): number {
  const clean = removeAccents(word.toLowerCase()).replace(/[^a-z]/g, '')
  if (!clean) return 0
  if (clean.length === 1) return 1

  let count = 0
  let i = 0

  while (i < clean.length) {
    const char = clean[i]
    const nextChar = clean[i + 1]
    const twoChar = nextChar ? char + nextChar : ''
    const threeChar = clean[i + 2] ? twoChar + clean[i + 2] : ''

    if (isVowel(char)) {
      count++

      // Verificar ditongo (próxima também é vogal)
      if (nextChar && isVowel(nextChar)) {
        // Hiato explícito — conta separado
        if (HIATUS_PATTERNS.some(h => (char + nextChar) === removeAccents(h))) {
          // Não agrupar — já contou a primeira, a próxima iteração conta a segunda
        } else if (GROWING_DIPHTHONGS.includes(twoChar)) {
          // Ditongo — pular próxima vogal
          i++
        }
      }
    }
    i++
  }

  return Math.max(1, count)
}

/**
 * Conta sílabas de uma linha inteira com ajuste de elisões
 */
export function countLineSyllables(line: string): number {
  const words = line.trim().split(/\s+/).filter(Boolean)
  if (words.length === 0) return 0

  let total = 0
  for (let i = 0; i < words.length; i++) {
    const wordCount = countWordSyllables(words[i])
    const nextWord = words[i + 1]

    // Verificar elisão: palavra termina em vogal e próxima começa com vogal
    if (nextWord && canElide(words[i], nextWord)) {
      total += Math.max(1, wordCount - 1) // reduz 1 sílaba pela fusão
    } else {
      total += wordCount
    }
  }

  return total
}

function isVowel(char: string): boolean {
  return 'aeiouáéíóúâêôãõ'.includes(char)
}

export function canElide(word: string, nextWord: string): boolean {
  const lastChar = removeAccents(word.toLowerCase()).at(-1) ?? ''
  const firstChar = removeAccents(nextWord.toLowerCase())[0] ?? ''
  return isVowel(lastChar) && isVowel(firstChar)
}
