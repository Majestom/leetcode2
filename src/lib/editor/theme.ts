import { EditorView } from '@codemirror/view'
import { HighlightStyle, syntaxHighlighting } from '@codemirror/language'
import { tags as t } from '@lezer/highlight'

/**
 * Chrome in the app's slate palette; token colours follow VS Code's Dark+, so
 * code reads the way it did under Monaco's vs-dark.
 */
const chrome = EditorView.theme(
  {
    '&': {
      height: '100%',
      backgroundColor: '#0b1220',
      color: '#d4d4d4',
    },
    '&.cm-focused': { outline: 'none' },
    '.cm-scroller': {
      fontFamily: 'var(--font-mono)',
      lineHeight: '1.55',
    },
    '.cm-content': { caretColor: 'var(--accent)' },
    '.cm-cursor, .cm-dropCursor': { borderLeftColor: 'var(--accent)' },
    '&.cm-focused > .cm-scroller > .cm-selectionLayer .cm-selectionBackground, .cm-selectionBackground, .cm-content ::selection':
      { backgroundColor: '#264f78' },
    '.cm-activeLine': { backgroundColor: '#ffffff08' },
    '.cm-gutters': {
      backgroundColor: '#0b1220',
      color: '#475569',
      border: 'none',
    },
    '.cm-activeLineGutter': {
      backgroundColor: 'transparent',
      color: 'var(--text-dim)',
    },
    '.cm-lineNumbers .cm-gutterElement': { padding: '0 10px 0 8px' },
    '.cm-matchingBracket': {
      backgroundColor: '#ffffff14',
      outline: '1px solid #ffffff30',
    },
    '.cm-selectionMatch': { backgroundColor: '#ffffff12' },
    '.cm-panels': {
      backgroundColor: 'var(--panel)',
      color: 'var(--text)',
    },
    '.cm-panels-bottom': { borderTop: '1px solid var(--border)' },
    '.cm-searchMatch': { backgroundColor: '#623315' },
    '.cm-searchMatch-selected': { backgroundColor: '#515c6a' },
  },
  { dark: true },
)

const highlight = HighlightStyle.define([
  { tag: [t.keyword, t.operatorKeyword, t.modifier], color: '#569cd6' },
  { tag: [t.controlKeyword, t.moduleKeyword], color: '#c586c0' },
  { tag: [t.string, t.special(t.string)], color: '#ce9178' },
  { tag: [t.number, t.bool, t.null], color: '#b5cea8' },
  { tag: t.comment, color: '#6a9955', fontStyle: 'italic' },
  {
    tag: [t.function(t.variableName), t.function(t.propertyName)],
    color: '#dcdcaa',
  },
  { tag: t.definition(t.function(t.variableName)), color: '#dcdcaa' },
  { tag: [t.className, t.typeName], color: '#4ec9b0' },
  { tag: [t.variableName, t.propertyName], color: '#9cdcfe' },
  { tag: t.self, color: '#569cd6' },
  { tag: [t.operator, t.punctuation, t.bracket], color: '#d4d4d4' },
  { tag: t.invalid, color: 'var(--fail)' },
])

export const editorTheme = [chrome, syntaxHighlighting(highlight)]
