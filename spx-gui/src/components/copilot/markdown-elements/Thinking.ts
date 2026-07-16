import { z } from 'zod'
import { defineComponent } from 'vue'

export const tagName = 'thinking'

export const isRaw = true

export const description = 'Wrap internal reasoning so the user never sees it.'

export const detailedDescription = `Wrap ALL internal reasoning, analysis or planning in \
<${tagName}></${tagName}> when you need to think before answering: everything inside is hidden from the user, even \
while your reply is still streaming. Any text OUTSIDE this element is shown to the user as your reply — reasoning \
must never appear there. Think briefly or not at all; when you do, close the tag before writing the user-facing \
part of the reply.`

export const attributes = z.object({})

export default defineComponent(() => () => null, { name: 'CopilotThinking', props: {} })
