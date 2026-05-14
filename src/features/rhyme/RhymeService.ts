// Motor de rimas — integra dicionário curado + matching fonético PT-BR
import { lookupDictionary } from './rhymeDictionary'
import { toPhoneticKey, extractRhymeNucleus, extractEndWord, hasAssonance } from './phoneticUtils'
import { classifyRhymeType, detectRhymeScheme, getPredictableEndingLabel, getRhymeColor, getRhymeLabel } from './rhymeScoring'
import type {
  RhymeType,
  RhymeMatch,
  RhymeChain,
  RhymeAnalysis,
  RhymeScheme,
  RhymeSchemeBlock,
  RhymeSuggestion as RhymeSuggestionType,
} from '../../shared/types/Rhyme'
import WORD_BANK_JSON from './wordBank.json'
import PHRASE_BANK_JSON from './phraseBank.json'
import WORD_INDEX_JSON from './wordIndex.json'

export interface RhymeSuggestion {
  word: string
  type: RhymeType
  score: number
  lane: 'forte' | 'criativa' | 'inclinada' | 'frase' | 'simples'
  source: 'curated' | 'bank' | 'index' | 'phrase' | 'suffix'
  phoneticKey: string
  ending: string
  reason: string
}

export interface RhymeFamily {
  id: string
  ending: string
  count: number
  strength: number
  dominantLane: RhymeSuggestion['lane']
  examples: string[]
  laneCounts: Record<RhymeSuggestion['lane'], number>
}

export interface RhymeMove {
  id: string
  title: string
  body: string
  word: string
  lane: RhymeSuggestion['lane']
  reason: string
}

const WORD_BANK: readonly string[] = WORD_BANK_JSON
const PHRASE_BANK: readonly string[] = PHRASE_BANK_JSON
const WORD_INDEX: Record<string, readonly string[]> = WORD_INDEX_JSON as Record<string, readonly string[]>

const LANE_PRIORITY: Record<RhymeSuggestion['lane'], number> = {
  forte: 5,
  criativa: 4,
  frase: 3,
  inclinada: 2,
  simples: 1,
}

interface RhymeStanza {
  startLine: number
  lines: string[]
}

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

function vowelSignature(nucleus: string): string {
  return (nucleus.replace(/W/g, 'U').match(/[AEIOU~]/g) ?? [])
    .join('')
    .replace(/([AEIOU~])\1+/g, '$1')
}

function consonantSignature(nucleus: string): string {
  return nucleus
    .replace(/W/g, '')
    .replace(/[AEIOU~]/g, '')
}

function hasVocalizedL(nucleus: string): boolean {
  return nucleus.includes('W')
}

function hasCompatibleConsonantAnchor(nucA: string, nucB: string): boolean {
  const conA = consonantSignature(nucA)
  const conB = consonantSignature(nucB)

  if (!conA || !conB) return false

  return conA.slice(-1) === conB.slice(-1) || conA.slice(-2) === conB.slice(-2)
}

function scoreByVowelShape(nucA: string, nucB: string): number {
  const sigA = vowelSignature(nucA)
  const sigB = vowelSignature(nucB)

  if (!sigA || !sigB) return 0

  // Rap/trap usa muita rima inclinada por assonância, mas ela não pode dominar o
  // esquema. "forma" não deve virar família de "idiota/cota/tropa" só por "o-a".
  if (sigA.length >= 2 && sigB.length >= 2) {
    const sameSignature = sigA === sigB
    const sameEndingSignature = sigA.slice(-2) === sigB.slice(-2)

    if (sameSignature && hasVocalizedL(nucA) && hasVocalizedL(nucB)) {
      return 0.62 // calmo ≈ alto, mal ≈ tal
    }

    if (sameSignature && hasCompatibleConsonantAnchor(nucA, nucB)) {
      return 0.48
    }

    if (sameSignature) return 0.44
    if (sameEndingSignature) return 0.28
  }

  return 0
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
      if (!dA || !dB || dA !== dB) return scoreByVowelShape(nucA, nucB)
    }
    return Math.min((overlap / minLen) * 0.95, 0.95)
  }

  // Assonância por ditongo compartilhado (hoje ↔ pois, boi, foi, noite...)
  const dA = getDiphthongFamily(nucA)
  const dB = getDiphthongFamily(nucB)
  if (dA && dA === dB) return 0.45

  return scoreByVowelShape(nucA, nucB)
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

