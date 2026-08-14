import type { PatternStatus } from '../lib/types'
import styles from './StatusPill.module.css'

const GLYPH: Record<PatternStatus, string> = {
  passed: '●',
  attempted: '◐',
  unattempted: '○',
}

const LABEL: Record<PatternStatus, string> = {
  passed: 'all tests passing',
  attempted: 'attempted',
  unattempted: 'not attempted',
}

export default function StatusPill({ status }: { status: PatternStatus }) {
  return (
    <span className={styles.pill} data-status={status} title={LABEL[status]}>
      {GLYPH[status]}
    </span>
  )
}
