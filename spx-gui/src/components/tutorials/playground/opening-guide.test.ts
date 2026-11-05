import { describe, expect, it } from 'vitest'

import { OpeningGuide } from './opening-guide'

describe('Opening guide actions', () => {
  it.each([
    { calls: 'showPrelude "Task"', kinds: ['prelude'], actions: ['start'] },
    { calls: 'showVideo "intro"', kinds: ['video'], actions: ['start'] },
    { calls: 'showPrelude ["A", "B"]\nshowVideo "intro"', kinds: ['prelude', 'video'], actions: ['next', 'start'] },
    { calls: 'showVideo "intro"\nshowPrelude "Task"', kinds: ['video', 'prelude'], actions: ['next', 'start'] },
    {
      calls: 'showPrelude "A"\nshowVideo "intro"\nshowPrelude "B"',
      kinds: ['prelude', 'video', 'prelude'],
      actions: ['next', 'next', 'start']
    }
  ] as const)('labels $calls as $actions', ({ calls, kinds, actions }) => {
    const guide = new OpeningGuide(`onStart => {\n${calls}\n}`)
    expect(kinds.map((kind) => guide.take(kind))).toEqual(actions)
    expect(guide.take('video')).toBeNull()
  })

  it('ignores text, comments, other event callbacks and unused video declarations', () => {
    const guide = new OpeningGuide(`
      // onStart => { showVideo "unused" }
      var text = "showVideo \\x22not a call\\x22"
      var raw = \`showVideo "also not a call"\`
      /* showPrelude "not a call" */
      onStart => {
        Editor.CodeEditor.filterAPIs ["showVideo"]
        showPrelude "Task mentions showVideo and onStart"
      }
      Editor.Runtime.onStart => { showVideo "during play" }
      Editor.Runtime.onLog log => { showPrelude "Later" }
    `)
    expect(guide.take('prelude')).toBe('start')
    expect(guide.take('video')).toBeNull()
  })

  it('supports the function callback spelling', () => {
    const guide = new OpeningGuide('onStart(func() { showPrelude("Task"); showVideo("intro") })')
    expect(guide.take('prelude')).toBe('next')
    expect(guide.take('video')).toBe('start')
  })

  it.each([
    'Spotlight.revealWith "stage-overview", "Watch", SpotlightOptions{Mask: false, Duration: 3}',
    'options := []SpotlightOptions{{Mask: false}, {Mask: true}}',
    'options := map[string]SpotlightOptions{"stage": {Mask: false}}',
    'options := Options{showPrelude: "not a call", showVideo: "not a call"}'
  ])('keeps data literals in a straight-line opening: %s', (configuration) => {
    const guide = new OpeningGuide(`
      onStart => {
        ${configuration}
        showPrelude "Task"
        Spotlight.revealWith "stage-overview", "Watch", SpotlightOptions{Mask: false}
        showVideo "intro"
      }
    `)
    expect(guide.take('prelude')).toBe('next')
    expect(guide.take('video')).toBe('start')
  })

  it('allows independent configuration callbacks alongside one guide sequence', () => {
    const guide = new OpeningGuide(`
      onStart => { Editor.Ruler.enable }
      onStart => { showPrelude "Task"; showVideo "intro" }
    `)
    expect(guide.take('prelude')).toBe('next')
    expect(guide.take('video')).toBe('start')
  })

  it.each([
    'onStart => { if enabled { showVideo "intro" }; showPrelude "Task" }',
    'onStart => { for i <- 3 { showVideo "intro" } }',
    'onStart => { for ready { showPrelude "Task" }; showVideo "intro" }',
    'onStart => { switch mode { case "intro": showPrelude "Task" }; showVideo "intro" }',
    'onStart => { select { default: showPrelude "Task" }; showVideo "intro" }',
    'onStart => { if !enabled { return }; showPrelude "Task"; showVideo "intro" }',
    'onStart => { { showPrelude "Task" }; showVideo "intro" }',
    'onStart => { options := Options{Done: func() { showVideo "later" }}; showPrelude "Task"; showVideo "intro" }',
    'onStart => { Editor.Runtime.onStart => { showVideo "later" }; showPrelude "Task"; showVideo "intro" }',
    'onStart => { showPrelude "Task" }\nonStart => { showVideo "intro" }',
    'onStart => { if enabled { showPrelude "Task" } }\nonStart => { showVideo "intro" }',
    'func intro() { showPrelude "Task"; showVideo "intro" }; onStart => { intro() }',
    'func intro() { showPrelude "Task" }; onStart => { intro(); showPrelude "Then"; showVideo "intro" }',
    'func intro() { showPrelude "Task" }; onStart => { intro() }; onStart => { showVideo "intro" }',
    'intro := func() { showPrelude "Task" }; onStart => { intro(); showPrelude "Then"; showVideo "intro" }'
  ])('leaves dynamic or overlapping openings to explicit author labels: %s', (source) => {
    const guide = new OpeningGuide(source)
    expect(guide.take('prelude')).toBeNull()
    expect(guide.take('video')).toBeNull()
  })

  it('stops predicting when runtime calls differ from the declared order', () => {
    const guide = new OpeningGuide('onStart => { showPrelude "Task"; showVideo "intro" }')
    expect(guide.take('video')).toBeNull()
    expect(guide.take('prelude')).toBeNull()
  })
})
