import type { Topic } from '@/components/copilot/copilot'

export type PlaygroundCopilotTopicOptions = {
  /** Course title. */
  title: string
  /** Instructions the Course author wrote for the learner's Copilot; may be empty. */
  copilotContext: string
}

function getDescription({ title, copilotContext }: PlaygroundCopilotTopicOptions) {
  const parts = [
    `You are working inside a Playground Course: ${title}.`,
    'In a Playground Course, the learner is given a prepared project and a goal to reach by writing and running code. A course program runs alongside the project; the learner cannot see it. It shows the opening instructions, mid-course feedback, videos and the closing summary in pop-ups, may limit which APIs the API References panel lists, and decides when the course is complete.',
    "You deal with two parties here. The learner is the XBuilder user, who talks with you in this conversation. The course program may send you one-off requests of its own, for example to assess the learner's code or to write feedback; your answer to such a request goes back to the course program, which decides what the learner sees."
  ]
  if (copilotContext !== '') {
    parts.push(
      'The course author wrote the instructions below about how you help the learner in this conversation.',
      `<course-instructions>
${copilotContext}
</course-instructions>`,
      'The course instructions govern how you word your replies to the learner. They do not limit tool calls, which are not part of a reply. If a tool for reading code is available, use it to read any code you need before replying, even if the instructions ask for a short reply or a guiding question. Then write your reply as the course instructions require.'
    )
  }
  return parts.join('\n\n')
}

export function getPlaygroundCopilotTopic(options: PlaygroundCopilotTopicOptions): Topic {
  return {
    title: { en: options.title, zh: options.title },
    description: getDescription({ ...options, copilotContext: options.copilotContext.trim() }),
    reactToEvents: false,
    endable: true,
    codeHelperEnabled: false
  }
}
