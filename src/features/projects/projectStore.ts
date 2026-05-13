// src/features/projects/projectStore.ts
import { create } from 'zustand'
import { Project } from '../../shared/types/Project'
import { Song } from '../../shared/types/Song'

interface ProjectState {
  projects: Project[]
  currentProject: Project | null
  songs: Song[]
  isLoading: boolean
  searchQuery: string
  vibeFilter: string | null

  setProjects: (projects: Project[]) => void
  setCurrentProject: (p: Project | null) => void
  setSongs: (songs: Song[]) => void
  setIsLoading: (v: boolean) => void
  setSearchQuery: (q: string) => void
  setVibeFilter: (v: string | null) => void
  addProject: (p: Project) => void
  removeProject: (id: string) => void
  updateProject: (p: Project) => void
}

export const useProjectStore = create<ProjectState>((set) => ({
  projects: [],
  currentProject: null,
  songs: [],
  isLoading: false,
  searchQuery: '',
  vibeFilter: null,

  setProjects: (projects) => set({ projects }),
  setCurrentProject: (currentProject) => set({ currentProject }),
  setSongs: (songs) => set({ songs }),
  setIsLoading: (isLoading) => set({ isLoading }),
  setSearchQuery: (searchQuery) => set({ searchQuery }),
  setVibeFilter: (vibeFilter) => set({ vibeFilter }),
  addProject: (p) => set((s) => ({ projects: [p, ...s.projects] })),
  removeProject: (id) => set((s) => ({ projects: s.projects.filter(p => p.id !== id) })),
  updateProject: (updated) => set((s) => ({
    projects: s.projects.map(p => p.id === updated.id ? updated : p)
  }))
}))
