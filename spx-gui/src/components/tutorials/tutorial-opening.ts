import type { LocaleMessage } from '@/utils/i18n'

/** The action shown by an opening guide window, based on its rendered queue position. */
export function getOpeningActionMessage(stepIndex: number, stepCount: number): LocaleMessage {
  const isLastStep = stepCount <= 1 || stepIndex >= stepCount - 1
  return isLastStep ? { en: 'Start', zh: '开始' } : { en: 'Next', zh: '下一步' }
}
