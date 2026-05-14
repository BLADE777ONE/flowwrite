// src/main/index.ts
// Electron Main Process — OBloco

import { app, BrowserWindow, shell } from 'electron'
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
import { registerAudioHandlers, registerAudioProtocol, registerAudioProtocolPrivileges } from './ipc/audioHandlers'

const isDev = process.env.NODE_ENV === 'development'

let mainWindow: BrowserWindow | null = null
let pythonProcess: ChildProcess | null = null

const PYTHON_PORT = 5001

registerAudioProtocolPrivileges()

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

// ─── Schema init (roda em todo startup, CREATE TABLE IF NOT EXISTS é seguro) ──

async function initSchema(db: { $executeRawUnsafe: (sql: string) => Promise<unknown> }) {
  const statements = [
    `CREATE TABLE IF NOT EXISTS "Project" ("id" TEXT NOT NULL PRIMARY KEY, "title" TEXT NOT NULL, "bpm" INTEGER, "vibe" TEXT, "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP, "updatedAt" DATETIME NOT NULL)`,
    `CREATE TABLE IF NOT EXISTS "Song" ("id" TEXT NOT NULL PRIMARY KEY, "projectId" TEXT NOT NULL, "title" TEXT NOT NULL, "content" TEXT NOT NULL DEFAULT '', "metadataJson" TEXT, "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP, "updatedAt" DATETIME NOT NULL, CONSTRAINT "Song_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project" ("id") ON DELETE CASCADE ON UPDATE CASCADE)`,
    `CREATE TABLE IF NOT EXISTS "Section" ("id" TEXT NOT NULL PRIMARY KEY, "songId" TEXT NOT NULL, "type" TEXT NOT NULL, "order" INTEGER NOT NULL, "content" TEXT NOT NULL DEFAULT '', "startBar" INTEGER, "endBar" INTEGER, "label" TEXT, "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP, "updatedAt" DATETIME NOT NULL, CONSTRAINT "Section_songId_fkey" FOREIGN KEY ("songId") REFERENCES "Song" ("id") ON DELETE CASCADE ON UPDATE CASCADE)`,
    `CREATE TABLE IF NOT EXISTS "SongVersion" ("id" TEXT NOT NULL PRIMARY KEY, "songId" TEXT NOT NULL, "content" TEXT NOT NULL, "versionName" TEXT NOT NULL, "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP, CONSTRAINT "SongVersion_songId_fkey" FOREIGN KEY ("songId") REFERENCES "Song" ("id") ON DELETE CASCADE ON UPDATE CASCADE)`,
    `CREATE TABLE IF NOT EXISTS "ProjectTag" ("id" TEXT NOT NULL PRIMARY KEY, "projectId" TEXT NOT NULL, "tag" TEXT NOT NULL, CONSTRAINT "ProjectTag_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project" ("id") ON DELETE CASCADE ON UPDATE CASCADE)`,
    `CREATE TABLE IF NOT EXISTS "RhymeDictionary" ("id" TEXT NOT NULL PRIMARY KEY, "term" TEXT NOT NULL, "suggestionsJson" TEXT NOT NULL, "phoneticKey" TEXT NOT NULL, "category" TEXT, "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP, "updatedAt" DATETIME NOT NULL)`,
    `CREATE TABLE IF NOT EXISTS "StyleMetrics" ("id" TEXT NOT NULL PRIMARY KEY, "totalSongs" INTEGER NOT NULL DEFAULT 0, "totalWords" INTEGER NOT NULL DEFAULT 0, "frequentWordsJson" TEXT NOT NULL DEFAULT '[]', "recurringThemesJson" TEXT NOT NULL DEFAULT '[]', "averageLineLength" REAL NOT NULL DEFAULT 0, "averageSyllablesPerLine" REAL NOT NULL DEFAULT 0, "vocabularyEntropy" REAL NOT NULL DEFAULT 0, "dominantVibe" TEXT, "rhymeDensity" REAL NOT NULL DEFAULT 0, "internalRhymeRate" REAL NOT NULL DEFAULT 0, "multisyllableRate" REAL NOT NULL DEFAULT 0, "adlibUsageRate" REAL NOT NULL DEFAULT 0, "updatedAt" DATETIME NOT NULL)`,
    `CREATE TABLE IF NOT EXISTS "WordFrequency" ("id" TEXT NOT NULL PRIMARY KEY, "word" TEXT NOT NULL, "count" INTEGER NOT NULL DEFAULT 1, "lastUsedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP)`,
    `CREATE TABLE IF NOT EXISTS "AnalysisCache" ("id" TEXT NOT NULL PRIMARY KEY, "songId" TEXT NOT NULL, "rhymeAnalysisJson" TEXT NOT NULL DEFAULT '{}', "metricsAnalysisJson" TEXT NOT NULL DEFAULT '{}', "clicheAnalysisJson" TEXT NOT NULL DEFAULT '{}', "qualityAnalysisJson" TEXT NOT NULL DEFAULT '{}', "updatedAt" DATETIME NOT NULL, CONSTRAINT "AnalysisCache_songId_fkey" FOREIGN KEY ("songId") REFERENCES "Song" ("id") ON DELETE CASCADE ON UPDATE CASCADE)`,
    `CREATE TABLE IF NOT EXISTS "UserWord" ("id" TEXT NOT NULL PRIMARY KEY, "word" TEXT NOT NULL, "category" TEXT NOT NULL, "note" TEXT, "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP)`,
    `CREATE TABLE IF NOT EXISTS "AppSettings" ("id" TEXT NOT NULL PRIMARY KEY, "key" TEXT NOT NULL, "value" TEXT NOT NULL)`,
    `CREATE UNIQUE INDEX IF NOT EXISTS "RhymeDictionary_term_key" ON "RhymeDictionary"("term")`,
    `CREATE UNIQUE INDEX IF NOT EXISTS "WordFrequency_word_key" ON "WordFrequency"("word")`,
    `CREATE UNIQUE INDEX IF NOT EXISTS "AnalysisCache_songId_key" ON "AnalysisCache"("songId")`,
    `CREATE UNIQUE INDEX IF NOT EXISTS "AppSettings_key_key" ON "AppSettings"("key")`,
    `CREATE UNIQUE INDEX IF NOT EXISTS "UserWord_word_category_key" ON "UserWord"("word", "category")`,
  ]

  for (const sql of statements) {
    try {
      await db.$executeRawUnsafe(sql)
    } catch (err: any) {
      if (!String(err?.message ?? '').includes('already exists')) {
        console.error('[DB] initSchema erro:', err?.message ?? err)
      }
    }
  }
  console.log('[DB] Schema inicializado.')
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
  await initSchema(db)

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
  registerAudioProtocol()
  registerAudioHandlers()

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
