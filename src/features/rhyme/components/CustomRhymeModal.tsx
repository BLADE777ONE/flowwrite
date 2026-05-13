// src/features/rhyme/components/CustomRhymeModal.tsx
// Modal para adicionar entradas personalizadas ao dicionário de rimas

import { useState, useEffect } from 'react'

interface CustomEntry {
  id: string
  term: string
  suggestionsJson: string
  phoneticKey: string
  category: string | null
}

interface Props {
  onClose: () => void
}

export function CustomRhymeModal({ onClose }: Props) {
  const [entries, setEntries] = useState<CustomEntry[]>([])
  const [term, setTerm] = useState('')
  const [suggestions, setSuggestions] = useState('')
  const [category, setCategory] = useState('')
  const [saving, setSaving] = useState(false)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const loadEntries = async () => {
    setLoading(true)
    try {
      const data = await window.flowAPI.invoke('rhymeDict:list') as CustomEntry[]
      setEntries(data)
    } catch {
      // silencioso se não tiver dados ainda
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { loadEntries() }, [])

  const handleAdd = async () => {
    if (!term.trim() || !suggestions.trim()) {
      setError('Preencha o termo e ao menos uma sugestão')
      return
    }
    setError('')
    setSaving(true)
    try {
      const suggs = suggestions.split(',').map(s => s.trim()).filter(Boolean)
      await window.flowAPI.invoke('rhymeDict:add', {
        term: term.trim().toLowerCase(),
        suggestionsJson: JSON.stringify(suggs),
        phoneticKey: term.trim().toUpperCase().replace(/[AEIOU]/g, 'V').replace(/[^A-Z]/g, 'C'),
        category: category.trim() || null,
      })
      setTerm('')
      setSuggestions('')
      setCategory('')
      await loadEntries()
    } catch (err) {
      setError('Erro ao salvar — tente novamente')
      console.error(err)
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async (id: string) => {
    try {
      await window.flowAPI.invoke('rhymeDict:delete', id)
      setEntries(prev => prev.filter(e => e.id !== id))
    } catch (err) {
      console.error(err)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="bg-studio-surface border border-studio-border rounded-xl shadow-2xl w-[480px] max-h-[80vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-studio-border">
          <div>
            <div className="text-sm font-semibold text-text-primary">Dicionário de Rimas</div>
            <div className="text-[10px] text-text-muted">Adicione suas próprias rimas ao motor fonético</div>
          </div>
          <button onClick={onClose} className="text-text-muted hover:text-text-primary text-lg leading-none">✕</button>
        </div>

        {/* Form de adição */}
        <div className="px-4 py-3 border-b border-studio-border space-y-2">
          <div className="flex gap-2">
            <div className="flex-1">
              <label className="text-[10px] text-text-muted uppercase tracking-wider">Termo</label>
              <input
                type="text"
                value={term}
                onChange={e => setTerm(e.target.value)}
                placeholder="ex: baile"
                className="w-full mt-1 bg-studio-bg border border-studio-border rounded px-2 py-1.5 text-xs text-text-primary outline-none focus:border-accent-primary placeholder-text-muted"
              />
            </div>
            <div className="w-28">
              <label className="text-[10px] text-text-muted uppercase tracking-wider">Categoria</label>
              <input
                type="text"
                value={category}
                onChange={e => setCategory(e.target.value)}
                placeholder="ex: lugar"
                className="w-full mt-1 bg-studio-bg border border-studio-border rounded px-2 py-1.5 text-xs text-text-primary outline-none focus:border-accent-primary placeholder-text-muted"
              />
            </div>
          </div>

          <div>
            <label className="text-[10px] text-text-muted uppercase tracking-wider">
              Sugestões de rima{' '}
              <span className="normal-case">(separadas por vírgula)</span>
            </label>
            <input
              type="text"
              value={suggestions}
              onChange={e => setSuggestions(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleAdd()}
              placeholder="ex: vaile, graal, chafariz, capaz"
              className="w-full mt-1 bg-studio-bg border border-studio-border rounded px-2 py-1.5 text-xs text-text-primary outline-none focus:border-accent-primary placeholder-text-muted"
            />
          </div>

          {error && (
            <p className="text-[10px] text-accent-red">{error}</p>
          )}

          <button
            onClick={handleAdd}
            disabled={saving}
            className="w-full py-1.5 bg-accent-primary text-white rounded text-xs font-medium disabled:opacity-40 hover:bg-accent-glow transition-colors"
          >
            {saving ? 'Salvando…' : '+ Adicionar ao Dicionário'}
          </button>
        </div>

        {/* Lista de entradas */}
        <div className="flex-1 overflow-y-auto p-4">
          <div className="text-[10px] text-text-muted uppercase tracking-wider mb-2">
            Entradas personalizadas ({entries.length})
          </div>
          {loading ? (
            <p className="text-xs text-text-muted text-center py-4">Carregando…</p>
          ) : entries.length === 0 ? (
            <p className="text-xs text-text-muted text-center py-4">Nenhuma entrada ainda</p>
          ) : (
            <div className="space-y-1.5">
              {entries.map(entry => {
                const suggs: string[] = JSON.parse(entry.suggestionsJson || '[]')
                return (
                  <div
                    key={entry.id}
                    className="bg-studio-elevated rounded px-3 py-2 flex items-start justify-between gap-2"
                  >
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-medium text-accent-glow">{entry.term}</span>
                        {entry.category && (
                          <span className="text-[9px] px-1.5 py-0.5 bg-studio-muted/30 rounded text-text-muted">
                            {entry.category}
                          </span>
                        )}
                      </div>
                      <div className="flex flex-wrap gap-1 mt-1">
                        {suggs.slice(0, 6).map(s => (
                          <span key={s} className="text-[9px] px-1 py-0.5 bg-studio-bg rounded text-text-secondary">
                            {s}
                          </span>
                        ))}
                        {suggs.length > 6 && (
                          <span className="text-[9px] text-text-muted">+{suggs.length - 6}</span>
                        )}
                      </div>
                    </div>
                    <button
                      onClick={() => handleDelete(entry.id)}
                      className="text-[10px] text-text-muted hover:text-accent-red flex-shrink-0 mt-0.5"
                      title="Remover"
                    >
                      ✕
                    </button>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
