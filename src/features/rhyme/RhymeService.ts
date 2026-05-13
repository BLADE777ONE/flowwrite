// Motor de rimas — integra dicionário curado + matching fonético PT-BR
import { lookupDictionary } from './rhymeDictionary'
import { toPhoneticKey, extractRhymeNucleus, extractEndWord, splitLines, hasAssonance } from './phoneticUtils'
import { classifyRhymeType, detectRhymeScheme, getRhymeColor, getRhymeLabel } from './rhymeScoring'
import type { RhymeType, RhymeMatch, RhymeChain, RhymeAnalysis, RhymeSuggestion as RhymeSuggestionType } from '../../shared/types/Rhyme'
import WORD_BANK_JSON from './wordBank.json'
import PHRASE_BANK_JSON from './phraseBank.json'

export interface RhymeSuggestion {
  word: string
  type: RhymeType
  score: number
}

const WORD_BANK: readonly string[] = WORD_BANK_JSON
const PHRASE_BANK: readonly string[] = PHRASE_BANK_JSON

function normalize(word: string): string {
  return word
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z]/g, '')
}

// Ditongos do PT-BR que rimam entre si em rap/funk
const DIPHTHONG_FAMILIES: readonly string[][] = [
  ['OI'],       // hoje, boi, foi, dói, pois, noite, coisa
  ['AI'],       // vai, cai, sai, mais, pai, raiz
  ['EI'],       // lei, rei, sei, fei, lei, grey
  ['UI'],       // fui, azui, muito
  ['OU', 'AU'], // vou, mau, pau, sou, dou
  ['~OW'],      // ão, am — já coberto pelas nasais
]

function getDiphthongFamily(nucleus: string): string | null {
  for (const family of DIPHTHONG_FAMILIES) {
    for (const d of family) {
      // startsWith para ditongos iniciais (boi, foi, pois)
      // includes para ditongos no meio/fim (açoite: ASOITI contém OI)
      if (nucleus.startsWith(d) || nucleus.includes(d)) return family[0]
    }
  }
  return null
}

// Compara dois núcleos rímicos pelo sufixo — retorna score 0-1
function scoreByNucleus(wordA: string, wordB: string): number {
  const nucA = extractRhymeNucleus(wordA)
  const nucB = extractRhymeNucleus(wordB)

  if (nucA === nucB) return 1.0

  let overlap = 0
  const minLen = Math.min(nucA.length, nucB.length)
  for (let i = 1; i <= minLen; i++) {
    if (nucA.slice(-i) === nucB.slice(-i)) overlap = i
    else break
  }

  if (overlap > 0) {
    // Overlap de 1 só conta se ambos pertencem ao mesmo ditongo
    // (evita falsos positivos: "hoje" vs "feirante" → ambos terminam em I)
    if (overlap === 1) {
      const dA = getDiphthongFamily(nucA)
      const dB = getDiphthongFamily(nucB)
      if (!dA || !dB || dA !== dB) return 0
    }
    return Math.min((overlap / minLen) * 0.95, 0.95)
  }

  // Assonância por ditongo compartilhado (hoje ↔ pois, boi, foi, noite...)
  const dA = getDiphthongFamily(nucA)
  const dB = getDiphthongFamily(nucB)
  if (dA && dA === dB) return 0.45

  return 0
}

// Fallback: score por sufixo de caracteres normalizados
function scoreBySuffix(normA: string, normB: string): number {
  for (const len of [4, 3, 2]) {
    if (normA.length >= len && normB.length >= len) {
      if (normA.slice(-len) === normB.slice(-len)) {
        return len === 4 ? 0.75 : len === 3 ? 0.60 : 0.45
      }
    }
  }
  return 0
}

