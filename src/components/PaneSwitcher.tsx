import styles from './PaneSwitcher.module.css'

export type Pane = 'problem' | 'code' | 'output'

const PANES: { id: Pane; label: string }[] = [
  { id: 'problem', label: 'Problem' },
  { id: 'code', label: 'Code' },
  { id: 'output', label: 'Output' },
]

type Props = {
  selected: Pane
  onSelect: (pane: Pane) => void
}

/** Phone only: one pane at a time instead of a stack too tall to use. */
export default function PaneSwitcher({ selected, onSelect }: Props) {
  return (
    <div className={styles.switcher} role="tablist" aria-label="View">
      {PANES.map((p) => (
        <button
          key={p.id}
          role="tab"
          aria-selected={p.id === selected}
          className={styles.segment}
          data-selected={p.id === selected}
          onClick={() => onSelect(p.id)}
        >
          {p.label}
        </button>
      ))}
    </div>
  )
}
