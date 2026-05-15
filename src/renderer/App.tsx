import { useEffect, useRef, useState } from 'react'
import { getDictionaryData, type DictionaryResult } from '../features/dictionary/DictionaryService'
import { useEditorStore } from '../features/editor/editorStore'
import { useProjectStore } from '../features/projects/projectStore'
import { CoreEditor } from '../features/editor/components/CoreEditor'
import { ProjectSidebar } from '../features/projects/components/ProjectSidebar'
import { RightPanel } from './components/RightPanel'
import type { ActiveToolTab } from './types'
import type { Project } from '../shared/types/Project'
import type { Song } from '../shared/types/Song'

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
  const { setProjects, setSongs, setCurrentProject } = useProjectStore()
  const {
    selectedWord, selectedWordRaw, scopedLines, activeBarIndex, activeBlockStart,
    insertWordFn, insertLineFn, setCurrentSong,
  } = useEditorStore()

  const [activeTab, setActiveTab] = useState<ActiveToolTab>('rhymes')
  const [dictResult, setDictResult] = useState<DictionaryResult | null>(null)
  const [dictLoading, setDictLoading] = useState(false)
  const dictTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Auto-load first project and first song on startup
  useEffect(() => {
    if (!window.flowAPI) return
    window.flowAPI.invoke('project:list').then(async (data) => {
      const list = data as Project[]
      setProjects(list)
      if (list.length === 0) return
      const first = list[0]
      setCurrentProject(first)
      const songs = (await window.flowAPI.invoke('lyric:list', first.id)) as Song[]
      setSongs(songs)
      if (songs.length === 0) return
      const full = (await window.flowAPI.invoke('lyric:get', songs[0].id)) as Song
      setCurrentSong(full)
    }).catch(console.error)
  }, [])

  // Dictionary fetch when selected word or tab changes
  useEffect(() => {
    if (activeTab !== 'dictionary') return
    if (!selectedWord) { setDictResult(null); setDictLoading(false); return }

    setDictResult(null)
    setDictLoading(true)
    if (dictTimerRef.current) clearTimeout(dictTimerRef.current)

    dictTimerRef.current = setTimeout(async () => {
      try {
        const result = await getDictionaryData(selectedWordRaw || selectedWord)
        setDictResult(result)
      } catch {
        setDictResult({ girias: [], sinonimos: [], relacionados: [], antonimos: [], themes: [] })
      } finally {
        setDictLoading(false)
      }
    }, 700)

    return () => { if (dictTimerRef.current) clearTimeout(dictTimerRef.current) }
  }, [selectedWord, activeTab])

  return (
    <div className="flex h-screen text-gray-200 font-sans overflow-hidden" style={{ background: '#050507' }}>
      <ProjectSidebar />

      <div className="flex-1 min-w-0 flex flex-col relative overflow-hidden" style={{ background: '#09090d' }}>
        <CoreEditor />
      </div>

      <RightPanel
        activeTab={activeTab}
        selectedWord={selectedWord}
        lines={scopedLines}
        activeBlockStart={activeBlockStart}
        activeBarIndex={activeBarIndex}
        dictResult={dictResult}
        dictLoading={dictLoading}
        onTabChange={setActiveTab}
        onInsertWord={(word) => insertWordFn?.(word)}
        onInsertLine={(line) => insertLineFn?.(line)}
      />
    </div>
  )
}
