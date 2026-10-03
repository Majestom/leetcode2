import { Annotation, EditorSelection, EditorState, Prec } from '@codemirror/state'
import type { Extension } from '@codemirror/state'
import type { Command } from '@codemirror/view'
import {
  EditorView,
  drawSelection,
  highlightActiveLine,
  highlightActiveLineGutter,
  keymap,
  lineNumbers,
} from '@codemirror/view'
import {
  defaultKeymap,
  history,
  historyKeymap,
  indentLess,
  indentMore,
} from '@codemirror/commands'
import {
  bracketMatching,
  getIndentUnit,
  indentOnInput,
  indentUnit,
} from '@codemirror/language'
import { closeBrackets, closeBracketsKeymap } from '@codemirror/autocomplete'
import { highlightSelectionMatches, searchKeymap } from '@codemirror/search'
import { python } from '@codemirror/lang-python'
import type { LanguageId } from '../runtimes'
import { editorTheme } from './theme'

const LANGUAGE: Record<LanguageId, () => Extension> = { python }

/**
 * Tab as Monaco had it: spaces to the next indent stop at the cursor, or the
 * whole selection indented when there is one. CodeMirror's own insertTab
 * would insert a literal tab character, which Python will not mix with spaces.
 */
export const insertSoftTab: Command = (view) => {
  const { state } = view
  if (state.selection.ranges.some((r) => !r.empty)) return indentMore(view)
  const unit = getIndentUnit(state)
  view.dispatch(
    state.changeByRange((range) => {
      const column = range.head - state.doc.lineAt(range.head).from
      const spaces = ' '.repeat(unit - (column % unit))
      return {
        changes: { from: range.head, insert: spaces },
        range: EditorSelection.cursor(range.head + spaces.length),
      }
    }),
    { scrollIntoView: true, userEvent: 'input' },
  )
  return true
}

/**
 * Marks a transaction that syncs the document from outside (a Reset, say), so
 * the change listener does not echo it straight back as an edit.
 */
export const external = Annotation.define<boolean>()

type Handlers = {
  /** Fired with the full document after any edit not marked `external`. */
  change: (doc: string) => void
  run: () => void
}

export function createEditorState(
  doc: string,
  language: LanguageId,
  handlers: Handlers,
): EditorState {
  return EditorState.create({
    doc,
    extensions: [
      lineNumbers(),
      highlightActiveLineGutter(),
      highlightActiveLine(),
      drawSelection(),
      history(),
      indentOnInput(),
      bracketMatching(),
      closeBrackets(),
      highlightSelectionMatches(),
      indentUnit.of('    '),
      EditorState.tabSize.of(4),
      LANGUAGE[language](),
      editorTheme,
      // Above defaultKeymap, which binds Mod-Enter to insertBlankLine.
      Prec.highest(
        keymap.of([
          {
            key: 'Mod-Enter',
            run: () => {
              handlers.run()
              return true
            },
          },
        ]),
      ),
      keymap.of([
        { key: 'Tab', run: insertSoftTab, shift: indentLess },
        ...closeBracketsKeymap,
        ...defaultKeymap,
        ...historyKeymap,
        ...searchKeymap,
      ]),
      EditorView.updateListener.of((update) => {
        if (
          update.docChanged &&
          update.transactions.some((tr) => !tr.annotation(external))
        ) {
          handlers.change(update.state.doc.toString())
        }
      }),
    ],
  })
}
