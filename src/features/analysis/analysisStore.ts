// src/features/analysis/analysisStore.ts
import { create } from 'zustand'
import { RhymeAnalysis } from '../../shared/types/Rhyme'
import { MetricsAnalysis, ArtistDNA, QualityAnalysis, ClicheAnalysis, InsightResult } from '../../shared/types/Metrics'

type AnalysisTab = 'rhyme' | 'metrics' | 'bpm' | 'insights' | 'cliches' | 'dna' | 'quality'

export interface PythonStressWord {
  word: string
  stress: 'strong' | 'medium' | 'weak'
  position: number
}

export interface PythonLine {
  text: string
  syllables: number
  stressWords: PythonStressWord[]
  breathPoints: number[]
  isTooLong: boolean
  isTooShort: boolean
}

export interface PythonRhymeChain {
  words: string[]
  lines: number[]
  color: string
  score: number
}

export interface PythonAnalysis {
  syllables: {
    lines: PythonLine[]
    average: number
    regularity: number
    totalLines: number
    flowSpeed: string
    warnings: string[]
    has_pyphen: boolean
  }
  rhymes: {
    scheme: string[]
    chains: PythonRhymeChain[]
    rhymeDensity: number
    internalRhymes: unknown[]
    suggestions: unknown[]
  }
}

interface AnalysisState {
  activeTab: AnalysisTab
  isAnalyzing: boolean
  analysisProgress: number
  rhymeAnalysis: RhymeAnalysis | null
  metricsAnalysis: MetricsAnalysis | null
  clicheAnalysis: ClicheAnalysis | null
  qualityAnalysis: QualityAnalysis | null
  insights: InsightResult | null
  artistDNA: ArtistDNA | null
  lastAnalyzedText: string
  pythonAnalysis: PythonAnalysis | null
  pythonAvailable: boolean

  setActiveTab: (tab: AnalysisTab) => void
  setIsAnalyzing: (v: boolean) => void
  setAnalysisProgress: (n: number) => void
  setResults: (data: {
    rhyme?: RhymeAnalysis
    metrics?: MetricsAnalysis
    cliche?: ClicheAnalysis
    quality?: QualityAnalysis
    insights?: InsightResult
  }) => void
  setArtistDNA: (dna: ArtistDNA | null) => void
  setLastAnalyzedText: (t: string) => void
  setPythonAnalysis: (data: PythonAnalysis | null) => void
  setPythonAvailable: (v: boolean) => void
}

export const useAnalysisStore = create<AnalysisState>((set) => ({
  activeTab: 'rhyme',
  isAnalyzing: false,
  analysisProgress: 0,
  rhymeAnalysis: null,
  metricsAnalysis: null,
  clicheAnalysis: null,
  qualityAnalysis: null,
  insights: null,
  artistDNA: null,
  lastAnalyzedText: '',
  pythonAnalysis: null,
  pythonAvailable: false,

  setActiveTab: (activeTab) => set({ activeTab }),
  setIsAnalyzing: (isAnalyzing) => set({ isAnalyzing }),
  setAnalysisProgress: (analysisProgress) => set({ analysisProgress }),

  setResults: (data) => set({
    ...(data.rhyme    !== undefined && { rhymeAnalysis:   data.rhyme }),
    ...(data.metrics  !== undefined && { metricsAnalysis: data.metrics }),
    ...(data.cliche   !== undefined && { clicheAnalysis:  data.cliche }),
    ...(data.quality  !== undefined && { qualityAnalysis: data.quality }),
    ...(data.insights !== undefined && { insights:        data.insights }),
    isAnalyzing: false
  }),

  setArtistDNA: (artistDNA) => set({ artistDNA }),
  setLastAnalyzedText: (lastAnalyzedText) => set({ lastAnalyzedText }),
  setPythonAnalysis: (pythonAnalysis) => set({ pythonAnalysis }),
  setPythonAvailable: (pythonAvailable) => set({ pythonAvailable }),
}))
