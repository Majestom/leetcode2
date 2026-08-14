import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { createRuntime } from './lib/runtimes'
import type { LanguageId, Runtime } from './lib/runtimes'
import { allTestsPassed, buildTestScript, patterns } from './lib/patterns'
import type { PatternStatus } from './lib/types'
import ProblemPanel from './components/ProblemPanel'
import PatternNav from './components/PatternNav'
import LanguageTabs from './components/LanguageTabs'
import Editor from './components/Editor'
import OutputPanel from './components/OutputPanel'
import styles from './App.module.css'

type RuntimeStatus = 'loading' | 'ready' | 'failed'

const STATUS_LABEL: Record<RuntimeStatus, string> = {
  loading: 'Runtime loading…',
  ready: 'Runtime ready',
  failed: 'Runtime failed',
}

/** Progress is per (pattern, language); stage 6 persists this to localStorage. */
const key = (patternId: string, lang: LanguageId) => `${patternId}:${lang}`

const FILE_EXTENSION: Record<LanguageId, string> = { python: 'py' }
const MONACO_LANGUAGE: Record<LanguageId, string> = { python: 'python' }

const RANK: Record<PatternStatus, number> = {
  unattempted: 0,
  attempted: 1,
  passed: 2,
}

export default function App() {
  const runtimeRef = useRef<Runtime | null>(null)
  const [runtimeStatus, setRuntimeStatus] = useState<RuntimeStatus>('loading')
  const [running, setRunning] = useState(false)
  const [output, setOutput] = useState('')

  const [selectedId, setSelectedId] = useState(patterns[0]?.id ?? '')
  const [lang, setLang] = useState<LanguageId>('python')
  const [codeByKey, setCodeByKey] = useState<Record<string, string>>({})
  const [statusByKey, setStatusByKey] = useState<Record<string, PatternStatus>>(
    {},
  )

  const pattern = patterns.find((p) => p.id === selectedId) ?? patterns[0]
  const languages = useMemo(
    () => (pattern ? (Object.keys(pattern.implementations) as LanguageId[]) : []),
    [pattern],
  )
  const activeLang = languages.includes(lang) ? lang : languages[0]
  const impl = pattern && activeLang ? pattern.implementations[activeLang] : undefined

  const currentKey = pattern && activeLang ? key(pattern.id, activeLang) : ''
  const code = codeByKey[currentKey] ?? impl?.starter ?? ''

  // One runtime per language: switching language tabs tears the old one down
  // and boots the new one.
  useEffect(() => {
    if (!activeLang) return
    setRuntimeStatus('loading')
    const runtime = createRuntime(activeLang)
    runtimeRef.current = runtime
    let cancelled = false

    runtime.isReady().then(
      () => !cancelled && setRuntimeStatus('ready'),
      (err: unknown) => {
        if (cancelled) return
        setRuntimeStatus('failed')
        setOutput(err instanceof Error ? err.message : String(err))
      },
    )

    return () => {
      cancelled = true
      runtime.dispose()
      runtimeRef.current = null
    }
  }, [activeLang])

  const setCode = useCallback(
    (value: string) => {
      if (!currentKey) return
      setCodeByKey((prev) => ({ ...prev, [currentKey]: value }))
    },
    [currentKey],
  )

  /** Statuses only ever move forward: attempted never overwrites passed. */
  const advanceStatus = useCallback(
    (next: PatternStatus) => {
      if (!currentKey) return
      setStatusByKey((prev) => {
        const current = prev[currentKey] ?? 'unattempted'
        if (RANK[next] <= RANK[current]) return prev
        return { ...prev, [currentKey]: next }
      })
    },
    [currentKey],
  )

  const runTests = useCallback(async () => {
    const runtime = runtimeRef.current
    if (!runtime || !pattern || !impl || !activeLang) return
    setRunning(true)
    advanceStatus('attempted')
    const result = await runtime.run(buildTestScript(pattern, activeLang, code))
    setRunning(false)
    setOutput(
      [result.stdout, result.stderr]
        .filter(Boolean)
        .join('\n')
        .replace(/\n+$/, ''),
    )
    if (allTestsPassed(result.stdout)) advanceStatus('passed')
  }, [activeLang, advanceStatus, code, impl, pattern])

  function selectPattern(id: string) {
    setSelectedId(id)
    setOutput('')
  }

  function resetCode() {
    if (!currentKey) return
    setCodeByKey((prev) => ({ ...prev, [currentKey]: impl?.starter ?? '' }))
    setOutput('')
  }

  /** Sidebar shows the best status across a pattern's implemented languages. */
  const aggregateStatuses = useMemo(() => {
    const out: Record<string, PatternStatus> = {}
    for (const p of patterns) {
      let best: PatternStatus = 'unattempted'
      for (const l of Object.keys(p.implementations) as LanguageId[]) {
        const status = statusByKey[key(p.id, l)] ?? 'unattempted'
        if (RANK[status] > RANK[best]) best = status
      }
      out[p.id] = best
    }
    return out
  }, [statusByKey])

  const passedCount = Object.values(aggregateStatuses).filter(
    (s) => s === 'passed',
  ).length

  if (!pattern || !impl || !activeLang) {
    return <div className={styles.app}>No patterns loaded.</div>
  }

  return (
    <div className={styles.app}>
      <header className={styles.header}>
        <h1 className={styles.title}>Pattern Practice</h1>
        <span className={styles.status} data-state={runtimeStatus}>
          {STATUS_LABEL[runtimeStatus]} · {passedCount}/{patterns.length}
        </span>
      </header>

      <div className={styles.body}>
        <PatternNav
          patterns={patterns}
          selectedId={pattern.id}
          statuses={aggregateStatuses}
          onSelect={selectPattern}
        />

        <main className={styles.main}>
          <ProblemPanel pattern={pattern} />

          <LanguageTabs
            languages={languages}
            selected={activeLang}
            onSelect={setLang}
          />

          <Editor
            value={code}
            language={MONACO_LANGUAGE[activeLang]}
            filename={`solution.${FILE_EXTENSION[activeLang]}`}
            onChange={setCode}
            onRun={runTests}
          />

          <div className={styles.actions}>
            <button
              className={styles.runButton}
              onClick={runTests}
              disabled={runtimeStatus !== 'ready' || running}
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
