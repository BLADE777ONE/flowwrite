// src/main/ipc/settingsHandlers.ts
import { ipcMain } from 'electron'
import { PrismaClient } from '@prisma/client'

export function registerSettingsHandlers(db: PrismaClient) {
  ipcMain.handle('settings:get', async (_, key: string) => {
    const setting = await db.appSettings.findUnique({ where: { key } })
    return setting?.value ?? null
  })

  ipcMain.handle('settings:set', async (_, key: string, value: string) => {
    return db.appSettings.upsert({
      where: { key },
      update: { value },
      create: { key, value }
    })
  })

  ipcMain.handle('settings:getAll', async () => {
    const settings = await db.appSettings.findMany()
    return Object.fromEntries(settings.map(s => [s.key, s.value]))
  })
}
