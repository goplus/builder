import { describe, expect, it } from 'vitest'

import { getPlaygroundCopilotTopic } from './copilot-topic'

describe('getPlaygroundCopilotTopic', () => {
  it('wraps the Course instructions for conversations with the learner', () => {
    const topic = getPlaygroundCopilotTopic({
      title: 'Build a game',
      copilotContext: '\n## Goal\nKeep replies short.\n',
      onlyVisibleSprite: 'Bird'
    })

    expect(topic).toMatchObject({
      title: { en: 'Build a game', zh: 'Build a game' },
      reactToEvents: false,
      endable: true,
      codeHelperEnabled: false
    })
    expect(topic.description).toBe(`You are working inside a Playground Course: Build a game.

In a Playground Course, the learner is given a prepared project and a goal to reach by writing and running code. A course program runs alongside the project; the learner cannot see it. It shows the opening instructions, mid-course feedback, videos and the closing summary in pop-ups, may limit which APIs the API References panel lists, and decides when the course is complete.

You are now talking with the learner. Help them as the course instructions below describe. You are not told when a pop-up appears or when the course completes; the course program announces completion, not you.

The learner's editor shows only the code of sprite \`Bird\`. They cannot open the code of other sprites or the stage, so do not ask them to look at or change those files.

The course author wrote the instructions below for you. They may refer to the pop-ups above by other names.

<course-instructions>
## Goal
Keep replies short.
</course-instructions>

The "Current code" section of this context shows the file the learner is viewing: up to about 20 lines around their cursor, with \`lineCount\` giving the file's total. Other files are not in this context. If and only if a question depends on code you have not seen, open that code with \`get_project_code\` before replying. Read it yourself: never ask the learner to open or look at a file their editor does not show. Do this even when the course instructions above ask for a short reply or a guiding question: tool calls are not part of your final reply, so those rules do not limit them. Do not read again code that is in this context or that you have already read in this conversation. After checking, word your reply as the course instructions require.`)
  })

  it('keeps the Course instructions as background for requests from the Course program', () => {
    const topic = getPlaygroundCopilotTopic({
      title: 'Build a game',
      copilotContext: 'Keep replies short.',
      onlyVisibleSprite: 'Bird'
    })

    expect(topic.oneShotDescription).toBe(`You are working inside a Playground Course: Build a game.

In a Playground Course, the learner is given a prepared project and a goal to reach by writing and running code. A course program runs alongside the project; the learner cannot see it. It shows the opening instructions, mid-course feedback, videos and the closing summary in pop-ups, may limit which APIs the API References panel lists, and decides when the course is complete.

The next message is a one-off request from the course program, not from the learner, for example to assess the learner's code or to write feedback. Do what it asks, in the form it asks for. Your answer goes back to the course program, which decides what the learner sees.

The course author's instructions for conversations with the learner are included below as background on this course. Their rules about how to talk to the learner (reply length, hinting order, not giving answers, not judging) do not apply to this request.

<course-instructions>
Keep replies short.
</course-instructions>`)
  })

  it('says the learner can open all code outside simple mode', () => {
    const { description } = getPlaygroundCopilotTopic({
      title: 'Build a game',
      copilotContext: 'Keep replies short.',
      onlyVisibleSprite: null
    })

    expect(description).toContain('The learner can open and edit the code of every sprite and the stage.')
    expect(description).not.toContain('shows only the code of sprite')
  })

  it('does not refer to Course instructions when the Course has none', () => {
    const topic = getPlaygroundCopilotTopic({ title: 'Build a game', copilotContext: '  ', onlyVisibleSprite: null })

    expect(topic.description).not.toContain('course instructions')
    expect(topic.description).not.toContain('course-instructions')
    expect(topic.description).toContain(
      'never ask the learner to open or look at a file their editor does not show. Do not read again'
    )
    expect(topic.oneShotDescription).not.toContain('course-instructions')
  })
})
