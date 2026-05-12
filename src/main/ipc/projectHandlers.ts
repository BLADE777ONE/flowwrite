// src/main/ipc/projectHandlers.ts
import { ipcMain } from 'electron'
import { PrismaClient } from '@prisma/client'

export function registerProjectHandlers(db: PrismaClient) {
  ipcMain.handle('project:list', async () => {
    return db.project.findMany({
      orderBy: { updatedAt: 'desc' },
      include: { tags: true, _count: { select: { songs: true } } }
    })
  })

  ipcMain.handle('project:get', async (_, id: string) => {
    return db.project.findUnique({
      where: { id },
      include: { tags: true, songs: { orderBy: { updatedAt: 'desc' } } }
    })
  })

  ipcMain.handle('project:create', async (_, data: { title: string; bpm?: number; vibe?: string }) => {
    try {
      console.log('[project:create] data recebida:', JSON.stringify(data))
      const result = await db.project.create({ data })
      console.log('[project:create] criado:', result.id)
      return result
    } catch (err: any) {
      console.error('[project:create] ERRO:', err?.message ?? err)
      throw err
    }
  })

  ipcMain.handle('project:update', async (_, id: string, data: { title?: string; bpm?: number; vibe?: string }) => {
    return db.project.update({ where: { id }, data })
  })

  ipcMain.handle('project:delete', async (_, id: string) => {
    return db.project.delete({ where: { id } })
  })
}
