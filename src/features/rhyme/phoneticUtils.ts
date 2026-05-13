// src/features/rhyme/phoneticUtils.ts
// Motor fonético simplificado para Português Brasileiro
// LIMITAÇÃO: heurístico, não usa corpus linguístico real.
// Prioridade: precisão suficiente para composição musical.

/**
 * Normaliza texto para análise fonética:
 * minúsculas, sem acentos, sem pontuação
 */
export function normalizeText(text: string): string {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')  // remove diacríticos
    .replace(/[^\w\s\n]/g, ' ')        // remove pontuação
    .replace(/\s+/g, ' ')
    .trim()
}

/**
 * Remove acentos mantendo estrutura
 */
export function removeAccents(str: string): string {
  return str.normalize('NFD').replace(/[\u0300-\u036f]/g, '')
}

/**
 * Detecta tipo de tonicidade da palavra (heurística PT-BR)
 * oxítona: acento na última sílaba
 * paroxítona: acento na penúltima (padrão)
 * proparoxítona: acento na antepenúltima
 */
export type Tonicity = 'oxytone' | 'paroxytone' | 'proparoxytone'

export function estimateTonicity(word: string): Tonicity {
  const clean = word.toLowerCase()

  // Palavras com acento explícito = proparoxítona (á, é com padrão ***X)
  const hasAccent = /[áéíóúâêôãõ]/.test(clean)

  // Proparoxítonas geralmente têm acento e padrão específico
  // Heurística: se tem acento E termina em vogal/a/e/o sem ser final tônico
  const proparoxPattern = /[áéí][a-z]{2,}[aeiou]$/.test(clean)
  if (proparoxPattern) return 'proparoxytone'

  // Oxítonas: terminam em: a(s), e(s), o(s) COM acento; ou em r,s,l,z,x,n,i,u,im,em finais
  const oxytoneTerminations = /([aeiou]r|[aeiou]s|[aeiou]l|[aeiou]z|[aeiou]x|[aeiou]n|im$|em$|[iuíú]$|ão$|ões$|ais$|eis$|ois$|uis$)$/.test(clean)

  if (!hasAccent && oxytoneTerminations) return 'oxytone'

  // Paroxítona: terminam em a, e, o, em, ens, am (sem acento)
  const paroxytoneTerminations = /([aeo]s?|em$|ens$|am$|[aeiou]m$)$/.test(clean)
  if (!hasAccent && paroxytoneTerminations) return 'paroxytone'

  // Default: paroxítona (mais comum no português)
  return 'paroxytone'
}

/**
 * Aplica regras fonéticas para gerar chave fonética aproximada PT-BR
 * Esta chave é usada para comparar similaridade sonora entre palavras
 */
