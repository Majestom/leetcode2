import { useCallback, useEffect, useRef, useState } from 'react'
import { createRuntime } from './lib/runtimes'
import type { Runtime } from './lib/runtimes'
import { buildTestScript, patterns } from './lib/patterns'
import ProblemPanel from './components/ProblemPanel'
import Editor from './components/Editor'
import OutputPanel from './components/OutputPanel'
import styles from './App.module.css'

type RuntimeStatus = 'loading' | 'ready' | 'failed'

const STATUS_LABEL: Record<RuntimeStatus, string> = {
  loading: 'Runtime loading…',
  ready: 'Runtime ready',
  failed: 'Runtime failed',
}

export default function App() {
  const runtimeRef = useRef<Runtime | null>(null)
  const [status, setStatus] = useState<RuntimeStatus>('loading')
  const [running, setRunning] = useState(false)
  const [output, setOutput] = useState('')

  // Stage 5 makes this selectable; for now the first pattern is the only one.
  const pattern = patterns[0]
  const impl = pattern?.implementations.python

  const [code, setCode] = useState(impl?.starter ?? '')

  useEffect(() => {
    const runtime = createRuntime('python')
    runtimeRef.current = runtime
    let cancelled = false

    runtime.isReady().then(
      () => !cancelled && setStatus('ready'),
      (err: unknown) => {
        if (cancelled) return
        setStatus('failed')
        setOutput(err instanceof Error ? err.message : String(err))
      },
    )

    return () => {
      cancelled = true
      runtime.dispose()
      runtimeRef.current = null
    }
  }, [])

  const runTests = useCallback(async () => {
    const runtime = runtimeRef.current
    if (!runtime || !pattern || !impl) return
    setRunning(true)
    const result = await runtime.run(buildTestScript(pattern, 'python', code))
    setRunning(false)
    setOutput(
      [result.stdout, result.stderr]
        .filter(Boolean)
        .join('\n')
        .replace(/\n+$/, ''),
    )
  }, [code, impl, pattern])

  function resetCode() {
    setCode(impl?.starter ?? '')
    setOutput('')
  }

  if (!pattern || !impl) {
    return <div className={styles.app}>No patterns loaded.</div>
  }

  return (
    <div className={styles.app}>
      <header className={styles.header}>
        <h1 className={styles.title}>Pattern Practice</h1>
        <span className={styles.status} data-state={status}>
          {STATUS_LABEL[status]}
        </span>
      </header>

      <div className={styles.body}>
        <nav className={styles.nav}>
          {patterns.map((p) => (
            <div key={p.id} className={styles.navItem}>
              {p.order}. {p.pattern}
            </div>
          ))}
        </nav>

        <main className={styles.main}>
          <ProblemPanel pattern={pattern} />

          <Editor
            value={code}
            language="python"
            filename={`solution.${runtimeRef.current?.fileExtension ?? 'py'}`}
            onChange={setCode}
            onRun={runTests}
          />

          <div className={styles.actions}>
            <button
              className={styles.runButton}
              onClick={runTests}
              disabled={status !== 'ready' || running}
            >
              {running ? 'Running…' : '▶ Run tests'}
            </button>
            <button className={styles.button} onClick={resetCode}>
              Reset
            </button>
            <span className={styles.shortcut}>⌘/Ctrl + Enter</span>
          </div>

          <OutputPanel text={output} running={running} />
        </main>
      </div>
    </div>
  )
}
