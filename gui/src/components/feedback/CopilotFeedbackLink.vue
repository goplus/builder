<script lang="ts">
import { z } from 'zod'
import { feedbackDescriptionMaxLength, feedbackTitleMaxLength } from '@/apis/feedback'

export const tagName = 'feedback-link'

export const isRaw = false

export const detailedDescription = `Display a button that opens the feedback form prefilled with your draft. \
The user reviews, edits, and sends it to the XBuilder team. For example:
You can <feedback-link title="My sprite stops moving" description="After I renamed my sprite, it stopped moving. I have tried refreshing the page.">send feedback</feedback-link> to the XBuilder team. \
I've filled it in with what you told me, and you can change it before sending.

Offer it when you cannot solve the user's problem (XBuilder seems broken, a needed feature is missing, or your suggestions failed twice), \
or when the user asks to send feedback. If you do not yet know what the feedback is about, ask first instead of offering it with an empty draft. \
Not for questions you can answer. Once the user declines, do not offer it again for the same problem.

Write the title and description as the user, in first person and the UI language (“I clicked Run”, not “The user clicked Run”). \
Include only what the user said, quoting errors exactly. \
Do not add steps, expectations, or causes the user did not mention, and do not list your current suggestions as tried. \
No placeholders, personal information, or code. \
Escape attribute values as in HTML without changing the text: write & as &amp;, " as &quot;, and line breaks as &#10;.

Use it at most once per reply, inside a sentence, never on its own line. \
Say you filled it in with what the user told you and that they can change it before sending. Never say it was sent.`

export const attributes = z.object({
  title: z.string().max(feedbackTitleMaxLength).describe('Short summary of the problem'),
  description: z.string().max(feedbackDescriptionMaxLength).describe('Details of the problem in one paragraph')
})
</script>

<script setup lang="ts">
import { useMessageHandle } from '@/utils/exception'
import InlineActionBtn from '@/components/copilot/markdown-elements/common/InlineActionBtn.vue'
import { useSendFeedback } from '.'

const props = defineProps<{
  /** Draft title of the Feedback */
  title: string
  /** Draft description of the Feedback */
  description: string
}>()

const sendFeedback = useSendFeedback()
const handleClick = useMessageHandle(() =>
  sendFeedback('copilotReply', { title: props.title, description: props.description })
).fn
</script>

<template>
  <InlineActionBtn @click="handleClick">
    <slot>{{ $t({ en: 'Send feedback', zh: '提交反馈' }) }}</slot>
  </InlineActionBtn>
</template>
