import { dialog, ipcMain, protocol } from 'electron'
import { createReadStream, existsSync, statSync } from 'fs'
import path from 'path'
import { Readable } from 'stream'

const AUDIO_SCHEME = 'obloco-audio'
const AUDIO_EXTENSIONS = new Set(['.mp3', '.wav', '.ogg', '.m4a', '.flac', '.aac'])
const AUDIO_MIME: Record<string, string> = {
  '.mp3': 'audio/mpeg',
  '.wav': 'audio/wav',
  '.ogg': 'audio/ogg',
  '.m4a': 'audio/mp4',
  '.flac': 'audio/flac',
  '.aac': 'audio/aac',
}

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

    if (!existsSync(filePath)) {
      return new Response('Audio file not found', { status: 404 })
    }

    const fileSize = statSync(filePath).size
    const range = request.headers.get('range')
    const mimeType = AUDIO_MIME[extension] ?? 'application/octet-stream'

    if (range) {
      const match = /^bytes=(\d*)-(\d*)$/.exec(range)
      const requestedStart = match?.[1] ? Number(match[1]) : 0
      const requestedEnd = match?.[2] ? Number(match[2]) : fileSize - 1
      const start = Math.max(0, Math.min(requestedStart, fileSize - 1))
      const end = Math.max(start, Math.min(requestedEnd, fileSize - 1))
      const chunkSize = end - start + 1

      return new Response(Readable.toWeb(createReadStream(filePath, { start, end })) as ReadableStream, {
        status: 206,
        headers: {
          'Accept-Ranges': 'bytes',
          'Content-Type': mimeType,
          'Content-Length': String(chunkSize),
          'Content-Range': `bytes ${start}-${end}/${fileSize}`,
        },
      })
    }

    return new Response(Readable.toWeb(createReadStream(filePath)) as ReadableStream, {
      status: 200,
      headers: {
        'Accept-Ranges': 'bytes',
        'Content-Type': mimeType,
        'Content-Length': String(fileSize),
      },
    })
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
