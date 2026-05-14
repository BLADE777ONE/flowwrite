import { dialog, ipcMain, net, protocol } from 'electron'
import path from 'path'
import { pathToFileURL } from 'url'

const AUDIO_SCHEME = 'obloco-audio'
const AUDIO_EXTENSIONS = new Set(['.mp3', '.wav', '.ogg', '.m4a', '.flac', '.aac'])

export function registerAudioProtocolPrivileges() {
  protocol.registerSchemesAsPrivileged([
    {
      scheme: AUDIO_SCHEME,
      privileges: {
        standard: true,
        secure: true,
        stream: true,
        supportFetchAPI: true,
        corsEnabled: true,
      },
    },
  ])
}

export function buildAudioUrl(filePath: string): string {
  return `${AUDIO_SCHEME}://beat/play?path=${encodeURIComponent(filePath)}`
}

export function registerAudioProtocol() {
  protocol.handle(AUDIO_SCHEME, async (request) => {
    const url = new URL(request.url)
    const filePath = url.searchParams.get('path')

    if (!filePath) {
      return new Response('Missing audio path', { status: 400 })
    }

    const extension = path.extname(filePath).toLowerCase()
    if (!AUDIO_EXTENSIONS.has(extension)) {
      return new Response('Unsupported audio type', { status: 415 })
    }

    return net.fetch(pathToFileURL(filePath).toString())
  })
}

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
      url: buildAudioUrl(filePath),
    }
  })
}
