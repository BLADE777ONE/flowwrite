// Motor híbrido: urban_database.json local + Wiktionary PT-BR online.
import urbanDatabase from './urban_database.json'

export interface DictionaryResult {
  girias: string[]
  sinonimos: string[]
  relacionados: string[]
  antonimos: string[]
  themes: DictionaryTheme[]
}

export interface DictionaryTheme {
  id: string
  label: string
  score: number
  keys: string[]
  girias: string[]
  relacionados: string[]
}

interface UrbanLookupEntry {
  categoryIds?: string[]
  girias?: string[]
  sinonimos?: string[]
}

interface UrbanCategory {
  id: string
  label: string
  keys: string[]
  girias: string[]
  sinonimos: string[]
}

function normalize(word: string): string {
  return String(word || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9\s-]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

function compactKey(word: string): string {
  return normalize(word).replace(/[\s-]+/g, '')
}

function uniq(items: string[]): string[] {
  const seen = new Set<string>()
  const out: string[] = []
  for (const item of items) {
    const clean = String(item || '').trim()
    const key = normalize(clean)
    if (!clean || !key || seen.has(key)) continue
    seen.add(key)
    out.push(clean)
  }
  return out
}

function scoreCategoryMatch(rawWord: string, category: UrbanCategory): number {
  const norm = normalize(rawWord)
  const compact = compactKey(rawWord)
  let score = 0

  for (const key of category.keys) {
    const keyNorm = normalize(key)
    const keyCompact = compactKey(key)
    if (!keyNorm) continue
    if (norm === keyNorm || compact === keyCompact) score = Math.max(score, 1)
    else if (norm.includes(keyNorm) || keyNorm.includes(norm)) score = Math.max(score, 0.72)
    else if (compact.includes(keyCompact) || keyCompact.includes(compact)) score = Math.max(score, 0.62)
  }

  return score
}

function buildTheme(category: UrbanCategory, score: number): DictionaryTheme {
  return {
    id: category.id,
    label: category.label,
    score,
    keys: uniq(category.keys).slice(0, 8),
    girias: uniq(category.girias).slice(0, 10),
    relacionados: uniq(category.sinonimos).slice(0, 10),
  }
}

function getUrbanEntry(rawWord: string): DictionaryResult {
  const lookup = urbanDatabase.lookup as Record<string, UrbanLookupEntry>
  const categories = urbanDatabase.categories as UrbanCategory[]
  const categoryMap = new Map(categories.map(category => [category.id, category]))

  const norm = normalize(rawWord)
  const compact = compactKey(rawWord)
  const entry = lookup[norm] ?? lookup[compact]

  if (!entry) {
    const fallbackCategories = categories
      .map(category => ({ category, score: scoreCategoryMatch(rawWord, category) }))
      .filter(item => item.score >= 0.6)
      .sort((a, b) => b.score - a.score)
      .slice(0, 3)

    return {
      girias: uniq(fallbackCategories.flatMap(item => item.category.girias))
        .filter(item => normalize(item) !== norm)
        .slice(0, 32),
      sinonimos: [],
      relacionados: uniq(fallbackCategories.flatMap(item => item.category.sinonimos))
        .filter(item => normalize(item) !== norm)
        .slice(0, 32),
      antonimos: [],
      themes: fallbackCategories.map(item => buildTheme(item.category, item.score)),
    }
  }

  const categoryData = (entry.categoryIds ?? [])
    .map(id => categoryMap.get(id))
    .filter((category): category is UrbanCategory => Boolean(category))

  const girias = uniq([
    ...(entry.girias ?? []),
    ...categoryData.flatMap(category => category.girias),
  ]).filter(item => normalize(item) !== norm).slice(0, 48)

  const relacionados = uniq([
    ...(entry.sinonimos ?? []),
    ...categoryData.flatMap(category => category.sinonimos),
  ]).filter(item => normalize(item) !== norm).slice(0, 48)

  const themes = categoryData
    .map(category => buildTheme(category, Math.max(0.82, scoreCategoryMatch(rawWord, category))))
    .sort((a, b) => b.score - a.score)
    .slice(0, 4)

  return { girias, sinonimos: [], relacionados, antonimos: [], themes }
}

// ─── Wiktionary PT-BR: parser simples e tolerante ────────────────────────────

function extractSectionBlock(wikitext: string, sectionName: string): string {
  try {
    const lower = wikitext.toLowerCase()
    const name = sectionName.toLowerCase()
    const candidates = [
      `==== ${name} ====`,
      `====${name}====`,
      `=== ${name} ===`,
      `===${name}===`,
      `== ${name} ==`,
      `==${name}==`,
    ]

    let start = -1
    let headingLength = 0
    for (const candidate of candidates) {
      const idx = lower.indexOf(candidate)
      if (idx !== -1) {
        start = idx + candidate.length
        headingLength = candidate.length
        break
      }
    }

    if (start === -1 || headingLength === 0) return ''

    const nextSection = lower.indexOf('\n==', start)
    const end = nextSection === -1 ? wikitext.length : nextSection
    return wikitext.slice(start, end)
  } catch {
    return ''
  }
}

function extractLinksFromBlock(block: string): string[] {
  try {
    const words: string[] = []

    const links = block.match(/\[\[(.*?)\]\]/g) ?? []
    for (const link of links) {
      const inner = link.slice(2, -2)
      const word = inner.split('|')[0].trim()
      if (word && !word.includes(':') && word.split(/\s+/).length <= 3) {
        words.push(word)
      }
    }

    // Wiktionary também usa templates como {{sin|pt|termo1|termo2}}.
    const templates = block.match(/\{\{[^}]+\}\}/g) ?? []
    for (const tpl of templates) {
      const parts = tpl.slice(2, -2).split('|')
      const template = normalize(parts[0])
      if (!['sin', 'sinonimo', 'sinonimos', 'ant', 'antonimo', 'antonimos'].includes(template)) continue
      for (let i = 2; i < parts.length; i++) {
        const word = parts[i].replace(/=.*$/, '').trim()
        if (word && word.length > 1 && !word.includes('{{') && word.split(/\s+/).length <= 3) {
          words.push(word)
        }
      }
    }

    return uniq(words).slice(0, 80)
  } catch {
    return []
  }
}

