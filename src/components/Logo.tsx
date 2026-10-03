import styles from './Logo.module.css'

/**
 * Two pointers converging on a target: the first pattern in the set, and a
 * reasonable stand-in for the rest. Currentcolor for the chevrons so the mark
 * inherits the surrounding text colour. Decorative: it always sits beside the
 * app name, so it is hidden from assistive tech rather than labelled twice.
 */
export default function Logo({ size = 20 }: { size?: number }) {
  return (
    <svg
      className={styles.logo}
      width={size}
      height={size}
      viewBox="0 0 32 32"
      aria-hidden="true"
    >
      <g
        fill="none"
        stroke="currentcolor"
        strokeWidth="3.4"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M6 9.5 11 16 6 22.5" />
        <path d="M26 9.5 21 16 26 22.5" />
      </g>
      <circle cx="16" cy="16" r="2.3" className={styles.target} />
    </svg>
  )
}
