import { inject, provide, type InjectionKey } from 'vue'
import type { Copilot } from './copilot'

const copilotInjectionKey: InjectionKey<Copilot> = Symbol('copilot')

export function useCopilot(): Copilot {
  const copilot = inject(copilotInjectionKey)
  if (!copilot) throw new Error('Copilot not provided')
  return copilot
}

export function provideCopilot(copilot: Copilot) {
  return provide(copilotInjectionKey, copilot)
}
