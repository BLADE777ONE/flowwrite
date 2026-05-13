interface EditorStatusBarProps {
  lyrics: string
  lineCount: number
  saving: boolean
}

export function EditorStatusBar({ lyrics, lineCount, saving }: EditorStatusBarProps) {
  const wordCount = lyrics.trim().split(/\s+/).filter(word => word.length > 0).length
  const charCount = lyrics.length

  return (
    <div className="h-11 border-t border-[#262631] bg-[#151519] flex items-center justify-between px-6 text-xs text-gray-400 font-medium">
      <div className="flex items-center gap-5">
        <span><strong className="text-gray-200">{wordCount}</strong> palavras</span>
        <span><strong className="text-gray-200">{lineCount}</strong> linhas</span>
        <span><strong className="text-gray-200">{charCount}</strong> caracteres</span>
      </div>
      <span className={`border px-2 py-0.5 rounded-full text-[10px] uppercase tracking-wider font-bold ${saving ? 'text-yellow-300 border-yellow-900 bg-yellow-900/20' : 'text-green-300 border-green-900 bg-green-900/20'}`}>
        {saving ? 'Salvando...' : 'Salvo'}
      </span>
    </div>
  )
}
