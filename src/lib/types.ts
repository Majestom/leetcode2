import type { LanguageId } from './runtimes'

export type Difficulty = 'easy' | 'medium' | 'hard'

export type TestFile = {
  /** Full path of the source file, useful for debugging. */
  path: string
  /** Filename without extension, e.g. `01_basic`. */
  name: string
  content: string
}

export type Implementation = {
  functionName: string
  starter: string
  setup?: string
  /** Sorted by filename, which is why the files are numbered. */
  tests: TestFile[]
}

export type Pattern = {
  id: string
  order: number
  pattern: string
  title: string
  difficulty: Difficulty
  description: string
  examples: string[]
  hint: string
  implementations: Partial<Record<LanguageId, Implementation>>
}

/** Shape of `patterns/<id>/meta.json` — the on-disk half of a Pattern. */
export type PatternMeta = Omit<Pattern, 'implementations'> & {
  implementations: Partial<Record<LanguageId, { functionName: string }>>
}
