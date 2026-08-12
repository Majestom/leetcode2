# Pattern Practice — Local Web App Spec (v3)

A personal-use web app for practising the ~16 LeetCode-style algorithm patterns. **Runs entirely in the browser** — no server, no host Python dependency. Real CPython via Pyodide (Python compiled to WebAssembly).

**v3 changes from v2:** multi-language-ready architecture (Python only at launch, but built so TypeScript/JavaScript slot in as a new folder). Test cases separated into individual files under a `tests/` subfolder per language, with a shared `check()` runner helper.

---

## 1. Goals & Non-Goals

**Goals**

- Real code execution against pre-defined test suites (no simulation)
- Nice syntax-highlighted editor
- Easy to add or edit problems (content on disk, bundled at build time)
- Easy to add new languages later (drop in a sibling folder, register a runtime)
- Individual, easily-editable test files rather than one blob per pattern
- Persist progress and last code per (pattern, language) across sessions
- One-command local start (`npm run dev`)

**Non-goals for v1**

- Multiple languages beyond Python populated at launch (architecture supports it; content follows later)
- Multi-user / authentication
- Cloud deployment
- Sandboxing untrusted code (you're only running your own solutions)

---

## 2. Architecture Overview

```
┌────────────────────────────────────────────────────┐
│  Browser tab                                       │
│                                                    │
│  ┌─────────────────────────────────────────────┐   │
│  │  Main thread (React UI)                     │   │
│  │  ┌──────────────┐  ┌────────────────────┐   │   │
│  │  │ Problem      │  │ Monaco editor      │   │   │
│  │  │ panel        │  │                    │   │   │
│  │  └──────────────┘  └──────┬─────────────┘   │   │
│  │                           │                 │   │
│  │                    [▶ Run tests]            │   │
│  │                           │                 │   │
│  │           ┌───────────────▼──────────────┐  │   │
│  │           │ Runtime interface            │  │   │
│  │           │ • createRuntime(lang)        │  │   │
│  │           │ • runtime.run(code, timeout) │  │   │
│  │           └──────┬───────────────────────┘  │   │
│  │                  │ postMessage              │   │
│  │  ┌───────────────▼──────────────────────┐   │   │
│  │  │ Output panel (colored PASS/FAIL)     │   │   │
│  │  └───────────────▲──────────────────────┘   │   │
│  └──────────────────┼──────────────────────────┘   │
│                     │ postMessage                  │
│  ┌──────────────────┴──────────────────────────┐   │
│  │  Web Worker (one per language runtime)      │   │
│  │  ┌──────────────────────────────────────┐   │   │
│  │  │ Python: Pyodide (CPython WASM)       │   │   │
│  │  │ TS/JS:  esbuild-wasm + eval (future) │   │   │
│  │  └──────────────────────────────────────┘   │   │
│  └─────────────────────────────────────────────┘   │
└────────────────────────────────────────────────────┘
```

**Key design decisions:**

- **Language execution sits behind a `Runtime` interface.** Adding a language is implementing one interface plus a folder of content, not touching the UI.
- **Pattern content is language-partitioned on disk.** Each pattern folder contains a `meta.json` and one subfolder per implemented language.
- **Test cases are individual files** under `<pattern>/<lang>/tests/`, sorted by filename and executed in order. Add or remove tests by adding or deleting files.
- **A shared runner injects a `check()` helper** so each test file is typically one line.
- **Everything runs in a Web Worker.** Pyodide's initialisation and infinite loops must be off the main thread.
- **Pattern content is bundled at build time** via Vite's `import.meta.glob`. No runtime fetches for problem data.
- **No routing.** SPA. Which pattern and language you're on is React state.

---

## 3. Tech Stack

- **Vite 5+** for build tool and dev server
- **React 18** with TypeScript
- **Tailwind CSS** for styling
- **@monaco-editor/react** for the code editor
- **Pyodide 0.26+** (CPython in WASM) — Python runtime, loaded from jsDelivr CDN inside a Web Worker

Future language runtimes plug in the same way (e.g. `esbuild-wasm` for a TypeScript runtime).

No server, no database, no state library beyond `useState`.

---

## 4. Directory Structure

```
pattern-practice/
├── index.html
├── src/
│   ├── main.tsx
│   ├── App.tsx
│   ├── components/
│   │   ├── Editor.tsx              # Monaco wrapper
│   │   ├── ProblemPanel.tsx
│   │   ├── OutputPanel.tsx
│   │   ├── PatternNav.tsx
│   │   ├── LanguageTabs.tsx        # Shows tabs when meta lists >1 impl
│   │   └── StatusPill.tsx
│   ├── lib/
│   │   ├── runtimes/
│   │   │   ├── index.ts            # createRuntime factory
│   │   │   ├── types.ts            # Runtime interface + RunResult
│   │   │   ├── pyodide-runtime.ts  # PyodideRuntime : Runtime
│   │   │   ├── pyodide-worker.ts   # The Web Worker
│   │   │   └── (future: ts-runtime.ts, ts-worker.ts)
│   │   ├── patterns.ts             # Loads all pattern data
│   │   ├── progress.ts             # localStorage helpers
│   │   └── types.ts
│   └── styles/
│       └── globals.css
├── patterns/                       # ALL PATTERN CONTENT
│   ├── 01-two-pointers/
│   │   ├── meta.json
│   │   └── python/
│   │       ├── starter.py
│   │       ├── setup.py            # Optional per-pattern helpers/comparators
│   │       └── tests/
│   │           ├── 01_basic.py
│   │           ├── 02_smallest.py
│   │           ├── 03_negatives.py
│   │           ├── 04_zeros.py
│   │           ├── 05_answer_end.py
│   │           └── 06_answer_start.py
│   ├── 02-sliding-window/
│   │   ├── meta.json
│   │   └── python/
│   │       ├── starter.py
│   │       └── tests/ ...
│   └── ... (14 more)
├── public/
├── package.json
├── vite.config.ts
├── tailwind.config.ts
├── tsconfig.json
└── postcss.config.js
```

**Adding a pattern:** create a new `patterns/<id>/` folder with `meta.json`, `python/starter.py`, and `python/tests/*.py`. Next build picks it up.

**Adding a language:** implement a new `Runtime` in `src/lib/runtimes/`, register it in `createRuntime`, and add `<lang>/starter.<ext>` and `<lang>/tests/*.<ext>` under each pattern folder. The UI shows a language tab once any pattern has more than one implementation.

---

## 5. Data Model

### `patterns/<id>/meta.json`

```json
{
  "id": "02-sliding-window",
  "order": 2,
  "pattern": "sliding window",
  "title": "Longest substring without repeats",
  "difficulty": "medium",
  "description": "Given a string s, return the length of the longest substring with no repeating characters.",
  "examples": [
    "longest_unique('abcabcbb') -> 3",
    "longest_unique('bbbbb')    -> 1",
    "longest_unique('pwwkew')   -> 3",
    "longest_unique('')         -> 0"
  ],
  "hint": "Maintain a set of chars in the window. Expand right; when a duplicate appears, shrink from left until it's gone.",
  "implementations": {
    "python": {
      "functionName": "longest_unique"
    }
  }
}
```

When you add TypeScript later, `implementations.typescript` grows a sibling entry with `"functionName": "longestUnique"`. The `implementations` map drives the language-tab UI.

### `patterns/<id>/<lang>/starter.<ext>`

Minimal skeleton the user starts from.

### `patterns/<id>/<lang>/setup.<ext>` _(optional)_

Per-pattern helpers and comparators — only present when a pattern needs them (e.g. `build_linked_list`, `cmp_unordered_lists`).

### `patterns/<id>/<lang>/tests/<NN>_<name>.<ext>`

One test case per file, numbered so they sort deterministically. Each test uses the `check()` helper injected by the runner (see Section 8).

---

## 6. Runtime Abstraction (`lib/runtimes/`)

### `types.ts`

```typescript
export type LanguageId = "python"; // | 'typescript' | 'javascript' — later

export type RunResult = {
  stdout: string;
  stderr: string;
  ok: boolean;
  timedOut: boolean;
  elapsedMs: number;
};

export interface Runtime {
  language: LanguageId;
  displayName: string;
  fileExtension: string;
  monacoLanguage: string; // maps to Monaco's language id
  isReady(): Promise<void>;
  run(code: string, timeoutMs?: number): Promise<RunResult>;
  dispose(): void;
}
```

### `index.ts` — factory

```typescript
import type { Runtime, LanguageId } from "./types";
import { PyodideRuntime } from "./pyodide-runtime";

export function createRuntime(lang: LanguageId): Runtime {
  switch (lang) {
    case "python":
      return new PyodideRuntime();
    // case 'typescript': return new TypeScriptRuntime()
    // case 'javascript': return new JavaScriptRuntime()
    default:
      throw new Error(`no runtime for ${lang}`);
  }
}
```

Everything below the interface (worker lifecycle, timeout handling, kill-and-respawn) is a runtime's private concern. The UI only ever talks to the interface.

---

## 7. Python Runtime (`lib/runtimes/pyodide-runtime.ts` + `pyodide-worker.ts`)

### `pyodide-worker.ts`

```typescript
/// <reference lib="webworker" />

importScripts("https://cdn.jsdelivr.net/pyodide/v0.26.4/full/pyodide.js");
declare const loadPyodide: (opts?: any) => Promise<any>;

let pyodide: any = null;

async function boot() {
  pyodide = await loadPyodide({
    indexURL: "https://cdn.jsdelivr.net/pyodide/v0.26.4/full/",
  });
  self.postMessage({ type: "ready" });
}
boot();

self.onmessage = async (e: MessageEvent) => {
  if (e.data.type !== "run") return;
  if (!pyodide) {
    self.postMessage({
      type: "result",
      stdout: "",
      stderr: "Pyodide not ready",
      ok: false,
    });
    return;
  }
  let stdout = "";
  let stderr = "";
  pyodide.setStdout({
    batched: (s: string) => {
      stdout += s;
    },
  });
  pyodide.setStderr({
    batched: (s: string) => {
      stderr += s;
    },
  });
  try {
    await pyodide.runPythonAsync(e.data.code);
    self.postMessage({ type: "result", stdout, stderr, ok: true });
  } catch (err: any) {
    self.postMessage({
      type: "result",
      stdout,
      stderr: stderr + "\n" + (err?.message ?? String(err)),
      ok: false,
    });
  }
};
```

### `pyodide-runtime.ts`

```typescript
import type { Runtime, RunResult } from "./types";
import PyodideWorker from "./pyodide-worker.ts?worker";

export class PyodideRuntime implements Runtime {
  language = "python" as const;
  displayName = "Python";
  fileExtension = "py";
  monacoLanguage = "python";

  private worker: Worker | null = null;
  private ready = false;
  private readyPromise!: Promise<void>;
  private resolveReady!: () => void;

  constructor() {
    this.spawn();
  }

  private spawn() {
    this.readyPromise = new Promise<void>((r) => {
      this.resolveReady = r;
    });
    this.ready = false;
    this.worker = new PyodideWorker();
    this.worker.onmessage = (e) => {
      if (e.data.type === "ready") {
        this.ready = true;
        this.resolveReady();
      }
    };
  }

  isReady(): Promise<void> {
    return this.readyPromise;
  }

  async run(code: string, timeoutMs = 8000): Promise<RunResult> {
    await this.readyPromise;
    const start = performance.now();
    return new Promise((resolve) => {
      const w = this.worker!;
      let done = false;
      const timer = setTimeout(() => {
        if (done) return;
        done = true;
        w.terminate();
        this.spawn(); // fresh worker for the next call
        resolve({
          stdout: "",
          stderr: "Execution timed out",
          ok: false,
          timedOut: true,
          elapsedMs: performance.now() - start,
        });
      }, timeoutMs);
      w.onmessage = (e) => {
        if (e.data.type !== "result" || done) return;
        done = true;
        clearTimeout(timer);
        resolve({
          stdout: e.data.stdout,
          stderr: e.data.stderr,
          ok: e.data.ok,
          timedOut: false,
          elapsedMs: performance.now() - start,
        });
      };
      w.postMessage({ type: "run", code });
    });
  }

  dispose() {
    this.worker?.terminate();
  }
}
```

---

## 8. Test Runner & Injected `check()` Helper

When "Run tests" is clicked, the app builds a single script string:

1. **Preamble** — defines `check()` and result-tracking state
2. **User's code** from the editor
3. **`setup.py`** contents (if the pattern has one)
4. **Every test file** in `tests/`, concatenated in filename order
5. **Postamble** — prints the summary line

That script is sent to the runtime's `run()` method.

### Python preamble (defines `check`)

```python
__pass = 0
__fail = 0
__err  = 0
__total = 0

def check(name, fn, expected, cmp=None):
    global __pass, __fail, __err, __total
    __total += 1
    try:
        got = fn()
        matched = cmp(got, expected) if cmp else (got == expected)
        if matched:
            __pass += 1
            print(f"PASS  {name}: {got!r}")
        else:
            __fail += 1
            print(f"FAIL  {name}: got {got!r}, expected {expected!r}")
    except Exception as e:
        __err += 1
        print(f"ERROR {name}: {type(e).__name__}: {e}")
```

### Python postamble

```python
print(f"\n{__pass}/{__total} tests passed")
```

Each test file is then a single line:

```python
# patterns/01-two-pointers/python/tests/01_basic.py
check("basic mid-array", lambda: pair_sum([1, 2, 4, 7, 11, 15], 13), (1, 4))
```

For linked-list, tree, and Trie problems, `setup.py` provides the helpers used inside the `lambda`:

```python
# patterns/04-fast-slow-pointers/python/setup.py
def build_linked_list(vals, cycle_at=None):
    if not vals: return None
    ns = [Node(v) for v in vals]
    for i in range(len(ns) - 1): ns[i].next = ns[i + 1]
    if cycle_at is not None: ns[-1].next = ns[cycle_at]
    return ns[0]
```

```python
# patterns/04-fast-slow-pointers/python/tests/01_cycle_middle.py
check("cycle back to middle", lambda: has_cycle(build_linked_list([1,2,3,4], cycle_at=1)), True)
```

### Concatenation logic (`lib/patterns.ts`, sketched)

```typescript
export function buildTestScript(
  pattern: Pattern,
  lang: LanguageId,
  userCode: string,
): string {
  const impl = pattern.implementations[lang];
  const parts: string[] = [];
  parts.push(RUNTIME_PREAMBLES[lang]);
  parts.push(userCode);
  if (impl.setup) parts.push(impl.setup);
  // tests already sorted by filename in the Pattern object
  for (const t of impl.tests) parts.push(t.content);
  parts.push(RUNTIME_POSTAMBLES[lang]);
  return parts.join("\n\n");
}
```

`RUNTIME_PREAMBLES` and `RUNTIME_POSTAMBLES` are per-language string constants. Adding a language means adding two more entries.

---

## 9. Loading Pattern Content (`lib/patterns.ts`)

`import.meta.glob` handles the nested structure directly.

```typescript
export type TestFile = { path: string; name: string; content: string };
export type Implementation = {
  functionName: string;
  starter: string;
  setup?: string;
  tests: TestFile[];
};
export type Pattern = {
  id: string;
  order: number;
  pattern: string;
  title: string;
  difficulty: "easy" | "medium" | "hard";
  description: string;
  examples: string[];
  hint: string;
  implementations: Partial<Record<LanguageId, Implementation>>;
};

const metaFiles = import.meta.glob("../../patterns/*/meta.json", {
  eager: true,
}) as Record<string, { default: any }>;
const starterRaw = import.meta.glob("../../patterns/*/*/starter.*", {
  as: "raw",
  eager: true,
}) as Record<string, string>;
const setupRaw = import.meta.glob("../../patterns/*/*/setup.*", {
  as: "raw",
  eager: true,
}) as Record<string, string>;
const testsRaw = import.meta.glob("../../patterns/*/*/tests/*", {
  as: "raw",
  eager: true,
}) as Record<string, string>;

// Assemble: group by pattern id, then by language folder.
// (Straightforward loop over the raw maps; ~40 lines.)
```

Adding a folder-level test file requires no code change — the next build's `import.meta.glob` picks it up.

---

## 10. UI Layout

Two-column desktop layout, unchanged from v2 in shape. The only new element is a small **language tab strip** above the editor, rendered only when the current pattern's `implementations` map has more than one key. Until then it's invisible.

```
┌──────────────────────────────────────────────────────────────┐
│ Python Pattern Practice           [● Runtime ready · 4/16]   │
├──────────────┬───────────────────────────────────────────────┤
│              │ ┌─ Problem ─────────────────────────────────┐ │
│  Patterns    │ │ [badge] Longest substring without repeats │ │
│              │ │ Description...                            │ │
│  ● 1. Two P. │ │ Examples...                               │ │
│  ○ 2. Slid.  │ │ [Show hint]                               │ │
│  ○ ...       │ └───────────────────────────────────────────┘ │
│              │                                               │
│              │ [Python] [TypeScript]  ← only when > 1 impl   │
│              │ ┌─ solution.py ─────────────────────────────┐ │
│              │ │ (Monaco editor)                           │ │
│              │ └───────────────────────────────────────────┘ │
│              │ [▶ Run tests] [Reset] [Hint]     Cmd+Enter    │
│              │ ┌─ Output ──────────────────────────────────┐ │
│              │ │ PASS  basic mid-array: (1, 4)             │ │
│              │ │ ...                                       │ │
│              │ │ 7/7 tests passed                          │ │
│              │ └───────────────────────────────────────────┘ │
└──────────────┴───────────────────────────────────────────────┘
```

Colour rules on output lines: `PASS` green, `FAIL` red, `ERROR` amber, summary line bold.

Monaco is configured per-language via the `Runtime.monacoLanguage` field:

```typescript
<Editor
  height="50vh"
  language={runtime.monacoLanguage}
  theme="vs-dark"
  value={code}
  onChange={(v) => setCode(v ?? '')}
  options={{
    fontSize: 13,
    minimap: { enabled: false },
    scrollBeyondLastLine: false,
    tabSize: 4,
    insertSpaces: true,
  }}
/>
```

---

## 11. Progress Tracking (`lib/progress.ts`)

localStorage key `pp-progress`:

```typescript
type Progress = Record<
  string,
  Partial<
    Record<
      LanguageId,
      {
        status: "unattempted" | "attempted" | "passed";
        lastCode: string;
      }
    >
  >
>;
```

Keyed by `(patternId, language)`. Same state transitions as v2 — `unattempted` → `attempted` on first Run, → `passed` when output ends with `N/N tests passed` and N > 0, never regresses. Sidebar shows an aggregate pill (● / ◐ / ○) computed as the best status across implemented languages for that pattern.

---

## 12. Development Setup

```bash
npm create vite@latest pattern-practice -- --template react-ts
cd pattern-practice
npm install
npm install @monaco-editor/react
npm install -D tailwindcss postcss autoprefixer
npx tailwindcss init -p

# Then create patterns/ and add folders per Section 13
mkdir -p patterns

npm run dev
# open http://localhost:5173
```

---

## 13. Per-Pattern Test Specifications

For each pattern, the layout of files is:

```
patterns/NN-slug/
├── meta.json
└── python/
    ├── starter.py
    ├── setup.py        # only when the pattern needs helpers
    └── tests/
        ├── 01_....py
        ├── 02_....py
        └── ...
```

Each test file is a single `check(...)` line (occasionally two if a helper needs to be constructed locally). The runner defines `check`, iterates, and prints the summary. Test files are listed below in compact form as `filename → content`.

---

### 13.1 Two Pointers — Pair sum in a sorted array

**id:** `01-two-pointers` · **function:** `pair_sum(nums, target) -> (int, int)`

**setup.py:** none.

**tests/:**

```
01_basic.py         → check("basic mid-array", lambda: pair_sum([1, 2, 4, 7, 11, 15], 13), (1, 4))
02_smallest.py      → check("smallest input", lambda: pair_sum([1, 2], 3), (0, 1))
03_negatives.py     → check("with negatives", lambda: pair_sum([-3, -1, 0, 2, 5], 1), (1, 3))
04_zeros.py         → check("with zeros", lambda: pair_sum([0, 0, 3, 4], 0), (0, 1))
05_answer_end.py    → check("answer at end", lambda: pair_sum([1, 3, 5, 7, 9, 11], 20), (4, 5))
06_answer_start.py  → check("answer at start", lambda: pair_sum([1, 3, 5, 7, 9, 11], 4), (0, 1))
07_typical.py       → check("typical case", lambda: pair_sum([2, 3, 4], 6), (0, 2))
```

---

### 13.2 Sliding Window — Longest substring without repeats

**id:** `02-sliding-window` · **function:** `longest_unique(s) -> int`

**setup.py:** none.

**tests/:**

```
01_canonical.py     → check("abcabcbb -> 3", lambda: longest_unique('abcabcbb'), 3)
02_all_same.py      → check("bbbbb -> 1", lambda: longest_unique('bbbbb'), 1)
03_pwwkew.py        → check("pwwkew -> 3", lambda: longest_unique('pwwkew'), 3)
04_empty.py         → check("empty string", lambda: longest_unique(''), 0)
05_single.py        → check("single char", lambda: longest_unique('a'), 1)
06_dvdf.py          → check("dvdf tricky", lambda: longest_unique('dvdf'), 3)
07_unique.py        → check("all unique", lambda: longest_unique('abcdefg'), 7)
```

---

### 13.3 Prefix Sum — Subarray sum equals K

**id:** `03-prefix-sum` · **function:** `subarray_sum(nums, k) -> int`

**setup.py:** none.

**tests/:**

```
01_basic.py         → check("[1,1,1] k=2", lambda: subarray_sum([1, 1, 1], 2), 2)
02_disjoint.py      → check("[1,2,3] k=3", lambda: subarray_sum([1, 2, 3], 3), 2)
03_negatives.py     → check("with negatives", lambda: subarray_sum([1, -1, 1, -1], 0), 4)
04_single.py        → check("single non-match", lambda: subarray_sum([1], 0), 0)
05_zeros.py         → check("all zeros k=0", lambda: subarray_sum([0, 0, 0], 0), 6)
06_complex.py       → check("complex", lambda: subarray_sum([3, 4, 7, 2, -3, 1, 4, 2], 7), 4)
```

---

### 13.4 Fast & Slow Pointers — Detect a cycle in a linked list

**id:** `04-fast-slow-pointers` · **function:** `has_cycle(head) -> bool`

The user must also define `class Node`.

**setup.py:**

```python
def build_linked_list(vals, cycle_at=None):
    if not vals: return None
    ns = [Node(v) for v in vals]
    for i in range(len(ns) - 1): ns[i].next = ns[i + 1]
    if cycle_at is not None: ns[-1].next = ns[cycle_at]
    return ns[0]
```

**tests/:**

```
01_cycle_middle.py  → check("cycle back to middle", lambda: has_cycle(build_linked_list([1,2,3,4], cycle_at=1)), True)
02_no_cycle.py      → check("no cycle", lambda: has_cycle(build_linked_list([1,2,3])), False)
03_self_loop.py     → check("self-loop", lambda: has_cycle(build_linked_list([1], cycle_at=0)), True)
04_single_none.py   → check("single node no cycle", lambda: has_cycle(build_linked_list([1])), False)
05_empty.py         → check("empty list", lambda: has_cycle(build_linked_list([])), False)
06_cycle_head.py    → check("cycle back to head", lambda: has_cycle(build_linked_list([1,2,3,4,5], cycle_at=0)), True)
```

---

### 13.5 Binary Search — First and last position of target

**id:** `05-binary-search` · **function:** `search_range(nums, target) -> (int, int)`

**setup.py:** none.

**tests/:**

```
01_basic.py         → check("basic case", lambda: tuple(search_range([5, 7, 7, 8, 8, 10], 8)), (3, 4))
02_absent.py        → check("target absent", lambda: tuple(search_range([5, 7, 7, 8, 8, 10], 6)), (-1, -1))
03_empty.py         → check("empty array", lambda: tuple(search_range([], 0)), (-1, -1))
04_single_hit.py    → check("single match", lambda: tuple(search_range([1], 1)), (0, 0))
05_single_miss.py   → check("single non-match", lambda: tuple(search_range([1], 2)), (-1, -1))
06_all_same.py      → check("all same", lambda: tuple(search_range([2, 2, 2, 2], 2)), (0, 3))
07_distinct.py      → check("distinct elems", lambda: tuple(search_range([1, 2, 3, 4, 5], 3)), (2, 2))
```

---

### 13.6 Merge Intervals — Merge overlapping intervals

**id:** `06-merge-intervals` · **function:** `merge(intervals) -> list[list[int]]`

**setup.py:**

```python
def norm(iv): return sorted([list(x) for x in iv])
def cmp_intervals(got, expected): return norm(got) == norm(expected)
```

**tests/:**

```
01_classic.py       → check("classic", lambda: merge([[1,3],[2,6],[8,10],[15,18]]), [[1,6],[8,10],[15,18]], cmp=cmp_intervals)
02_touching.py      → check("touching endpoints", lambda: merge([[1,4],[4,5]]), [[1,5]], cmp=cmp_intervals)
03_empty.py         → check("empty", lambda: merge([]), [], cmp=cmp_intervals)
04_single.py        → check("single interval", lambda: merge([[1,4]]), [[1,4]], cmp=cmp_intervals)
05_out_of_order.py  → check("unsorted input", lambda: merge([[1,4],[0,4]]), [[0,4]], cmp=cmp_intervals)
06_nested.py        → check("nested", lambda: merge([[1,4],[2,3]]), [[1,4]], cmp=cmp_intervals)
```

---

### 13.7 Cyclic Sort — Missing number

**id:** `07-cyclic-sort` · **function:** `missing_number(nums) -> int`

**setup.py:** none.

**tests/:**

```
01_basic.py         → check("basic [3,0,1]", lambda: missing_number([3, 0, 1]), 2)
02_missing_two.py   → check("[0,1] -> 2", lambda: missing_number([0, 1]), 2)
03_classic.py       → check("classic 9-elem", lambda: missing_number([9,6,4,2,3,5,7,0,1]), 8)
04_missing_one.py   → check("[0] -> 1", lambda: missing_number([0]), 1)
05_missing_zero.py  → check("[1] -> 0", lambda: missing_number([1]), 0)
06_missing_last.py  → check("missing n", lambda: missing_number([0,1,2,3,4,5,6,7,8,9]), 10)
```

---

### 13.8 DFS — Maximum depth of a binary tree

**id:** `08-dfs` · **function:** `max_depth(root) -> int`

**setup.py:**

```python
def build_tree(vals):
    if not vals: return None
    root = TreeNode(vals[0]); q = [root]; i = 1
    while q and i < len(vals):
        node = q.pop(0)
        if i < len(vals) and vals[i] is not None:
            node.left = TreeNode(vals[i]); q.append(node.left)
        i += 1
        if i < len(vals) and vals[i] is not None:
            node.right = TreeNode(vals[i]); q.append(node.right)
        i += 1
    return root
```

**tests/:**

```
01_standard.py      → check("standard", lambda: max_depth(build_tree([3,9,20,None,None,15,7])), 3)
02_empty.py         → check("empty tree", lambda: max_depth(build_tree([])), 0)
03_single.py        → check("single node", lambda: max_depth(build_tree([1])), 1)
04_skewed.py        → check("left-skewed", lambda: max_depth(build_tree([1,2,None,3,None,4,None,5])), 5)
05_balanced.py      → check("balanced 2-level", lambda: max_depth(build_tree([1,2,3])), 2)
```

---

### 13.9 BFS — Binary tree level order traversal

**id:** `09-bfs` · **function:** `level_order(root) -> list[list[int]]`

**setup.py:** same `build_tree` as 13.8 (each pattern's `setup.py` is standalone).

**tests/:**

```
01_standard.py      → check("standard tree", lambda: level_order(build_tree([3,9,20,None,None,15,7])), [[3],[9,20],[15,7]])
02_empty.py         → check("empty", lambda: level_order(build_tree([])), [])
03_single.py        → check("single node", lambda: level_order(build_tree([1])), [[1]])
04_complete.py      → check("complete tree", lambda: level_order(build_tree([1,2,3,4,5,6,7])), [[1],[2,3],[4,5,6,7]])
```

---

### 13.10 Topological Sort — Course schedule

**id:** `10-topological-sort` · **function:** `can_finish(num_courses, prerequisites) -> bool`

**setup.py:** none.

**tests/:**

```
01_simple.py        → check("simple 2-course", lambda: can_finish(2, [[1, 0]]), True)
02_two_cycle.py     → check("2-cycle", lambda: can_finish(2, [[1, 0], [0, 1]]), False)
03_chain.py         → check("valid chain", lambda: can_finish(4, [[1,0],[2,1],[3,2]]), True)
04_three_cycle.py   → check("3-cycle", lambda: can_finish(3, [[0,1],[1,2],[2,0]]), False)
05_single.py        → check("single no-prereq", lambda: can_finish(1, []), True)
06_multi_free.py    → check("many no-prereq", lambda: can_finish(5, []), True)
07_diamond.py       → check("diamond DAG", lambda: can_finish(6, [[1,0],[2,0],[3,1],[3,2],[4,3],[5,4]]), True)
```

---

### 13.11 Union-Find — Number of connected components

**id:** `11-union-find` · **function:** `count_components(n, edges) -> int`

**setup.py:** none.

**tests/:**

```
01_two_comps.py     → check("two components", lambda: count_components(5, [[0,1],[1,2],[3,4]]), 2)
02_one_chain.py     → check("single chain", lambda: count_components(5, [[0,1],[1,2],[2,3],[3,4]]), 1)
03_no_edges.py      → check("n singletons", lambda: count_components(4, []), 4)
04_single.py        → check("single node", lambda: count_components(1, []), 1)
05_three_pairs.py   → check("three disjoint pairs", lambda: count_components(6, [[0,1],[2,3],[4,5]]), 3)
06_triangle.py      → check("triangle", lambda: count_components(3, [[0,1],[1,2],[0,2]]), 1)
```

---

### 13.12 Backtracking — Generate all subsets

**id:** `12-backtracking` · **function:** `subsets(nums) -> list[list[int]]`

**setup.py:**

```python
def norm(xs): return sorted([tuple(sorted(x)) for x in xs])
def cmp_powerset(got, expected): return norm(got) == norm(expected)
```

**tests/:**

```
01_three_elems.py   → check("three-element", lambda: subsets([1,2,3]), [[],[1],[2],[3],[1,2],[1,3],[2,3],[1,2,3]], cmp=cmp_powerset)
02_empty.py         → check("empty input", lambda: subsets([]), [[]], cmp=cmp_powerset)
03_single.py        → check("single element", lambda: subsets([5]), [[],[5]], cmp=cmp_powerset)
04_pair.py          → check("two elements", lambda: subsets([1,2]), [[],[1],[2],[1,2]], cmp=cmp_powerset)
```

---

### 13.13 Dynamic Programming — Climbing stairs

**id:** `13-dynamic-programming` · **function:** `climb_stairs(n) -> int`

**setup.py:** none.

**tests/:**

```
01_n1.py            → check("n=1", lambda: climb_stairs(1), 1)
02_n2.py            → check("n=2", lambda: climb_stairs(2), 2)
03_n3.py            → check("n=3", lambda: climb_stairs(3), 3)
04_n4.py            → check("n=4", lambda: climb_stairs(4), 5)
05_n5.py            → check("n=5", lambda: climb_stairs(5), 8)
06_n6.py            → check("n=6", lambda: climb_stairs(6), 13)
07_n10.py           → check("n=10", lambda: climb_stairs(10), 89)
08_n20.py           → check("n=20 (naive recursion times out)", lambda: climb_stairs(20), 10946)
```

---

### 13.14 Top-K / Heap — Kth largest element

**id:** `14-top-k` · **function:** `kth_largest(nums, k) -> int`

**setup.py:** none.

**tests/:**

```
01_basic.py         → check("basic", lambda: kth_largest([3,2,1,5,6,4], 2), 5)
02_duplicates.py    → check("with duplicates", lambda: kth_largest([3,2,3,1,2,4,5,5,6], 4), 4)
03_single.py        → check("single element", lambda: kth_largest([1], 1), 1)
04_k_equals_n.py    → check("k = n (smallest)", lambda: kth_largest([2, 1], 2), 1)
05_all_same.py      → check("all identical", lambda: kth_largest([7,7,7,7,7], 3), 7)
06_negatives.py     → check("negatives", lambda: kth_largest([-1,-2,-3], 1), -1)
```

---

### 13.15 Monotonic Stack — Next greater element

**id:** `15-monotonic-stack` · **function:** `next_greater(nums) -> list[int]`

**setup.py:** none.

**tests/:**

```
01_mixed.py         → check("mixed", lambda: next_greater([2, 1, 2, 4, 3]), [4, 2, 4, -1, -1])
02_decreasing.py    → check("strictly decreasing", lambda: next_greater([5, 4, 3, 2, 1]), [-1, -1, -1, -1, -1])
03_increasing.py    → check("strictly increasing", lambda: next_greater([1, 2, 3]), [2, 3, -1])
04_empty.py         → check("empty", lambda: next_greater([]), [])
05_single.py        → check("single", lambda: next_greater([7]), [-1])
06_far_right.py     → check("answer far right", lambda: next_greater([1, 3, 2, 4]), [3, 4, 4, -1])
```

---

### 13.16 Trie — Implement a Trie

**id:** `16-trie` · **class:** `Trie` with `insert(word)`, `search(word) -> bool`, `starts_with(prefix) -> bool`

**setup.py:**

```python
t = Trie()
t.insert('apple')
```

The setup constructs a shared `t` so each test file works from the same state. Insertions in later tests build on it.

**tests/:**

```
01_search_apple.py     → check("search 'apple'", lambda: t.search('apple'), True)
02_search_app_no.py    → check("search 'app' before insert", lambda: t.search('app'), False)
03_starts_app.py       → check("starts_with 'app'", lambda: t.starts_with('app'), True)
04_insert_app.py       → check("insert & search 'app'", lambda: (t.insert('app'), t.search('app'))[1], True)
05_insert_appl.py      → check("insert & search 'application'", lambda: (t.insert('application'), t.search('application'))[1], True)
06_starts_appl.py      → check("starts_with 'appl'", lambda: t.starts_with('appl'), True)
07_search_apples.py    → check("search 'apples'", lambda: t.search('apples'), False)
08_starts_xyz.py       → check("starts_with 'xyz'", lambda: t.starts_with('xyz'), False)
09_search_empty.py     → check("search ''", lambda: t.search(''), False)
10_starts_empty.py     → check("starts_with ''", lambda: t.starts_with(''), True)
```

The `(t.insert(x), t.search(x))[1]` idiom is a trick for expressing a two-step action inside a lambda while returning only the second value. If you'd rather each test have its own scope, an alternative is to have each test file construct a fresh Trie in its lambda — verbose but purer.

---

## 14. Adding a New Language Later

Full checklist for adding, say, TypeScript. The list is short by design.

1. **Implement the runtime.** Create `src/lib/runtimes/typescript-runtime.ts` and `typescript-worker.ts`. The worker loads `esbuild-wasm`, transforms TS → JS, then evaluates it. Register in `createRuntime()`.
2. **Add `LanguageId`.** Add `'typescript'` to the union in `types.ts`.
3. **Add preamble/postamble.** Add TypeScript versions of the `check()` helper string to `RUNTIME_PREAMBLES` / `RUNTIME_POSTAMBLES`. (`console.log` is `PASS`/`FAIL` output, a module-level counter tracks totals, a final `console.log` emits the summary line.)
4. **Extend `meta.json`.** For each pattern you want to support in TS, add `"typescript": { "functionName": "longestUnique" }` to the `implementations` map.
5. **Add content files.** Create `patterns/<id>/typescript/starter.ts`, optionally `setup.ts`, and `tests/*.ts` files following the same conventions.

Steps 1–3 happen once. Steps 4–5 are per-pattern content — mostly translation work, no architectural decisions.

**What the runtime interface intentionally does not constrain:** anything about how the runtime achieves execution. The Python runtime uses Pyodide in a classic Web Worker. A TypeScript runtime could use esbuild-wasm in a module worker. A JavaScript-only runtime could skip the worker entirely if fast enough. As long as `run(code, timeoutMs)` returns a `RunResult`, the app doesn't care.

---

## 15. Future Enhancements

- **SharedArrayBuffer-based interrupts** so infinite loops don't require killing and re-spawning the worker
- **Bundle Pyodide locally** for full offline capability
- **Diff view** on failed tests: `got` vs `expected` visually
- **Solution reveal** button after N failed runs
- **Multiple problems per pattern** for drill-down mode
- **Interview timer**
- **Dark mode toggle**
- **Deep-linkable pattern URLs** via a hash router
- **Language-neutral test cases** (JSON files that runners in each language can read) — an ambitious refactor for problems whose inputs are pure data

---

## 16. Build Order Suggestion

1. Scaffold Vite + React + TS; add Tailwind.
2. Define `Runtime` interface and stub `PyodideRuntime`. Verify Pyodide loads (log `ready` from the worker in devtools).
3. Wire `PyodideRuntime.run()` end-to-end from a hard-coded button running `print("hi")`.
4. Add `patterns/01-two-pointers/` with `meta.json`, `python/starter.py`, and 2–3 `tests/*.py` files.
5. Implement `lib/patterns.ts` load + `buildTestScript()` concatenation. Verify by running one pattern end-to-end.
6. Build `App.tsx` with problem panel + Monaco + output panel for a single pattern.
7. Add pattern sidebar and pattern switching.
8. Add `LanguageTabs.tsx` (renders only when >1 impl — no-op with only Python present, but wired).
9. Add localStorage progress tracking keyed by (pattern, language).
10. Add all remaining 15 pattern folders per Section 13.
11. Polish: Cmd/Ctrl+Enter shortcut, output-line colouring, responsive layout.

Each step is independently testable. Adding TypeScript later starts back at step 2's factory and step 8's tab rendering — everything else is content.
