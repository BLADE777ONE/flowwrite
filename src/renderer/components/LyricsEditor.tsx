import { EditorContent } from '@tiptap/react'
import type { Editor } from '@tiptap/core'

interface LyricsEditorProps {
  editor: Editor | null
}

export function LyricsEditor({ editor }: LyricsEditorProps) {
  return (
    <main className="flex-1 min-h-0 bg-[#09090d] relative overflow-hidden">
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
        <EditorContent editor={editor} />
      </div>
    </main>
  )
}
