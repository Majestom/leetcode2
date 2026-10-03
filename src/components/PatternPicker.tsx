import type { Pattern, PatternStatus } from '../lib/types'
import { GLYPH } from '../lib/status'
import styles from './PatternPicker.module.css'

type Props = {
  patterns: Pattern[]
  selectedId: string
  statuses: Record<string, PatternStatus>
  onSelect: (id: string) => void
}

/**
 * The phone stand-in for PatternNav. A native select gets the platform's own
 * picker sheet, which beats any list we could fit in a header. Options are
 * plain text, so the status glyph is inlined rather than rendered as a pill.
 */
export default function PatternPicker({
  patterns,
  selectedId,
  statuses,
  onSelect,
}: Props) {
  return (
    <select
      className={styles.picker}
      aria-label="Pattern"
      value={selectedId}
      onChange={(e) => onSelect(e.target.value)}
    >
      {patterns.map((p) => (
        <option key={p.id} value={p.id}>
          {GLYPH[statuses[p.id] ?? 'unattempted']} {p.order}. {p.pattern}
        </option>
      ))}
    </select>
  )
}
