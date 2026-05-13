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
  autosaveCount: number          // conta autosaves para disparar DNA update
  rightPanelCollapsed: boolean

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
  incrementAutosaveCount: () => void
  toggleRightPanel: () => void
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
  autosaveCount: 0,
  rightPanelCollapsed: false,

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
  incrementAutosaveCount: () => set(s => ({ autosaveCount: s.autosaveCount + 1 })),
  toggleRightPanel: () => set(s => ({ rightPanelCollapsed: !s.rightPanelCollapsed })),
}))
