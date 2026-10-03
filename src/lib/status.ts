import type { PatternStatus } from './types'

/** Progress glyphs, shared by the sidebar pills and the phone picker. */
export const GLYPH: Record<PatternStatus, string> = {
  passed: '●',
  attempted: '◐',
  unattempted: '○',
}
