export interface RhythmSyllable {
  id: string
  text: string
  word: string
  slot: number
  originalSlot: number
  durationSlots: number
  startsBeat: boolean
  timeMs: number
}

export type RhythmPocket = 'straight16' | 'triplet'

export interface RhythmLineMap {
  lineText: string
  bpm: number
  pocket: RhythmPocket
  slotsPerBar: number
  barDurationMs: number
  slotDurationMs: number
  syllables: RhythmSyllable[]
}

const VOWEL_GROUP = /[aeiouáàâãéêíóôõúü]+/i
const WORD_RE = /[\p{L}\p{M}0-9'-]+/gu

function clampSlot(slot: number, slotsPerBar: number): number {
  return Math.max(0, Math.min(slotsPerBar - 1, Math.round(slot)))
}

function sanitizePart(part: string): string {
  return part.trim().replace(/^-+|-+$/g, '')
}

function splitWordByHyphen(word: string): string[] {
  return word
    .split('-')
    .map(sanitizePart)
    .filter(Boolean)
}

function splitWordByVowels(word: string): string[] {
  const clean = word.trim()
  if (!clean) return []
  if (clean.length <= 3) return [clean]

  const chunks: string[] = []
  let current = ''

  for (let i = 0; i < clean.length; i++) {
    const char = clean[i]
    const next = clean[i + 1] ?? ''
    current += char

    if (VOWEL_GROUP.test(char) && next && !VOWEL_GROUP.test(next)) {
      const nextNext = clean[i + 2] ?? ''
      if (nextNext && VOWEL_GROUP.test(nextNext)) {
        chunks.push(current)
        current = ''
      }
    }
  }

  if (current) chunks.push(current)
  return chunks.length > 0 ? chunks : [clean]
}

export function mockSyllabify(text: string): Array<{ text: string; word: string }> {
  const words = text.match(WORD_RE) ?? []

  return words.flatMap((word) => {
    const parts = word.includes('-')
      ? splitWordByHyphen(word)
      : splitWordByVowels(word)

    return parts.map((part) => ({ text: part, word }))
  })
}

function getSlotsPerBar(pocket: RhythmPocket): number {
  return pocket === 'triplet' ? 12 : 16
}

function getBeatSlotStep(pocket: RhythmPocket): number {
  return pocket === 'triplet' ? 3 : 4
}

export function distributeSyllablesInBar(count: number, pocket: RhythmPocket = 'straight16'): number[] {
  const slotsPerBar = getSlotsPerBar(pocket)

  if (count <= 0) return []
  if (count === 1) return [0]

  if (pocket === 'triplet') {
    if (count <= 8) {
      const tripletPocket = [0, 1, 2, 3, 4, 5, 6, 7]
      return tripletPocket.slice(0, count)
    }

    return Array.from({ length: count }, (_, index) => index % slotsPerBar)
  }

  if (count <= 8) {
    const eighthSlots = [0, 2, 4, 6, 8, 10, 12, 14]
    return eighthSlots.slice(0, count)
  }

  if (count <= slotsPerBar) {
    return Array.from({ length: count }, (_, index) => {
      const slot = (index * (slotsPerBar - 1)) / (count - 1)
      return clampSlot(slot, slotsPerBar)
    })
  }

  return Array.from({ length: count }, (_, index) => index % slotsPerBar)
}

export function mapLineToRhythm(
  textoDaLinha: string,
  bpm = 128,
  contagemDeSilabas?: number,
  slotOverrides: Record<string, number> = {},
  pocket: RhythmPocket = 'straight16',
): RhythmLineMap {
  const safeBpm = Number.isFinite(bpm) && bpm > 0 ? bpm : 128
  const slotsPerBar = getSlotsPerBar(pocket)
  const beatSlotStep = getBeatSlotStep(pocket)
  const barDurationMs = (60000 / safeBpm) * 4
  const slotDurationMs = barDurationMs / slotsPerBar
  const syllables = mockSyllabify(textoDaLinha)
  const visualCount = contagemDeSilabas ?? syllables.length
  const slots = distributeSyllablesInBar(visualCount, pocket)

  return {
    lineText: textoDaLinha,
    bpm: safeBpm,
    pocket,
    slotsPerBar,
    barDurationMs,
    slotDurationMs,
    syllables: syllables.map((syllable, index) => {
      const id = `${index}-${syllable.text.toLowerCase()}`
      const originalSlot = slots[index] ?? slotsPerBar - 1
      const slot = clampSlot(slotOverrides[id] ?? originalSlot, slotsPerBar)

      return {
        id,
        text: syllable.text,
        word: syllable.word,
        slot,
        originalSlot,
        durationSlots: pocket === 'triplet' ? 1 : syllables.length <= 8 ? 2 : 1,
        startsBeat: slot % beatSlotStep === 0,
        timeMs: Math.round(slot * slotDurationMs),
      }
    }),
  }
}
