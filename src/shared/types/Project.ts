// src/shared/types/Project.ts
export interface Project {
  id: string
  title: string
  bpm?: number | null
  vibe?: string | null
  createdAt: Date
  updatedAt: Date
  tags?: ProjectTag[]
  _count?: { songs: number }
}

export interface ProjectTag {
  id: string
  projectId: string
  tag: string
}

export type ProjectCreateInput = Pick<Project, 'title'> & Partial<Pick<Project, 'bpm' | 'vibe'>>
export type ProjectUpdateInput = Partial<Pick<Project, 'title' | 'bpm' | 'vibe'>>
