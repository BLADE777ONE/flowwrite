import { ipcMain } from 'electron'
import { analyzeFlowCompat, runLyricAssistant } from '../../features/ai/lyricAssistant'
import type { LyricAssistantRequest } from '../../features/ai/types'

export function registerAIHandlers() {
  ipcMain.handle('ai:analyzeFlow', async (_, payload: { letraUsuario: string; bpmAtual: number }) => {
    return analyzeFlowCompat(payload?.letraUsuario ?? '', payload?.bpmAtual ?? 120)
  })

  ipcMain.handle('ai:suggest', async (_, payload: LyricAssistantRequest) => {
    return runLyricAssistant({
      action: payload?.action ?? 'analyze_flow',
      text: payload?.text ?? '',
      bpm: payload?.bpm ?? 120,
      selectedWord: payload?.selectedWord,
      activeLine: payload?.activeLine,
      activeLineIndex: payload?.activeLineIndex,
    })
  })
}
