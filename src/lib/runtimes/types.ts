export type LanguageId = 'python' // | 'typescript' | 'javascript' — later

export type RunResult = {
  stdout: string
  stderr: string
  ok: boolean
  timedOut: boolean
  elapsedMs: number
}

export interface Runtime {
  language: LanguageId
  displayName: string
  fileExtension: string
  /** Monaco's language id for syntax highlighting. */
  monacoLanguage: string
  /** Resolves once the runtime can accept `run()` calls; rejects if it failed to boot. */
  isReady(): Promise<void>
  run(code: string, timeoutMs?: number): Promise<RunResult>
  dispose(): void
}

/** Messages the UI thread sends to a runtime worker. */
export type WorkerRequest = { type: 'run'; code: string }

/** Messages a runtime worker sends back. */
export type WorkerResponse =
  | { type: 'ready' }
  | { type: 'boot-error'; message: string }
  | { type: 'result'; stdout: string; stderr: string; ok: boolean }
