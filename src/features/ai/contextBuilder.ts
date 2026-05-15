import { analyzeMetrics } from '../metrics/MetricsService'
import { analyzeRhymes } from '../rhyme/RhymeService'
import type { CompactLyricContext, LyricAssistantRequest } from './types'
import { estimateContextSavings, estimateTokens, trimToTokenBudget } from './tokenBudget'

function cleanLine(line: string): string {
  return line.replace(/\s+/g, ' ').trim()
}

function getFocusedLines(lines: string[], activeLineIndex: number): string[] {
  const safeIndex = Math.max(0, Math.min(activeLineIndex, Math.max(lines.length - 1, 0)))
  const blockStart = Math.floor(safeIndex / 4) * 4
  const block = lines.slice(blockStart, blockStart + 4)

  if (block.length >= 2) return block
  return lines.slice(Math.max(0, safeIndex - 3), safeIndex + 5)
}

export function buildCompactLyricContext(request: LyricAssistantRequest): CompactLyricContext {
  const text = String(request.text || '')
  const allLines = text.split('\n').map(cleanLine).filter(Boolean)
  const activeLineIndex = Number.isFinite(request.activeLineIndex)
    ? Number(request.activeLineIndex)
    : Math.max(0, allLines.length - 1)
  const focused = trimToTokenBudget(getFocusedLines(allLines, activeLineIndex), 520)
  const activeLine = cleanLine(request.activeLine || focused[Math.min(activeLineIndex, Math.max(focused.length - 1, 0))] || focused.at(-1) || '')
  const metrics = analyzeMetrics(focused.join('\n'), request.bpm)
  const rhymes = analyzeRhymes(focused.join('\n'))
  const wordCount = text.split(/\s+/).filter(Boolean).length

  return {
    action: request.action,
    bpm: Number.isFinite(request.bpm) ? Math.round(request.bpm) : 120,
    selectedWord: cleanLine(request.selectedWord || ''),
    activeLine,
    activeLineIndex,
    activeLines: focused,
    fullLineCount: allLines.length,
    wordCount,
    estimatedInputTokens: estimateTokens(focused.join('\n')),
    rhymeScheme: rhymes.schemePattern || rhymes.schemeBlocks?.at(-1)?.pattern || 'livre',
    averageSyllables: Math.round((metrics.averageSyllables || 0) * 10) / 10,
    flowSpeed: metrics.flowSpeed,
    warnings: metrics.warnings.slice(0, 4),
  }
}

export function getContextSavings(fullText: string, context: CompactLyricContext): number {
  return estimateContextSavings(fullText, context.activeLines)
}
