// src/features/artistDNA/ArtistDNAService.ts
// Serviço de perfil estilístico do artista — aprende com as letras salvas

import { ArtistDNA } from '../../shared/types/Metrics'
import { calculateVocabularyEntropy, findSaturatedWords, getTopWords, extractContentWords } from './vocabularyEntropy'
import { analyzeMetrics } from '../metrics/MetricsService'
import { analyzeRhymes } from '../rhyme/RhymeService'

// Campos semânticos para detectar temas recorrentes
const SEMANTIC_FIELDS: Record<string, string[]> = {
  'rua/quebrada': ['rua', 'favela', 'quebrada', 'beco', 'viela', 'asfalto', 'periferia', 'vila', 'gueto', 'comunidade'],
  'dinheiro/sucesso': ['dinheiro', 'grana', 'money', 'cash', 'topo', 'sucesso', 'rico', 'nível', 'luxo', 'ostentação'],
  'família/raízes': ['mãe', 'pai', 'família', 'irmão', 'sangue', 'raiz', 'origem', 'base', 'casa', 'infância'],
  'violência/risco': ['bala', 'tiro', 'morte', 'faca', 'guerra', 'fuga', 'perigo', 'sobreviver', 'resistir'],
  'espiritualidade': ['deus', 'fé', 'oração', 'santo', 'sagrado', 'crença', 'céu', 'espírito', 'luz'],
  'amor/relacionamento': ['amor', 'paixão', 'coração', 'saudade', 'beijo', 'ela', 'sentir', 'apaixonado'],
  'superação/motivação': ['superar', 'vencer', 'lutar', 'força', 'poder', 'determinação', 'garra', 'sonho'],
  'traição/inveja': ['traição', 'falso', 'inveja', 'inimigo', 'atrair', 'queda', 'invejoso', 'cobra'],
}

/**
 * Calcula o DNA estilístico completo a partir de todas as letras do artista
 */
export function calculateArtistDNA(allLyricsText: string, songCount: number): ArtistDNA {
  if (!allLyricsText.trim()) {
    return emptyDNA()
  }

  // ─── Análise de vocabulário ──────────────────────────────────────────────────
  const allWords = extractContentWords(allLyricsText)
  const uniqueWords = new Set(allWords).size
  const totalWords = allWords.length
  const vocabularyEntropy = calculateVocabularyEntropy(allLyricsText)
  const frequentWords = getTopWords(allLyricsText, 20)
  const saturatedWords = findSaturatedWords(allLyricsText)

  // ─── Análise de métricas ─────────────────────────────────────────────────────
  const metricsAnalysis = analyzeMetrics(allLyricsText)

  // ─── Análise de rimas ────────────────────────────────────────────────────────
  const rhymeAnalysis = analyzeRhymes(allLyricsText)

  // ─── Detecção de temas ───────────────────────────────────────────────────────
  const recurringThemes = detectThemes(allLyricsText)

  // ─── Vibe dominante ──────────────────────────────────────────────────────────
  const dominantVibe = inferDominantVibe(recurringThemes)

  // ─── Taxa de rimas multissilábicas ──────────────────────────────────────────
  const multisyllableRate = rhymeAnalysis.matches.length > 0
    ? rhymeAnalysis.multisyllabicMatches.length / rhymeAnalysis.matches.length
    : 0

  // ─── Taxa de rimas internas ──────────────────────────────────────────────────
  const internalRhymeRate = rhymeAnalysis.matches.length > 0
    ? rhymeAnalysis.internalRhymes.length / (rhymeAnalysis.matches.length + rhymeAnalysis.internalRhymes.length)
    : 0

  // ─── Taxa de ad-libs (heurística: palavras entre parênteses ou onomatopeias) ─
  const adlibCount = (allLyricsText.match(/\(([^)]+)\)/g) || []).length
  const lineCount = allLyricsText.split('\n').filter(Boolean).length
  const adlibUsageRate = lineCount > 0 ? adlibCount / lineCount : 0

  // ─── Alertas de repetição ────────────────────────────────────────────────────
  const repetitionAlerts = saturatedWords.slice(0, 5).map(
    w => `Você repete muito a palavra "${w}" — considere variar com metáforas`
  )

  // ─── Sugestões de evolução ───────────────────────────────────────────────────
  const evolutionSuggestions = generateEvolutionSuggestions({
    vocabularyEntropy,
    saturatedWords,
    recurringThemes,
    multisyllableRate,
    internalRhymeRate,
    rhymeDensity: rhymeAnalysis.rhymeDensity
  })

  return {
    totalSongs: songCount,
    totalWords,
    uniqueWords,
    vocabularyEntropy,
    frequentWords,
    saturatedWords,
    recurringThemes,
    dominantVibe,
    averageLineLength: metricsAnalysis.totalWords / Math.max(1, metricsAnalysis.totalLines),
    averageSyllablesPerLine: metricsAnalysis.averageSyllables,
    rhymeDensity: rhymeAnalysis.rhymeDensity,
    internalRhymeRate,
    multisyllableRate,
    adlibUsageRate,
    evolutionSuggestions,
    repetitionAlerts,
    updatedAt: new Date()
  }
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function detectThemes(text: string) {
  const normalizedText = text.toLowerCase()
  const themes = []

  for (const [theme, keywords] of Object.entries(SEMANTIC_FIELDS)) {
    const matchedKeywords = keywords.filter(kw => normalizedText.includes(kw))
    if (matchedKeywords.length >= 2) {
      const weight = matchedKeywords.length / keywords.length
      themes.push({ theme, weight, keywords: matchedKeywords })
    }
  }

  return themes.sort((a, b) => b.weight - a.weight)
}

