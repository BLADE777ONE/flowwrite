// src/main/preload.ts
// Preload seguro — expõe APENAS canais IPC explícitos via contextBridge

import { contextBridge, ipcRenderer } from 'electron'

const PROJECT_CHANNELS = [
  'project:list',
  'project:create',
  'project:update',
  'project:delete',
  'project:get'
] as const

const LYRIC_CHANNELS = [
  'lyric:list',
  'lyric:get',
  'lyric:create',
  'lyric:update',
  'lyric:delete',
  'lyric:saveVersion',
  'lyric:getVersions',
  'section:list',
  'section:upsert',
  'section:delete'
] as const

const ANALYSIS_CHANNELS = [
  'analysis:getCache',
  'analysis:saveCache',
  'analysis:getDNA',
  'analysis:updateDNA',
  'wordFreq:update'
] as const

const EXPORT_CHANNELS = [
  'export:txt',
  'export:dnaJson'
] as const

const SETTINGS_CHANNELS = [
  'settings:get',
  'settings:set',
  'settings:getAll'
] as const

const RHYME_DICT_CHANNELS = [
  'rhymeDict:list',
  'rhymeDict:add',
  'rhymeDict:delete',
] as const

const USER_WORD_CHANNELS = [
  'userword:list',
  'userword:add',
  'userword:delete',
] as const

const AI_CHANNELS = [
  'ai:analyzeFlow',
] as const

// Python analysis server
const PYTHON_CHANNELS = [
  'python:health',
  'python:analyze',
  'python:syllables',
  'python:rhymes',
  'python:rhymeScore',
  'python:ready',
] as const

type AllChannels =
  | typeof PROJECT_CHANNELS[number]
  | typeof LYRIC_CHANNELS[number]
  | typeof ANALYSIS_CHANNELS[number]
  | typeof EXPORT_CHANNELS[number]
  | typeof SETTINGS_CHANNELS[number]
  | typeof RHYME_DICT_CHANNELS[number]
  | typeof USER_WORD_CHANNELS[number]
  | typeof AI_CHANNELS[number]
  | typeof PYTHON_CHANNELS[number]

const ALL_CHANNELS: ReadonlyArray<AllChannels> = [
  ...PROJECT_CHANNELS,
  ...LYRIC_CHANNELS,
  ...ANALYSIS_CHANNELS,
  ...EXPORT_CHANNELS,
  ...SETTINGS_CHANNELS,
  ...RHYME_DICT_CHANNELS,
  ...USER_WORD_CHANNELS,
  ...AI_CHANNELS,
  ...PYTHON_CHANNELS,
]

contextBridge.exposeInMainWorld('flowAPI', {
  invoke: (channel: AllChannels, ...args: unknown[]) => {
    if (ALL_CHANNELS.includes(channel)) {
      return ipcRenderer.invoke(channel, ...args)
    }
    return Promise.reject(new Error(`Canal IPC não autorizado: ${channel}`))
  },
  on: (channel: AllChannels, listener: (...args: unknown[]) => void) => {
    if (ALL_CHANNELS.includes(channel)) {
      ipcRenderer.on(channel, (_, ...args) => listener(...args))
    }
  },
  off: (channel: AllChannels) => {
    if (ALL_CHANNELS.includes(channel)) {
      ipcRenderer.removeAllListeners(channel)
    }
  }
})

contextBridge.exposeInMainWorld('appInfo', {
  platform: process.platform
})
