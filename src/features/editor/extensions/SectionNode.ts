// src/features/editor/extensions/SectionNode.ts
// Nó TipTap para blocos de seção (Intro, Verso, Refrão, etc.)
// Renderiza como um divisor visual com label editável inline

import { Node, mergeAttributes } from '@tiptap/core'

export type SectionType = 'intro' | 'verse' | 'chorus' | 'bridge' | 'outro' | 'freestyle' | 'custom'

const SECTION_LABELS: Record<SectionType, string> = {
  intro:     'INTRO',
  verse:     'VERSO',
  chorus:    'REFRÃO',
  bridge:    'BRIDGE',
  outro:     'OUTRO',
  freestyle: 'FREESTYLE',
  custom:    'SEÇÃO',
}

const SECTION_COLORS: Record<SectionType, string> = {
  intro:     '#7c3aed',
  verse:     '#06b6d4',
  chorus:    '#f59e0b',
  bridge:    '#10b981',
  outro:     '#606080',
  freestyle: '#ef4444',
  custom:    '#a0a0c0',
}

declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    sectionBlock: {
      insertSection: (type: SectionType, label?: string) => ReturnType
    }
  }
}

export const SectionNode = Node.create({
  name: 'sectionBlock',
  group: 'block',
  atom: true,          // não editável internamente pelo cursor

  addAttributes() {
    return {
      sectionType: {
        default: 'verse',
        parseHTML: (el) => el.getAttribute('data-section-type') || 'verse',
        renderHTML: (attrs) => ({ 'data-section-type': attrs.sectionType }),
      },
      label: {
        default: '',
        parseHTML: (el) => el.getAttribute('data-label') || '',
        renderHTML: (attrs) => ({ 'data-label': attrs.label }),
      },
    }
  },

  parseHTML() {
    return [{ tag: 'div[data-section-block]' }]
  },

  renderHTML({ node, HTMLAttributes }) {
    const type: SectionType = node.attrs.sectionType
    const label: string     = node.attrs.label || SECTION_LABELS[type]
    const color             = SECTION_COLORS[type]

    return [
      'div',
      mergeAttributes(HTMLAttributes, {
        'data-section-block': 'true',
        class: 'section-block-node',
        style: `--section-color: ${color}`,
      }),
      ['span', { class: 'section-block-label' }, label],
      ['span', { class: 'section-block-line' }],
    ]
  },

  addCommands() {
    return {
      insertSection:
        (type, label) =>
        ({ commands }) => {
          return commands.insertContent({
            type: this.name,
            attrs: { sectionType: type, label: label || '' },
          })
        },
    }
  },

  addKeyboardShortcuts() {
    return {
      // Backspace no início do próximo parágrafo não apaga a seção acidentalmente
      Backspace: () => false,
    }
  },
})
