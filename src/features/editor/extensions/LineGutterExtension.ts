import { Extension } from '@tiptap/core'
import { Plugin, PluginKey } from '@tiptap/pm/state'
import { Decoration, DecorationSet } from '@tiptap/pm/view'
import type { Node as ProseMirrorNode } from '@tiptap/pm/model'
import { countLineSyllables } from '../../metrics/syllableUtils'
import { analyzeRhymes } from '../../rhyme/RhymeService'

const RHYME_COLORS = [
  '#8b5cf6', '#3b82f6', '#10b981', '#f59e0b',
  '#ec4899', '#ef4444', '#14b8a6', '#fb923c',
]

function densityColor(syllables: number, avg: number): string {
  if (syllables === 0) return 'transparent'
  const diff = syllables - avg
  if (syllables >= 20) return 'rgba(239,68,68,0.55)'
  if (diff >= 5)       return 'rgba(251,191,36,0.50)'
  if (diff <= -4)      return 'rgba(59,130,246,0.40)'
  return 'rgba(34,211,238,0.35)'
}

function createGutterWidget(
  displayNum: string,
  isBlock: boolean,
  syllables: number,
  rhymeLetter: string | null,
  rhymeColor: string,
  dColor: string,
): HTMLElement {
  const el = document.createElement('span')
  el.setAttribute('data-gutter', 'true')
  el.contentEditable = 'false'
  el.style.cssText = [
    'position:absolute', 'left:0', 'top:0', 'width:4rem', 'height:100%',
    'display:flex', 'align-items:flex-start',
    'pointer-events:none', 'user-select:none',
    "font-family:'JetBrains Mono',monospace",
    'font-size:0.6rem', 'line-height:1.9',
  ].join(';')

  // Density bar — thin strip on the far left edge
  const bar = document.createElement('span')
  bar.style.cssText = `position:absolute;left:0;top:0.35rem;bottom:0.35rem;width:2px;border-radius:99px;background:${dColor};`
  el.appendChild(bar)

  // Block number or line number
  const num = document.createElement('span')
  num.style.cssText = isBlock
    ? 'width:1.7rem;text-align:right;padding-right:0.2rem;color:rgba(168,85,247,0.55);font-weight:900;letter-spacing:0.05em;'
    : 'width:1.7rem;text-align:right;padding-right:0.2rem;color:rgba(148,163,184,0.28);letter-spacing:0.06em;'
  num.textContent = displayNum
  el.appendChild(num)

  // Syllable count
  const syl = document.createElement('span')
  syl.style.cssText = 'width:1rem;text-align:center;color:rgba(34,211,238,0.42);font-weight:600;'
  syl.textContent = String(syllables)
  el.appendChild(syl)

  // Rhyme letter
  const rhy = document.createElement('span')
  rhy.style.cssText = `width:0.85rem;text-align:center;font-weight:900;color:${rhymeLetter ? rhymeColor : 'transparent'};opacity:0.75;`
  rhy.textContent = rhymeLetter ?? '·'
  el.appendChild(rhy)

  return el
}

function buildDecorations(doc: ProseMirrorNode): DecorationSet {
  const paragraphs: Array<{ text: string; offset: number; nodeSize: number }> = []
  doc.forEach((node, offset) => {
    if (node.type.name === 'paragraph') {
      paragraphs.push({ text: node.textContent, offset, nodeSize: node.nodeSize })
    }
  })

  if (paragraphs.length === 0) return DecorationSet.empty

  // Rhyme analysis on non-empty lines only
  const contentLines = paragraphs.filter(p => p.text.trim()).map(p => p.text)
  let lineLabels: (string | null)[] = new Array(contentLines.length).fill(null)
  const labelColorMap = new Map<string, string>()

  if (contentLines.length >= 2) {
    const rhyme = analyzeRhymes(contentLines.join('\n'))
    lineLabels = rhyme.lineLabels
    rhyme.chains.forEach((chain, idx) => {
      labelColorMap.set(chain.label, RHYME_COLORS[idx % RHYME_COLORS.length])
    })
  }

  // Syllable counts + average
  const sylCounts = paragraphs.map(p => p.text.trim() ? countLineSyllables(p.text) : 0)
  const contentSyls = sylCounts.filter((_, i) => paragraphs[i].text.trim())
  const avg = contentSyls.length > 0
    ? contentSyls.reduce((a, b) => a + b, 0) / contentSyls.length
    : 13

  const decorations: Decoration[] = []
  let contentIdx = 0

  for (let i = 0; i < paragraphs.length; i++) {
    const { text, offset, nodeSize } = paragraphs[i]
    const isEmpty = !text.trim()
    const isBlockStart = i % 4 === 0
    const blockNum = Math.floor(i / 4) + 1
    const displayNum = isBlockStart ? `B${blockNum}` : (i + 1).toString().padStart(2, '0')

    // Node-level classes
    const classes = ['has-gutter']
    if (i > 0 && i % 4 === 0) classes.push('gutter-block-start')
    decorations.push(
      Decoration.node(offset, offset + nodeSize, { class: classes.join(' ') }),
    )

    if (!isEmpty) {
      const syllables = sylCounts[i]
      const letter = lineLabels[contentIdx] ?? null
      const color = letter ? (labelColorMap.get(letter) ?? 'transparent') : 'transparent'
      const dColor = densityColor(syllables, avg)

      const widget = createGutterWidget(displayNum, isBlockStart, syllables, letter, color, dColor)
      decorations.push(
        Decoration.widget(offset + 1, widget, { side: -1, key: `gutter-${i}` }),
      )
      contentIdx++
    }
  }

  return DecorationSet.create(doc, decorations)
}

const gutterKey = new PluginKey<DecorationSet>('lineGutter')
const activeLineKey = new PluginKey<DecorationSet>('activeLine')

export const LineGutterExtension = Extension.create({
  name: 'lineGutter',

  addProseMirrorPlugins() {
    let debounceTimer: ReturnType<typeof setTimeout> | null = null

    const gutterPlugin = new Plugin({
      key: gutterKey,

      state: {
        init(_cfg, state) { return buildDecorations(state.doc) },
        apply(tr, old) {
          const meta = tr.getMeta(gutterKey)
          if (meta !== undefined) return meta as DecorationSet
          if (!tr.docChanged) return old
          return old.map(tr.mapping, tr.doc)
        },
      },

      props: {
        decorations(state) { return gutterKey.getState(state) },
      },

      view(initialView) {
        const schedule = (view: typeof initialView) => {
          if (debounceTimer) clearTimeout(debounceTimer)
          debounceTimer = setTimeout(() => {
            const deco = buildDecorations(view.state.doc)
            view.dispatch(view.state.tr.setMeta(gutterKey, deco))
          }, 500)
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
    })

    // Lightweight active-line plugin — runs on every selection change
    const activeLinePlugin = new Plugin({
      key: activeLineKey,
      props: {
        decorations(state) {
          const { selection } = state
          const decos: Decoration[] = []
          state.doc.forEach((node, offset) => {
            if (node.type.name !== 'paragraph') return
            if (selection.from >= offset && selection.from <= offset + node.nodeSize) {
              decos.push(Decoration.node(offset, offset + node.nodeSize, { class: 'is-active-line' }))
            }
          })
          return DecorationSet.create(state.doc, decos)
        },
      },
    })

    return [gutterPlugin, activeLinePlugin]
  },
})
