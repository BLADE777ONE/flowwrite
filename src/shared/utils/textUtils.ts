// src/shared/utils/textUtils.ts
// Utilitários gerais de texto

export function wordCount(text: string): number {
  return text.split(/\s+/).filter(Boolean).length
}

export function lineCount(text: string): number {
  return text.split('\n').filter(l => l.trim()).length
}

export function truncate(str: string, max: number): string {
  return str.length > max ? str.slice(0, max) + '…' : str
}

export function capitalize(str: string): string {
  return str.charAt(0).toUpperCase() + str.slice(1)
}

// src/shared/utils/portugueseUtils.ts
// Utilitários específicos do Português Brasileiro

export const PREPOSITIONS = ['de', 'do', 'da', 'dos', 'das', 'em', 'no', 'na', 'por', 'para', 'pra', 'com', 'sob', 'sobre', 'entre', 'até', 'desde', 'após']
export const ARTICLES     = ['o', 'a', 'os', 'as', 'um', 'uma', 'uns', 'umas']
export const CONJUNCTIONS = ['e', 'ou', 'mas', 'que', 'se', 'nem', 'porque', 'pois', 'logo', 'portanto']

export function isFunctionWord(word: string): boolean {
  const clean = word.toLowerCase()
  return PREPOSITIONS.includes(clean) || ARTICLES.includes(clean) || CONJUNCTIONS.includes(clean)
}

// src/shared/utils/id.ts
let counter = 0
export function generateId(prefix = 'id'): string {
  return `${prefix}_${Date.now()}_${++counter}`
}

// src/shared/utils/date.ts
export function formatDate(date: Date): string {
  return date.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: '2-digit' })
}

export function formatTime(date: Date): string {
  return date.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
}
