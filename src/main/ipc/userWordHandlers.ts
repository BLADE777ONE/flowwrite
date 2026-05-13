import { ipcMain } from 'electron'
import type { PrismaClient } from '@prisma/client'

export function registerUserWordHandlers(db: PrismaClient) {
  ipcMain.handle('userword:list', async () => {
    return db.userWord.findMany({ orderBy: { createdAt: 'desc' } })
  })

  ipcMain.handle('userword:add', async (_, payload: { word: string; category: string; note?: string }) => {
    const { word, category, note } = payload
    return db.userWord.upsert({
      where: { word_category: { word: word.trim().toLowerCase(), category } },
      update: { note: note ?? null },
      create: { word: word.trim().toLowerCase(), category, note: note ?? null },
    })
  })

  ipcMain.handle('userword:delete', async (_, id: string) => {
    return db.userWord.delete({ where: { id } })
  })
}