export function findRhymesTyped(input: string, limit = 12): RhymeSuggestion[] {
  if (!input || input.length < 2) return []

  const normInput = normalize(input)
  const seen = new Set<string>()
  const results: RhymeSuggestion[] = []

  function addResult(word: string, score: number, scoreBoost = 0) {
    const key = normalize(word)
    if (key === normInput || seen.has(key)) return
    seen.add(key)
    const finalScore = Math.min(score + scoreBoost, 1.0)
    results.push({
      word,
      type: classifyRhymeType(finalScore, input, word, false),
      score: finalScore,
    })
  }

  // 1. Dicionário curado — prioridade máxima
  const dictWords = lookupDictionary(input)
  for (const w of dictWords) {
    const sc = scoreByNucleus(input, w)
    addResult(w, sc > 0 ? sc : 0.7, 0.15)
  }

  // 2. WORD_BANK via núcleo fonético
  for (const candidate of WORD_BANK) {
    const sc = scoreByNucleus(input, candidate)
    if (sc >= 0.4) addResult(candidate, sc)
  }

  // 3. PHRASE_BANK — expressões multi-palavra (pois é, foi lá, dói né...)
  // A frase é avaliada pelo núcleo fonético da sua última palavra
  for (const phrase of PHRASE_BANK) {
    const lastWord = phrase.split(/\s+/).at(-1) ?? phrase
    const sc = scoreByNucleus(input, lastWord)
    // Também testa a frase inteira sem espaço (captura o ditongo completo)
    const scFull = scoreByNucleus(input, phrase.replace(/\s+/g, ''))
    const best = Math.max(sc, scFull)
    if (best >= 0.4) addResult(phrase, best, 0.05)
  }

  // 4. Fallback: sufixo de caracteres normalizados (garante resultados mínimos)
  if (results.length < 3) {
    for (const candidate of WORD_BANK) {
      const sc = scoreBySuffix(normInput, normalize(candidate))
      if (sc > 0) addResult(candidate, sc)
    }
  }

  return results.sort((a, b) => b.score - a.score).slice(0, limit)
}

// Compatibilidade retroativa com App.tsx
export function findRhymes(input: string, limit = 10): string[] {
  return findRhymesTyped(input, limit).map(r => r.word)
}

