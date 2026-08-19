# Pattern Practice

A personal drilling ground for the sixteen classic LeetCode-style algorithm patterns. Runs entirely in the browser: real CPython via [Pyodide](https://pyodide.org) in a Web Worker, with no server and no host Python install.

Full design notes live in [spec.md](spec.md).

## Running it

```bash
npm install
npm run dev      # http://localhost:5173
```

The first load pulls Pyodide (~10 MB) and the Monaco editor from jsDelivr, so it needs a network connection; both are cached by the browser afterwards. The header reports when the runtime is ready.

```bash
npm run build    # type-check and bundle to dist/
npm run preview  # serve the production build
npm run lint     # oxlint
```

## Using it

Pick a pattern from the sidebar, write your solution in the editor, and hit **Run tests** or **⌘/Ctrl + Enter**. Output is coloured per line: green `PASS`, red `FAIL`, amber `ERROR`, with a bold `N/N tests passed` summary.

The sidebar glyph tracks progress: `○` unattempted, `◐` attempted, `●` all tests passing. Progress and your latest code are saved to `localStorage` under `pp-progress`, per pattern and language, and survive a reload. **Reset** restores the starter code for the current pattern. A pattern never regresses from passed once it has passed.

Runs are killed after 8 seconds — an infinite loop costs you a worker restart, not a page reload.

## Adding a pattern

Create `patterns/<NN>-<slug>/` with:

```
meta.json                 # id, order, pattern, title, difficulty, description, examples, hint, implementations
python/starter.py         # the skeleton the editor opens with
python/setup.py           # optional: helpers and comparators, concatenated after the solution
python/tests/01_....py    # one check() call per file, run in filename order
```

Each test file is typically a single line:

```python
check("basic mid-array", lambda: pair_sum([1, 2, 4, 7, 11, 15], 13), (1, 4))
```

`check(name, fn, expected, cmp=None)` is injected by the runner. Pass `cmp` when equality is too strict — for example when the order of a returned list should not matter — and define the comparator in `setup.py`.

Because `setup.py` is concatenated *after* the solution, helpers may depend on classes the solution defines (`Node`, `TreeNode`). Patterns that rely on this say so in their description and ship the class skeleton in `starter.py`.

No code changes are needed: `import.meta.glob` picks up new folders and test files on the next build.

## Adding a language

The UI talks only to the `Runtime` interface, so a new language is one runtime plus content:

1. Implement `src/lib/runtimes/<lang>-runtime.ts` (plus a worker if it needs one) and register it in `createRuntime()`.
2. Add the id to the `LanguageId` union in `src/lib/runtimes/types.ts`.
3. Add `check()` preamble and summary postamble strings to `RUNTIME_PREAMBLES` / `RUNTIME_POSTAMBLES` in `src/lib/patterns.ts`.
4. Add `"<lang>": { "functionName": "..." }` to the `implementations` map of each pattern you want to support.
5. Add `patterns/<id>/<lang>/starter.<ext>`, optional `setup.<ext>`, and `tests/*.<ext>`.

Steps 1–3 happen once; the language tab strip appears automatically for any pattern with more than one implementation.

## Layout

```
src/
  components/     ProblemPanel, Editor, OutputPanel, PatternNav, LanguageTabs, StatusPill
  lib/
    runtimes/     Runtime interface, createRuntime factory, Pyodide runtime + worker
    patterns.ts   build-time content loading, buildTestScript()
    progress.ts   localStorage progress
    types.ts
patterns/         all pattern content, one folder per pattern
```
