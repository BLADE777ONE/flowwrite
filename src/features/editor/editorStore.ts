// src/features/editor/editorStore.ts
import { create } from 'zustand'
import { Song, Section, SectionType } from '../../shared/types/Song'

interface EditorState {
  currentSong: Song | null
  sections: Section[]
  isDirty: boolean
  isSaving: boolean
  lastSavedAt: Date | null
  content: string

  // Estágio 2: Ghost Notes + BPM + Versão
  ghostNotesEnabled: boolean
  rhymeHighlightsEnabled: boolean
  showVersionHistory: boolean
  bpm: number
  metronomePlaying: boolean
  autosaveCount: number          // conta autosaves para disparar DNA update
  rightPanelCollapsed: boolean

  // Palavra selecionada e estado de exibição (para RightPanel)
  selectedWord: string
  selectedWordRaw: string
  scopedLines: string[]
  activeBarIndex: number
  activeBlockStart: number
  insertWordFn: ((word: string) => void) | null
  insertLineFn: ((line: string) => void) | null

  setCurrentSong: (song: Song | null) => void
  updateContent: (content: string) => void
  setSections: (sections: Section[]) => void
  addSection: (type: SectionType) => void
  setIsDirty: (v: boolean) => void
  setIsSaving: (v: boolean) => void
  setLastSavedAt: (d: Date) => void

  toggleGhostNotes: () => void
  toggleRhymeHighlights: () => void
  setShowVersionHistory: (v: boolean) => void
  setBpm: (bpm: number) => void
  setMetronomePlaying: (playing: boolean) => void
  toggleMetronomePlaying: () => void
  incrementAutosaveCount: () => void
  toggleRightPanel: () => void

  setSelectedWord: (word: string, raw: string) => void
  setEditorDisplayState: (lines: string[], barIdx: number) => void
  registerInsertCallbacks: (word: (w: string) => void, line: (l: string) => void) => void
}

export const useEditorStore = create<EditorState>((set, get) => ({
  currentSong: null,
  sections: [],
  isDirty: false,
  isSaving: false,
  lastSavedAt: null,
  content: '',
  ghostNotesEnabled: false,
  rhymeHighlightsEnabled: true,
  showVersionHistory: false,
  bpm: 90,
  metronomePlaying: false,
  autosaveCount: 0,
  rightPanelCollapsed: false,

  selectedWord: '',
  selectedWordRaw: '',
  scopedLines: [],
  activeBarIndex: 0,
  activeBlockStart: 0,
  insertWordFn: null,
  insertLineFn: null,

  setCurrentSong: (song) => set({
    currentSong: song,
    isDirty: false,
    content: song?.content || '',
    bpm: song?.metadataJson
      ? JSON.parse(song.metadataJson)?.bpm ?? 90
      : 90,
  }),

  updateContent: (content) => set({ content, isDirty: true }),

  setSections: (sections) => set({ sections }),

  addSection: (type) => {
    const { sections } = get()
    const newSection: Partial<Section> = {
      type,
      order: sections.length,
      content: '',
      label: type.charAt(0).toUpperCase() + type.slice(1)
    }
    set({ sections: [...sections, newSection as Section], isDirty: true })
  },

  setIsDirty:   (v) => set({ isDirty: v }),
  setIsSaving:  (v) => set({ isSaving: v }),
  setLastSavedAt: (d) => set({ lastSavedAt: d }),

  toggleGhostNotes:      () => set(s => ({ ghostNotesEnabled: !s.ghostNotesEnabled })),
  toggleRhymeHighlights: () => set(s => ({ rhymeHighlightsEnabled: !s.rhymeHighlightsEnabled })),
  setShowVersionHistory:  (v) => set({ showVersionHistory: v }),
  setBpm: (bpm) => set({ bpm }),
  setMetronomePlaying: (playing) => set({ metronomePlaying: playing }),
  toggleMetronomePlaying: () => set(s => ({ metronomePlaying: !s.metronomePlaying })),
  incrementAutosaveCount: () => set(s => ({ autosaveCount: s.autosaveCount + 1 })),
  toggleRightPanel: () => set(s => ({ rightPanelCollapsed: !s.rightPanelCollapsed })),

  setSelectedWord: (word, raw) => set({ selectedWord: word, selectedWordRaw: raw }),

  setEditorDisplayState: (lines, barIdx) => {
    const blockStart = Math.floor(barIdx / 4) * 4
    const scoped = lines.slice(blockStart, blockStart + 4)
    set({
      scopedLines: scoped.length > 0 ? scoped : lines.slice(0, 4),
      activeBarIndex: barIdx,
      activeBlockStart: blockStart,
    })
  },

  registerInsertCallbacks: (word, line) => set({ insertWordFn: word, insertLineFn: line }),
}))
