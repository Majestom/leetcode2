import { useEffect, useRef, useState } from 'react'
import { EditorView } from '@codemirror/view'
import type { LanguageId } from '../lib/runtimes'
import { createEditorState, external } from '../lib/editor/setup'
import KeyBar from './KeyBar'
import styles from './Editor.module.css'

type Props = {
  value: string
  language: LanguageId
  filename: string
  /**
   * Identifies the document being edited. A new key starts a fresh editor
   * state, undo history included, so undo never crosses into another pattern.
   */
  docKey: string
  onChange: (value: string) => void
  /** Fired on Cmd/Ctrl+Enter from inside the editor. */
  onRun: () => void
}

export default function Editor({
  value,
  language,
  filename,
  docKey,
  onChange,
  onRun,
}: Props) {
  const hostRef = useRef<HTMLDivElement>(null)
  const viewRef = useRef<EditorView | null>(null)
  const keyRef = useRef(docKey)

  // Editor states outlive renders, so their handlers read the latest props
  // through refs rather than capturing stale ones.
  const onChangeRef = useRef(onChange)
  const onRunRef = useRef(onRun)
  useEffect(() => {
    onChangeRef.current = onChange
    onRunRef.current = onRun
  }, [onChange, onRun])

  const [handlers] = useState(() => ({
    change: (doc: string) => onChangeRef.current(doc),
    run: () => onRunRef.current(),
  }))

  // Mount once; later documents arrive through setState below, not a new view.
  useEffect(() => {
    const view = new EditorView({
      parent: hostRef.current!,
      state: createEditorState(value, language, handlers),
    })
    viewRef.current = view
    return () => {
      view.destroy()
      viewRef.current = null
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Outside changes: a new document gets a new state; the same document with
  // different text (Reset) gets an ordinary, undoable replacement.
  useEffect(() => {
    const view = viewRef.current
    if (!view) return
    if (keyRef.current !== docKey) {
      keyRef.current = docKey
      view.setState(createEditorState(value, language, handlers))
      return
    }
    if (view.state.doc.toString() !== value) {
      view.dispatch({
        changes: { from: 0, to: view.state.doc.length, insert: value },
        annotations: external.of(true),
      })
    }
  }, [docKey, language, value, handlers])

  return (
    <section className={styles.wrapper}>
      <div className={styles.filename}>{filename}</div>
      <div ref={hostRef} className={styles.editor} />
      <KeyBar getView={() => viewRef.current} />
    </section>
  )
}
