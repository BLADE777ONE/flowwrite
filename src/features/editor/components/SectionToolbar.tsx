// src/features/editor/components/SectionToolbar.tsx
import { useState } from 'react'
import { Editor } from '@tiptap/react'
import { SectionType } from '../extensions/SectionNode'

const SECTIONS: { type: SectionType; label: string; shortLabel: string; color: string }[] = [
  { type: 'intro',     label: 'Intro',     shortLabel: 'I', color: '#a855f7' },
  { type: 'verse',     label: 'Verso',     shortLabel: 'V', color: '#22d3ee' },
  { type: 'chorus',    label: 'Refrão',    shortLabel: 'R', color: '#fbbf24' },
  { type: 'bridge',    label: 'Bridge',    shortLabel: 'B', color: '#34d399' },
  { type: 'outro',     label: 'Outro',     shortLabel: 'O', color: '#94a3b8' },
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
    editor.chain().focus().insertSection(type, label).run()
    setOpen(false)
    setCustomLabel('')
  }

  return (
    <div className="relative">
      <button
        onClick={() => setOpen(v => !v)}
        title="Inserir bloco de seção"
        className={`editor-toolbar-btn ${open ? 'active' : ''}`}
      >
        <span className="text-sm leading-none">§</span>
        <span className="text-[8px] leading-none font-medium">Seção</span>
      </button>

      {open && (
        <div
          className="absolute top-full left-0 mt-2 z-50 rounded-2xl shadow-card p-2.5 w-52 animate-fade-in"
          style={{
            background: 'rgba(255,255,255,0.97)',
            border: '1px solid rgba(0,0,0,0.1)',
            backdropFilter: 'blur(16px)',
          }}
        >
          <p className="text-[9px] font-bold uppercase tracking-wider px-1.5 mb-2" style={{ color: '#9898c0' }}>
            Tipo de Seção
          </p>
          <div className="space-y-0.5">
            {SECTIONS.map(sec => (
              <button
                key={sec.type}
                onClick={() => insert(sec.type)}
                className="w-full flex items-center gap-2.5 px-2.5 py-1.5 rounded-xl text-left transition-all duration-150"
                style={{ color: '#1a1829' }}
                onMouseEnter={e => (e.currentTarget.style.background = `${sec.color}12`)}
                onMouseLeave={e => (e.currentTarget.style.background = '')}
              >
                <span
                  className="w-6 h-6 rounded-lg text-[9px] font-bold flex items-center justify-center flex-shrink-0"
                  style={{
                    backgroundColor: `${sec.color}18`,
                    color: sec.color,
                    border: `1px solid ${sec.color}35`,
                  }}
                >
                  {sec.shortLabel}
                </span>
                <span className="text-xs font-medium">{sec.label}</span>
              </button>
            ))}

            {/* Custom */}
            <div className="pt-2 mt-1.5" style={{ borderTop: '1px solid rgba(0,0,0,0.06)' }}>
              <div className="flex gap-1.5">
                <input
                  type="text"
                  value={customLabel}
                  onChange={e => setCustomLabel(e.target.value)}
                  onKeyDown={e => {
                    if (e.key === 'Enter' && customLabel.trim()) {
                      insert('custom', customLabel.trim().toUpperCase())
                    }
                  }}
                  placeholder="Seção personalizada..."
                  className="flex-1 rounded-lg px-2.5 py-1.5 text-[10px] outline-none transition-all"
                  style={{
                    background: 'rgba(0,0,0,0.04)',
                    border: '1px solid rgba(0,0,0,0.1)',
                    color: '#1a1829',
                  }}
                  onFocus={e => (e.target.style.borderColor = 'rgba(124,58,237,0.4)')}
                  onBlur={e => (e.target.style.borderColor = 'rgba(0,0,0,0.1)')}
                />
                <button
                  onClick={() => customLabel.trim() && insert('custom', customLabel.trim().toUpperCase())}
                  disabled={!customLabel.trim()}
                  className="px-2.5 py-1 rounded-lg text-[10px] font-semibold transition-all disabled:opacity-30"
                  style={{ background: 'rgba(124,58,237,0.12)', color: '#7c3aed' }}
                >
                  +
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
