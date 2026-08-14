import { useEffect, useState } from 'react'
import type { Pattern } from '../lib/types'
import styles from './ProblemPanel.module.css'

type Props = { pattern: Pattern }

export default function ProblemPanel({ pattern }: Props) {
  const [showHint, setShowHint] = useState(false)

  // A hint revealed for one pattern should not stay revealed for the next.
  useEffect(() => setShowHint(false), [pattern.id])

  return (
    <section className={styles.panel}>
      <header className={styles.header}>
        <span className={styles.badge} data-difficulty={pattern.difficulty}>
          {pattern.difficulty}
        </span>
        <h2 className={styles.title}>{pattern.title}</h2>
        <span className={styles.pattern}>{pattern.pattern}</span>
      </header>

      <p className={styles.description}>{pattern.description}</p>

      {pattern.examples.length > 0 && (
        <pre className={styles.examples}>{pattern.examples.join('\n')}</pre>
      )}

      {pattern.hint &&
        (showHint ? (
          <p className={styles.hint}>{pattern.hint}</p>
        ) : (
          <button
            className={styles.hintButton}
            onClick={() => setShowHint(true)}
          >
            Show hint
          </button>
        ))}
    </section>
  )
}
