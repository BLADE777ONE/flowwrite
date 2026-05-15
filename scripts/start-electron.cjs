// Wrapper para iniciar o Electron sem ELECTRON_RUN_AS_NODE
// Essa variavel de ambiente (definida globalmente pelo VSCode/outras ferramentas)
// faz o Electron rodar como Node.js puro, quebrando require('electron')
'use strict'
const { spawn } = require('child_process')
const path = require('path')

const env = { ...process.env }
delete env.ELECTRON_RUN_AS_NODE

const electronExe = path.join(__dirname, '..', 'node_modules', 'electron', 'dist', 'electron.exe')

const child = spawn(electronExe, ['.'], {
  stdio: 'ignore',
  env,
  cwd: path.join(__dirname, '..')
})

child.on('close', (code) => {
  process.exit(code || 0)
})

child.on('error', (err) => {
  console.error('[start-electron] Erro ao iniciar Electron:', err.message)
  process.exit(1)
})
