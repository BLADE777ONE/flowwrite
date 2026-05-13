import type { TimelineSegment } from '../types'

interface EditorStatusBarProps {
  lyrics: string
  lineCount: number
  saving: boolean
  segments: TimelineSegment[]
}

const BPM = 128

function formatDuration(lineCount: number): string {
  const barsPerMinute = BPM / 4
  const totalSecs = Math.round((lineCount / barsPerMinute) * 60)
  const mins = Math.floor(totalSecs / 60)
  const secs = totalSecs % 60
  return `${mins}:${secs.toString().padStart(2, '0')}`
}

export function EditorStatusBar({ lyrics, lineCount, saving, segments }: EditorStatusBarProps) {
  const wordCount = lyrics.trim().split(/\s+/).filter(w => w.length > 0).length
  const charCount = lyrics.length

  const activeSegments = segments.filter(s => s.lines > 0)
  const hasContent = lineCount > 0
  const isSectioned = activeSegments.length > 0 && activeSegments.some(s => s.type !== 'unsectioned')

  return (
    <footer className="h-14 border-t border-white/[0.07] bg-[#0c0c11] flex items-center gap-5 px-5 text-xs text-gray-400 font-medium">

      {/* Counters */}
      <div className="flex items-center gap-4 min-w-max">
        <span><strong className="text-gray-100">{wordCount}</strong> palavras</span>
        <span><strong className="text-gray-100">{lineCount}</strong> linhas</span>
        <span><strong className="text-gray-100">{charCount}</strong> chars</span>
      </div>

      {/* Timeline */}
      <div className="flex-1 min-w-0 h-9 rounded-md border border-white/[0.06] bg-black/25 overflow-hidden flex">
        {!hasContent ? (
          <div className="flex-1 flex items-center justify-center">
            <span className="text-[10px] text-gray-700 tracking-wider">
              Escreva para ver a timeline...
            </span>
          </div>
        ) : !isSectioned ? (
          // Sem seções — gradient original com ticks por linha
          <div className="flex-1 flex items-end gap-px px-2 pb-1.5">
            {Array.from({ length: Math.min(lineCount, 96) }).map((_, i) => (
              <span
                key={i}
                className="flex-1 rounded-full bg-gradient-to-t from-purple-700 via-fuchsia-500 to-cyan-300"
                style={{ height: i % 4 === 3 ? '22px' : i % 2 === 1 ? '14px' : '10px' }}
              />
            ))}
          </div>
        ) : (
          // Timeline segmentada por seções
          activeSegments.map((seg, i) => {
            const fraction = seg.lines / lineCount
            const tickCount = Math.min(seg.lines, 48)
            return (
              <div
                key={i}
                className="relative flex items-end gap-px px-1.5 pb-1.5 border-r border-white/[0.05] last:border-r-0 overflow-hidden"
                style={{ flex: fraction }}
                title={`${seg.label} — ${seg.lines} barras`}
              >
                {/* Colored gradient background */}
                <div
                  className="absolute inset-0"
                  style={{ background: `linear-gradient(to right, ${seg.color}28, ${seg.color}08)` }}
                />
                {/* Section label */}
                <span
                  className="absolute left-1.5 top-[4px] text-[7px] font-black uppercase tracking-[0.18em] z-10 truncate leading-none"
                  style={{ color: seg.color, opacity: 0.75 }}
                >
                  {seg.label}
                </span>
                {/* Line ticks */}
                {Array.from({ length: tickCount }).map((_, j) => (
                  <span
                    key={j}
                    className="relative z-10 flex-1 rounded-full"
                    style={{
                      height: j % 4 === 3 ? '20px' : j % 2 === 1 ? '13px' : '9px',
                      backgroundColor: seg.color,
                      opacity: j % 4 === 3 ? 0.75 : 0.3,
                      minWidth: '2px',
                    }}
                  />
                ))}
              </div>
            )
          })
        )}
      </div>

      {/* Duration + line indicator */}
      <div className="hidden lg:flex items-center gap-3 font-mono text-[10px] text-gray-500 min-w-max">
        <span>{hasContent ? formatDuration(lineCount) : '--:--'}</span>
        <span className="text-cyan-300">L {lineCount.toString().padStart(2, '0')}</span>
      </div>

      {/* Save status */}
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
