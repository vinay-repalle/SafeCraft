// CodeMirror 6 is the code editor library. Its pieces are small packages you combine:
// - state: the document text and the editor's settings (an "EditorState")
// - view: draws the state on screen and sends edits back (an "EditorView")
// - extensions: features added one by one (line numbers, undo history, colouring)
// This file is loaded lazily (see EditorPane), so the library only downloads when My view opens.
import { defaultKeymap, history, historyKeymap } from '@codemirror/commands'
import { javascript } from '@codemirror/lang-javascript'
import { HighlightStyle, syntaxHighlighting } from '@codemirror/language'
import { EditorState } from '@codemirror/state'
import { EditorView, keymap, lineNumbers } from '@codemirror/view'
import { tags as t } from '@lezer/highlight'
import { useEffect, useRef } from 'react'

// Colours come from the app's design tokens, so the editor follows light, dark and system
// with no separate editor theme. Flat colours only.
const theme = EditorView.theme({
  '&': { height: '100%', backgroundColor: 'var(--card)', color: 'var(--ink)', fontSize: '13px' },
  '&.cm-focused': { outline: '2px solid var(--accent)', outlineOffset: '-2px' },
  '.cm-scroller': { fontFamily: "'JetBrains Mono Variable', ui-monospace, monospace", lineHeight: '20px' },
  '.cm-content': { padding: '12px 0', caretColor: 'var(--accent)' },
  '.cm-cursor': { borderLeftColor: 'var(--accent)' },
  '.cm-gutters': { backgroundColor: 'var(--card)', color: 'var(--ink-3)', border: 'none' },
  '.cm-lineNumbers .cm-gutterElement': { padding: '0 12px 0 16px' },
  '&.cm-focused .cm-selectionBackground, .cm-selectionBackground': {
    backgroundColor: 'color-mix(in srgb, var(--accent) 22%, transparent)',
  },
})

// Monochrome on purpose: the accent is for actions and selection, and green and red mean
// passed and failed elsewhere in the app. Code is read through weight and tone instead.
const highlight = HighlightStyle.define([
  { tag: [t.keyword, t.controlKeyword, t.definitionKeyword, t.moduleKeyword], color: 'var(--ink)', fontWeight: '500' },
  { tag: [t.string, t.special(t.string), t.number, t.bool], color: 'var(--ink-2)' },
  { tag: [t.comment], color: 'var(--ink-3)' },
  { tag: [t.tagName, t.angleBracket, t.attributeName], color: 'var(--ink-2)' },
])

type Props = { value: string; onChange: (value: string) => void; label: string }

export default function CodeEditor({ value, onChange, label }: Props) {
  const host = useRef<HTMLDivElement>(null)
  const view = useRef<EditorView | null>(null)
  const onChangeRef = useRef(onChange)
  const fromOutside = useRef(false)

  useEffect(() => {
    onChangeRef.current = onChange
  }, [onChange])

  // Create the editor once, and destroy it when the component goes away.
  useEffect(() => {
    const editor = new EditorView({
      parent: host.current!,
      state: EditorState.create({
        doc: value,
        extensions: [
          lineNumbers(),
          history(),
          keymap.of([...defaultKeymap, ...historyKeymap]),
          javascript({ jsx: true }),
          syntaxHighlighting(highlight),
          theme,
          EditorView.contentAttributes.of({ 'aria-label': label }),
          EditorView.updateListener.of((update) => {
            if (update.docChanged && !fromOutside.current) onChangeRef.current(update.state.doc.toString())
          }),
        ],
      }),
    })
    view.current = editor
    return () => editor.destroy()
    // The document is created once; later changes from outside are applied below.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // The text can change from outside the editor (Skip & Auto-Fill, a pull). Copy it in.
  useEffect(() => {
    const editor = view.current
    if (!editor || editor.state.doc.toString() === value) return
    fromOutside.current = true
    editor.dispatch({ changes: { from: 0, to: editor.state.doc.length, insert: value } })
    fromOutside.current = false
  }, [value])

  return <div ref={host} className="h-full" />
}
