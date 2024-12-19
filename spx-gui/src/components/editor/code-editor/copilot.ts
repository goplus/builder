import { Disposable } from '@/utils/disposable'
import { makeBasicMarkdownString, type BasicMarkdownString } from './common'
import type { Chat, ChatContext, ICopilot } from './ui/code-editor-ui'

export class Copilot extends Disposable implements ICopilot {
  async getChatCompletion(ctx: ChatContext, chat: Chat): Promise<BasicMarkdownString> {
    console.warn('TODO', ctx, chat)
    return Promise.race([
      new Promise<never>((_, reject) => ctx.signal.addEventListener('abort', () => reject(ctx.signal.reason))),
      new Promise((resolve) => setTimeout(resolve, 1000)).then(() =>
        makeBasicMarkdownString(`
I do not have access to real-time information, including the specifics of the \`turn\` API for the spx game engine.  My knowledge is based on the data I was trained on.  To understand the \`turn\` API, you should consult the official spx documentation or the source code itself.  The GitHub repository you linked ([https://github.com/goplus/spx](https://github.com/goplus/spx)) is the best place to find this information.

Based on the context of the provided tutorials, it's likely that the \`turn\` function or method within the spx game engine is related to game logic and sprite movement.  The tutorials show examples of sprites moving randomly using functions like \`step\` and \`turn\`.  It's probable that \`turn\` modifies the rotation or orientation of a sprite, potentially in conjunction with \`step\` to control its movement direction.  However, without access to the engine's API documentation, this is just speculation.

To find the precise functionality of \`turn\`, I recommend the following steps:

1. **Check the spx documentation:** Look for official documentation or tutorials that explain the API.
2. **Examine the source code:** The GitHub repository contains the source code.  Search for the \`turn\` function or method within the relevant files.  The surrounding code will provide context and explain its usage.
3. **Search the spx issues and discussions:** The GitHub repository likely has issues or discussions where users have asked about the \`turn\` API.  These discussions might provide helpful insights.

Remember to always refer to the official documentation for the most accurate and up-to-date information.
`)
      )
    ])
  }
}
