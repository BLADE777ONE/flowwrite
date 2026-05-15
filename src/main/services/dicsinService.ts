import { app } from 'electron'
import fs from 'fs'
import path from 'path'

export interface ThesaurusLookupResult {
  sinonimos: string[]
  antonimos: string[]
  source: string[]
}

let dicsinCache: Map<string, string[]> | null = null

function normalize(word: string): string {
  return String(word || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9\s-]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
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

function candidateDicSinPaths(): string[] {
  return [
    process.env.DICSIN_DAT_PATH || '',
    path.join(process.cwd(), 'src', 'features', 'dictionary', 'dicsin', 'th_pt_BR.dat'),
    path.join(app.getPath('documents'), 'references', 'DicSin-dicionario-sinonimos-portugues-brasileiro', 'dicsin', 'th_pt_BR.dat'),
  ].filter(Boolean)
}

function findDicSinPath(): string | null {
  return candidateDicSinPaths().find(filePath => fs.existsSync(filePath)) ?? null
}

function addEntry(map: Map<string, string[]>, word: string, values: string[]): void {
  const key = normalize(word)
  if (!key) return
  const current = map.get(key) ?? []
  map.set(key, uniq([...current, ...values]).slice(0, 120))
}

function parseSenseLine(line: string, entryWord: string): string[] {
  const cleanLine = line.replace(/^\([^)]*\)/, '')
  return uniq(cleanLine.split('|'))
    .filter(item => normalize(item) !== normalize(entryWord))
    .filter(item => item.length > 1 && item.length <= 40)
    .filter(item => !/[{}()[\]/\\]/.test(item))
}

function loadDicSin(): Map<string, string[]> {
  if (dicsinCache) return dicsinCache

  const map = new Map<string, string[]>()
  const filePath = findDicSinPath()
  if (!filePath) {
    console.warn('[DicSin] Base th_pt_BR.dat nao encontrada. Dicionario segue com fallback online/local.')
    dicsinCache = map
    return map
  }

  const content = fs.readFileSync(filePath, 'utf8')
  const lines = content.split(/\r?\n/)

  for (let i = 1; i < lines.length; i++) {
    const header = lines[i]?.trim()
    const match = header?.match(/^(.+)\|(\d+)$/)
    if (!match) continue

    const entryWord = match[1].trim()
    const count = Number.parseInt(match[2], 10)
    const values: string[] = []

    for (let offset = 1; offset <= count; offset++) {
      const sense = lines[i + offset]?.trim()
      if (!sense || !/^\(sin[oô]nimo\)/i.test(sense.normalize('NFD').replace(/[\u0300-\u036f]/g, ''))) continue
      values.push(...parseSenseLine(sense, entryWord))
    }

    if (values.length > 0) addEntry(map, entryWord, values)
    i += Number.isFinite(count) ? count : 0
  }

  console.log(`[DicSin] ${map.size} entradas carregadas de ${filePath}`)
  dicsinCache = map
  return map
}

function htmlToText(html: string): string {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&aacute;/g, 'á')
    .replace(/&eacute;/g, 'é')
    .replace(/&iacute;/g, 'í')
    .replace(/&oacute;/g, 'ó')
    .replace(/&uacute;/g, 'ú')
    .replace(/&atilde;/g, 'ã')
    .replace(/&otilde;/g, 'õ')
    .replace(/&ccedil;/g, 'ç')
    .replace(/\s+/g, ' ')
    .trim()
}

function parseCommaList(text: string): string[] {
  const afterColon = text.includes(':') ? text.split(':').slice(1).join(':') : text
  return uniq(
    afterColon
      .replace(/\.$/, '')
      .split(/\s*,\s*|\s+ e \s+/)
      .map(item => item.trim())
  ).slice(0, 80)
}

async function fetchLexico(rawWord: string): Promise<{ sinonimos: string[]; antonimos: string[] }> {
  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), 4500)

  try {
    const response = await fetch(`https://www.lexico.pt/${encodeURIComponent(rawWord)}/`, {
      signal: controller.signal,
      headers: { 'User-Agent': 'OBloco/1.0 dictionary lookup' },
    })
    if (!response.ok) return { sinonimos: [], antonimos: [] }

    const html = await response.text()
    const synonymMatch = html.match(/<p[^>]*class=["'][^"']*adicional sinonimos[^"']*["'][^>]*>([\s\S]*?)<\/p>/i)
    const antonymMatch = html.match(/id=["']tit-antonimos["'][\s\S]*?<p[^>]*>([\s\S]*?)<\/p>/i)

    return {
      sinonimos: synonymMatch ? parseCommaList(htmlToText(synonymMatch[1])) : [],
      antonimos: antonymMatch ? parseCommaList(htmlToText(antonymMatch[1])) : [],
    }
  } catch (error) {
    console.warn('[Lexico] fallback indisponivel:', error instanceof Error ? error.message : error)
    return { sinonimos: [], antonimos: [] }
  } finally {
    clearTimeout(timeoutId)
  }
}

export async function lookupPortugueseThesaurus(rawWord: string): Promise<ThesaurusLookupResult> {
  const word = String(rawWord || '').trim()
  if (word.length < 2) return { sinonimos: [], antonimos: [], source: [] }

  const dicsin = loadDicSin()
  const dicsinSynonyms = dicsin.get(normalize(word)) ?? []
  const lexico = await fetchLexico(word)

  return {
    sinonimos: uniq([...dicsinSynonyms, ...lexico.sinonimos]).filter(item => normalize(item) !== normalize(word)).slice(0, 96),
    antonimos: uniq(lexico.antonimos).filter(item => normalize(item) !== normalize(word)).slice(0, 48),
    source: [
      ...(dicsinSynonyms.length > 0 ? ['DicSin'] : []),
      ...(lexico.sinonimos.length > 0 || lexico.antonimos.length > 0 ? ['Lexico.pt'] : []),
    ],
  }
}
