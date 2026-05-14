import { useEffect, useRef, useState } from 'react'
import { useEditor } from '@tiptap/react'
import type { Editor } from '@tiptap/core'
import StarterKit from '@tiptap/starter-kit'
import Placeholder from '@tiptap/extension-placeholder'
import { RhymeHighlightExtension } from '../features/editor/RhymeHighlightExtension'
import { SectionNode } from '../features/editor/extensions/SectionNode'
import { LineGutterExtension } from '../features/editor/extensions/LineGutterExtension'
import { getDictionaryData, type DictionaryResult } from '../features/dictionary/DictionaryService'
import { useEditorStore } from '../features/editor/editorStore'
import { RhythmicScorePanel } from '../features/rhythm/components/RhythmicScorePanel'
import { Sidebar } from './components/Sidebar'
import { EditorTopBar } from './components/EditorTopBar'
import { LyricsEditor } from './components/LyricsEditor'
import { EditorStatusBar } from './components/EditorStatusBar'
import { RightPanel } from './components/RightPanel'
import { OnboardingOverlay } from './components/OnboardingOverlay'
import type { ActiveToolTab, Project, Song, TimelineSegment } from './types'
import {
  extractWordFromSelection,
  extractTimelineSegments,
  replaceWordAtSelection,
  storedContentToEditorHtml,
  storedContentToPlainText,
  textToHtml,
} from './utils/editorText'

declare global {
  interface Window {
    flowAPI: {
      invoke: (channel: string, ...args: unknown[]) => Promise<unknown>
      on: (channel: string, listener: (...args: unknown[]) => void) => void
      off: (channel: string) => void
    }
    appInfo: { platform: string }
  }
}

function getActiveBarIndex(editor: Editor): number {
  let contentIndex = 0
  let activeIndex = 0
  let found = false
  const { from } = editor.state.selection

  editor.state.doc.forEach((node, offset) => {
    if (node.type.name !== 'paragraph') return

    const isActiveNode = from >= offset && from <= offset + node.nodeSize
    if (isActiveNode && !found) {
      activeIndex = contentIndex
      found = true
    }

    if (node.textContent.trim()) contentIndex++
  })

  return found ? activeIndex : Math.max(0, contentIndex - 1)
}

type SongMetadata = {
  bpm?: number
  audio?: {
    path: string
    name: string
  } | null
}

function parseSongMetadata(song: Song | null): SongMetadata {
  if (!song?.metadataJson) return {}
  try {
    return JSON.parse(song.metadataJson) as SongMetadata
  } catch {
    return {}
  }
}

function buildSongMetadata(song: Song | null, patch: SongMetadata): string {
  return JSON.stringify({
    ...parseSongMetadata(song),
    ...patch,
  })
}

