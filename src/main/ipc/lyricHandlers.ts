// src/main/ipc/lyricHandlers.ts
import { ipcMain } from 'electron'
import { PrismaClient } from '@prisma/client'

export function registerLyricHandlers(db: PrismaClient) {
  ipcMain.handle('lyric:list', async (_, projectId: string) => {
    return db.song.findMany({
      where: { projectId },
      orderBy: { updatedAt: 'desc' }
    })
  })

  ipcMain.handle('lyric:get', async (_, id: string) => {
    return db.song.findUnique({
      where: { id },
      include: { sections: { orderBy: { order: 'asc' } } }
    })
  })

  ipcMain.handle('lyric:create', async (_, data: { projectId: string; title: string }) => {
    return db.song.create({ data: { ...data, content: '' } })
  })

  ipcMain.handle('lyric:update', async (_, id: string, data: { title?: string; content?: string; metadataJson?: string }) => {
    return db.song.update({ where: { id }, data })
  })

  ipcMain.handle('lyric:delete', async (_, id: string) => {
    return db.song.delete({ where: { id } })
  })

  ipcMain.handle('lyric:saveVersion', async (_, songId: string, versionName: string, content: string) => {
    return db.songVersion.create({ data: { songId, versionName, content } })
  })

  ipcMain.handle('lyric:getVersions', async (_, songId: string) => {
    return db.songVersion.findMany({
      where: { songId },
      orderBy: { createdAt: 'desc' }
    })
  })

  ipcMain.handle('section:list', async (_, songId: string) => {
    return db.section.findMany({
      where: { songId },
      orderBy: { order: 'asc' }
    })
  })

  ipcMain.handle('section:upsert', async (_, data: {
    id?: string; songId: string; type: string; order: number;
    content: string; label?: string; startBar?: number; endBar?: number
  }) => {
    if (data.id) {
      return db.section.update({ where: { id: data.id }, data })
    }
    return db.section.create({ data })
  })

  ipcMain.handle('section:delete', async (_, id: string) => {
    return db.section.delete({ where: { id } })
  })
}
