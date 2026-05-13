import { useEffect, useRef, useState } from 'react'
import { useEditor } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import Placeholder from '@tiptap/extension-placeholder'
import { RhymeHighlightExtension } from '../features/editor/RhymeHighlightExtension'
import { SectionNode } from '../features/editor/extensions/SectionNode'
import { getDictionaryData, type DictionaryResult } from '../features/dictionary/DictionaryService'
import { Sidebar } from './components/Sidebar'
import { EditorTopBar } from './components/EditorTopBar'
import { LyricsEditor } from './components/LyricsEditor'
import { EditorStatusBar } from './components/EditorStatusBar'
import { RightPanel } from './components/RightPanel'
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

  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const isLoadingRef = useRef(false)
  const pendingContentRef = useRef<string | null>(null)
  const rawWordRef = useRef('')
  const dictTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const editor = useEditor({
    extensions: [
      StarterKit,
      SectionNode,
      Placeholder.configure({ placeholder: 'Comece a escrever suas barras...' }),
      RhymeHighlightExtension,
    ],
    content: '',
    onUpdate: ({ editor }) => {
      if (isLoadingRef.current) return
      setLyrics(editor.getText({ blockSeparator: '\n' }))
      setSegments(extractTimelineSegments(editor))
    },
    onSelectionUpdate: ({ editor }) => {
      const { raw, normalized } = extractWordFromSelection(editor)
      console.log('[App] Palavra extraída:', raw, '| normalizada:', normalized)
      rawWordRef.current = raw.toLowerCase()
      setSelectedWord(normalized)
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
        setDictResult({ girias: [], sinonimos: [], relacionados: [], antonimos: [] })
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
    if (!currentSong || !window.flowAPI || isLoadingRef.current) return
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current)

    saveTimerRef.current = setTimeout(async () => {
      setSaving(true)
      await window.flowAPI.invoke('lyric:update', currentSong.id, { content: editor?.getHTML() ?? textToHtml(lyrics), title })
      setSaving(false)
    }, 1500)

    return () => {
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current)
    }
  }, [lyrics, title])

  async function handleSave() {
    if (!currentSong || !window.flowAPI) return
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current)
    setSaving(true)
    await window.flowAPI.invoke('lyric:update', currentSong.id, { content: editor?.getHTML() ?? textToHtml(lyrics), title })
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
    setTitle(song.title ?? '')

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
    if (!window.flowAPI) return

    let project = currentProject
    if (!project) {
      project = (await window.flowAPI.invoke('project:create', { title: 'Meu Projeto' })) as Project
      setProjects(prev => [project!, ...prev])
      setCurrentProject(project)
    }

    const newSong = (await window.flowAPI.invoke('lyric:create', {
      projectId: project.id,
      title: 'Nova Letra',
    })) as Song

    setSongs(prev => [newSong, ...prev])
    loadSong(newSong)
  }

  return (
    <div className="flex h-screen bg-[#050507] text-gray-200 font-sans overflow-hidden">
      <Sidebar
        songs={songs}
        currentProject={currentProject}
        currentSong={currentSong}
        onNewLyric={handleNewLyric}
        onSelectSong={loadSong}
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
        <LyricsEditor editor={editor} lyrics={lyrics} />
        <EditorStatusBar lyrics={lyrics} lineCount={lines.length} saving={saving} segments={segments} />
      </div>

      <RightPanel
        activeTab={activeTab}
        selectedWord={selectedWord}
        lines={lines}
        dictResult={dictResult}
        dictLoading={dictLoading}
        onTabChange={setActiveTab}
        onInsertWord={insertDictionaryWord}
        onInsertLine={insertSuggestedLine}
      />
    </div>
  )
}
