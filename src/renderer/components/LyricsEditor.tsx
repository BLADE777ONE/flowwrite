import { EditorContent } from '@tiptap/react'
import type { Editor } from '@tiptap/core'
import { analyzeMetrics } from '../../features/metrics/MetricsService'
import { analyzeRhymes } from '../../features/rhyme/RhymeService'
import { useEditorStore } from '../../features/editor/editorStore'

interface LyricsEditorProps {
  editor: Editor | null
  lyrics: string
  scopedLines: string[]
  activeBlockStart: number
}

function EditorStudioStrip({
  lyrics,
  scopedLines,
  activeBlockStart,
}: {
  lyrics: string
  scopedLines: string[]
  activeBlockStart: number
}) {
  const { bpm } = useEditorStore()
  const contentLines = scopedLines.map(line => line.trim()).filter(Boolean)
  const scopedText = contentLines.join('\n')
  const metrics = analyzeMetrics(scopedText, bpm)
  const rhyme = analyzeRhymes(scopedText)
  const currentBlock = Math.floor(activeBlockStart / 4) + 1
  const activeScheme = rhyme.schemeBlocks.at(-1)?.pattern ?? '----'
  const averageSyllables = metrics.averageSyllables || 0

  return (
    <div className="mx-auto max-w-[980px] px-16 pt-5 pb-1">
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-2 min-w-0">
          <span className="text-[10px] uppercase tracking-[0.24em] font-black text-gray-500">
            Verso {currentBlock}
          </span>
          <span className="h-1.5 w-1.5 rounded-full bg-purple-400 shadow-[0_0_10px_rgba(168,85,247,0.65)]" />
          <span className="hidden md:inline text-[10px] text-gray-600">
            {contentLines.length || 0} barras neste bloco
          </span>
        </div>

        <div className="flex items-center gap-2 font-mono text-[10px]">
          <span className="rounded border border-purple-500/30 bg-purple-500/10 px-2 py-1 text-purple-200">
            {activeScheme}
          </span>
          <span className="rounded border border-cyan-500/25 bg-cyan-500/10 px-2 py-1 text-cyan-200">
            {averageSyllables ? `${averageSyllables} sil.` : '-- sil.'}
          </span>
        </div>
      </div>
    </div>
  )
}

export function LyricsEditor({ editor, lyrics, scopedLines, activeBlockStart }: LyricsEditorProps) {
  return (
    <main data-onboarding="lyrics-editor" className="flex-1 min-h-0 bg-[#09090d] relative overflow-hidden">
      <div className="absolute inset-x-0 top-0 h-24 bg-[radial-gradient(circle_at_50%_-30%,rgba(124,58,237,0.16),transparent_60%)] pointer-events-none" />
      <div className="absolute left-0 top-0 bottom-0 w-px bg-cyan-400/20 shadow-[0_0_24px_rgba(34,211,238,0.28)] pointer-events-none" />

      <div className="h-full overflow-y-auto editor-scroll tiptap-editor relative">
        <div className="sticky top-0 z-10 h-9 border-b border-white/[0.06] bg-[#09090d]/90 backdrop-blur flex items-center px-8">
          <div className="ml-[4.25rem] flex-1 flex items-center justify-between font-mono text-[10px] text-gray-600">
            {[1, 1.2, 1.4, 2, 2.2, 2.4].map(marker => (
              <span key={marker}>{marker}</span>
            ))}
          </div>
        </div>
        <EditorStudioStrip lyrics={lyrics} scopedLines={scopedLines} activeBlockStart={activeBlockStart} />
        <EditorContent editor={editor} />
      </div>
    </main>
  )
}
