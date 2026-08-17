import type { LanguageId } from './runtimes'
import type { Pattern, PatternStatus } from './types'

const STORAGE_KEY = 'pp-progress'

export type ProgressEntry = {
  status: PatternStatus
  lastCode: string
}

/** Keyed by pattern id, then language. */
export type Progress = Record<string, Partial<Record<LanguageId, ProgressEntry>>>

const RANK: Record<PatternStatus, number> = {
  unattempted: 0,
  attempted: 1,
  passed: 2,
}

const VALID_STATUSES = new Set<string>(Object.keys(RANK))

/**
 * Reads and validates the stored blob. Anything malformed is dropped rather
 * than thrown: losing progress is annoying, a white screen is worse.
 */
export function loadProgress(): Progress {
  let raw: string | null = null
  try {
    raw = localStorage.getItem(STORAGE_KEY)
  } catch {
    return {} // storage disabled, e.g. private browsing
  }
  if (!raw) return {}

  let parsed: unknown
  try {
    parsed = JSON.parse(raw)
  } catch {
    console.warn(`[progress] ${STORAGE_KEY} was not valid JSON — starting fresh`)
    return {}
  }
  if (typeof parsed !== 'object' || parsed === null) return {}

  const out: Progress = {}
  for (const [patternId, byLang] of Object.entries(parsed)) {
    if (typeof byLang !== 'object' || byLang === null) continue
    const langs: Partial<Record<LanguageId, ProgressEntry>> = {}
    for (const [lang, entry] of Object.entries(byLang)) {
      if (typeof entry !== 'object' || entry === null) continue
      const { status, lastCode } = entry as Partial<ProgressEntry>
      if (typeof status !== 'string' || !VALID_STATUSES.has(status)) continue
      langs[lang as LanguageId] = {
        status: status as PatternStatus,
        lastCode: typeof lastCode === 'string' ? lastCode : '',
      }
    }
    if (Object.keys(langs).length > 0) out[patternId] = langs
  }
  return out
}

export function saveProgress(progress: Progress): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(progress))
  } catch (err) {
    console.warn('[progress] could not save progress', err)
  }
}

export function getEntry(
  progress: Progress,
  patternId: string,
  lang: LanguageId,
): ProgressEntry | undefined {
  return progress[patternId]?.[lang]
}

export function getStatus(
  progress: Progress,
  patternId: string,
  lang: LanguageId,
): PatternStatus {
  return getEntry(progress, patternId, lang)?.status ?? 'unattempted'
}

function update(
  progress: Progress,
  patternId: string,
  lang: LanguageId,
  changes: Partial<ProgressEntry>,
): Progress {
  const existing = getEntry(progress, patternId, lang) ?? {
    status: 'unattempted' as PatternStatus,
    lastCode: '',
  }
  return {
    ...progress,
    [patternId]: {
      ...progress[patternId],
      [lang]: { ...existing, ...changes },
    },
  }
}

/** Status only ever moves forward, so a failing run cannot undo a pass. */
export function withStatus(
  progress: Progress,
  patternId: string,
  lang: LanguageId,
  status: PatternStatus,
): Progress {
  const current = getStatus(progress, patternId, lang)
  if (RANK[status] <= RANK[current]) return progress
  return update(progress, patternId, lang, { status })
}

export function withCode(
  progress: Progress,
  patternId: string,
  lang: LanguageId,
  lastCode: string,
): Progress {
  if (getEntry(progress, patternId, lang)?.lastCode === lastCode) return progress
  return update(progress, patternId, lang, { lastCode })
}

/** Best status across a pattern's implemented languages, for the sidebar. */
export function aggregateStatus(
  progress: Progress,
  pattern: Pattern,
): PatternStatus {
  let best: PatternStatus = 'unattempted'
  for (const lang of Object.keys(pattern.implementations) as LanguageId[]) {
    const status = getStatus(progress, pattern.id, lang)
    if (RANK[status] > RANK[best]) best = status
  }
  return best
}
