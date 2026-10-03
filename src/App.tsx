import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { createRuntime } from './lib/runtimes'
import type { LanguageId, Runtime } from './lib/runtimes'
import { allTestsPassed, buildTestScript, patterns } from './lib/patterns'
import {
  aggregateStatus,
  getEntry,
  loadProgress,
  saveProgress,
  withCode,
  withStatus,
} from './lib/progress'
import type { Progress } from './lib/progress'
import type { PatternStatus } from './lib/types'
import ProblemPanel from './components/ProblemPanel'
import PatternNav from './components/PatternNav'
import LanguageTabs from './components/LanguageTabs'
import Editor from './components/Editor'
import OutputPanel from './components/OutputPanel'
import Logo from './components/Logo'
import PatternPicker from './components/PatternPicker'
import PaneSwitcher from './components/PaneSwitcher'
import type { Pane } from './components/PaneSwitcher'
import styles from './App.module.css'

type RuntimeStatus = 'loading' | 'ready' | 'failed'

const STATUS_LABEL: Record<RuntimeStatus, string> = {
  loading: 'Runtime loading…',
  ready: 'Runtime ready',
  failed: 'Runtime failed',
}

const FILE_EXTENSION: Record<LanguageId, string> = { python: 'py' }

/** Editing writes on every keystroke; persistence waits for a pause. */
const SAVE_DEBOUNCE_MS = 300

export default function App() {
  const runtimeRef = useRef<Runtime | null>(null)
  const [runtimeStatus, setRuntimeStatus] = useState<RuntimeStatus>('loading')
  const [running, setRunning] = useState(false)
  const [output, setOutput] = useState('')
  // Only consulted by the phone layout; wider layouts show every pane at once.
  const [pane, setPane] = useState<Pane>('problem')

  const [selectedId, setSelectedId] = useState(patterns[0]?.id ?? '')
  const [lang, setLang] = useState<LanguageId>('python')
  const [progress, setProgress] = useState<Progress>(loadProgress)

  const pattern = patterns.find((p) => p.id === selectedId) ?? patterns[0]
  const languages = useMemo(
    () =>
      pattern ? (Object.keys(pattern.implementations) as LanguageId[]) : [],
    [pattern],
  )
  const activeLang = languages.includes(lang) ? lang : languages[0]
  const impl =
    pattern && activeLang ? pattern.implementations[activeLang] : undefined

  const code =
    (pattern && activeLang
      ? getEntry(progress, pattern.id, activeLang)?.lastCode
      : undefined) ??
    impl?.starter ??
    ''

  useEffect(() => {
    const timer = setTimeout(() => saveProgress(progress), SAVE_DEBOUNCE_MS)
    return () => clearTimeout(timer)
  }, [progress])

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
      if (!pattern || !activeLang) return
      setProgress((prev) => withCode(prev, pattern.id, activeLang, value))
    },
    [activeLang, pattern],
  )

  const runTests = useCallback(async () => {
    const runtime = runtimeRef.current
    if (!runtime || !pattern || !impl || !activeLang) return
    setRunning(true)
    setPane('output')
    setProgress((prev) => withStatus(prev, pattern.id, activeLang, 'attempted'))

    const result = await runtime.run(buildTestScript(pattern, activeLang, code))

    setRunning(false)
    setOutput(
      [result.stdout, result.stderr]
        .filter(Boolean)
        .join('\n')
        .replace(/\n+$/, ''),
    )
    if (allTestsPassed(result.stdout)) {
      setProgress((prev) => withStatus(prev, pattern.id, activeLang, 'passed'))
    }
  }, [activeLang, code, impl, pattern])

  // The editor handles the shortcut while it has focus; this covers the rest of
  // the page, e.g. straight after clicking a pattern in the sidebar.
  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (e.key !== 'Enter' || !(e.metaKey || e.ctrlKey)) return
      e.preventDefault()
      if (!running && runtimeStatus === 'ready') void runTests()
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [running, runTests, runtimeStatus])

  function selectPattern(id: string) {
    setSelectedId(id)
    setOutput('')
    setPane('problem')
  }

  function resetCode() {
    if (!pattern || !activeLang) return
    setProgress((prev) =>
      withCode(prev, pattern.id, activeLang, impl?.starter ?? ''),
    )
    setOutput('')
  }

  const aggregateStatuses = useMemo(() => {
    const out: Record<string, PatternStatus> = {}
    for (const p of patterns) out[p.id] = aggregateStatus(progress, p)
    return out
  }, [progress])

  const passedCount = Object.values(aggregateStatuses).filter(
    (s) => s === 'passed',
  ).length

  if (!pattern || !impl || !activeLang) {
    return <div className={styles.app}>No patterns loaded.</div>
  }

  return (
    <div className={styles.app}>
      <header className={styles.header}>
        <h1 className={styles.title}>
          <Logo />
          Pattern Practice
        </h1>
        <span className={styles.status} data-state={runtimeStatus}>
          {STATUS_LABEL[runtimeStatus]} · {passedCount}/{patterns.length}
        </span>
        <PatternPicker
          patterns={patterns}
          selectedId={pattern.id}
          statuses={aggregateStatuses}
          onSelect={selectPattern}
        />
      </header>

      <div className={styles.body}>
        <PatternNav
          patterns={patterns}
          selectedId={pattern.id}
          statuses={aggregateStatuses}
          onSelect={selectPattern}
        />

        <main className={styles.main} data-active={pane}>
          <PaneSwitcher selected={pane} onSelect={setPane} />

          <div className={styles.pane} data-pane="problem">
            <ProblemPanel pattern={pattern} />
          </div>

          <div className={styles.pane} data-pane="code">
            <LanguageTabs
              languages={languages}
              selected={activeLang}
              onSelect={setLang}
            />

            <Editor
              value={code}
              language={activeLang}
              filename={`solution.${FILE_EXTENSION[activeLang]}`}
              docKey={`${pattern.id}:${activeLang}`}
              onChange={setCode}
              onRun={runTests}
            />
          </div>

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

          <div className={styles.pane} data-pane="output">
            <OutputPanel text={output} running={running} />
          </div>
        </main>
      </div>
    </div>
  )
}
