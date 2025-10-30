import { contextBridge } from 'electron'
import { mm, me, invokeMainMethod, onMainEvent } from './protocol'

contextBridge.exposeInMainWorld('spxGuiDesktop', {
  setAIInteractionAPIEndpoint(endpoint: string) {
    return invokeMainMethod(mm.setAIInteractionAPIEndpoint, endpoint)
  },

  async setAIInteractionAPITokenProvider(provider: () => Promise<string>) {
    // To simplify the implementation, we call the provider here and send the token to main process.
    // TODO: we may implement a more complex mechanism to call the provider as needed from main process.
    const token = await provider()
    return invokeMainMethod(
      mm.setAIInteractionAPIToken,
      token
    )
  },

  setAIDescription(description: string) {
    return invokeMainMethod(mm.setAIDescription, description)
  },

  async startGame(buffer: ArrayBuffer) {
    return invokeMainMethod(mm.startGame, buffer)
  },

  stopGame() {
    return invokeMainMethod(mm.stopGame)
  },

  onGameError(callback: (err: string) => void) {
    onMainEvent(me.gameError, callback)
  },

  onGameExit(callback: (code: number) => void) {
    onMainEvent(me.gameExit, callback)
  },

  onConsole(callback: (type: string, msg: string) => void) {
    onMainEvent(me.console, callback)
  }
})
