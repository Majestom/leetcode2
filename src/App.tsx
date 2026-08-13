import styles from './App.module.css'

export default function App() {
  return (
    <div className={styles.app}>
      <header className={styles.header}>
        <h1 className={styles.title}>Pattern Practice</h1>
        <span className={styles.status}>runtime not wired yet</span>
      </header>

      <div className={styles.body}>
        <nav className={styles.nav}>Patterns</nav>

        <main className={styles.main}>
          Problem, editor and output panels land here in later stages.
        </main>
      </div>
    </div>
  )
}
