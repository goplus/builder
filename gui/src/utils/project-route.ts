import type { RouteParamsRawGeneric } from 'vue-router'

/** Project owner and name pair. */
export type ProjectIdentifier = {
  owner: string
  name: string
}

/** Build a project identifier if both owner and name are available. */
export function toProjectIdentifier(owner: string | undefined, name: string | undefined): ProjectIdentifier | null {
  if (owner == null || name == null) return null
  return { owner, name }
}

/** Check if two project identifiers point to the same project. */
export function isSameProjectIdentifier(left: ProjectIdentifier | null, right: ProjectIdentifier | null): boolean {
  return left != null && right != null && left.owner === right.owner && left.name === right.name
}

/** Preserve the current editor sub-route while replacing the project route segments. */
export function getProjectEditorRouteParams(
  currentParams: RouteParamsRawGeneric,
  projectIdentifier: ProjectIdentifier
): RouteParamsRawGeneric {
  return {
    ...currentParams,
    ownerNameInput: projectIdentifier.owner,
    projectNameInput: projectIdentifier.name
  }
}
