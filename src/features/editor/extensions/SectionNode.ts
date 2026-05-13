import { Node, mergeAttributes } from '@tiptap/core'

export type SectionType = 'intro' | 'verse' | 'chorus' | 'bridge' | 'outro' | 'freestyle' | 'custom'

const SECTION_LABELS: Record<SectionType, string> = {
  intro: 'INTRO',
  verse: 'VERSO',
  chorus: 'REFRÃO',
  bridge: 'BRIDGE',
  outro: 'OUTRO',
  freestyle: 'FREESTYLE',
  custom: 'SEÇÃO',
}

const SECTION_COLORS: Record<SectionType, string> = {
  intro: '#a855f7',
  verse: '#22d3ee',
  chorus: '#fbbf24',
  bridge: '#34d399',
  outro: '#94a3b8',
  freestyle: '#f87171',
  custom: '#a0a0c0',
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
  atom: true,
  selectable: true,
  draggable: true,

  addAttributes() {
    return {
      sectionType: {
        default: 'verse',
        parseHTML: element => element.getAttribute('data-section-type') || 'verse',
        renderHTML: attributes => ({ 'data-section-type': attributes.sectionType }),
      },
      label: {
        default: '',
        parseHTML: element => element.getAttribute('data-label') || '',
        renderHTML: attributes => ({ 'data-label': attributes.label }),
      },
    }
  },

  parseHTML() {
    return [{ tag: 'div[data-section-block]' }]
  },

  renderHTML({ node, HTMLAttributes }) {
    const type = node.attrs.sectionType as SectionType
    const label = node.attrs.label || SECTION_LABELS[type] || SECTION_LABELS.custom
    const color = SECTION_COLORS[type] || SECTION_COLORS.custom

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
          return commands.insertContent([
            {
              type: this.name,
              attrs: { sectionType: type, label: label || '' },
            },
            { type: 'paragraph' },
          ])
        },
    }
  },
})
