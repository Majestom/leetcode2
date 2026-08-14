import type { LanguageId } from './runtimes'
import type { Implementation, Pattern, PatternMeta, TestFile } from './types'

/**
 * Pattern content is bundled at build time — no runtime fetches. Adding a
 * pattern folder or a test file is picked up by the next build with no code
 * change here.
 */
const metaModules = import.meta.glob('../../patterns/*/meta.json', {
  eager: true,
  import: 'default',
}) as Record<string, PatternMeta>

const starterFiles = import.meta.glob('../../patterns/*/*/starter.*', {
  eager: true,
  query: '?raw',
  import: 'default',
}) as Record<string, string>

const setupFiles = import.meta.glob('../../patterns/*/*/setup.*', {
  eager: true,
  query: '?raw',
  import: 'default',
}) as Record<string, string>

const testFiles = import.meta.glob('../../patterns/*/*/tests/*', {
  eager: true,
  query: '?raw',
  import: 'default',
}) as Record<string, string>

const KNOWN_LANGUAGES = new Set<string>(['python'])

const META_RE = /patterns\/([^/]+)\/meta\.json$/
const STARTER_RE = /patterns\/([^/]+)\/([^/]+)\/starter\.[^/]+$/
const SETUP_RE = /patterns\/([^/]+)\/([^/]+)\/setup\.[^/]+$/
const TEST_RE = /patterns\/([^/]+)\/([^/]+)\/tests\/([^/]+)$/

/** `01-two-pointers` -> `python` -> file contents. */
type ByPatternAndLang<T> = Map<string, Map<LanguageId, T>>

function indexByPatternAndLang<T>(
  files: Record<string, T>,
  re: RegExp,
): ByPatternAndLang<T> {
  const out: ByPatternAndLang<T> = new Map()
  for (const [path, value] of Object.entries(files)) {
    const match = re.exec(path)
    if (!match) continue
    const [, patternId, lang] = match
    if (!KNOWN_LANGUAGES.has(lang)) continue
    let byLang = out.get(patternId)
    if (!byLang) {
      byLang = new Map()
      out.set(patternId, byLang)
    }
    byLang.set(lang as LanguageId, value)
  }
  return out
}

function indexTests(): ByPatternAndLang<TestFile[]> {
  const out: ByPatternAndLang<TestFile[]> = new Map()
  for (const [path, content] of Object.entries(testFiles)) {
    const match = TEST_RE.exec(path)
    if (!match) continue
    const [, patternId, lang, filename] = match
    if (!KNOWN_LANGUAGES.has(lang)) continue
    let byLang = out.get(patternId)
    if (!byLang) {
      byLang = new Map()
      out.set(patternId, byLang)
    }
    const list = byLang.get(lang as LanguageId) ?? []
    list.push({ path, name: filename.replace(/\.[^.]+$/, ''), content })
    byLang.set(lang as LanguageId, list)
  }
  // Numeric filename prefixes give a deterministic, author-controlled order.
  for (const byLang of out.values()) {
    for (const list of byLang.values()) {
      list.sort((a, b) => a.name.localeCompare(b.name))
    }
  }
  return out
}

function loadPatterns(): Pattern[] {
  const starters = indexByPatternAndLang(starterFiles, STARTER_RE)
  const setups = indexByPatternAndLang(setupFiles, SETUP_RE)
  const tests = indexTests()

  const patterns: Pattern[] = []

  for (const [path, meta] of Object.entries(metaModules)) {
    const match = META_RE.exec(path)
    if (!match) continue
    const patternId = match[1]

    const implementations: Partial<Record<LanguageId, Implementation>> = {}
    for (const [lang, entry] of Object.entries(meta.implementations)) {
      const language = lang as LanguageId
      const starter = starters.get(patternId)?.get(language)
      if (starter === undefined) {
        console.warn(
          `[patterns] ${patternId}: meta.json lists "${lang}" but there is no ${lang}/starter file — skipping`,
        )
        continue
      }
      implementations[language] = {
        functionName: entry.functionName,
        starter,
        setup: setups.get(patternId)?.get(language),
        tests: tests.get(patternId)?.get(language) ?? [],
      }
    }

    patterns.push({ ...meta, id: meta.id ?? patternId, implementations })
  }

  return patterns.sort((a, b) => a.order - b.order)
}

export const patterns: Pattern[] = loadPatterns()

export function getPattern(id: string): Pattern | undefined {
  return patterns.find((p) => p.id === id)
}

/**
 * Defines `check()` plus the counters the summary line reads. Prepended to
 * every run, so user code and test files can rely on it existing.
 */
const PYTHON_PREAMBLE = `__pass = 0
__fail = 0
__err = 0
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
`

const PYTHON_POSTAMBLE = `print(f"\\n{__pass}/{__total} tests passed")`

const RUNTIME_PREAMBLES: Record<LanguageId, string> = {
  python: PYTHON_PREAMBLE,
}

const RUNTIME_POSTAMBLES: Record<LanguageId, string> = {
  python: PYTHON_POSTAMBLE,
}

/**
 * Assembles preamble + user code + setup + every test file + postamble into the
 * single script string handed to `Runtime.run()`.
 */
export function buildTestScript(
  pattern: Pattern,
  lang: LanguageId,
  userCode: string,
): string {
  const impl = pattern.implementations[lang]
  if (!impl) {
    throw new Error(`${pattern.id} has no ${lang} implementation`)
  }

  const parts: string[] = [RUNTIME_PREAMBLES[lang], userCode]
  if (impl.setup) parts.push(impl.setup)
  for (const test of impl.tests) parts.push(test.content)
  parts.push(RUNTIME_POSTAMBLES[lang])

  return parts.join('\n\n')
}

/** True when a run's output reports every test passing. */
export function allTestsPassed(stdout: string): boolean {
  const match = /(\d+)\/(\d+) tests passed\s*$/.exec(stdout.trimEnd())
  if (!match) return false
  const [, passed, total] = match
  return Number(total) > 0 && passed === total
}
