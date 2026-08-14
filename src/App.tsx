import { useEffect, useRef, useState } from 'react'
import { createRuntime } from './lib/runtimes'
import type { Runtime } from './lib/runtimes'
import { allTestsPassed, buildTestScript, patterns } from './lib/patterns'
import styles from './App.module.css'

// Temporary scaffolding for stage 3: a known-good solution, so a run can be
// checked end to end before the editor exists. Removed in stage 4.
const REFERENCE_SOLUTION = `def pair_sum(nums, target):
    lo, hi = 0, len(nums) - 1
    while lo < hi:
        total = nums[lo] + nums[hi]
        if total == target:
            return (lo, hi)
        if total < target:
            lo += 1
        else:
            hi -= 1
    return (-1, -1)
`

type RuntimeStatus = 'loading' | 'ready' | 'failed'

export default function App() {
  const runtimeRef = useRef<Runtime | null>(null)
  const [status, setStatus] = useState<RuntimeStatus>('loading')
  const [output, setOutput] = useState('')
  const [running, setRunning] = useState(false)

  const pattern = patterns[0]

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

  async function runCode(userCode: string) {
    const runtime = runtimeRef.current
    if (!runtime || !pattern) return
    setRunning(true)
    const script = buildTestScript(pattern, 'python', userCode)
    const result = await runtime.run(script)
    setRunning(false)
    setOutput(
      [result.stdout, result.stderr].filter(Boolean).join('\n').trimEnd() +
        `\n\n[ok=${result.ok} passed=${allTestsPassed(result.stdout)} ${Math.round(result.elapsedMs)}ms]`,
    )
  }

  const statusLabel = {
    loading: 'Runtime loading…',
    ready: 'Runtime ready',
    failed: 'Runtime failed',
  }[status]

  const impl = pattern?.implementations.python

  return (
    <div className={styles.app}>
      <header className={styles.header}>
        <h1 className={styles.title}>Pattern Practice</h1>
        <span className={styles.status} data-state={status}>
          {statusLabel}
        </span>
      </header>

      <div className={styles.body}>
        <nav className={styles.nav}>
          {patterns.map((p) => (
            <div key={p.id}>
              {p.order}. {p.pattern}
            </div>
          ))}
        </nav>

        <main className={styles.main}>
          {pattern && impl ? (
            <>
              <p>
                {pattern.title} — {impl.tests.length} tests
              </p>
              <button
                className={styles.runButton}
                onClick={() => runCode(REFERENCE_SOLUTION)}
                disabled={status !== 'ready' || running}
              >
                {running ? 'Running…' : '▶ Run reference solution'}
              </button>{' '}
              <button
                className={styles.runButton}
                onClick={() => runCode(impl.starter)}
                disabled={status !== 'ready' || running}
              >
                ▶ Run starter (should fail)
              </button>
            </>
          ) : (
            <p>No patterns loaded.</p>
          )}
          {output && <pre className={styles.output}>{output}</pre>}
        </main>
      </div>
    </div>
  )
}
