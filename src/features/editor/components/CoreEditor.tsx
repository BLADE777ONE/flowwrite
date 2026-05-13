// src/features/editor/components/CoreEditor.tsx
import { useEffect, useRef, useCallback } from 'react'
import { useEditor, EditorContent } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import Placeholder from '@tiptap/extension-placeholder'
import CharacterCount from '@tiptap/extension-character-count'
import { useEditorStore } from '../editorStore'
import { useAnalysisStore, PythonAnalysis } from '../../analysis/analysisStore'
import { WorkerInput, WorkerOutput } from '../../../workers/analysisWorker'
import { MetricsAnalysis, FlowSpeed } from '../../../shared/types/Metrics'
import { RhymeHighlightExtension } from '../extensions/RhymeHighlightExtension'
import { SectionNode } from '../extensions/SectionNode'
import { SectionToolbar } from './SectionToolbar'
import { GhostNotesView } from './GhostNotesView'
import { VersionHistoryPanel } from './VersionHistoryPanel'
import { calculateArtistDNA } from '../../artistDNA/ArtistDNAService'
import { extractContentWords } from '../../artistDNA/vocabularyEntropy'

const DEBOUNCE_MS = 500
const AUTOSAVE_MS = 3000
const DNA_EVERY_N = 5

export function CoreEditor() {
  const {
    currentSong, updateContent, content, setIsSaving, setLastSavedAt, setIsDirty,
    ghostNotesEnabled, rhymeHighlightsEnabled,
    showVersionHistory, setShowVersionHistory,
    bpm, setBpm,
    toggleGhostNotes, toggleRhymeHighlights,
    incrementAutosaveCount, autosaveCount,
  } = useEditorStore()

  const {
    setIsAnalyzing, setResults, setLastAnalyzedText, setAnalysisProgress,
    rhymeAnalysis, clicheAnalysis, metricsAnalysis, setArtistDNA,
    setPythonAnalysis, setPythonAvailable,
  } = useAnalysisStore()

  const debounceRef   = useRef<ReturnType<typeof setTimeout>>()
  const autosaveRef   = useRef<ReturnType<typeof setTimeout>>()
  const workerRef     = useRef<Worker | null>(null)
  const pythonReadyRef = useRef(false)

  // ─── Web Worker ──────────────────────────────────────────────────────────
  useEffect(() => {
    workerRef.current = new Worker(
      new URL('../../../workers/analysisWorker.ts', import.meta.url),
      { type: 'module' }
    )
    workerRef.current.onmessage = (e: MessageEvent<WorkerOutput>) => {
      const { type, rhymeAnalysis, metricsAnalysis, clicheAnalysis, qualityAnalysis, insights, progress } = e.data
      if (type === 'progress' && progress !== undefined) setAnalysisProgress(progress)
      if (type === 'result') setResults({ rhyme: rhymeAnalysis, metrics: metricsAnalysis, cliche: clicheAnalysis, quality: qualityAnalysis, insights })
    }
    return () => workerRef.current?.terminate()
  }, [])

  // ─── Python init ─────────────────────────────────────────────────────────
  useEffect(() => {
    if (!window.flowAPI) return
    let cancelled = false
    window.flowAPI.invoke('python:health').then((res: any) => {
      if (!cancelled && res?.ok) { pythonReadyRef.current = true; setPythonAvailable(true) }
    }).catch(() => {})
    const onReady = () => {
      if (cancelled) return
      pythonReadyRef.current = true
      setPythonAvailable(true)
    }
    window.flowAPI.on('python:ready', onReady)
    return () => {
      cancelled = true
      window.flowAPI.off('python:ready')
    }
  }, [])

  // ─── Análise ─────────────────────────────────────────────────────────────
  const triggerAnalysis = useCallback((text: string) => {
    if (!text.trim()) return
    setIsAnalyzing(true)
    setLastAnalyzedText(text)
    workerRef.current?.postMessage({
      type: 'analyze', content: text,
      vibe: currentSong?.metadataJson ? JSON.parse(currentSong.metadataJson)?.vibe ?? 'default' : 'default',
      bpm,
    } as WorkerInput)
  }, [currentSong, bpm])

  // ─── Python Analysis ─────────────────────────────────────────────────────
  const triggerPythonAnalysis = useCallback(async (text: string) => {
    if (!text.trim() || !pythonReadyRef.current) return
    try {
      const result = await window.flowAPI.invoke('python:analyze', text, bpm) as PythonAnalysis & { error?: string }
      if (!result || result.error) return
      setPythonAnalysis(result)
      // Override metricsAnalysis with Python's more accurate syllable data
      const pyLines = result.syllables.lines
      const metricsFromPython: MetricsAnalysis = {
        lines: pyLines.map((l, i) => ({
          lineIndex: i,
          text: l.text,
          syllableCount: l.syllables,
          estimatedStressWords: l.stressWords,
          breathPoints: l.breathPoints,
          isTooLong: l.isTooLong,
          isTooShort: l.isTooShort,
          flowSpeed: result.syllables.flowSpeed as FlowSpeed,
          suggestions: [],
          elisions: [],
        })),
        averageSyllables: result.syllables.average,
        regularityScore: result.syllables.regularity,
        flowSpeed: result.syllables.flowSpeed as FlowSpeed,
        totalLines: result.syllables.totalLines,
        totalWords: 0,
        totalSyllables: pyLines.reduce((s, l) => s + l.syllables, 0),
        warnings: result.syllables.warnings,
        longestLine: null,
        shortestLine: null,
      }
      // Compute longest/shortest
      if (metricsFromPython.lines.length > 0) {
        const sorted = [...metricsFromPython.lines].sort((a, b) => b.syllableCount - a.syllableCount)
        metricsFromPython.longestLine = sorted[0]
        metricsFromPython.shortestLine = sorted[sorted.length - 1]
      }
      setResults({ metrics: metricsFromPython })
    } catch {
      // Python unavailable — JS fallback already running
    }
  }, [bpm])

  // ─── DNA Persistence ─────────────────────────────────────────────────────
  const persistArtistDNA = useCallback(async (currentContent: string) => {
    if (!currentSong?.projectId) return
    try {
      const songs = await window.flowAPI.invoke('lyric:list', currentSong.projectId) as { content: string }[]
      const allText = songs.map(s => s.content).join('\n')
      const dna = calculateArtistDNA(allText, songs.length)
      setArtistDNA(dna)
      await window.flowAPI.invoke('analysis:updateDNA', {
        totalSongs: dna.totalSongs, totalWords: dna.totalWords,
        frequentWordsJson: JSON.stringify(dna.frequentWords),
        recurringThemesJson: JSON.stringify(dna.recurringThemes),
        averageLineLength: dna.averageLineLength,
        averageSyllablesPerLine: dna.averageSyllablesPerLine,
        vocabularyEntropy: dna.vocabularyEntropy,
        dominantVibe: dna.dominantVibe ?? undefined,
        rhymeDensity: dna.rhymeDensity,
        internalRhymeRate: dna.internalRhymeRate,
        multisyllableRate: dna.multisyllableRate,
        adlibUsageRate: dna.adlibUsageRate,
      })
      const words = extractContentWords(currentContent).slice(0, 100)
      if (words.length > 0) await window.flowAPI.invoke('wordFreq:update', words)
    } catch (err) { console.error('DNA persist error:', err) }
  }, [currentSong])

  // ─── Autosave ─────────────────────────────────────────────────────────────
  const triggerAutosave = useCallback(async (text: string) => {
    if (!currentSong?.id) return
    setIsSaving(true)
    try {
      const existing = currentSong.metadataJson ? JSON.parse(currentSong.metadataJson) : {}
      const metadataJson = JSON.stringify({ ...existing, bpm })
      await window.flowAPI.invoke('lyric:update', currentSong.id, { content: text, metadataJson })
      setIsDirty(false)
      setLastSavedAt(new Date())
      incrementAutosaveCount()
      if ((autosaveCount + 1) % DNA_EVERY_N === 0) await persistArtistDNA(text)
    } catch (err) { console.error('Autosave error:', err) }
    finally { setIsSaving(false) }
  }, [currentSong, bpm, autosaveCount, persistArtistDNA])

  // ─── Editor ──────────────────────────────────────────────────────────────
  const editor = useEditor({
    extensions: [
      StarterKit.configure({ heading: false, bulletList: false, orderedList: false }),
      Placeholder.configure({ placeholder: 'Escreva sua letra aqui…\n\nCada linha é um verso.' }),
      CharacterCount,
      RhymeHighlightExtension,
      SectionNode,
    ],
    content: currentSong?.content || '',
    editorProps: {
      attributes: { class: 'tiptap-editor h-full', spellcheck: 'false' }
    },
    onUpdate: ({ editor }) => {
      const text = editor.getText()
      updateContent(text)
      clearTimeout(debounceRef.current)
      debounceRef.current = setTimeout(() => {
        triggerAnalysis(text)
        triggerPythonAnalysis(text)
      }, DEBOUNCE_MS)
      clearTimeout(autosaveRef.current)
      autosaveRef.current = setTimeout(() => triggerAutosave(text), AUTOSAVE_MS)
    }
  })

  useEffect(() => {
    if (!editor) return
    if (rhymeHighlightsEnabled && rhymeAnalysis) editor.commands.setRhymeHighlights(rhymeAnalysis)
    else editor.commands.setRhymeHighlights(null)
  }, [rhymeAnalysis, rhymeHighlightsEnabled, editor])

  useEffect(() => {
    if (!editor) return
    editor.commands.setClicheHighlights(clicheAnalysis ?? null)
  }, [clicheAnalysis, editor])

  useEffect(() => {
    if (editor && currentSong) {
      editor.commands.setContent(currentSong.content || '')
      triggerAnalysis(currentSong.content || '')
      triggerPythonAnalysis(currentSong.content || '')
    }
  }, [currentSong?.id])

  useEffect(() => {
    async function loadDNA() {
      try {
        const raw = await window.flowAPI.invoke('analysis:getDNA') as any
        if (!raw) return
        setArtistDNA({
          totalSongs: raw.totalSongs, totalWords: raw.totalWords, uniqueWords: 0,
          vocabularyEntropy: raw.vocabularyEntropy,
          frequentWords: JSON.parse(raw.frequentWordsJson || '[]'),
          saturatedWords: [],
          recurringThemes: JSON.parse(raw.recurringThemesJson || '[]'),
          dominantVibe: raw.dominantVibe ?? null,
          averageLineLength: raw.averageLineLength,
          averageSyllablesPerLine: raw.averageSyllablesPerLine,
          rhymeDensity: raw.rhymeDensity, internalRhymeRate: raw.internalRhymeRate,
          multisyllableRate: raw.multisyllableRate, adlibUsageRate: raw.adlibUsageRate,
          evolutionSuggestions: [], repetitionAlerts: [],
          updatedAt: new Date(raw.updatedAt),
        })
      } catch { /* silencioso no primeiro uso */ }
    }
    loadDNA()
  }, [])

  // ─── Empty state ──────────────────────────────────────────────────────────
  if (!currentSong) {
    return (
      <div className="h-full flex flex-col items-center justify-center gap-6" style={{ background: '#f9f8f5' }}>
        <div
          className="w-20 h-20 rounded-3xl flex items-center justify-center text-4xl"
          style={{ background: 'linear-gradient(135deg, rgba(124,58,237,0.08), rgba(8,145,178,0.08))', border: '1px solid rgba(124,58,237,0.12)' }}
        >
          ✍️
        </div>
        <div className="text-center space-y-2">
          <p className="text-xl font-semibold" style={{ color: '#1a1829' }}>Nenhuma letra selecionada</p>
          <p className="text-sm" style={{ color: '#8b8a9f' }}>Abra um projeto na sidebar e selecione uma letra</p>
        </div>
        <div
          className="flex items-center gap-2 text-xs rounded-xl px-5 py-2.5"
          style={{ background: 'rgba(124,58,237,0.06)', border: '1px solid rgba(124,58,237,0.12)', color: '#7c6fa0' }}
        >
          <span>←</span>
          <span>Clique em <strong style={{ color: '#7c3aed' }}>Novo Projeto</strong> para começar</span>
        </div>
      </div>
    )
  }

  return (
    <div className="h-full flex flex-col overflow-hidden relative" style={{ background: '#f9f8f5' }}>

      {/* ── Header do editor ─────────────────────────────────────────────── */}
      <div
        className="flex-shrink-0 px-4 py-2 flex items-center gap-2"
        style={{
          background: 'rgba(255,255,255,0.85)',
          backdropFilter: 'blur(12px)',
          borderBottom: '1px solid rgba(0,0,0,0.07)',
          WebkitBackdropFilter: 'blur(12px)',
        }}
      >
        {/* Título */}
        <input
          type="text"
          defaultValue={currentSong.title}
          placeholder="Título da letra"
          className="flex-1 bg-transparent text-sm font-semibold outline-none min-w-0 transition-colors"
          style={{ color: '#1a1829' }}
          onBlur={async (e) => {
            if (e.target.value !== currentSong.title) {
              await window.flowAPI.invoke('lyric:update', currentSong.id, { title: e.target.value })
            }
          }}
        />

        {/* Separador */}
        <div className="w-px h-5 flex-shrink-0" style={{ background: 'rgba(0,0,0,0.1)' }} />

        {/* BPM */}
        <div
          className="flex items-center gap-1.5 rounded-lg px-2.5 py-1 flex-shrink-0"
          style={{ background: 'rgba(124,58,237,0.06)', border: '1px solid rgba(124,58,237,0.15)' }}
        >
          <span className="text-[9px] font-bold tracking-wider" style={{ color: '#9d5cf0' }}>BPM</span>
          <input
            type="text"
            inputMode="numeric"
            defaultValue={bpm}
            key={bpm}
            onBlur={e => {
              const v = parseInt(e.target.value, 10)
              if (!isNaN(v) && v >= 40 && v <= 240) setBpm(v)
              else e.target.value = String(bpm)
            }}
            onKeyDown={e => { if (e.key === 'Enter') (e.target as HTMLInputElement).blur() }}
            onFocus={e => e.target.select()}
            className="w-9 bg-transparent text-xs font-bold font-mono outline-none text-center"
            style={{ color: '#7c3aed' }}
          />
        </div>

        {/* Separador */}
        <div className="w-px h-5 flex-shrink-0" style={{ background: 'rgba(0,0,0,0.1)' }} />

        {/* Toolbar */}
        <SectionToolbar editor={editor} />

        <ToolbarBtn
          onClick={() => { toggleRhymeHighlights(); editor?.commands.toggleRhymeHighlights() }}
          active={rhymeHighlightsEnabled}
          icon="🎨"
          label="Rimas"
          title={rhymeHighlightsEnabled ? 'Desativar highlights de rima' : 'Ativar highlights de rima'}
        />
        <ToolbarBtn
          onClick={toggleGhostNotes}
          active={ghostNotesEnabled}
          icon="👻"
          label="Tônica"
          title="Ghost Notes — marcadores de tônica"
        />
        <ToolbarBtn
          onClick={() => setShowVersionHistory(!showVersionHistory)}
          active={showVersionHistory}
          icon="🕐"
          label="Versões"
          title="Histórico de versões"
        />
      </div>

      {/* ── Conteúdo ─────────────────────────────────────────────────────── */}
      <div className="flex-1 overflow-hidden">
        {ghostNotesEnabled ? (
          <GhostNotesView content={content} metricsAnalysis={metricsAnalysis} />
        ) : (
          <div className="h-full overflow-y-auto editor-scroll" style={{ background: '#f9f8f5' }}>
            <EditorContent editor={editor} className="h-full tiptap-editor" />
          </div>
        )}
      </div>

      {/* ── Histórico de versões ──────────────────────────────────────────── */}
      {showVersionHistory && (
        <VersionHistoryPanel onClose={() => setShowVersionHistory(false)} />
      )}
    </div>
  )
}

function ToolbarBtn({
  onClick, active, icon, label, title
}: {
  onClick: () => void
  active: boolean
  icon: string
  label: string
  title: string
}) {
  return (
    <button
      onClick={onClick}
      title={title}
      className={`editor-toolbar-btn ${active ? 'active' : ''}`}
    >
      <span className="text-sm leading-none">{icon}</span>
      <span className="text-[8px] leading-none font-medium">{label}</span>
    </button>
  )
}
