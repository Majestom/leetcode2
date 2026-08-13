import { useEffect, useRef, useState } from 'react'
import { createRuntime } from './lib/runtimes'
import type { Runtime } from './lib/runtimes'
import styles from './App.module.css'

const SMOKE_TEST_CODE = `print("hi from CPython")
import sys
print(sys.version)`

type RuntimeStatus = 'loading' | 'ready' | 'failed'

export default function App() {
  const runtimeRef = useRef<Runtime | null>(null)
  const [status, setStatus] = useState<RuntimeStatus>('loading')
  const [output, setOutput] = useState('')
  const [running, setRunning] = useState(false)

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

  async function runSmokeTest() {
    const runtime = runtimeRef.current
    if (!runtime) return
    setRunning(true)
    const result = await runtime.run(SMOKE_TEST_CODE)
    setRunning(false)
    setOutput(
      [result.stdout, result.stderr].filter(Boolean).join('\n').trimEnd() +
        `\n\n[ok=${result.ok} timedOut=${result.timedOut} ${Math.round(result.elapsedMs)}ms]`,
    )
  }

  const statusLabel = {
    loading: 'Runtime loading…',
    ready: 'Runtime ready',
    failed: 'Runtime failed',
  }[status]

  return (
    <div className={styles.app}>
      <header className={styles.header}>
        <h1 className={styles.title}>Pattern Practice</h1>
        <span className={styles.status} data-state={status}>
          {statusLabel}
        </span>
      </header>

      <div className={styles.body}>
        <nav className={styles.nav}>Patterns</nav>

        <main className={styles.main}>
          {/* Temporary scaffolding: proves the runtime round-trips. Replaced by
              the problem/editor/output panels in the next stages. */}
          <button
            className={styles.runButton}
            onClick={runSmokeTest}
            disabled={status !== 'ready' || running}
          >
            {running ? 'Running…' : '▶ Run print("hi")'}
          </button>
          {output && <pre className={styles.output}>{output}</pre>}
        </main>
      </div>
    </div>
  )
}
