// src/main/index.ts
// Electron Main Process — OBloco

import { app, BrowserWindow, ipcMain, shell } from 'electron'
import path from 'path'
import { spawn, ChildProcess } from 'child_process'
import http from 'http'
import { getDB, disconnectDB } from '../database/db'
import { registerProjectHandlers } from './ipc/projectHandlers'
import { registerLyricHandlers } from './ipc/lyricHandlers'
import { registerAnalysisHandlers } from './ipc/analysisHandlers'
import { registerExportHandlers } from './ipc/exportHandlers'
import { registerSettingsHandlers } from './ipc/settingsHandlers'
import { registerPythonHandlers } from './ipc/pythonHandlers'
import { registerUserWordHandlers } from './ipc/userWordHandlers'
import { registerAIHandlers } from './ipc/aiHandlers'

const isDev = process.env.NODE_ENV === 'development'

let mainWindow: BrowserWindow | null = null
let pythonProcess: ChildProcess | null = null

const PYTHON_PORT = 5001

// ─── Servidor Python ─────────────────────────────────────────────────────────

function findPythonExecutable(): string {
  // No Windows, tentar 'python' primeiro, depois 'python3'
  return process.platform === 'win32' ? 'python' : 'python3'
}

function startPythonServer(): void {
  const pythonExe    = findPythonExecutable()
  const scriptPath   = isDev
    ? path.join(__dirname, '../../src/python/server.py')
    : path.join(process.resourcesPath, 'python', 'server.py')

  console.log(`[Python] Iniciando servidor: ${pythonExe} ${scriptPath} ${PYTHON_PORT}`)

  try {
    pythonProcess = spawn(pythonExe, [scriptPath, String(PYTHON_PORT)], {
      stdio: ['ignore', 'pipe', 'pipe'],
    })

    pythonProcess.stdout?.on('data', (data: Buffer) => {
      console.log(`[Python] ${data.toString().trim()}`)
    })

    pythonProcess.stderr?.on('data', (data: Buffer) => {
      const msg = data.toString().trim()
      if (msg) console.warn(`[Python WARN] ${msg}`)
    })

    pythonProcess.on('error', (err) => {
      console.error('[Python] Falha ao iniciar processo:', err.message)
      pythonProcess = null
    })

    pythonProcess.on('exit', (code) => {
      if (code !== 0 && code !== null) {
        console.warn(`[Python] Processo encerrou com código ${code}`)
      }
      pythonProcess = null
    })
  } catch (err) {
    console.error('[Python] Erro ao spawnar processo:', err)
  }
}

async function waitForPythonServer(maxAttempts = 20, intervalMs = 500): Promise<boolean> {
  for (let i = 0; i < maxAttempts; i++) {
    try {
      const ok = await checkPythonHealth()
      if (ok) {
        console.log(`[Python] Servidor pronto na tentativa ${i + 1}`)
        return true
      }
    } catch {
      // ainda não pronto
    }
    await new Promise(resolve => setTimeout(resolve, intervalMs))
  }
  console.warn('[Python] Servidor não respondeu após tentativas máximas')
  return false
}

function checkPythonHealth(): Promise<boolean> {
  return new Promise((resolve, reject) => {
    const req = http.get(`http://127.0.0.1:${PYTHON_PORT}/health`, (res) => {
      resolve(res.statusCode === 200)
    })
    req.on('error', reject)
    req.setTimeout(1000, () => { req.destroy(); reject(new Error('timeout')) })
  })
}

function stopPythonServer(): void {
  if (pythonProcess) {
    console.log('[Python] Encerrando servidor...')
    pythonProcess.kill()
    pythonProcess = null
  }
}

// ─── Janela principal ─────────────────────────────────────────────────────────

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1440,
    height: 900,
    minWidth: 1100,
    minHeight: 700,
    backgroundColor: '#07070f',
    title: 'OBloco',
    titleBarStyle: 'hidden',
    titleBarOverlay: {
      color: '#0d0d1a',
      symbolColor: '#9898c0',
      height: 30
    },
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false,
      webSecurity: true,
      allowRunningInsecureContent: false,
      preload: path.join(__dirname, '../preload/preload.js'),
    }
  })

  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url)
    return { action: 'deny' }
  })

  if (isDev) {
    mainWindow.loadURL('http://localhost:5173')
    mainWindow.webContents.openDevTools({ mode: 'detach' })
  } else {
    mainWindow.loadFile(path.join(__dirname, '../../dist/index.html'))
  }

  mainWindow.on('closed', () => { mainWindow = null })
}

// ─── App lifecycle ────────────────────────────────────────────────────────────

app.whenReady().then(async () => {
  // Banco de dados
  const db = getDB()
  await db.$connect()

  // Iniciar servidor Python (não bloquear a UI)
  startPythonServer()
  waitForPythonServer().then(ok => {
    if (ok) {
      console.log('[Python] Integração ativa — análise fonética PT-BR disponível')
      // Notificar renderer que o Python está pronto
      mainWindow?.webContents.send('python:ready')
    } else {
      console.warn('[Python] Análise em modo JS (fallback)')
    }
  })

  // Handlers IPC
  registerProjectHandlers(db)
  registerLyricHandlers(db)
  registerAnalysisHandlers(db)
  registerExportHandlers(db)
  registerSettingsHandlers(db)
  registerUserWordHandlers(db)
  registerPythonHandlers(PYTHON_PORT)
  registerAIHandlers()

  createWindow()

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

app.on('window-all-closed', async () => {
  stopPythonServer()
  await disconnectDB()
  if (process.platform !== 'darwin') app.quit()
})

// Bloquear DevTools em produção
app.on('web-contents-created', (_, contents) => {
  if (!isDev) {
    contents.on('before-input-event', (event, input) => {
      if (input.key === 'F12' || (input.control && input.shift && input.key === 'I')) {
        event.preventDefault()
      }
    })
  }
})
