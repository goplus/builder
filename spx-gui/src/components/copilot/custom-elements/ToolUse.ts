import { z } from 'zod'
import { defineComponent } from 'vue'

export const tagName = 'tool-use'

export const isRaw = false

export const description = 'Use a tool and get the result in further messages.'

export const detailedDescription = `Use a tool and get the result in further messages. \
For example, <tool-use id="hmztvy" tool="example-tool" parameters='{"foo":"bar"}' /> invokes the tool named "example-tool" with parameters \`{"foo":"bar"}\`.`

export const attributes = z.object({
  id: z.string().describe('Unique identifier for this tool execution'),
  tool: z.string().describe('Tool name to execute'),
  parameters: z.string().describe('Tool parameters in JSON string format')
})

export type Props = {
  id: string // Unique identifier for this tool execution
  tool: string // Tool name to execute
  parameters: string // Tool parameters in JSON string format
}

export default defineComponent<Props>(
  () => {
    return () => null
  },
  {
    name: 'ToolUse',
    props: {
      id: {
        type: String,
        required: true
      },
      tool: {
        type: String,
        required: true
      },
      parameters: {
        type: String,
        required: true
      }
    }
  }
)
