import type { EditorView } from '@codemirror/view'
import {
  cursorCharLeft,
  cursorCharRight,
  indentLess,
  redo,
  undo,
} from '@codemirror/commands'
import { insertBracket } from '@codemirror/autocomplete'
import { insertSoftTab } from '../lib/editor/setup'
import styles from './KeyBar.module.css'

type Key = { label: string; title: string; run: (view: EditorView) => void }

/**
 * Brackets and quotes go through closeBrackets' insertBracket, so a key-bar
 * "(" auto-closes and a key-bar ")" steps over an auto-inserted one, exactly
 * as typing them would.
 */
function insertText(view: EditorView, text: string) {
  const bracketed = insertBracket(view.state, text)
  view.dispatch(
    bracketed ??
      view.state.update(view.state.replaceSelection(text), {
        scrollIntoView: true,
        userEvent: 'input.type',
      }),
  )
}

const char = (c: string): Key => ({
  label: c,
  title: c,
  run: (view) => insertText(view, c),
})

/** Ordered by how often Python drills reach for them. */
const KEYS: Key[] = [
  { label: 'Tab', title: 'Indent', run: insertSoftTab },
  { label: '⇧Tab', title: 'Dedent', run: indentLess },
  ...[':', '(', ')', '[', ']', '_', '=', "'", '"', '{', '}', '#'].map(char),
  { label: '←', title: 'Cursor left', run: cursorCharLeft },
  { label: '→', title: 'Cursor right', run: cursorCharRight },
  { label: '↶', title: 'Undo', run: undo },
  { label: '↷', title: 'Redo', run: redo },
]

type Props = { getView: () => EditorView | null }

/**
 * Touch screens only: the keys a phone keyboard buries a layer or two deep.
 * Pointer-down is cancelled so a tap never takes focus from the editor, which
 * would drop the on-screen keyboard.
 */
export default function KeyBar({ getView }: Props) {
  return (
    <div className={styles.bar} role="toolbar" aria-label="Extra keys">
      {KEYS.map((k) => (
        <button
          key={k.title}
          type="button"
          className={styles.key}
          title={k.title}
          aria-label={k.title}
          onPointerDown={(e) => e.preventDefault()}
          onMouseDown={(e) => e.preventDefault()}
          onClick={() => {
            const view = getView()
            if (!view) return
            k.run(view)
            view.focus()
          }}
        >
          {k.label}
        </button>
      ))}
    </div>
  )
}
