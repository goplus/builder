import { inject, provide, type InjectionKey } from 'vue'
import type { Copilot, Round } from './copilot'

const copilotInjectionKey: InjectionKey<Copilot> = Symbol('copilot')

export function useCopilot(): Copilot {
  const copilot = inject(copilotInjectionKey)
  if (copilot == null) throw new Error('Copilot not provided')
  return copilot
}

export function provideCopilot(copilot: Copilot) {
  return provide(copilotInjectionKey, copilot)
}

/** Context describing the copilot round a markdown element is rendered within. */
export interface CopilotRoundContext {
  /** The round this content belongs to. */
  round: Round
  /** Whether this is the latest round in the session. */
  isLastRound: () => boolean
}

const copilotRoundInjectionKey: InjectionKey<CopilotRoundContext> = Symbol('copilot-round')

/** Read the round a markdown element belongs to, or `null` when not rendered inside a copilot round. */
export function useCopilotRound(): CopilotRoundContext | null {
  return inject(copilotRoundInjectionKey, null)
}

export function provideCopilotRound(ctx: CopilotRoundContext) {
  return provide(copilotRoundInjectionKey, ctx)
}
