import { z } from 'zod'
import type { ToolDefinition } from '@/components/copilot/copilot'

const prepareFeedbackParametersSchema = z.object({
  title: z
    .string()
    .trim()
    .min(1)
    .max(100)
    .describe("A concise feedback title in the user's language. Do not invent details."),
  description: z
    .string()
    .trim()
    .min(1)
    .max(2000)
    .describe("A faithful summary of what happened and what the user expected, in the user's language.")
})

export type PreparedFeedbackDraft = z.infer<typeof prepareFeedbackParametersSchema>

export function createPrepareFeedbackTool(onPrepare: (draft: PreparedFeedbackDraft) => void): ToolDefinition {
  return {
    name: 'prepare_feedback',
    description:
      'Prepare an editable XBuilder feedback draft after the user explicitly asks to report feedback or explicitly accepts an offer to report it. If the user only describes a problem, first offer to prepare feedback and wait for their agreement. Never call this tool for ordinary troubleshooting alone. This tool only opens a review form and never submits feedback.',
    parameters: prepareFeedbackParametersSchema,
    async implementation(draft) {
      onPrepare({ ...draft })
      return {
        status: 'prepared',
        requiresUserConfirmation: true,
        message: 'The editable feedback form will open after this response. Do not claim that the feedback was sent.'
      }
    }
  }
}
