import { describe, expect, it } from 'vitest'
import { instrumentSpxSource } from './spx-source-instrumentation'

describe('instrumentSpxSource', () => {
  it('keeps top-level classfile declarations valid', () => {
    const source = `// IsMature\nfunc IsMature() bool {\n  return firstMature\n}\nonTouchStart "Lita", sprite => {\n  if IsMature() {\n    die\n  }\n}`

    const instrumented = instrumentSpxSource('Mushroom.spx', source)

    expect(instrumented).toContain('func IsMature() bool {')
    expect(instrumented).toContain('onTouchStart "Lita", sprite => {')
    expect(instrumented).not.toMatch(/fmt\.Println\("__XB_EXEC__start:Mushroom\.spx:2"\)\nfunc IsMature/)
    expect(instrumented).toMatch(
      /func IsMature\(\) bool \{\n\s+fmt\.Println\("__XB_EXEC__start:Mushroom\.spx:3"\)\n\s+return firstMature/
    )
    expect(instrumented).not.toMatch(/return firstMature\n\s+fmt\.Println\("__XB_EXEC__end:Mushroom\.spx:3"\)/)
    expect(instrumented).toMatch(
      /onTouchStart "Lita", sprite => \{\n\s+fmt\.Println\("__XB_EXEC__start:Mushroom\.spx:6"\)\n\s+if IsMature\(\) \{/
    )
  })

  it('ignores braces inside strings and comments when tracking blocks', () => {
    const source = `onStart => {\n  println "{not a block}"\n  // }\n  println "done"\n}`
    const instrumented = instrumentSpxSource('Stage.spx', source)

    expect(instrumented.match(/__XB_EXEC__start/g)).toHaveLength(2)
  })
})
