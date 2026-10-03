import type { PatternStatus } from '../lib/types'
import { GLYPH } from '../lib/status'
import styles from './StatusPill.module.css'

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
