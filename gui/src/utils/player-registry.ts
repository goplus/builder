/**
 * @file Registry for audio players across application
 * @desc Use central registry to ensure that at most one player plays at a time.
 */

type Player = {
  onStart: () => void
  onStopped: () => void
}

type InternalPlayer = Player & {
  stopHandler: () => void
}

class PlayerRegistry {
  private playing: InternalPlayer | null = null

  register(stopHandler: () => void): Player {
    const player: InternalPlayer = {
      onStart: () => {
        if (this.playing != null) {
          this.playing.stopHandler()
        }
        this.playing = player
      },
      onStopped: () => {
        if (this.playing === player) {
          this.playing = null
        }
      },
      stopHandler
    }
    return player
  }
}

const registry = new PlayerRegistry()

export function registerPlayer(stopHandler: () => void) {
  return registry.register(stopHandler)
}
