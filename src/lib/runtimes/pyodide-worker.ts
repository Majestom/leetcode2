/// <reference lib="webworker" />

import type { WorkerRequest, WorkerResponse } from './types'

const ctx = self as unknown as DedicatedWorkerGlobalScope

const PYODIDE_VERSION = '0.26.4'
const INDEX_URL = `https://cdn.jsdelivr.net/pyodide/v${PYODIDE_VERSION}/full/`

type Pyodide = {
  runPythonAsync(code: string): Promise<unknown>
  setStdout(opts: { batched: (s: string) => void }): void
  setStderr(opts: { batched: (s: string) => void }): void
}

let pyodide: Pyodide | null = null

function post(msg: WorkerResponse) {
  ctx.postMessage(msg)
}

// Loaded from the CDN at runtime rather than bundled, so Vite must not try to
// resolve this specifier at build time.
async function boot() {
  try {
    const mod = await import(/* @vite-ignore */ `${INDEX_URL}pyodide.mjs`)
    pyodide = (await mod.loadPyodide({ indexURL: INDEX_URL })) as Pyodide
    post({ type: 'ready' })
  } catch (err) {
    post({ type: 'boot-error', message: errorMessage(err) })
  }
}

void boot()

ctx.onmessage = async (e: MessageEvent<WorkerRequest>) => {
  if (e.data.type !== 'run') return

  if (!pyodide) {
    post({ type: 'result', stdout: '', stderr: 'Runtime not ready', ok: false })
    return
  }

  let stdout = ''
  let stderr = ''
  pyodide.setStdout({
    batched: (s) => {
      stdout += s + '\n'
    },
  })
  pyodide.setStderr({
    batched: (s) => {
      stderr += s + '\n'
    },
  })

  try {
    await pyodide.runPythonAsync(e.data.code)
    post({ type: 'result', stdout, stderr, ok: true })
  } catch (err) {
    const detail = errorMessage(err)
    post({
      type: 'result',
      stdout,
      stderr: stderr ? `${stderr}\n${detail}` : detail,
      ok: false,
    })
  }
}

function errorMessage(err: unknown): string {
  if (err instanceof Error) return err.message
  return String(err)
}
