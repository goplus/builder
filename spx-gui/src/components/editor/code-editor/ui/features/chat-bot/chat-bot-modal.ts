import { reactive } from "vue";
import { Chat } from "@/components/editor/code-editor/chat-bot";

export class ChatBotModal {
    constructor() {}
  
    setVisible(visible: boolean) {
      this.state.visible = visible
    }
  
    setChat(chat: Chat) {
      this.state.chat = chat
    }
  
    state = reactive<{ visible: boolean; chat: Chat | null }>({ visible: false, chat: null })
  }