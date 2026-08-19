import { useEffect, useRef } from 'react'
import MonacoEditor from '@monaco-editor/react'
import styles from './Editor.module.css'

type Props = {
  value: string
  language: string
  filename: string
  onChange: (value: string) => void
  /** Fired on Cmd/Ctrl+Enter from inside the editor. */
  onRun: () => void
}

export default function Editor({
  value,
  language,
  filename,
  onChange,
  onRun,
}: Props) {
  // Monaco commands are registered once on mount, so the handler is read
  // through a ref to avoid capturing a stale closure over `onRun`.
  const onRunRef = useRef(onRun)
  useEffect(() => {
    onRunRef.current = onRun
  }, [onRun])

  return (
    <section className={styles.wrapper}>
      <div className={styles.filename}>{filename}</div>
      <MonacoEditor
        wrapperProps={{ className: styles.editor }}
        height="100%"
        language={language}
        theme="vs-dark"
        value={value}
        onChange={(v) => onChange(v ?? '')}
        onMount={(editor, monaco) => {
          editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.Enter, () =>
            onRunRef.current(),
          )
        }}
        options={{
          fontSize: 13,
          minimap: { enabled: false },
          scrollBeyondLastLine: false,
          tabSize: 4,
          insertSpaces: true,
          automaticLayout: true,
        }}
        loading={<div className={styles.loading}>Loading editor…</div>}
      />
    </section>
  )
}
