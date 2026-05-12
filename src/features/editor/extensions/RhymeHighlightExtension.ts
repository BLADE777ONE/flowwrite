// src/features/editor/extensions/RhymeHighlightExtension.ts
// Decora o editor TipTap com highlights de cadeias de rima e sublinhados de clichês
// Usa ProseMirror Decorations — não altera o documento, só a visualização

import { Extension } from '@tiptap/core'
import { Plugin, PluginKey } from '@tiptap/pm/state'
import { DecorationSet, Decoration } from '@tiptap/pm/view'
import { Node as ProseMirrorNode } from '@tiptap/pm/model'
import { RhymeAnalysis } from '../../../shared/types/Rhyme'
import { ClicheAnalysis } from '../../../shared/types/Metrics'

export const rhymeHighlightKey = new PluginKey<DecorationSet>('rhymeHighlights')
export const clicheHighlightKey = new PluginKey<DecorationSet>('clicheHighlights')

// ─── Funções utilitárias de posição ──────────────────────────────────────────

/**
 * Retorna a posição absoluta no documento TipTap de onde começa
 * o conteúdo do parágrafo de índice lineIndex (0-based).
 *
 * Em TipTap com StarterKit cada parágrafo ocupa:
 *   1 token para o nó abrir + N tokens de texto + 1 token para fechar
 * Portanto lineStart[i] = 1 + sum(len[k]+2 for k < i)
 */
function buildLineStarts(doc: ProseMirrorNode): { starts: number[]; texts: string[] } {
  const starts: number[] = []
  const texts: string[] = []

  doc.forEach((node, offset) => {
    if (node.type.name === 'paragraph') {
      starts.push(offset + 1)   // +1 pula o token de abertura do parágrafo
      texts.push(node.textContent)
    }
  })

  return { starts, texts }
}

/**
 * Encontra a posição (start, end) de uma palavra dentro de lineText.
 * Retorna null se não encontrada.
 * Procura case-insensitive, pegando a última ocorrência da palavra
 * (palavras de rima tendem a estar no final da linha).
 */
function findWordInLine(lineText: string, word: string): { start: number; end: number } | null {
  if (!word || !lineText) return null
  const lowerLine = lineText.toLowerCase()
  const lowerWord = word.toLowerCase()

  // Tenta localizar como palavra isolada (com fronteira simples)
  let lastIdx = -1
  let idx = 0
  while ((idx = lowerLine.indexOf(lowerWord, idx)) !== -1) {
    lastIdx = idx
    idx += lowerWord.length
  }

  if (lastIdx === -1) return null
  return { start: lastIdx, end: lastIdx + word.length }
}

// ─── Construção dos DecorationSets ───────────────────────────────────────────

function buildRhymeDecorations(analysis: RhymeAnalysis, doc: ProseMirrorNode): DecorationSet {
  const { starts, texts } = buildLineStarts(doc)
  const decorations: Decoration[] = []
  const decorated = new Set<string>() // evita decorar o mesmo span duas vezes

  for (const match of analysis.matches) {
    const entries = [
      { lineIdx: match.sourceLine, word: match.sourceWord, color: match.color },
      { lineIdx: match.targetLine, word: match.targetWord, color: match.color },
    ]

    for (const { lineIdx, word, color } of entries) {
      const lineStart = starts[lineIdx]
      const lineText = texts[lineIdx]
      if (lineStart == null || !lineText) continue

      const pos = findWordInLine(lineText, word)
      if (!pos) continue

      const from = lineStart + pos.start
      const to   = lineStart + pos.end
      const key  = `${from}:${to}`
      if (decorated.has(key)) continue
      decorated.add(key)

      decorations.push(
        Decoration.inline(from, to, {
          class: 'rhyme-highlight',
          style: [
            `background-color: ${color}26`,
            `color: ${color}`,
            `border-bottom: 2px solid ${color}90`,
          ].join(';'),
          'data-rhyme-class': match.rhymeClass,
        })
      )
    }
  }

  // Rimas internas — mesmo estilo mas mais tênue
  for (const match of analysis.internalRhymes) {
    for (const { lineIdx, word } of [
      { lineIdx: match.sourceLine, word: match.sourceWord },
      { lineIdx: match.targetLine, word: match.targetWord },
    ]) {
      const lineStart = starts[lineIdx]
      const lineText = texts[lineIdx]
      if (lineStart == null || !lineText) continue

      const pos = findWordInLine(lineText, word)
      if (!pos) continue

      const from = lineStart + pos.start
      const to   = lineStart + pos.end
      const key  = `ri:${from}:${to}`
      if (decorated.has(key)) continue
      decorated.add(key)

      decorations.push(
        Decoration.inline(from, to, {
          class: 'rhyme-highlight rhyme-internal',
          style: `border-bottom: 1px dashed ${match.color}70;`,
          'data-rhyme-class': match.rhymeClass,
        })
      )
    }
  }

  return DecorationSet.create(doc, decorations)
}

