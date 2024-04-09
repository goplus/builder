export type Size = {
  width: number
  height: number
}

export function assign<T extends object>(instance: T, patches: Partial<T>) {
  Object.assign(instance, patches)
}
