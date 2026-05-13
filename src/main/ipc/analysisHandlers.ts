// src/main/ipc/analysisHandlers.ts
import { ipcMain } from 'electron'
import { PrismaClient } from '@prisma/client'

export function registerAnalysisHandlers(db: PrismaClient) {
  ipcMain.handle('analysis:getCache', async (_, songId: string) => {
    return db.analysisCache.findUnique({ where: { songId } })
  })

  ipcMain.handle('analysis:saveCache', async (_, songId: string, data: {
    rhymeAnalysisJson?: string
    metricsAnalysisJson?: string
    clicheAnalysisJson?: string
    qualityAnalysisJson?: string
  }) => {
    return db.analysisCache.upsert({
      where: { songId },
      update: data,
      create: { songId, ...data }
    })
  })

  ipcMain.handle('analysis:getDNA', async () => {
    return db.styleMetrics.findFirst()
  })

  ipcMain.handle('analysis:updateDNA', async (_, data: Partial<{
    totalSongs: number; totalWords: number; frequentWordsJson: string
    recurringThemesJson: string; averageLineLength: number
    averageSyllablesPerLine: number; vocabularyEntropy: number
    dominantVibe: string; rhymeDensity: number; internalRhymeRate: number
    multisyllableRate: number; adlibUsageRate: number
  }>) => {
    const existing = await db.styleMetrics.findFirst()
    if (existing) {
      return db.styleMetrics.update({ where: { id: existing.id }, data })
    }
    return db.styleMetrics.create({ data: data as any })
  })

  ipcMain.handle('wordFreq:update', async (_, words: string[]) => {
    for (const word of words) {
      await db.wordFrequency.upsert({
        where: { word },
        update: { count: { increment: 1 }, lastUsedAt: new Date() },
        create: { word, count: 1 }
      })
    }
    return true
  })

  // ─── Estágio 2: Dicionário de rimas customizado ───────────────────────────

  ipcMain.handle('rhymeDict:list', async () => {
    return db.rhymeDictionary.findMany({
      orderBy: { createdAt: 'desc' }
    })
  })

  ipcMain.handle('rhymeDict:add', async (_, data: {
    term: string
    suggestionsJson: string
    phoneticKey: string
    category?: string | null
  }) => {
    return db.rhymeDictionary.upsert({
      where: { term: data.term },
      update: {
        suggestionsJson: data.suggestionsJson,
        phoneticKey: data.phoneticKey,
        category: data.category ?? null,
      },
      create: {
        term: data.term,
        suggestionsJson: data.suggestionsJson,
        phoneticKey: data.phoneticKey,
        category: data.category ?? null,
      }
    })
  })

  ipcMain.handle('rhymeDict:delete', async (_, id: string) => {
    return db.rhymeDictionary.delete({ where: { id } })
  })
}