function classifySuggestionLane(word: string, type: RhymeType, score: number, source: RhymeSuggestion['source']): RhymeSuggestion['lane'] {
  if (source === 'phrase' || word.includes(' ')) return 'frase'
  if (type === 'rich' || type === 'multisyllabic') return 'criativa'
  if (type === 'assonance' || (score >= 0.4 && score < 0.65)) return 'inclinada'
  if (score >= 0.82 && type !== 'poor') return 'forte'
  return 'simples'
}

function describeSuggestion(type: RhymeType, score: number, source: RhymeSuggestion['source']): string {
  if (source === 'curated') return 'curada para rap/trap'
  if (source === 'phrase') return 'frase pronta para fechamento'
  if (type === 'multisyllabic') return 'encaixe multissilábico'
  if (type === 'rich') return 'rima rica/incomum'
  if (type === 'assonance') return 'rima inclinada por vogal'
  if (type === 'poor') return 'rima previsível'
  if (score >= 0.85) return 'som final muito próximo'
  return 'aproximação fonética'
}

function splitIntoRhymeStanzas(text: string): RhymeStanza[] {
  const stanzas: RhymeStanza[] = []
  let currentLines: string[] = []
  let currentStartLine = 0
  let nonEmptyLineIndex = 0

  const flush = () => {
    if (currentLines.length === 0) return
    stanzas.push({ startLine: currentStartLine, lines: currentLines })
    currentLines = []
  }

  for (const rawLine of text.split('\n')) {
    const line = rawLine.trim()

    if (!line) {
      flush()
      continue
    }

    if (currentLines.length === 0) currentStartLine = nonEmptyLineIndex
    currentLines.push(line)
    nonEmptyLineIndex++
  }

  flush()
  return stanzas
}

function classifySchemePattern(pattern: string): { type: RhymeScheme; description: string; confidence: number } {
  const clean = pattern.replace(/-/g, '')

  if (clean.length < 2) {
    return { type: 'free', description: 'Livre: ainda não há versos suficientes para formar esquema.', confidence: 0 }
  }

  const known: Record<string, { description: string; confidence: number }> = {
    AABB: { description: 'Pareado: duas linhas rimam entre si e as duas seguintes fecham outro par.', confidence: 1 },
    ABAB: { description: 'Alternado: a primeira linha conversa com a terceira, a segunda com a quarta.', confidence: 1 },
    ABCB: { description: 'Balada/quadrinha: a segunda e a quarta linha fecham a rima; primeira e terceira ficam livres.', confidence: 0.95 },
    ABBA: { description: 'Interpolado: a primeira fecha com a quarta, e o centro fecha em par.', confidence: 0.95 },
    AAAA: { description: 'Monorrima: todas as linhas caem no mesmo som.', confidence: 1 },
    AABA: { description: 'Retorno: três linhas no mesmo som, com uma quebra no terceiro movimento.', confidence: 0.9 },
    ABCA: { description: 'Retorno aberto: a primeira linha volta no fim do bloco.', confidence: 0.85 },
    ABAC: { description: 'Rima parcial: a primeira linha reaparece na terceira.', confidence: 0.8 },
    ABCC: { description: 'Fechamento pareado: as duas últimas linhas resolvem juntas.', confidence: 0.85 },
  }

  if (known[clean]) {
    return { type: clean, ...known[clean] }
  }

  const unique = new Set(clean).size
  const hasRepetition = clean.length !== unique
  if (!hasRepetition) {
    return { type: 'free', description: 'Livre: finais sem repetição clara dentro do bloco.', confidence: 0.35 }
  }

  return {
    type: 'mixed',
    description: 'Misto: há rimas, mas o desenho não cai em um padrão clássico.',
    confidence: 0.65,
  }
}

function buildSchemeLabels(endWords: string[]): (string | null)[] {
  const representatives: Array<{ label: string; word: string }> = []
  const labels: (string | null)[] = []

  for (const word of endWords) {
    if (!word) {
      labels.push(null)
      continue
    }

    let bestIdx = -1
    let bestScore = 0
    for (let i = 0; i < representatives.length; i++) {
      const score = scoreByNucleus(word, representatives[i].word)
      if (score >= 0.4 && score > bestScore) {
        bestIdx = i
        bestScore = score
      }
    }

    if (bestIdx >= 0) {
      labels.push(representatives[bestIdx].label)
    } else {
      const label = getRhymeLabel(representatives.length)
      representatives.push({ label, word })
      labels.push(label)
    }
  }

  return labels
}

