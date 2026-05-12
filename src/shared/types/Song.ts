// src/shared/types/Song.ts
export interface Song {
  id: string
  projectId: string
  title: string
  content: string
  metadataJson?: string | null
  createdAt: Date
  updatedAt: Date
  sections?: Section[]
}

export interface SongVersion {
  id: string
  songId: string
  content: string
  versionName: string
  createdAt: Date
}

// src/shared/types/Section.ts
export type SectionType = 'intro' | 'verse' | 'chorus' | 'bridge' | 'outro' | 'freestyle' | 'custom'

export interface Section {
  id: string
  songId: string
  type: SectionType
  order: number
  content: string
  startBar?: number | null
  endBar?: number | null
  label?: string | null
  createdAt: Date
  updatedAt: Date
}
