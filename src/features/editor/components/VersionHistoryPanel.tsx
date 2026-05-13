// src/features/editor/components/VersionHistoryPanel.tsx
// Painel lateral de histórico de versões com diff simples

import { useState, useEffect, useCallback } from 'react'
import { SongVersion } from '../../../shared/types/Song'
import { useEditorStore } from '../editorStore'

interface DiffLine {
  type: 'unchanged' | 'added' | 'removed'
  text: string
}

function computeDiff(oldText: string, newText: string): DiffLine[] {
  const oldLines = oldText.split('\n')
  const newLines = newText.split('\n')
  const result: DiffLine[] = []

  // Diff simples linha-por-linha usando LCS (longest common subsequence)
  const lcs = buildLCS(oldLines, newLines)
  let oi = 0, ni = 0

  for (const { oldIdx, newIdx } of lcs) {
    while (oi < oldIdx) {
      result.push({ type: 'removed', text: oldLines[oi++] })
    }
    while (ni < newIdx) {
      result.push({ type: 'added', text: newLines[ni++] })
    }
    result.push({ type: 'unchanged', text: oldLines[oi++] })
    ni++
  }

  while (oi < oldLines.length) result.push({ type: 'removed', text: oldLines[oi++] })
  while (ni < newLines.length) result.push({ type: 'added',   text: newLines[ni++] })

  return result
}

function buildLCS(a: string[], b: string[]): { oldIdx: number; newIdx: number }[] {
  const dp: number[][] = Array.from({ length: a.length + 1 }, () => new Array(b.length + 1).fill(0))

  for (let i = 1; i <= a.length; i++) {
    for (let j = 1; j <= b.length; j++) {
      dp[i][j] = a[i - 1] === b[j - 1]
        ? dp[i - 1][j - 1] + 1
        : Math.max(dp[i - 1][j], dp[i][j - 1])
    }
  }

  const result: { oldIdx: number; newIdx: number }[] = []
  let i = a.length, j = b.length
  while (i > 0 && j > 0) {
    if (a[i - 1] === b[j - 1]) {
      result.unshift({ oldIdx: i - 1, newIdx: j - 1 })
      i--; j--
    } else if (dp[i - 1][j] > dp[i][j - 1]) {
      i--
    } else {
      j--
    }
  }

  return result
}

function formatDate(d: Date | string): string {
  const date = new Date(d)
  return date.toLocaleString('pt-BR', {
    day: '2-digit', month: '2-digit', year: '2-digit',
    hour: '2-digit', minute: '2-digit'
  })
}

interface Props {
  onClose: () => void
}

