import { dialog, ipcMain, protocol } from 'electron'
import { createReadStream, existsSync, statSync } from 'fs'
import http from 'http'
import path from 'path'
import { Readable } from 'stream'

const AUDIO_SCHEME = 'obloco-audio'
const AUDIO_SERVER_PORT = 5057
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
  return `http://127.0.0.1:${AUDIO_SERVER_PORT}/audio?path=${encodeURIComponent(filePath)}`
}

function buildAudioResponseHeaders(extension: string, fileSize: number, range?: string | null) {
  const mimeType = AUDIO_MIME[extension] ?? 'application/octet-stream'
  const baseHeaders: Record<string, string> = {
    'Accept-Ranges': 'bytes',
    'Content-Type': mimeType,
    'Content-Length': String(fileSize),
  }

  if (!range) {
    return {
      status: 200,
      headers: baseHeaders,
      start: 0,
      end: fileSize - 1,
    }
  }

  const match = /^bytes=(\d*)-(\d*)$/.exec(range)
  const requestedStart = match?.[1] ? Number(match[1]) : 0
  const requestedEnd = match?.[2] ? Number(match[2]) : fileSize - 1
  const start = Math.max(0, Math.min(requestedStart, fileSize - 1))
  const end = Math.max(start, Math.min(requestedEnd, fileSize - 1))
  const chunkSize = end - start + 1

  return {
    status: 206,
    headers: {
      ...baseHeaders,
      'Content-Length': String(chunkSize),
      'Content-Range': `bytes ${start}-${end}/${fileSize}`,
    },
    start,
    end,
  }
}

function validateAudioPath(filePath: string | null): { ok: true; filePath: string; extension: string; fileSize: number } | { ok: false; status: number; message: string } {
  if (!filePath) return { ok: false, status: 400, message: 'Missing audio path' }

  const extension = path.extname(filePath).toLowerCase()
  if (!AUDIO_EXTENSIONS.has(extension)) {
    return { ok: false, status: 415, message: 'Unsupported audio type' }
  }

  if (!existsSync(filePath)) {
    return { ok: false, status: 404, message: 'Audio file not found' }
  }

  return { ok: true, filePath, extension, fileSize: statSync(filePath).size }
}

let audioServer: http.Server | null = null

export function startAudioServer() {
  if (audioServer) return

  audioServer = http.createServer((req, res) => {
    try {
      const requestUrl = new URL(req.url ?? '/', `http://127.0.0.1:${AUDIO_SERVER_PORT}`)
      if (requestUrl.pathname !== '/audio') {
        res.writeHead(404)
        res.end('Not found')
        return
      }

      const validation = validateAudioPath(requestUrl.searchParams.get('path'))
      if (!validation.ok) {
        res.writeHead(validation.status)
        res.end(validation.message)
        return
      }

      const response = buildAudioResponseHeaders(validation.extension, validation.fileSize, req.headers.range)
      res.writeHead(response.status, response.headers)
      createReadStream(validation.filePath, { start: response.start, end: response.end }).pipe(res)
    } catch (error) {
      console.error('[Audio] Erro ao servir beat:', error)
      res.writeHead(500)
      res.end('Audio server error')
    }
  })

  audioServer.listen(AUDIO_SERVER_PORT, '127.0.0.1', () => {
    console.log(`[Audio] Servidor de beat ativo em http://127.0.0.1:${AUDIO_SERVER_PORT}`)
  })

  audioServer.on('error', (error) => {
    console.error('[Audio] Falha no servidor de beat:', error)
  })
}

export function stopAudioServer() {
  audioServer?.close()
  audioServer = null
}

export function registerAudioProtocol() {
  protocol.handle(AUDIO_SCHEME, async (request) => {
    const url = new URL(request.url)
    const validation = validateAudioPath(url.searchParams.get('path'))
    if (!validation.ok) return new Response(validation.message, { status: validation.status })

    const range = request.headers.get('range')
    const response = buildAudioResponseHeaders(validation.extension, validation.fileSize, range)

    return new Response(Readable.toWeb(createReadStream(validation.filePath, { start: response.start, end: response.end })) as ReadableStream, {
      status: response.status,
      headers: response.headers,
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
