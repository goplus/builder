import type { Topic } from '@/components/copilot/copilot'

export type PlaygroundCopilotTopicOptions = {
  /** Course title. */
  title: string
  /** Instructions the Course author wrote for the learner's Copilot; may be empty. */
  copilotContext: string
  /** Name of the only sprite whose code the learner's editor shows, or `null` if the learner can open all code. */
  onlyVisibleSprite: string | null
}

function getIntroduction(title: string) {
  return `You are working inside a Playground Course: ${title}.

In a Playground Course, the learner is given a prepared project and a goal to reach by writing and running code. A course program runs alongside the project; the learner cannot see it. It shows the opening instructions, mid-course feedback, videos and the closing summary in pop-ups, may limit which APIs the API References panel lists, and decides when the course is complete.`
}

function getCourseInstructions(copilotContext: string) {
  return `<course-instructions>
${copilotContext}
</course-instructions>`
}

function getDescription({ title, copilotContext, onlyVisibleSprite }: PlaygroundCopilotTopicOptions) {
  const hasInstructions = copilotContext !== ''
  const parts = [
    getIntroduction(title),
    [
      'You are now talking with the learner.',
      hasInstructions ? 'Help them as the course instructions below describe.' : '',
      'You are not told when a pop-up appears or when the course completes; the course program announces completion, not you.'
    ],
    onlyVisibleSprite != null
      ? `The learner's editor shows only the code of sprite \`${onlyVisibleSprite}\`. They cannot open the code of other sprites or the stage, so do not ask them to look at or change those files.`
      : 'The learner can open and edit the code of every sprite and the stage.'
  ]
  if (hasInstructions) {
    parts.push(
      'The course author wrote the instructions below for you. They may refer to the pop-ups above by other names.',
      getCourseInstructions(copilotContext)
    )
  }
  parts.push([
    'The "Current code" section of this context shows the file the learner is viewing: up to about 20 lines around their cursor, with `lineCount` giving the file\'s total.',
    'Other files are not in this context.',
    'If and only if a question depends on code you have not seen, open that code with `get_project_code` before replying.',
    'Read it yourself: never ask the learner to open or look at a file their editor does not show.',
    hasInstructions
      ? 'Do this even when the course instructions above ask for a short reply or a guiding question: tool calls are not part of your final reply, so those rules do not limit them.'
      : '',
    'Do not read again code that is in this context or that you have already read in this conversation.',
    hasInstructions ? 'After checking, word your reply as the course instructions require.' : ''
  ])
  return joinParagraphs(parts)
}

function getOneShotDescription({ title, copilotContext }: PlaygroundCopilotTopicOptions) {
  const parts = [
    getIntroduction(title),
    "The next message is a one-off request from the course program, not from the learner, for example to assess the learner's code or to write feedback. Do what it asks, in the form it asks for. Your answer goes back to the course program, which decides what the learner sees."
  ]
  if (copilotContext !== '') {
    parts.push(
      "The course author's instructions for conversations with the learner are included below as background on this course. Their rules about how to talk to the learner (reply length, hinting order, not giving answers, not judging) do not apply to this request.",
      getCourseInstructions(copilotContext)
    )
  }
  return joinParagraphs(parts)
}

/** Joins paragraphs with blank lines; a paragraph given as sentences is joined with spaces, skipping empty ones. */
function joinParagraphs(paragraphs: Array<string | string[]>) {
  return paragraphs
    .map((paragraph) => (typeof paragraph === 'string' ? paragraph : paragraph.filter((s) => s !== '').join(' ')))
    .join('\n\n')
}

export function getPlaygroundCopilotTopic(options: PlaygroundCopilotTopicOptions): Topic {
  options = { ...options, copilotContext: options.copilotContext.trim() }
  return {
    title: { en: options.title, zh: options.title },
    description: getDescription(options),
    oneShotDescription: getOneShotDescription(options),
    reactToEvents: false,
    endable: true,
    codeHelperEnabled: false
  }
}
