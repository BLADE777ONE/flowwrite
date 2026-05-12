// src/database/db.ts
// Singleton do PrismaClient para uso no main process

import { PrismaClient } from '@prisma/client'
import path from 'path'
import { app } from 'electron'

let prisma: PrismaClient | null = null

export function getDB(): PrismaClient {
  if (!prisma) {
    // Em desenvolvimento, usar pasta do projeto; em produção, userData do SO
    // __dirname = dist-electron/main → ../../ = project root
    const dbPath = app.isPackaged
      ? path.join(app.getPath('userData'), 'flowwriter.db')
      : path.join(__dirname, '../../flowwriter.db')

    process.env.DATABASE_URL = `file:${dbPath}`

    prisma = new PrismaClient({
      log: process.env.NODE_ENV === 'development' ? ['warn', 'error'] : ['error']
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
