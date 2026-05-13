// src/shared/types/Rhyme.ts

export type RhymeType =
  | 'exact'          // rima exata — terminação fonética idêntica
  | 'approximate'    // rima aproximada — alta similaridade
  | 'poor'           // rima pobre — mesma classe gramatical/sufixo
  | 'rich'           // rima rica — classes gramaticais diferentes
  | 'internal'       // rima interna — dentro do mesmo verso
  | 'multisyllabic'  // rima multissilábica — bloco fonético de 2+ sílabas
  | 'assonance'      // assonância — repetição da vogal tônica
  | 'alliteration'   // aliteração — repetição consonantal

export type RhymeScheme = string

export interface RhymeSchemeBlock {
  startLine: number
  endLine: number
  stanzaIndex: number
  blockIndex: number
  pattern: string
  type: RhymeScheme
  labels: (string | null)[]
  endWords: string[]
  description: string
  confidence: number
}

export interface RhymeMatch {
  id: string
  sourceWord: string
  targetWord: string
  sourceLine: number
  targetLine: number
  score: number          // 0-1
  type: RhymeType
  rhymeClass: string     // letra da cadeia (A, B, C...)
  color: string          // cor hex da cadeia
  phoneticSource: string
  phoneticTarget: string
  isInternal: boolean
  positions?: {          // posição no verso (para highlights)
    start: number
    end: number
    lineIndex: number
  }[]
}

export interface RhymeChain {
  id: string
  label: string          // A, B, C...
  color: string          // cor para highlight
  words: string[]
  lines: number[]
  type: RhymeType
}

export interface RhymeAnalysis {
  scheme: RhymeScheme
  schemePattern: string
  schemeBlocks: RhymeSchemeBlock[]
  lineLabels: (string | null)[]
  matches: RhymeMatch[]
  chains: RhymeChain[]
  rhymeDensity: number          // 0-1 — proporção de linhas com rima
  internalRhymes: RhymeMatch[]
  multisyllabicMatches: RhymeMatch[]
  assonanceMatches: RhymeMatch[]
  alliterationMatches: RhymeMatch[]
  suggestions: RhymeSuggestion[]
  endWords: string[]            // última palavra de cada linha
}

export interface RhymeSuggestion {
  forWord: string
  suggestions: string[]
  phoneticKey: string
}
