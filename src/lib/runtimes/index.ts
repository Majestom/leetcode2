import type { LanguageId, Runtime } from './types'
import { PyodideRuntime } from './pyodide-runtime'

export function createRuntime(lang: LanguageId): Runtime {
  switch (lang) {
    case 'python':
      return new PyodideRuntime()
    // case 'typescript': return new TypeScriptRuntime()
    // case 'javascript': return new JavaScriptRuntime()
    default:
      throw new Error(`no runtime for ${lang}`)
  }
}

export type { LanguageId, RunResult, Runtime } from './types'
