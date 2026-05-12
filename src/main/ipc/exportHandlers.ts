// src/main/ipc/exportHandlers.ts
import { ipcMain, dialog, app } from 'electron'
import { PrismaClient } from '@prisma/client'
import fs from 'fs'
import path from 'path'

export function registerExportHandlers(db: PrismaClient) {
  ipcMain.handle('export:txt', async (_, songId: string) => {
    const song = await db.song.findUnique({
      where: { id: songId },
      include: { sections: { orderBy: { order: 'asc' } }, project: true }
    })
    if (!song) throw new Error('Letra não encontrada')

    const lines: string[] = [
      `FLOWWRITER — ${song.project.title}`,
      `Título: ${song.title}`,
      `Exportado em: ${new Date().toLocaleDateString('pt-BR')}`,
      '═'.repeat(50),
      ''
    ]

    if (song.sections.length > 0) {
      for (const section of song.sections) {
        lines.push(`[${section.label || section.type.toUpperCase()}]`)
        lines.push(section.content)
        lines.push('')
      }
    } else {
      lines.push(song.content)
    }

    const content = lines.join('\n')

    const { filePath } = await dialog.showSaveDialog({
      defaultPath: path.join(app.getPath('documents'), `${song.title}.txt`),
      filters: [{ name: 'Texto', extensions: ['txt'] }]
    })

    if (filePath) {
      fs.writeFileSync(filePath, content, 'utf8')
      return { success: true, path: filePath }
    }
    return { success: false }
  })

  ipcMain.handle('export:dnaJson', async () => {
    const dna = await db.styleMetrics.findFirst()
    if (!dna) throw new Error('DNA não calculado ainda')

    const dnaPath = path.join(app.getPath('userData'), 'dna_profile.json')
    fs.writeFileSync(dnaPath, JSON.stringify(dna, null, 2), 'utf8')

    const { filePath } = await dialog.showSaveDialog({
      defaultPath: path.join(app.getPath('documents'), 'dna_profile.json'),
      filters: [{ name: 'JSON', extensions: ['json'] }]
    })

    if (filePath) {
      fs.copyFileSync(dnaPath, filePath)
      return { success: true, path: filePath }
    }
    return { success: false }
  })
}