function buildSchemeBlocks(
  labels: (string | null)[],
  endWords: string[],
  stanzaIndex: number,
  lineOffset: number,
  blockSize = 4,
): RhymeSchemeBlock[] {
  const blocks: RhymeSchemeBlock[] = []

  for (let start = 0; start < labels.length; start += blockSize) {
    const blockLabels = labels.slice(start, start + blockSize)
    const blockEndWords = endWords.slice(start, start + blockSize)
    if (blockLabels.filter(Boolean).length < 2) continue

    const pattern = blockLabels.map(label => label ?? '-').join('')
    const classified = classifySchemePattern(pattern)

    blocks.push({
      startLine: lineOffset + start,
      endLine: lineOffset + start + blockLabels.length - 1,
      stanzaIndex,
      blockIndex: Math.floor(start / blockSize),
      pattern,
      labels: blockLabels,
      endWords: blockEndWords,
      ...classified,
    })
  }

  return blocks
}

function getOverallScheme(blocks: RhymeSchemeBlock[]): RhymeScheme {
  if (blocks.length === 0) return 'free'
  const useful = blocks.filter(block => block.type !== 'free')
  if (useful.length === 0) return 'free'
  const first = useful[0].type
  return useful.every(block => block.type === first) ? first : 'mixed'
}

function buildSchemeData(stanzas: RhymeStanza[], endWords: string[]) {
  const schemeLineLabels: (string | null)[] = new Array(endWords.length).fill(null)
  const schemeBlocks: RhymeSchemeBlock[] = []

  stanzas.forEach((stanza, stanzaIndex) => {
    const stanzaEndWords = endWords.slice(stanza.startLine, stanza.startLine + stanza.lines.length)
    const stanzaLabels = buildSchemeLabels(stanzaEndWords)

    stanzaLabels.forEach((label, index) => {
      schemeLineLabels[stanza.startLine + index] = label
    })

    schemeBlocks.push(
      ...buildSchemeBlocks(stanzaLabels, stanzaEndWords, stanzaIndex, stanza.startLine),
    )
  })

  return { schemeLineLabels, schemeBlocks }
}