function buildClicheDecorations(analysis: ClicheAnalysis, doc: ProseMirrorNode): DecorationSet {
  const { starts, texts } = buildLineStarts(doc)
  const decorations: Decoration[] = []

  for (const match of analysis.matches) {
    const lineStart = starts[match.lineIndex]
    const lineText  = texts[match.lineIndex]
    if (lineStart == null || !lineText) continue

    const phrase = match.phrase
    const idx    = lineText.toLowerCase().indexOf(phrase.toLowerCase())
    if (idx === -1) continue

    const from = lineStart + idx
    const to   = lineStart + idx + phrase.length
    const severity = match.severity

    decorations.push(
      Decoration.inline(from, to, {
        class: `cliche-highlight cliche-${severity}`,
        title: `Clichê (${severity}): ${match.suggestion}`,
      })
    )
  }

  return DecorationSet.create(doc, decorations)
}

// ─── Extensão TipTap ──────────────────────────────────────────────────────────

export interface RhymeHighlightStorage {
  enabled: boolean
}

declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    rhymeHighlight: {
      setRhymeHighlights: (analysis: RhymeAnalysis | null) => ReturnType
      setClicheHighlights: (analysis: ClicheAnalysis | null) => ReturnType
      toggleRhymeHighlights: () => ReturnType
    }
  }
}

export const RhymeHighlightExtension = Extension.create<Record<string, never>, RhymeHighlightStorage>({
  name: 'rhymeHighlight',

  addStorage() {
    return { enabled: true }
  },

  addCommands() {
    return {
      setRhymeHighlights:
        (analysis) =>
        ({ tr, dispatch, state }) => {
          if (!this.storage.enabled || !analysis) {
            if (dispatch) dispatch(tr.setMeta(rhymeHighlightKey, DecorationSet.empty))
            return true
          }
          if (dispatch) {
            const decorations = buildRhymeDecorations(analysis, state.doc)
            dispatch(tr.setMeta(rhymeHighlightKey, decorations))
          }
          return true
        },

      setClicheHighlights:
        (analysis) =>
        ({ tr, dispatch, state }) => {
          if (!analysis) {
            if (dispatch) dispatch(tr.setMeta(clicheHighlightKey, DecorationSet.empty))
            return true
          }
          if (dispatch) {
            const decorations = buildClicheDecorations(analysis, state.doc)
            dispatch(tr.setMeta(clicheHighlightKey, decorations))
          }
          return true
        },

      toggleRhymeHighlights:
        () =>
        ({ tr, dispatch, state }) => {
          this.storage.enabled = !this.storage.enabled
          if (dispatch) {
            // Limpa as decorações se desabilitado
            if (!this.storage.enabled) {
              dispatch(tr.setMeta(rhymeHighlightKey, DecorationSet.empty))
            }
          }
          return true
        },
    }
  },

  addProseMirrorPlugins() {
    return [
      // Plugin de highlights de rima
      new Plugin({
        key: rhymeHighlightKey,
        state: {
          init: () => DecorationSet.empty,
          apply: (tr, decoSet, _old, newState) => {
            const meta = tr.getMeta(rhymeHighlightKey)
            if (meta instanceof DecorationSet) return meta
            if (tr.docChanged) return decoSet.map(tr.mapping, tr.doc)
            return decoSet
          },
        },
        props: {
          decorations: (state) => rhymeHighlightKey.getState(state),
        },
      }),

      // Plugin de highlights de clichês
      new Plugin({
        key: clicheHighlightKey,
        state: {
          init: () => DecorationSet.empty,
          apply: (tr, decoSet, _old, newState) => {
            const meta = tr.getMeta(clicheHighlightKey)
            if (meta instanceof DecorationSet) return meta
            if (tr.docChanged) return decoSet.map(tr.mapping, tr.doc)
            return decoSet
          },
        },
        props: {
          decorations: (state) => clicheHighlightKey.getState(state),
        },
      }),
    ]
  },
})
