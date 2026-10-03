import PyodideWorker from './pyodide-worker.ts?worker'
import type { Runtime, RunResult, WorkerResponse } from './types'

const DEFAULT_TIMEOUT_MS = 8000

/**
 * CPython via Pyodide, running in a Web Worker.
 *
 * Timeouts are handled by killing the worker and spawning a fresh one — Pyodide
 * has no way to interrupt a running `while True:` without SharedArrayBuffer.
 */
export class PyodideRuntime implements Runtime {
  language = 'python' as const
  displayName = 'Python'
  fileExtension = 'py'

  private worker: Worker | null = null
  private readyPromise!: Promise<void>
  private disposed = false
  /** Set while a run is in flight; consumes the next `result` message. */
  private pending: ((msg: WorkerResponse) => void) | null = null

  constructor() {
    this.spawn()
  }

  private spawn() {
    this.pending = null
    this.readyPromise = new Promise<void>((resolve, reject) => {
      const worker = new PyodideWorker()
      this.worker = worker
      worker.onmessage = (e: MessageEvent<WorkerResponse>) => {
        const msg = e.data
        if (msg.type === 'ready') {
          resolve()
        } else if (msg.type === 'boot-error') {
          reject(new Error(`Python runtime failed to load: ${msg.message}`))
        } else if (msg.type === 'result') {
          this.pending?.(msg)
        }
      }
      worker.onerror = (e) => {
        reject(new Error(`Python runtime worker error: ${e.message}`))
      }
    })
    // A boot failure surfaces through isReady() and run(); keep it from also
    // landing as an unhandled rejection when nobody is awaiting yet.
    this.readyPromise.catch(() => {})
  }

  isReady(): Promise<void> {
    return this.readyPromise
  }

  async run(code: string, timeoutMs = DEFAULT_TIMEOUT_MS): Promise<RunResult> {
    const start = performance.now()
    const elapsed = () => performance.now() - start

    try {
      await this.readyPromise
    } catch (err) {
      return {
        stdout: '',
        stderr: err instanceof Error ? err.message : String(err),
        ok: false,
        timedOut: false,
        elapsedMs: elapsed(),
      }
    }

    const worker = this.worker
    if (!worker || this.disposed) {
      return {
        stdout: '',
        stderr: 'Python runtime has been disposed',
        ok: false,
        timedOut: false,
        elapsedMs: elapsed(),
      }
    }

    return new Promise<RunResult>((resolve) => {
      let done = false

      const timer = setTimeout(() => {
        if (done) return
        done = true
        this.pending = null
        worker.terminate()
        this.spawn() // fresh worker for the next call
        resolve({
          stdout: '',
          stderr: `Execution timed out after ${timeoutMs}ms`,
          ok: false,
          timedOut: true,
          elapsedMs: elapsed(),
        })
      }, timeoutMs)

      this.pending = (msg) => {
        if (done || msg.type !== 'result') return
        done = true
        clearTimeout(timer)
        this.pending = null
        resolve({
          stdout: msg.stdout,
          stderr: msg.stderr,
          ok: msg.ok,
          timedOut: false,
          elapsedMs: elapsed(),
        })
      }

      worker.postMessage({ type: 'run', code })
    })
  }

  dispose() {
    this.disposed = true
    this.pending = null
    this.worker?.terminate()
    this.worker = null
  }
}
