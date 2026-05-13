// src/main/ipc/pythonHandlers.ts
// Proxy IPC → servidor Python Flask

import { ipcMain } from 'electron'
import http from 'http'

function callPython(port: number, endpoint: string, body: object): Promise<unknown> {
  return new Promise((resolve, reject) => {
    const payload = JSON.stringify(body)

    const req = http.request(
      {
        hostname: '127.0.0.1',
        port,
        path: endpoint,
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Content-Length': Buffer.byteLength(payload),
        },
      },
      (res) => {
        let data = ''
        res.on('data', chunk => { data += chunk })
        res.on('end', () => {
          try {
            resolve(JSON.parse(data))
          } catch {
            reject(new Error(`JSON inválido do Python: ${data.slice(0, 100)}`))
          }
        })
      }
    )

    req.on('error', reject)
    req.setTimeout(8000, () => { req.destroy(); reject(new Error('timeout Python')) })
    req.write(payload)
    req.end()
  })
}

function getPython(port: number, endpoint: string): Promise<unknown> {
  return new Promise((resolve, reject) => {
    const req = http.get(`http://127.0.0.1:${port}${endpoint}`, (res) => {
      let data = ''
      res.on('data', chunk => { data += chunk })
      res.on('end', () => {
        try { resolve(JSON.parse(data)) }
        catch { reject(new Error('JSON inválido')) }
      })
    })
    req.on('error', reject)
    req.setTimeout(3000, () => { req.destroy(); reject(new Error('timeout')) })
  })
}

export function registerPythonHandlers(port: number) {

  // Health check — verifica se Python está rodando
  ipcMain.handle('python:health', async () => {
    try {
      const result = await getPython(port, '/health')
      return result
    } catch {
      return { ok: false }
    }
  })

  // Análise completa (sílabas + rimas + stress)
  ipcMain.handle('python:analyze', async (_, text: string, bpm: number) => {
    return callPython(port, '/analyze', { text, bpm })
  })

  // Só sílabas
  ipcMain.handle('python:syllables', async (_, text: string) => {
    return callPython(port, '/syllables', { text })
  })

  // Só rimas
  ipcMain.handle('python:rhymes', async (_, text: string) => {
    return callPython(port, '/rhymes', { text })
  })

  // Score entre duas palavras
  ipcMain.handle('python:rhymeScore', async (_, word_a: string, word_b: string) => {
    return callPython(port, '/rhyme-score', { word_a, word_b })
  })
}
