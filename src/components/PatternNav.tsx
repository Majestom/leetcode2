import type { Pattern, PatternStatus } from '../lib/types'
import StatusPill from './StatusPill'
import styles from './PatternNav.module.css'

type Props = {
  patterns: Pattern[]
  selectedId: string
  /** Aggregate status per pattern id, best across implemented languages. */
  statuses: Record<string, PatternStatus>
  onSelect: (id: string) => void
}

export default function PatternNav({
  patterns,
  selectedId,
  statuses,
  onSelect,
}: Props) {
  return (
    <nav className={styles.nav} aria-label="Patterns">
      <div className={styles.heading}>Patterns</div>
      <ul className={styles.list}>
        {patterns.map((p) => (
          <li key={p.id}>
            <button
              className={styles.item}
              data-selected={p.id === selectedId}
              onClick={() => onSelect(p.id)}
            >
              <StatusPill status={statuses[p.id] ?? 'unattempted'} />
              <span className={styles.order}>{p.order}.</span>
              <span className={styles.label}>{p.pattern}</span>
            </button>
          </li>
        ))}
      </ul>
    </nav>
  )
}
