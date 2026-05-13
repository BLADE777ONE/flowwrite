import { EditorContent } from '@tiptap/react'
import type { Editor } from '@tiptap/core'

interface LyricsEditorProps {
  editor: Editor | null
}

export function LyricsEditor({ editor }: LyricsEditorProps) {
  return (
    <div className="flex-1 overflow-y-auto editor-scroll tiptap-editor bg-[#101014]">
      <EditorContent editor={editor} />
    </div>
  )
}
