export interface Project {
  id: string
  title: string
  _count?: { songs: number }
}

export interface Song {
  id: string
  title: string
  content: string
  projectId: string
  updatedAt: string
}

export type ActiveToolTab = 'rhymes' | 'metrics' | 'dictionary' | 'assistant'

export interface TimelineSegment {
  type: string
  label: string
  color: string
  lines: number
}
