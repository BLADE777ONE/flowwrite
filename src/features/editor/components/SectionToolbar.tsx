import { useState } from 'react'
import type { Editor } from '@tiptap/core'
import type { SectionType } from '../extensions/SectionNode'

const SECTIONS: Array<{ type: SectionType; label: string; shortLabel: string; color: string }> = [
  { type: 'intro', label: 'Intro', shortLabel: 'I', color: '#a855f7' },
  { type: 'verse', label: 'Verso', shortLabel: 'V', color: '#22d3ee' },
  { type: 'chorus', label: 'Refrão', shortLabel: 'R', color: '#fbbf24' },
  { type: 'bridge', label: 'Bridge', shortLabel: 'B', color: '#34d399' },
  { type: 'outro', label: 'Outro', shortLabel: 'O', color: '#94a3b8' },
  { type: 'freestyle', label: 'Freestyle', shortLabel: 'F', color: '#f87171' },
]

interface Props {
  editor: Editor | null
}

export function SectionToolbar({ editor }: Props) {
  const [open, setOpen] = useState(false)
  const [customLabel, setCustomLabel] = useState('')

  if (!editor) return null

  const insert = (type: SectionType, label?: string) => {
    editor
      .chain()
      .focus()
      .insertContent([
        {
          type: 'sectionBlock',
          attrs: { sectionType: type, label: label || '' },
        },
        { type: 'paragraph' },
      ])
      .run()
    setOpen(false)
    setCustomLabel('')
  }

  return (
    <div className="relative flex-shrink-0">
      <button
        type="button"
        onClick={() => setOpen(value => !value)}
        title="Inserir bloco de seção"
        className={`h-9 px-3 rounded-md border text-xs font-semibold transition flex items-center gap-2 ${
          open
            ? 'bg-purple-600/20 border-purple-500/60 text-purple-100'
            : 'bg-[#1b1b22] border-[#30303c] text-gray-300 hover:border-purple-500/50 hover:text-white'
        }`}
      >
        <span className="text-purple-300">#</span>
        Seção
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-2 z-50 w-60 rounded-lg border border-[#333340] bg-[#18181f] p-2 shadow-2xl animate-fade-in">
          <p className="px-2 pb-2 text-[10px] font-bold uppercase tracking-[0.18em] text-gray-500">
            Estrutura da letra
          </p>

          <div className="grid grid-cols-2 gap-1.5">
            {SECTIONS.map(section => (
              <button
                key={section.type}
                type="button"
                onClick={() => insert(section.type)}
                className="flex items-center gap-2 rounded-md border border-transparent px-2 py-2 text-left text-xs text-gray-200 transition hover:border-white/10 hover:bg-white/5"
              >
                <span
                  className="flex h-6 w-6 items-center justify-center rounded text-[10px] font-black"
                  style={{
                    color: section.color,
                    backgroundColor: `${section.color}1f`,
                    border: `1px solid ${section.color}55`,
                  }}
                >
                  {section.shortLabel}
                </span>
                <span className="truncate">{section.label}</span>
              </button>
            ))}
          </div>

          <div className="mt-2 border-t border-white/10 pt-2">
            <div className="flex gap-1.5">
              <input
                type="text"
                value={customLabel}
                onChange={event => setCustomLabel(event.target.value)}
                onKeyDown={event => {
                  if (event.key === 'Enter' && customLabel.trim()) {
                    insert('custom', customLabel.trim().toUpperCase())
                  }
                }}
                placeholder="Custom..."
                className="min-w-0 flex-1 rounded-md border border-[#333340] bg-[#101014] px-2 py-1.5 text-xs text-gray-200 outline-none placeholder:text-gray-600 focus:border-purple-500/60"
              />
              <button
                type="button"
                onClick={() => customLabel.trim() && insert('custom', customLabel.trim().toUpperCase())}
                disabled={!customLabel.trim()}
                className="rounded-md border border-purple-600/50 bg-purple-700/30 px-2.5 text-xs font-bold text-purple-100 transition hover:bg-purple-700/50 disabled:cursor-not-allowed disabled:opacity-30"
              >
                +
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
