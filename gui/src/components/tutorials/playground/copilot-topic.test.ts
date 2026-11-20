import { describe, expect, it } from 'vitest'

import { getPlaygroundCopilotTopic } from './copilot-topic'

describe('getPlaygroundCopilotTopic', () => {
  it('introduces the Course, its two parties and the Course instructions', () => {
    const topic = getPlaygroundCopilotTopic({
      title: 'Build a game',
      copilotContext: '\n## Goal\nKeep replies short.\n'
    })

    expect(topic).toEqual({
      title: { en: 'Build a game', zh: 'Build a game' },
      description: `You are working inside a Playground Course: Build a game.

In a Playground Course, the learner is given a prepared project and a goal to reach by writing and running code. A course program runs alongside the project; the learner cannot see it. It shows the opening instructions, mid-course feedback, videos and the closing summary in pop-ups, may limit which APIs the API References panel lists, and decides when the course is complete.

You deal with two parties here. The learner is the XBuilder user, who talks with you in this conversation. The course program may send you one-off requests of its own, for example to assess the learner's code or to write feedback; your answer to such a request goes back to the course program, which decides what the learner sees.

The course author wrote the instructions below about how you help the learner in this conversation.

<course-instructions>
## Goal
Keep replies short.
</course-instructions>

The course instructions govern how you word your replies to the learner. They do not limit tool calls, which are not part of a reply: when this context tells you to read code before replying, do so even if the instructions ask for a short reply or a guiding question, then word your reply as they require.`,
      reactToEvents: false,
      endable: true,
      codeHelperEnabled: false
    })
  })

  it('does not refer to Course instructions when the Course has none', () => {
    const { description } = getPlaygroundCopilotTopic({ title: 'Build a game', copilotContext: '  ' })

    expect(description).toContain('You deal with two parties here.')
    expect(description).not.toContain('course instructions')
    expect(description).not.toContain('course-instructions')
  })
})