export function toPhoneticKey(word: string): string {
  // Hifens e apóstrofos viram espaço vazio (foda-se → fodase, foi-se → foise)
  let key = removeAccents(word.toLowerCase()).replace(/[-']/g, '')

  // ─── Grupos consonantais especiais ──────────────────────────────────────────
  key = key.replace(/lh/g, 'L')      // lh → L (som único)
  key = key.replace(/nh/g, 'N')      // nh → N (som único)
  key = key.replace(/ch/g, 'X')      // ch → X
  key = key.replace(/l(?=[bcdfghjklmnpqrstvwxyz]|$)/g, 'W') // alto/calmo/mal: L vocalizado em PT-BR
  key = key.replace(/qu([ei])/g, 'K$1') // que/qui → ke/ki
  key = key.replace(/qu([ao])/g, 'KW$1') // qua/quo
  key = key.replace(/gu([ei])/g, 'G$1')  // gue/gui
  key = key.replace(/gu([ao])/g, 'GW$1')

  // ─── Sibilantes ─────────────────────────────────────────────────────────────
  key = key.replace(/ss/g, 'S')      // ss → S
  key = key.replace(/[cç]([eiao])/g, 'S$1') // ç, c+e/i → S
  key = key.replace(/c([^eihkw])/g, 'K$1')  // c+a/o/u → K
  key = key.replace(/x([csz]?)/g, 'S')  // x → S (contexto mais comum em pt-br)

  // ─── R ──────────────────────────────────────────────────────────────────────
  key = key.replace(/rr/g, 'R')      // rr → R (vibrante forte)
  key = key.replace(/^r/g, 'R')      // r inicial → R
  key = key.replace(/([^aeiou])r/g, '$1R') // r após consoante = vibrante

  // ─── Nasais ─────────────────────────────────────────────────────────────────
  key = key.replace(/([aeiou])m([^aeiou]|$)/g, '$1~') // vogal+m final → nasal
  key = key.replace(/([aeiou])n([^aeiou]|$)/g, '$1~') // vogal+n final → nasal
  key = key.replace(/([aeiou])nh/g, '$1N')

  // ─── Terminações ────────────────────────────────────────────────────────────
  key = key.replace(/ao$|am$|ão$/g, '~ow')  // ão, am → som nasal
  key = key.replace(/em$|ens$/g, '~ej')      // em, ens
  key = key.replace(/im$|ins$/g, '~ij')      // im, ins
  key = key.replace(/om$|ons$/g, '~ow')      // om, ons

  // ─── Vogais átonas finais ────────────────────────────────────────────────────
  // e final átono soa como 'i' em PB
  key = key.replace(/e$/g, 'I')
  // o final átono soa como 'u' em PB
  key = key.replace(/o$/g, 'U')

  // ─── Simplificações finais ──────────────────────────────────────────────────
  key = key.replace(/ph/g, 'F')
  key = key.replace(/th/g, 'T')
  key = key.replace(/[wv]/g, 'V')
  key = key.replace(/[iy]/g, 'I')
  key = key.replace(/[sz]/g, 'S')

  key = key.toUpperCase()

  // ─── Normalização de ditongos PT-BR ─────────────────────────────────────────
  // OJ soa como OI em rap/funk (hoje ≈ boi, foi, pois)
  key = key.replace(/OJ/g, 'OI')
  // EI e EJ são equivalentes (lei, grey → mesma família)
  key = key.replace(/EJ/g, 'EI')
  // Sequências duplas de vogal idêntica → simplifica
  key = key.replace(/II+/g, 'I')
  key = key.replace(/UU+/g, 'U')

  return key
}

/**
 * Extrai o núcleo rímico de uma palavra:
 * da vogal tônica até o final da palavra
 */
export function extractRhymeNucleus(word: string): string {
  const phonetic = toPhoneticKey(word)
  // Encontra a última sequência vocálica significativa
  const match = phonetic.match(/[AEIOU~][A-Z~]*$/)
  return match ? match[0] : phonetic.slice(-3)
}

/**
 * Extrai a última palavra significativa de uma linha
 * Ignora artigos, preposições e palavras muito curtas
 */
const STOP_WORDS = new Set([
  'o', 'a', 'os', 'as', 'um', 'uma', 'de', 'do', 'da', 'dos', 'das',
  'em', 'no', 'na', 'nos', 'nas', 'por', 'para', 'com', 'sem', 'sob',
  'e', 'ou', 'mas', 'que', 'se', 'pra', 'pro', 'num', 'numas', 'dum'
])

export function extractEndWord(line: string): string {
  const words = normalizeText(line).split(/\s+/).filter(Boolean)
  // Pegar última palavra não-stopword
  for (let i = words.length - 1; i >= 0; i--) {
    if (words[i].length > 2 && !STOP_WORDS.has(words[i])) {
      return words[i]
    }
  }
  return words[words.length - 1] || ''
}

/**
 * Separa texto em linhas não-vazias
 */
export function splitLines(text: string): string[] {
  return text.split('\n').map(l => l.trim()).filter(Boolean)
}

/**
 * Verifica se duas chaves fonéticas têm assonância (vogal tônica compartilhada)
 */
export function hasAssonance(key1: string, key2: string): boolean {
  const vowelPattern1 = key1.match(/[AEIOU~]/g)?.join('') ?? ''
  const vowelPattern2 = key2.match(/[AEIOU~]/g)?.join('') ?? ''
  if (!vowelPattern1 || !vowelPattern2) return false
  // Última vogal tônica coincide
  const lastVowel1 = vowelPattern1.slice(-2)
  const lastVowel2 = vowelPattern2.slice(-2)
  return lastVowel1 === lastVowel2 && lastVowel1.length > 0
}

/**
 * Detecta aliteração em um verso:
 * retorna a consoante repetida se houver, null caso contrário
 */
export function detectAlliteration(line: string): string | null {
  const words = normalizeText(line).split(/\s+/).filter(w => w.length > 2 && !STOP_WORDS.has(w))
  if (words.length < 3) return null

  const initialConsonants = words
    .map(w => {
      const first = removeAccents(w)[0]
      return /[bcdfghjklmnpqrstvwxyz]/.test(first) ? first : null
    })
    .filter(Boolean) as string[]

  // Contar frequência
  const freq: Record<string, number> = {}
  for (const c of initialConsonants) {
    freq[c] = (freq[c] || 0) + 1
  }

  // Se 3+ palavras começam com a mesma consoante = aliteração
  const dominant = Object.entries(freq).find(([, count]) => count >= 3)
  return dominant ? dominant[0] : null
}
