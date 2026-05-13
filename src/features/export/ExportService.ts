// src/features/export/ExportService.ts
// Service de exportação — delega para IPC no main process

export async function exportSongAsTxt(songId: string): Promise<{ success: boolean; path?: string }> {
  return window.flowAPI.invoke('export:txt', songId) as Promise<{ success: boolean; path?: string }>
}

export async function exportDNAProfile(): Promise<{ success: boolean; path?: string }> {
  return window.flowAPI.invoke('export:dnaJson') as Promise<{ success: boolean; path?: string }>
}