async function fetchWiktionary(rawWord: string): Promise<{ sinonimos: string[]; antonimos: string[] }> {
  console.log('[DictionaryService] Iniciando fetch para:', rawWord)
  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), 6000)

  try {
    const url =
      'https://pt.wiktionary.org/w/api.php?action=query' +
      `&titles=${encodeURIComponent(rawWord)}` +
      '&prop=revisions&rvprop=content&rvslots=main&format=json&origin=*'

    const response = await fetch(url, { signal: controller.signal })
    if (!response.ok) {
      console.error('[DictionaryService] Wiktionary HTTP:', response.status, response.statusText)
      return { sinonimos: [], antonimos: [] }
    }

    const data = await response.json()
    const pages = data?.query?.pages
    if (!pages) return { sinonimos: [], antonimos: [] }

    const page = Object.values(pages)[0] as {
      missing?: true
      revisions?: Array<{ '*'?: string; slots?: { main?: { '*'?: string; content?: string } } }>
    }

    if (page.missing !== undefined) return { sinonimos: [], antonimos: [] }

    const revision = page.revisions?.[0]
    const content = revision?.['*'] ?? revision?.slots?.main?.['*'] ?? revision?.slots?.main?.content ?? ''
    if (!content) return { sinonimos: [], antonimos: [] }

    const result = {
      sinonimos: extractLinksFromBlock(extractSectionBlock(content, 'Sinônimos')),
      antonimos: extractLinksFromBlock(extractSectionBlock(content, 'Antônimos')),
    }

    console.log('[DictionaryService] Resultado do parse:', result)
    return result
  } catch (err) {
    console.error('[DictionaryService] Erro no fetch Wiktionary:', err)
    return { sinonimos: [], antonimos: [] }
  } finally {
    clearTimeout(timeoutId)
  }
}

export async function getDictionaryData(rawWord: string): Promise<DictionaryResult> {
  if (!rawWord || rawWord.trim().length < 2) {
    return { girias: [], sinonimos: [], relacionados: [], antonimos: [], themes: [] }
  }

  const local = getUrbanEntry(rawWord)
  const online = await fetchWiktionary(rawWord)

  const giriaKeys = new Set(local.girias.map(normalize))
  const rawKey = normalize(rawWord)
  const sinonimos = uniq(online.sinonimos)
    .filter(item => !giriaKeys.has(normalize(item)))
    .filter(item => normalize(item) !== rawKey)
    .slice(0, 64)

  const synonymKeys = new Set(sinonimos.map(normalize))
  const relacionados = uniq(local.relacionados)
    .filter(item => !giriaKeys.has(normalize(item)))
    .filter(item => !synonymKeys.has(normalize(item)))
    .filter(item => normalize(item) !== rawKey)
    .slice(0, 48)

  const result = {
    girias: local.girias,
    sinonimos,
    relacionados,
    antonimos: uniq(online.antonimos).slice(0, 32),
    themes: local.themes,
  }

  console.log('[DictionaryService] Resultado final:', result)
  return result
}
