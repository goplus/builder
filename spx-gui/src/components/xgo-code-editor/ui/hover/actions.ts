import type { Action } from '../../common'

// Command IDs are kept here instead of importing the controller, which imports the hover module.
const hoverNavigationCommands: ReadonlySet<string> = new Set(['xgo.goToDefinition', 'xgo.goToResource'])

export function filterHoverActions(actions: Action[], navigationActionsVisible: boolean) {
  if (navigationActionsVisible) return actions
  return actions.filter((action) => !hoverNavigationCommands.has(action.command))
}
