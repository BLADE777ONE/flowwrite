interface EditorStatusBarProps {
  lyrics: string
  lineCount: number
  saving: boolean
}

const WAVE_BARS = Array.from({ length: 96 }, (_, index) => 8 + ((index * 17) % 28))

export function EditorStatusBar({ lyrics, lineCount, saving }: EditorStatusBarProps) {
  const wordCount = lyrics.trim().split(/\s+/).filter(word => word.length > 0).length
  const charCount = lyrics.length

  return (
    <footer className="h-14 border-t border-white/[0.07] bg-[#0c0c11] flex items-center gap-5 px-5 text-xs text-gray-400 font-medium">
      <div className="flex items-center gap-4 min-w-max">
        <span><strong className="text-gray-100">{wordCount}</strong> palavras</span>
        <span><strong className="text-gray-100">{lineCount}</strong> linhas</span>
        <span><strong className="text-gray-100">{charCount}</strong> chars</span>
      </div>

      <div className="flex-1 min-w-0 h-9 rounded-md border border-white/[0.06] bg-black/25 px-2 flex items-center gap-0.5 overflow-hidden">
        {WAVE_BARS.map((height, index) => (
          <span
            key={index}
            className={`flex-1 rounded-full ${
              index < Math.floor(WAVE_BARS.length * 0.58)
                ? 'bg-gradient-to-t from-purple-700 via-fuchsia-500 to-cyan-300'
                : 'bg-white/10'
            }`}
            style={{ height: `${height}px` }}
          />
        ))}
      </div>

      <div className="hidden lg:flex items-center gap-3 font-mono text-[10px] text-gray-500 min-w-max">
        <span>00:24.8</span>
        <span className="text-cyan-300">L {lineCount.toString().padStart(2, '0')}</span>
      </div>

      <span className={`border px-2 py-0.5 rounded-full text-[10px] uppercase tracking-wider font-black min-w-max ${
        saving
          ? 'text-yellow-300 border-yellow-900 bg-yellow-900/20'
          : 'text-green-300 border-green-900 bg-green-900/20'
      }`}>
        {saving ? 'Salvando...' : 'Salvo'}
      </span>
    </footer>
  )
}
