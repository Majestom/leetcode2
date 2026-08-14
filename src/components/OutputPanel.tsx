import styles from './OutputPanel.module.css'

type Props = {
  /** Combined stdout/stderr of the last run; empty before the first run. */
  text: string
  running: boolean
}

type LineKind = 'pass' | 'fail' | 'error' | 'summary' | 'plain'

function classify(line: string): LineKind {
  if (line.startsWith('PASS')) return 'pass'
  if (line.startsWith('FAIL')) return 'fail'
  if (line.startsWith('ERROR')) return 'error'
  if (/^\d+\/\d+ tests passed$/.test(line.trim())) return 'summary'
  return 'plain'
}

export default function OutputPanel({ text, running }: Props) {
  const lines = text.split('\n')

  return (
    <section className={styles.panel}>
      <div className={styles.header}>Output</div>
      <pre className={styles.body}>
        {running && <span className={styles.running}>Running…</span>}
        {!running && text === '' && (
          <span className={styles.placeholder}>
            Run the tests to see results here.
          </span>
        )}
        {!running &&
          text !== '' &&
          lines.map((line, i) => (
            <div key={i} className={styles.line} data-kind={classify(line)}>
              {line === '' ? ' ' : line}
            </div>
          ))}
      </pre>
    </section>
  )
}
