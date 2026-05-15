import { Extension } from '@tiptap/core'
import { Plugin, PluginKey } from '@tiptap/pm/state'
import { DecorationSet, Decoration } from '@tiptap/pm/view'
import type { Node as ProseMirrorNode } from '@tiptap/pm/model'
import { analyzeRhymes } from '../rhyme/RhymeService'

const CHAIN_COLORS = [
  { bg: 'rgba(139, 92, 246, 0.28)', border: 'rgba(139, 92, 246, 0.8)' },
  { bg: 'rgba(59, 130, 246, 0.28)',  border: 'rgba(59, 130, 246, 0.8)'  },
  { bg: 'rgba(16, 185, 129, 0.28)', border: 'rgba(16, 185, 129, 0.8)'  },
  { bg: 'rgba(245, 158, 11, 0.28)', border: 'rgba(245, 158, 11, 0.8)'  },
  { bg: 'rgba(236, 72, 153, 0.28)', border: 'rgba(236, 72, 153, 0.8)'  },
  { bg: 'rgba(239, 68, 68, 0.28)',  border: 'rgba(239, 68, 68, 0.8)'   },
  { bg: 'rgba(20, 184, 166, 0.28)', border: 'rgba(20, 184, 166, 0.8)'  },
  { bg: 'rgba(251, 146, 60, 0.28)', border: 'rgba(251, 146, 60, 0.8)'  },
]

function normalizeWord(word: string): string {
  return word
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z]/g, '')
}

// Returns the absolute doc position of the LAST occurrence of endWord in lineText.
function findEndWordRange(
  lineText: string,
  endWord: string,
  contentStart: number,
): { from: number; to: number } | null {
  const wordRe = /[a-zA-ZÀ-ÿ]+/g
  let lastMatch: { from: number; to: number } | null = null
  let m: RegExpExecArray | null
  while ((m = wordRe.exec(lineText)) !== null) {
    if (normalizeWord(m[0]) === endWord) {
      lastMatch = {
        from: contentStart + m.index,
        to: contentStart + m.index + m[0].length,
      }
    }
  }
  return lastMatch
}

// Returns absolute doc positions for ALL occurrences of normTarget in lineText.
function findAllWordRanges(
  lineText: string,
  normTarget: string,
  contentStart: number,
): Array<{ from: number; to: number }> {
  const wordRe = /[a-zA-ZÀ-ÿ]+/g
  const results: Array<{ from: number; to: number }> = []
  let m: RegExpExecArray | null
  while ((m = wordRe.exec(lineText)) !== null) {
    if (normalizeWord(m[0]) === normTarget) {
      results.push({
        from: contentStart + m.index,
        to: contentStart + m.index + m[0].length,
      })
    }
  }
  return results
}

function buildDecorations(doc: ProseMirrorNode): DecorationSet {
  const paraTexts: string[] = []
  doc.forEach((node) => {
    if (node.type.name === 'paragraph') paraTexts.push(node.textContent)
  })

  const fullText = paraTexts.join('\n')
  if (!fullText.trim()) return DecorationSet.empty

  const analysis = analyzeRhymes(fullText)
  if (analysis.chains.length === 0) return DecorationSet.empty

  // filteredLineIndex → palette color index (for end-word lines)
  const filteredToColor = new Map<number, number>()
  analysis.chains.forEach((chain, chainIdx) => {
    const colorIdx = chainIdx % CHAIN_COLORS.length
    for (const lineIdx of chain.lines) filteredToColor.set(lineIdx, colorIdx)
  })

  // chainLabel → palette color index (for internal rhyme lookup)
  const labelToColorIdx = new Map<string, number>()
  analysis.chains.forEach((chain, chainIdx) => {
    labelToColorIdx.set(chain.label, chainIdx % CHAIN_COLORS.length)
  })

  // filteredLineIndex → internal rhyme entries
  const internalByLine = new Map<number, typeof analysis.internalRhymes>()
  for (const ir of analysis.internalRhymes) {
    const list = internalByLine.get(ir.sourceLine) ?? []
    list.push(ir)
    internalByLine.set(ir.sourceLine, list)
  }

  const decorations: Decoration[] = []
  let filteredIndex = 0

  doc.forEach((node, offset) => {
    if (node.type.name !== 'paragraph') return
    const lineText = node.textContent
    if (!lineText.trim()) return  // empty paragraph — don't advance filteredIndex

    const contentStart = offset + 1

    // End-word: solid underline
    const colorIdx = filteredToColor.get(filteredIndex)
    if (colorIdx !== undefined) {
      const endWord = analysis.endWords[filteredIndex]
      if (endWord) {
        const range = findEndWordRange(lineText, endWord, contentStart)
        if (range) {
          const c = CHAIN_COLORS[colorIdx]
          decorations.push(
            Decoration.inline(range.from, range.to, {
              style: `background:${c.bg};border-bottom:2px solid ${c.border};border-radius:3px;padding:0 2px;`,
              title: 'Rima final: fechamento de linha desta familia sonora.',
            }),
          )
        }
      }
    }

    // Internal rhymes: dotted underline — same color as the matched chain
    for (const ir of (internalByLine.get(filteredIndex) ?? [])) {
      const irColorIdx = labelToColorIdx.get(ir.rhymeClass) ?? 0
      const c = CHAIN_COLORS[irColorIdx]
      for (const range of findAllWordRanges(lineText, ir.sourceWord, contentStart)) {
        decorations.push(
          Decoration.inline(range.from, range.to, {
            style: `background:${c.bg};border-bottom:2px dotted ${c.border};border-radius:3px;padding:0 2px;`,
            title: 'Rima interna: palavra no meio da linha que conversa com uma familia sonora da estrofe.',
          }),
        )
      }
    }

    filteredIndex++
  })

  return DecorationSet.create(doc, decorations)
}

const rhymeHighlightKey = new PluginKey<DecorationSet>('rhymeHighlight')

export const RhymeHighlightExtension = Extension.create({
  name: 'rhymeHighlight',

  addProseMirrorPlugins() {
    let debounceTimer: ReturnType<typeof setTimeout> | null = null

    return [
      new Plugin({
        key: rhymeHighlightKey,

        state: {
          init() {
            return DecorationSet.empty
          },
          apply(tr, old) {
            const meta = tr.getMeta(rhymeHighlightKey)
            if (meta !== undefined) return meta as DecorationSet
            if (!tr.docChanged) return old
            return old.map(tr.mapping, tr.doc)
          },
        },

        props: {
          decorations(state) {
            return rhymeHighlightKey.getState(state)
          },
        },

        view(initialView) {
          const schedule = (view: typeof initialView) => {
            if (debounceTimer) clearTimeout(debounceTimer)
            debounceTimer = setTimeout(() => {
              const deco = buildDecorations(view.state.doc)
              view.dispatch(view.state.tr.setMeta(rhymeHighlightKey, deco))
            }, 600)
          }

          schedule(initialView)

          return {
            update(view, prevState) {
              if (!view.state.doc.eq(prevState.doc)) schedule(view)
            },
            destroy() {
              if (debounceTimer) clearTimeout(debounceTimer)
            },
          }
        },
      }),
    ]
  },
})
