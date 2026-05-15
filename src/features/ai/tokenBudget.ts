const DEFAULT_MAX_INPUT_TOKENS = 900

export function estimateTokens(text: string): number {
  return Math.ceil(String(text || '').length / 4)
}

export function trimToTokenBudget(lines: string[], maxTokens = DEFAULT_MAX_INPUT_TOKENS): string[] {
  const compact: string[] = []
  let total = 0

  for (const line of lines) {
    const next = estimateTokens(line)
    if (total + next > maxTokens && compact.length > 0) break
    compact.push(line)
    total += next
  }

  return compact
}

export function estimateContextSavings(fullText: string, compactLines: string[]): number {
  return Math.max(0, estimateTokens(fullText) - estimateTokens(compactLines.join('\n')))
}
