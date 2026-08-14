import type { LanguageId } from '../lib/runtimes'
import styles from './LanguageTabs.module.css'

const DISPLAY_NAME: Record<LanguageId, string> = {
  python: 'Python',
}

type Props = {
  languages: LanguageId[]
  selected: LanguageId
  onSelect: (lang: LanguageId) => void
}

/**
 * Hidden while a pattern has a single implementation, which is every pattern
 * until a second language is added. Wired now so that day is content-only.
 */
export default function LanguageTabs({
  languages,
  selected,
  onSelect,
}: Props) {
  if (languages.length < 2) return null

  return (
    <div className={styles.tabs} role="tablist">
      {languages.map((lang) => (
        <button
          key={lang}
          role="tab"
          aria-selected={lang === selected}
          className={styles.tab}
          data-selected={lang === selected}
          onClick={() => onSelect(lang)}
        >
          {DISPLAY_NAME[lang] ?? lang}
        </button>
      ))}
    </div>
  )
}
