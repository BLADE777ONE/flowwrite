import { dialog, ipcMain } from 'electron'
import path from 'path'

export function registerAudioHandlers() {
  ipcMain.handle('audio:select', async () => {
    const result = await dialog.showOpenDialog({
      title: 'Selecionar beat de referencia',
      properties: ['openFile'],
      filters: [
        { name: 'Audio', extensions: ['mp3', 'wav', 'ogg', 'm4a', 'flac', 'aac'] },
      ],
    })

    if (result.canceled || result.filePaths.length === 0) {
      return { canceled: true }
    }

    const filePath = result.filePaths[0]
    return {
      canceled: false,
      path: filePath,
      name: path.basename(filePath),
    }
  })
}