export default function App() {
  const [lyrics, setLyrics] = useState('')
  const [title, setTitle] = useState('')
  const [selectedWord, setSelectedWord] = useState('')
  const [activeTab, setActiveTab] = useState<ActiveToolTab>('metrics')

  const [projects, setProjects] = useState<Project[]>([])
  const [songs, setSongs] = useState<Song[]>([])
  const [currentProject, setCurrentProject] = useState<Project | null>(null)
  const [currentSong, setCurrentSong] = useState<Song | null>(null)
  const [saving, setSaving] = useState(false)
  const [segments, setSegments] = useState<TimelineSegment[]>([])
  const [dictResult, setDictResult] = useState<DictionaryResult | null>(null)
  const [dictLoading, setDictLoading] = useState(false)
  const [activeBarIndex, setActiveBarIndex] = useState(0)
  const [showOnboarding, setShowOnboarding] = useState(false)
  const { bpm, setBpm, metronomePlaying } = useEditorStore()

  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const isLoadingRef = useRef(false)
  const pendingContentRef = useRef<string | null>(null)
  const rawWordRef = useRef('')
  const dictTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const editor = useEditor({
    extensions: [
      StarterKit,
      SectionNode,
      Placeholder.configure({ placeholder: 'Abra o bloco e escreva suas barras...' }),
      RhymeHighlightExtension,
      LineGutterExtension,
    ],
    content: '',
    onUpdate: ({ editor }) => {
      if (isLoadingRef.current) return
      setLyrics(editor.getText({ blockSeparator: '\n' }))
      setSegments(extractTimelineSegments(editor))
      setActiveBarIndex(getActiveBarIndex(editor))
    },
    onSelectionUpdate: ({ editor }) => {
      const { raw, normalized } = extractWordFromSelection(editor)
      console.log('[App] Palavra extraída:', raw, '| normalizada:', normalized)
      rawWordRef.current = raw.toLowerCase()
      setSelectedWord(normalized)
      setActiveBarIndex(getActiveBarIndex(editor))
    },
  })

  useEffect(() => {
    if (!editor || pendingContentRef.current === null) return
    const content = pendingContentRef.current
    pendingContentRef.current = null
    editor.commands.setContent(storedContentToEditorHtml(content), false)
    setSegments(extractTimelineSegments(editor))
  }, [editor])

  const lines = lyrics.split('\n')
  const contentLines = lines.map(line => line.trim()).filter(Boolean)
  const safeActiveBarIndex = Math.min(activeBarIndex, Math.max(contentLines.length - 1, 0))
  const activeBlockStart = Math.floor(safeActiveBarIndex / 4) * 4
  const activeBlockLines = contentLines.slice(activeBlockStart, activeBlockStart + 4)
  const scopedLines = activeBlockLines.length > 0 ? activeBlockLines : contentLines.slice(0, 4)

  useEffect(() => {
    if (activeTab !== 'dictionary') return
    if (!selectedWord) {
      setDictResult(null)
      setDictLoading(false)
      return
    }

    setDictResult(null)
    setDictLoading(true)
    if (dictTimerRef.current) clearTimeout(dictTimerRef.current)

    dictTimerRef.current = setTimeout(async () => {
      try {
        const result = await getDictionaryData(rawWordRef.current || selectedWord)
        setDictResult(result)
      } catch (err) {
        console.error('[App] getDictionaryData falhou:', err)
        setDictResult({ girias: [], sinonimos: [], relacionados: [], antonimos: [], themes: [] })
      } finally {
        setDictLoading(false)
      }
    }, 700)

    return () => {
      if (dictTimerRef.current) clearTimeout(dictTimerRef.current)
    }
  }, [selectedWord, activeTab])

  useEffect(() => {
    if (!window.flowAPI) return
    window.flowAPI.invoke('project:list').then((data) => {
      const list = data as Project[]
      setProjects(list)
      if (list.length > 0) loadProject(list[0])
    })
  }, [])

  useEffect(() => {
    if (!window.flowAPI) return

    window.flowAPI.invoke('settings:get', 'onboarding_completed')
      .then(value => {
        if (value !== 'true') setShowOnboarding(true)
      })
      .catch(error => {
        console.error('[App] Falha ao carregar onboarding:', error)
      })
  }, [])

  useEffect(() => {
    if (!currentSong || !window.flowAPI || isLoadingRef.current) return
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current)

    saveTimerRef.current = setTimeout(async () => {
      setSaving(true)
      const metadataJson = buildSongMetadata(currentSong, { bpm })
      await window.flowAPI.invoke('lyric:update', currentSong.id, { content: editor?.getHTML() ?? textToHtml(lyrics), title, metadataJson })
      setCurrentSong(prev => prev ? { ...prev, title, metadataJson } : prev)
      setSaving(false)
    }, 1500)

    return () => {
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current)
    }
  }, [lyrics, title, bpm])

  async function handleSave() {
    if (!currentSong || !window.flowAPI) return
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current)
    setSaving(true)
    const metadataJson = buildSongMetadata(currentSong, { bpm })
    await window.flowAPI.invoke('lyric:update', currentSong.id, { content: editor?.getHTML() ?? textToHtml(lyrics), title, metadataJson })
    setCurrentSong(prev => prev ? { ...prev, title, metadataJson } : prev)
    setSaving(false)
  }

  async function handleDelete() {
    if (!currentSong || !window.flowAPI) return
    await window.flowAPI.invoke('lyric:delete', currentSong.id)
    const remaining = songs.filter(song => song.id !== currentSong.id)
    setSongs(remaining)

    if (remaining.length > 0) {
      loadSong(remaining[0])
    } else {
      setCurrentSong(null)
      setTitle('')
      setLyrics('')
      editor?.commands.clearContent()
    }
  }

  async function loadProject(project: Project) {
    setCurrentProject(project)
    const songList = (await window.flowAPI.invoke('lyric:list', project.id)) as Song[]
    setSongs(songList)

    if (songList.length > 0) {
      loadSong(songList[0])
    } else {
      setCurrentSong(null)
      setTitle('')
      setLyrics('')
      editor?.commands.clearContent(false)
    }
  }

  function loadSong(song: Song) {
    isLoadingRef.current = true
    setCurrentSong(song)
    setActiveBarIndex(0)
    setTitle(song.title ?? '')
    setBpm(parseSongMetadata(song).bpm ?? 90)

    const content = song.content ?? ''
    setLyrics(storedContentToPlainText(content))
    if (editor) {
      editor.commands.setContent(storedContentToEditorHtml(content), false)
      setSegments(extractTimelineSegments(editor))
    } else {
      pendingContentRef.current = content
    }

    setTimeout(() => {
      isLoadingRef.current = false
    }, 100)
  }

  function insertDictionaryWord(word: string) {
    if (!editor) return
    replaceWordAtSelection(editor, word)
  }

  function insertSuggestedLine(line: string) {
    if (!editor) return
    const escaped = line
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')

    editor
      .chain()
      .focus('end')
      .insertContent(`<p>${escaped}</p>`)
      .run()
  }

  async function handleNewLyric() {
    if (!currentProject || !window.flowAPI) return
    const newSong = (await window.flowAPI.invoke('lyric:create', {
      projectId: currentProject.id,
      title: 'Nova Letra',
    })) as Song
    const metadataJson = JSON.stringify({ bpm: 90 })
    const songWithMetadata = { ...newSong, metadataJson }
    await window.flowAPI.invoke('lyric:update', newSong.id, { metadataJson })
    setBpm(90)
    setSongs(prev => [songWithMetadata, ...prev])
    setProjects(prev => prev.map(p =>
      p.id === currentProject.id
        ? { ...p, _count: { songs: (p._count?.songs ?? 0) + 1 } }
        : p
    ))
    loadSong(songWithMetadata)
  }

  async function handleNewProject() {
    if (!window.flowAPI) return
    const newProject = (await window.flowAPI.invoke('project:create', { title: 'Novo Projeto' })) as Project
    setProjects(prev => [{ ...newProject, _count: { songs: 0 } }, ...prev])
    await loadProject(newProject)
  }

  async function completeOnboarding() {
    setShowOnboarding(false)
    if (!window.flowAPI) return
    try {
      await window.flowAPI.invoke('settings:set', 'onboarding_completed', 'true')
    } catch (error) {
      console.error('[App] Falha ao salvar onboarding:', error)
    }
  }

  async function handleOnboardingCreateProject() {
    if (projects.length === 0) {
      await handleNewProject()
      return
    }

    if (currentProject) {
      await handleNewLyric()
    }
  }

  async function handleAttachAudio() {
    if (!currentSong || !window.flowAPI) return
    const result = await window.flowAPI.invoke('audio:select') as { canceled: boolean; path?: string; name?: string }
    if (result.canceled || !result.path || !result.name) return

    const metadataJson = buildSongMetadata(currentSong, {
      bpm,
      audio: { path: result.path, name: result.name },
    })
    await window.flowAPI.invoke('lyric:update', currentSong.id, { metadataJson })
    setCurrentSong(prev => prev ? { ...prev, metadataJson } : prev)
    setSongs(prev => prev.map(song => song.id === currentSong.id ? { ...song, metadataJson } : song))
  }

  async function handleRenameProject(id: string, title: string) {
    if (!window.flowAPI) return
    await window.flowAPI.invoke('project:update', id, { title })
    setProjects(prev => prev.map(p => p.id === id ? { ...p, title } : p))
    if (currentProject?.id === id) setCurrentProject(prev => prev ? { ...prev, title } : prev)
  }

  async function handleDeleteProject(id: string) {
    if (!window.flowAPI) return
    const remaining = projects.filter(p => p.id !== id)
    await window.flowAPI.invoke('project:delete', id)
    setProjects(remaining)
    if (currentProject?.id === id) {
      if (remaining.length > 0) {
        await loadProject(remaining[0])
      } else {
        setCurrentProject(null)
        setSongs([])
        setCurrentSong(null)
        setTitle('')
        setLyrics('')
        editor?.commands.clearContent()
      }
    }
  }

  return (
    <div className="flex h-screen bg-[#050507] text-gray-200 font-sans overflow-hidden">
      <Sidebar
        projects={projects}
        songs={songs}
        currentProject={currentProject}
        currentSong={currentSong}
        onNewLyric={handleNewLyric}
        onSelectSong={loadSong}
        onSelectProject={loadProject}
        onNewProject={handleNewProject}
        onRenameProject={handleRenameProject}
        onDeleteProject={handleDeleteProject}
        audioName={parseSongMetadata(currentSong).audio?.name ?? null}
        audioPath={parseSongMetadata(currentSong).audio?.path ?? null}
        onAttachAudio={handleAttachAudio}
      />

      <div className="flex-1 min-w-0 flex flex-col relative bg-[#09090d]">
        <EditorTopBar
          title={title}
          saving={saving}
          hasCurrentSong={Boolean(currentSong)}
          editor={editor}
          onTitleChange={setTitle}
          onSave={handleSave}
          onDelete={handleDelete}
        />
        <LyricsEditor
          editor={editor}
          lyrics={lyrics}
          scopedLines={scopedLines}
          activeBlockStart={activeBlockStart}
        />
        <RhythmicScorePanel
          lines={scopedLines}
          bpm={bpm}
          startBarIndex={activeBlockStart}
          activeBarIndex={safeActiveBarIndex}
          playing={metronomePlaying}
        />
        <EditorStatusBar lyrics={lyrics} lineCount={lines.length} saving={saving} segments={segments} />
      </div>

      <RightPanel
        activeTab={activeTab}
        selectedWord={selectedWord}
        lines={scopedLines}
        activeBlockStart={activeBlockStart}
        activeBarIndex={safeActiveBarIndex}
        dictResult={dictResult}
        dictLoading={dictLoading}
        onTabChange={setActiveTab}
        onInsertWord={insertDictionaryWord}
        onInsertLine={insertSuggestedLine}
      />

      {showOnboarding && (
        <OnboardingOverlay
          hasProjects={projects.length > 0}
          hasCurrentProject={Boolean(currentProject)}
          onComplete={completeOnboarding}
          onSkip={completeOnboarding}
          onCreateFirstProject={handleOnboardingCreateProject}
          onFocusToolTab={setActiveTab}
        />
      )}
    </div>
  )
}