export function findRhymesTyped(input: string, limit = 12): RhymeSuggestion[] {
  if (!input || input.length < 2) return []

  const normInput = normalize(input)
  const seen = new Map<string, number>()
  const results: RhymeSuggestion[] = []

  function addResult(word: string, score: number, source: RhymeSuggestion['source'], scoreBoost = 0) {
    const key = normalize(word)
    if (key === normInput) return
    const predictablePenalty = getPredictableEndingLabel(word) ? 0.06 : 0
    const finalScore = Math.max(0, Math.min(score + scoreBoost - predictablePenalty, 1.0))
    const existingIndex = seen.get(key)
    if (existingIndex !== undefined) {
      if (results[existingIndex].score >= finalScore) return
      const type = classifyRhymeType(finalScore, input, word, false)
      results[existingIndex] = {
        word,
        type,
        score: finalScore,
        lane: classifySuggestionLane(word, type, finalScore, source),
        source,
        phoneticKey: toPhoneticKey(word),
        ending: extractRhymeNucleus(word),
        reason: describeSuggestion(type, finalScore, source),
      }
      return
    }
    const type = classifyRhymeType(finalScore, input, word, false)
    seen.set(key, results.length)
    results.push({
      word,
      type,
      score: finalScore,
      lane: classifySuggestionLane(word, type, finalScore, source),
      source,
      phoneticKey: toPhoneticKey(word),
      ending: extractRhymeNucleus(word),
      reason: describeSuggestion(type, finalScore, source),
    })
  }

  // 1. Dicionário curado — prioridade máxima
  const dictWords = lookupDictionary(input)
  for (const w of dictWords) {
    const sc = scoreByNucleus(input, w)
    addResult(w, sc > 0 ? sc : 0.7, 'curated', 0.15)
  }

  // 2. WORD_BANK via núcleo fonético
  for (const candidate of WORD_BANK) {
    const sc = scoreByNucleus(input, candidate)
    if (sc >= 0.4) addResult(candidate, sc, 'bank')
  }

  // 2b. WORD_INDEX — 15k palavras indexadas por sufixo (pythonprobr/palavras)
  // Lookup O(1): apenas candidatos com sufixo compatível são pontuados.
  {
    const s2 = normInput.slice(-2)
    const s3 = normInput.slice(-3)
    const s4 = normInput.slice(-4)
    const s5 = normInput.slice(-5)
    const indexCandidates = new Set<string>([
      ...(WORD_INDEX[s5] ?? []),
      ...(WORD_INDEX[s4] ?? []),
      ...(WORD_INDEX[s3] ?? []),
      ...(WORD_INDEX[s2] ?? []),
    ])
    for (const candidate of indexCandidates) {
      const sc = scoreByNucleus(input, candidate)
      if (sc >= 0.4) addResult(candidate, sc, 'index')
    }
  }

  // 3. PHRASE_BANK — expressões multi-palavra (pois é, foi lá, dói né...)
  // A frase é avaliada pelo núcleo fonético da sua última palavra
  for (const phrase of PHRASE_BANK) {
    const lastWord = phrase.split(/\s+/).at(-1) ?? phrase
    const sc = scoreByNucleus(input, lastWord)
    // Também testa a frase inteira sem espaço (captura o ditongo completo)
    const scFull = scoreByNucleus(input, phrase.replace(/\s+/g, ''))
    const best = Math.max(sc, scFull)
    if (best >= 0.4) addResult(phrase, best, 'phrase', 0.08)
  }

  // 4. Fallback: sufixo de caracteres normalizados (garante resultados mínimos)
  if (results.length < 3) {
    for (const candidate of WORD_BANK) {
      const sc = scoreBySuffix(normInput, normalize(candidate))
      if (sc > 0) addResult(candidate, sc, 'suffix')
    }
  }

  // 5. Modo criativo: rap/trap precisa de volume. Quando a palavra e rara,
  // abrimos a tolerancia para rimas inclinadas e assonancias, mantendo score
  // visivel para o artista decidir o que funciona na voz.
  if (results.length < 40) {
    for (const candidate of WORD_BANK) {
      const sc = Math.max(scoreByNucleus(input, candidate), scoreBySuffix(normInput, normalize(candidate)))
      if (sc >= 0.28) addResult(candidate, sc, 'bank', -0.04)
      if (results.length >= 80) break
    }
  }

  return results
    .sort((a, b) => {
      const laneDiff = LANE_PRIORITY[b.lane] - LANE_PRIORITY[a.lane]
      if (laneDiff !== 0) return laneDiff
      return b.score - a.score
    })
    .slice(0, limit)
}

function emptyLaneCounts(): Record<RhymeSuggestion['lane'], number> {
  return { forte: 0, criativa: 0, inclinada: 0, frase: 0, simples: 0 }
}

export function buildRhymeFamilies(suggestions: RhymeSuggestion[], limit = 5): RhymeFamily[] {
  const families = new Map<string, RhymeFamily>()

  for (const suggestion of suggestions) {
    const ending = suggestion.ending || extractRhymeNucleus(suggestion.word)
    const id = ending || suggestion.phoneticKey || normalize(suggestion.word)
    const current = families.get(id)

    if (!current) {
      const laneCounts = emptyLaneCounts()
      laneCounts[suggestion.lane] = 1
      families.set(id, {
        id,
        ending,
        count: 1,
        strength: suggestion.score * LANE_PRIORITY[suggestion.lane],
        dominantLane: suggestion.lane,
        examples: [suggestion.word],
        laneCounts,
      })
      continue
    }

    current.count += 1
    current.strength += suggestion.score * LANE_PRIORITY[suggestion.lane]
    current.laneCounts[suggestion.lane] += 1
    if (!current.examples.includes(suggestion.word) && current.examples.length < 5) {
      current.examples.push(suggestion.word)
    }

    const currentDominantCount = current.laneCounts[current.dominantLane]
    const newLaneCount = current.laneCounts[suggestion.lane]
    if (
      newLaneCount > currentDominantCount ||
      (newLaneCount === currentDominantCount && LANE_PRIORITY[suggestion.lane] > LANE_PRIORITY[current.dominantLane])
    ) {
      current.dominantLane = suggestion.lane
    }
  }

  return [...families.values()]
    .sort((a, b) => {
      const strengthDiff = b.strength - a.strength
      if (strengthDiff !== 0) return strengthDiff
      return b.count - a.count
    })
    .slice(0, limit)
}

