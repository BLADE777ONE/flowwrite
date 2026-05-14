import { ipcMain } from 'electron'
import { analisarMétricaFlow } from '../services/aiFlowAnalysis'

export function registerAIHandlers() {
  ipcMain.handle('ai:analyzeFlow', async (_, payload: { letraUsuario: string; bpmAtual: number }) => {
    return analisarMétricaFlow(payload?.letraUsuario ?? '', payload?.bpmAtual ?? 120)
  })
}
