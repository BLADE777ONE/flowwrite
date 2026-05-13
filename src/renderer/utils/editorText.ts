import type { Editor } from '@tiptap/core'

const WORD_CHAR_RE = /[a-zA-ZÀ-ÿ]/

export function textToHtml(text: string): string {
  return text.split('\n')
    .map(line => {
      const escaped = line.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      return `<p>${escaped || '<br>'}</p>`
    })
    .join('')
}

export function isHtmlContent(content: string): boolean {
  return /<\/?[a-z][\s\S]*>/i.test(content.trim())
}

export function storedContentToEditorHtml(content: string): string {
  if (!content.trim()) return ''
  return isHtmlContent(content) ? content : textToHtml(content)
}

export function storedContentToPlainText(content: string): string {
  if (!content.trim() || !isHtmlContent(content)) return content

  const wrapper = document.createElement('div')
  wrapper.innerHTML = content
  wrapper.querySelectorAll('[data-section-block]').forEach(element => element.remove())

  const blocks = Array.from(wrapper.children)
  if (blocks.length === 0) return wrapper.textContent?.trim() ?? ''

  return blocks
    .map(element => element.textContent ?? '')
    .join('\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim()
}

export function countSyllables(text: string): number {
  const words = text.trim().toLowerCase().split(/\s+/)
  return words.reduce((total, word) => {
    const vowelBlocks = word.match(/[aeiouáéíóúâêôãõ]+/g)
    return total + (vowelBlocks ? vowelBlocks.length : 0)
  }, 0)
}

export function normalizeWord(word: string): string {
  return word
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z]/g, '')
}

export function extractWordFromSelection(editor: Editor): { raw: string; normalized: string } {
  const { from, to, empty } = editor.state.selection
  let word = ''

  if (!empty) {
    const text = editor.state.doc.textBetween(from, to, ' ').trim()
    if (!text.includes(' ')) word = text
  } else {
    const $pos = editor.state.doc.resolve(from)
    if ($pos.parent.type.name === 'paragraph') {
      const text = $pos.parent.textContent
      const offset = $pos.parentOffset
      let start = offset
      let end = offset
      while (start > 0 && WORD_CHAR_RE.test(text[start - 1])) start--
      while (end < text.length && WORD_CHAR_RE.test(text[end])) end++
      word = text.slice(start, end)
    }
  }

  return { raw: word, normalized: normalizeWord(word) }
}

export function replaceWordAtSelection(editor: Editor, replacement: string): void {
  const { from, to, empty } = editor.state.selection

  if (!empty) {
    editor.chain().focus().deleteRange({ from, to }).insertContent(replacement).run()
    return
  }

  const $pos = editor.state.doc.resolve(from)
  if ($pos.parent.type.name !== 'paragraph') {
    editor.chain().focus().insertContent(replacement).run()
    return
  }

  const text = $pos.parent.textContent
  const offset = $pos.parentOffset
  const paraStart = $pos.start($pos.depth)
  let start = offset
  let end = offset

  while (start > 0 && WORD_CHAR_RE.test(text[start - 1])) start--
  while (end < text.length && WORD_CHAR_RE.test(text[end])) end++

  if (start === end) {
    editor.chain().focus().insertContent(replacement).run()
  } else {
    editor.chain().focus().deleteRange({ from: paraStart + start, to: paraStart + end }).insertContent(replacement).run()
  }
}