// Análise completa de rimas em um texto (usado por ArtistDNAService e analysisWorker)
export function analyzeRhymes(text: string): RhymeAnalysis {
  const lines = splitLines(text)
  const endWords = lines.map(extractEndWord)
  const phoneticKeys = endWords.map(w => toPhoneticKey(w))

  // Encontra pares de linhas que rimam
  const matches: RhymeMatch[] = []
  // Agrupa linhas em cadeias de rima
  const chainMap = new Map<string, number>() // nucleus → chainIndex
  const chains: RhymeChain[] = []
  const lineLabels: (string | null)[] = new Array(lines.length).fill(null)

  for (let i = 0; i < endWords.length; i++) {
    if (!endWords[i]) continue
    const nucA = extractRhymeNucleus(endWords[i])

    for (let j = i + 1; j < endWords.length; j++) {
      if (!endWords[j]) continue
      const score = scoreByNucleus(endWords[i], endWords[j])
      if (score < 0.4) continue

      const type = classifyRhymeType(score, endWords[i], endWords[j], false)
      const matchId = `${i}-${j}`

      // Determina cadeia de rima (cluster por núcleo fonético)
      let chainIdx = chainMap.get(nucA)
      if (chainIdx === undefined) {
        chainIdx = chains.length
        const label = getRhymeLabel(chainIdx)
        const color = getRhymeColor(chainIdx)
        chains.push({ id: `chain-${chainIdx}`, label, color, words: [], lines: [], type })
        chainMap.set(nucA, chainIdx)
      }
      const chain = chains[chainIdx]
      if (!chain.words.includes(endWords[i])) chain.words.push(endWords[i])
      if (!chain.words.includes(endWords[j])) chain.words.push(endWords[j])
      if (!chain.lines.includes(i)) chain.lines.push(i)
      if (!chain.lines.includes(j)) chain.lines.push(j)
      lineLabels[i] = chain.label
      lineLabels[j] = chain.label

      matches.push({
        id: matchId,
        sourceWord: endWords[i],
        targetWord: endWords[j],
        sourceLine: i,
        targetLine: j,
        score,
        type,
        rhymeClass: chain.label,
        color: chain.color,
        phoneticSource: phoneticKeys[i],
        phoneticTarget: phoneticKeys[j],
        isInternal: false,
      })
    }
  }

  // Assonâncias (baseadas em vogal tônica compartilhada, score mais baixo)
  const assonanceMatches = matches.filter(m => m.type === 'assonance')

  // Multissilábicas
  const multisyllabicMatches = matches.filter(m => m.type === 'multisyllabic')

  // Densidade: proporção de linhas com pelo menos uma rima
  const linesWithRhyme = new Set(matches.flatMap(m => [m.sourceLine, m.targetLine]))
  const rhymeDensity = lines.length > 0 ? linesWithRhyme.size / lines.length : 0

  // Esquema de rima
  const scheme = detectRhymeScheme(lineLabels)

  // Sugestões para linhas sem rima
  const suggestions: RhymeSuggestionType[] = endWords
    .map((w, i) => ({ w, i }))
    .filter(({ w, i }) => w && !linesWithRhyme.has(i))
    .slice(0, 5)
    .map(({ w }) => ({
      forWord: w,
      suggestions: findRhymes(w, 6),
      phoneticKey: toPhoneticKey(w),
    }))

  // Step 2: scan every word in every line for internal rhymes that echo an established chain.
  // Only runs when at least one chain exists (otherwise there's nothing to match against).
  const internalRhymes: RhymeMatch[] = []

  const INTERNAL_STOP = new Set([
    'o','a','os','as','um','uma','de','do','da','dos','das',
    'em','no','na','nos','nas','por','para','com','sem','sob',
    'e','ou','mas','que','se','pra','pro','num','numas','dum',
  ])

  if (chains.length > 0) {
    for (let lineIdx = 0; lineIdx < lines.length; lineIdx++) {
      const line = lines[lineIdx]
      const lineEndWord = endWords[lineIdx]
      if (!lineEndWord) continue

      const wordRe = /[a-zA-ZÀ-ÿ]+/g
      let m: RegExpExecArray | null

      while ((m = wordRe.exec(line)) !== null) {
        const rawWord = m[0]
        const normWord = normalize(rawWord)

        if (normWord === lineEndWord) continue  // end-word gets its own decoration
        if (normWord.length <= 3) continue
        if (INTERNAL_STOP.has(normWord)) continue

        // Find the chain whose nucleus best matches this word
        let bestScore = 0
        let bestChainIdx = -1
        for (let chainIdx = 0; chainIdx < chains.length; chainIdx++) {
          const score = scoreByNucleus(normWord, chains[chainIdx].words[0])
          if (score >= 0.4 && score > bestScore) {
            bestScore = score
            bestChainIdx = chainIdx
          }
        }

        if (bestChainIdx === -1) continue

        const chain = chains[bestChainIdx]
        internalRhymes.push({
          id: `int-${lineIdx}-${m.index}`,
          sourceWord: normWord,
          targetWord: chain.words[0],
          sourceLine: lineIdx,
          targetLine: lineIdx,
          score: bestScore,
          type: 'internal',
          rhymeClass: chain.label,
          color: chain.color,
          phoneticSource: toPhoneticKey(normWord),
          phoneticTarget: toPhoneticKey(chain.words[0]),
          isInternal: true,
        })
      }
    }
  }

  return {
    scheme,
    matches,
    chains,
    rhymeDensity,
    internalRhymes,
    multisyllabicMatches,
    assonanceMatches,
    alliterationMatches: [],
    suggestions,
    endWords,
  }
}