function inferDominantVibe(themes: { theme: string; weight: number }[]): string | null {
  if (themes.length === 0) return null

  const top = themes[0].theme
  const vibeMap: Record<string, string> = {
    'rua/quebrada': 'drill',
    'dinheiro/sucesso': 'trap',
    'espiritualidade': 'boombap',
    'amor/relacionamento': 'trap melódico',
    'superação/motivação': 'rap consciente',
    'violência/risco': 'drill',
    'família/raízes': 'boombap'
  }

  return vibeMap[top] || 'trap'
}

function generateEvolutionSuggestions(data: {
  vocabularyEntropy: number
  saturatedWords: string[]
  recurringThemes: { theme: string }[]
  multisyllableRate: number
  internalRhymeRate: number
  rhymeDensity: number
}): string[] {
  const suggestions: string[] = []

  if (data.vocabularyEntropy < 0.5) {
    suggestions.push('Sua entropia de vocabulário está baixa — experimente usar palavras de campos semânticos novos')
  }

  if (data.saturatedWords.length > 3) {
    suggestions.push(`Palavras supersaturadas detectadas: ${data.saturatedWords.slice(0, 3).join(', ')} — tente substituir algumas por metáforas`)
  }

  if (data.multisyllableRate < 0.1) {
    suggestions.push('Poucas rimas multissilábicas — tente rimar frases inteiras ao invés de apenas a última palavra')
  }

  if (data.internalRhymeRate < 0.15) {
    suggestions.push('Você usa poucas rimas internas — rimar dentro do mesmo verso aumenta a densidade e o punch')
  }

  if (data.rhymeDensity < 0.5) {
    suggestions.push('Densidade de rimas baixa — mais da metade das linhas não rimam com nada')
  }

  if (data.recurringThemes.length <= 2) {
    suggestions.push('Seus temas são concentrados — experimente cruzar dois temas opostos para criar contraste poético')
  }

  const themeNames = data.recurringThemes.map(t => t.theme)
  if (themeNames.includes('dinheiro/sucesso') && !themeNames.includes('família/raízes')) {
    suggestions.push('Você fala muito de sucesso — contrastar com origem/família pode criar profundidade narrativa')
  }

  return suggestions.slice(0, 6)
}

function emptyDNA(): ArtistDNA {
  return {
    totalSongs: 0, totalWords: 0, uniqueWords: 0,
    vocabularyEntropy: 0, frequentWords: [], saturatedWords: [],
    recurringThemes: [], dominantVibe: null,
    averageLineLength: 0, averageSyllablesPerLine: 0,
    rhymeDensity: 0, internalRhymeRate: 0,
    multisyllableRate: 0, adlibUsageRate: 0,
    evolutionSuggestions: [], repetitionAlerts: [],
    updatedAt: new Date()
  }
}
