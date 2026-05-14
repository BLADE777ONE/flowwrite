// src/database/db.ts
import { PrismaClient } from '@prisma/client'
import path from 'path'
import { app } from 'electron'

let prisma: PrismaClient | null = null

export function getDB(): PrismaClient {
  if (!prisma) {
    const dbPath = app.isPackaged
      ? path.join(app.getPath('userData'), 'obloco.db')
      : path.join(__dirname, '../../flowwriter.db')

    process.env.DATABASE_URL = `file:${dbPath}`

    // Em produção, o binário nativo do Prisma fica fora do ASAR (asarUnpack)
    if (app.isPackaged) {
      const enginePath = path.join(
        process.resourcesPath,
        'app.asar.unpacked',
        'node_modules',
        '.prisma',
        'client',
        'query_engine-windows.dll.node',
      )
      process.env.PRISMA_QUERY_ENGINE_LIBRARY = enginePath
    }

    prisma = new PrismaClient({
      log: process.env.NODE_ENV === 'development' ? ['warn', 'error'] : ['error'],
    })
  }
  return prisma
}

export async function disconnectDB() {
  if (prisma) {
    await prisma.$disconnect()
    prisma = null
  }
}