export function buildRhymeMoves(input: string, suggestions: RhymeSuggestion[], limit = 4): RhymeMove[] {
  if (!input || suggestions.length === 0) return []

  const moves: RhymeMove[] = []
  const pick = (lane: RhymeSuggestion['lane']) => suggestions.find(item => item.lane === lane)
  const strong = pick('forte')
  const creative = pick('criativa')
  const inclined = pick('inclinada')
  const phrase = pick('frase')

  if (strong) {
    moves.push({
      id: `close-${strong.word}`,
      title: 'Fechamento limpo',
      body: `Use "${strong.word}" quando quiser resolver a barra sem perder impacto.`,
      word: strong.word,
      lane: strong.lane,
      reason: strong.reason,
    })
  }

  if (creative) {
    moves.push({
      id: `punch-${creative.word}`,
      title: 'Punch mais autoral',
      body: `Puxe "${creative.word}" para sair da rima previsivel e ganhar cor.`,
      word: creative.word,
      lane: creative.lane,
      reason: creative.reason,
    })
  }

  if (inclined) {
    moves.push({
      id: `pocket-${inclined.word}`,
      title: 'Trap pocket',
      body: `Teste "${inclined.word}" como rima inclinada; funciona bem fora do tempo quadrado.`,
      word: inclined.word,
      lane: inclined.lane,
      reason: inclined.reason,
    })
  }

  if (phrase) {
    moves.push({
      id: `phrase-${phrase.word}`,
      title: 'Frase de queda',
      body: `"${phrase.word}" ja vem com gesto de fechamento para fim de linha.`,
      word: phrase.word,
      lane: phrase.lane,
      reason: phrase.reason,
    })
  }

  return moves.slice(0, limit)
}

// Compatibilidade retroativa com App.tsx
export function findRhymes(input: string, limit = 10): string[] {
  return findRhymesTyped(input, limit).map(r => r.word)
}

// Análise completa de rimas em um texto (usado por ArtistDNAService e analysisWorker)
export function analyzeRhymes(text: string): RhymeAnalysis {
  const stanzas = splitIntoRhymeStanzas(text)
  const lines = stanzas.flatMap(stanza => stanza.lines)
  const endWords = lines.map(extractEndWord)
  const phoneticKeys = endWords.map(w => toPhoneticKey(w))
  const { schemeLineLabels, schemeBlocks } = buildSchemeData(stanzas, endWords)

  // Encontra pares de linhas que rimam
  const matches: RhymeMatch[] = []
  // Agrupa linhas em cadeias de rima
  const chainMap = new Map<string, number>() // nucleus → chainIndex
  const chains: RhymeChain[] = []
  const lineLabels: (string | null)[] = new Array(lines.length).fill(null)

  for (const stanza of stanzas) {
    const start = stanza.startLine
    const end = stanza.startLine + stanza.lines.length

    for (let i = start; i < end; i++) {
      if (!endWords[i]) continue
      const nucA = extractRhymeNucleus(endWords[i])

      for (let j = i + 1; j < end; j++) {
        if (!endWords[j]) continue
        const score = scoreByNucleus(endWords[i], endWords[j])
        if (score < 0.4) continue

        const type = classifyRhymeType(score, endWords[i], endWords[j], false)
        const matchId = `${i}-${j}`

        // Determina cadeia de rima dentro dos blocos separados por linha em branco.
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
  }

  // Assonâncias (baseadas em vogal tônica compartilhada, score mais baixo)
  const assonanceMatches = matches.filter(m => m.type === 'assonance')

  // Multissilábicas
  const multisyllabicMatches = matches.filter(m => m.type === 'multisyllabic')

  // Densidade: proporção de linhas com pelo menos uma rima
  const linesWithRhyme = new Set(matches.flatMap(m => [m.sourceLine, m.targetLine]))
  const rhymeDensity = lines.length > 0 ? linesWithRhyme.size / lines.length : 0

  // Esquema de rima posicional (AABB, ABAB, ABCB etc.)
  // Usa todas as linhas, inclusive as que não repetem rima, para não achatar padrões.
  const legacyScheme = detectRhymeScheme(lineLabels)
  const scheme = getOverallScheme(schemeBlocks) || legacyScheme
  const schemePattern = schemeBlocks.length > 0
    ? schemeBlocks.map(block => block.pattern).join(' / ')
    : schemeLineLabels.map(label => label ?? '-').join('')

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
    schemePattern,
    schemeBlocks,
    lineLabels: schemeLineLabels,
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
