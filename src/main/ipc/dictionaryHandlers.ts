import { ipcMain } from 'electron'
import { lookupPortugueseThesaurus } from '../services/dicsinService'

export function registerDictionaryHandlers() {
  ipcMain.handle('dictionary:lookup', async (_, word: string) => {
    return lookupPortugueseThesaurus(word)
  })
}