export function VersionHistoryPanel({ onClose }: Props) {
  const { currentSong } = useEditorStore()
  const [versions, setVersions] = useState<SongVersion[]>([])
  const [selected, setSelected] = useState<SongVersion | null>(null)
  const [saving, setSaving] = useState(false)
  const [versionName, setVersionName] = useState('')
  const [showSaveForm, setShowSaveForm] = useState(false)
  const [diff, setDiff] = useState<DiffLine[]>([])
  const [loading, setLoading] = useState(true)

  const loadVersions = useCallback(async () => {
    if (!currentSong?.id) return
    setLoading(true)
    try {
      const data = await window.flowAPI.invoke('lyric:getVersions', currentSong.id) as SongVersion[]
      setVersions(data)
    } catch (err) {
      console.error('Erro ao carregar versões:', err)
    } finally {
      setLoading(false)
    }
  }, [currentSong?.id])

  useEffect(() => { loadVersions() }, [loadVersions])

  const saveVersion = async () => {
    if (!currentSong?.id || !versionName.trim()) return
    setSaving(true)
    try {
      await window.flowAPI.invoke(
        'lyric:saveVersion',
        currentSong.id,
        versionName.trim(),
        currentSong.content
      )
      setVersionName('')
      setShowSaveForm(false)
      await loadVersions()
    } catch (err) {
      console.error('Erro ao salvar versão:', err)
    } finally {
      setSaving(false)
    }
  }

  const selectVersion = (ver: SongVersion) => {
    setSelected(ver)
    if (currentSong?.content) {
      setDiff(computeDiff(ver.content, currentSong.content))
    }
  }

  const restoreVersion = async (ver: SongVersion) => {
    if (!currentSong?.id) return
    if (!confirm(`Restaurar para "${ver.versionName}"? O conteúdo atual será substituído.`)) return
    await window.flowAPI.invoke('lyric:update', currentSong.id, { content: ver.content })
    // Recarregar o editor via reload simples (o autosave cuidará da persistência)
    window.location.reload()
  }

  return (
    <div className="fixed inset-y-0 right-80 w-80 bg-studio-surface border-l border-studio-border z-40 flex flex-col shadow-xl">
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-2 border-b border-studio-border flex-shrink-0">
        <span className="text-xs font-semibold text-text-primary">Histórico de Versões</span>
        <button
          onClick={onClose}
          className="text-text-muted hover:text-text-primary text-sm leading-none"
        >
          ✕
        </button>
      </div>

      {/* Salvar versão */}
      <div className="px-3 py-2 border-b border-studio-border flex-shrink-0">
        {showSaveForm ? (
          <div className="flex gap-1">
            <input
              type="text"
              value={versionName}
              onChange={e => setVersionName(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && saveVersion()}
              placeholder="Nome da versão..."
              autoFocus
              className="flex-1 bg-studio-bg border border-studio-border rounded px-2 py-1 text-xs text-text-primary outline-none focus:border-accent-primary"
            />
            <button
              onClick={saveVersion}
              disabled={saving || !versionName.trim()}
              className="px-2 py-1 bg-accent-primary text-white rounded text-xs disabled:opacity-40"
            >
              {saving ? '…' : 'OK'}
            </button>
            <button
              onClick={() => setShowSaveForm(false)}
              className="px-2 py-1 text-text-muted text-xs hover:text-text-primary"
            >
              ✕
            </button>
          </div>
        ) : (
          <button
            onClick={() => setShowSaveForm(true)}
            className="w-full text-center text-xs text-accent-glow border border-accent-primary/30 rounded py-1.5 hover:bg-accent-primary/10 transition-colors"
          >
            + Salvar versão atual
          </button>
        )}
      </div>

      {/* Lista de versões */}
      <div className="flex-1 overflow-y-auto">
        {loading ? (
          <div className="p-4 text-center text-xs text-text-muted">Carregando…</div>
        ) : versions.length === 0 ? (
          <div className="p-4 text-center space-y-2">
            <div className="text-3xl opacity-30">📂</div>
            <p className="text-xs text-text-muted">Nenhuma versão salva</p>
          </div>
        ) : (
          <div className="divide-y divide-studio-border">
            {versions.map(ver => (
              <div
                key={ver.id}
                onClick={() => selectVersion(ver)}
                className={`px-3 py-2.5 cursor-pointer transition-colors ${
                  selected?.id === ver.id
                    ? 'bg-accent-primary/10 border-l-2 border-accent-primary'
                    : 'hover:bg-studio-elevated'
                }`}
              >
                <div className="flex items-start justify-between">
                  <span className="text-xs font-medium text-text-primary truncate flex-1 mr-2">
                    {ver.versionName}
                  </span>
                  {selected?.id === ver.id && (
                    <button
                      onClick={(e) => { e.stopPropagation(); restoreVersion(ver) }}
                      className="text-[10px] text-accent-gold hover:underline flex-shrink-0"
                    >
                      Restaurar
                    </button>
                  )}
                </div>
                <div className="text-[10px] text-text-muted mt-0.5">{formatDate(ver.createdAt)}</div>
                <div className="text-[10px] text-text-muted">
                  {ver.content.split('\n').filter(Boolean).length} linhas
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Diff view */}
      {selected && diff.length > 0 && (
        <div className="border-t border-studio-border flex-shrink-0 max-h-48 overflow-y-auto">
          <div className="px-3 py-1 text-[10px] text-text-muted uppercase tracking-wider border-b border-studio-border">
            Comparação com versão atual
          </div>
          <div className="font-mono text-[10px] p-2 space-y-0.5">
            {diff.slice(0, 40).map((line, i) => (
              <div
                key={i}
                className={`px-1 rounded ${
                  line.type === 'added'
                    ? 'bg-accent-green/10 text-accent-green'
                    : line.type === 'removed'
                    ? 'bg-accent-red/10 text-accent-red line-through'
                    : 'text-text-muted'
                }`}
              >
                <span className="mr-1 select-none opacity-50">
                  {line.type === 'added' ? '+' : line.type === 'removed' ? '−' : ' '}
                </span>
                {line.text || <span className="opacity-30">(vazio)</span>}
              </div>
            ))}
            {diff.length > 40 && (
              <div className="text-text-muted opacity-50 text-center">
                … +{diff.length - 40} linhas
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
