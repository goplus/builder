export function join(base: string, ...paths: string[]) {
  // TODO
  return [base, ...paths].join('/')
}

export function resolve(base: string, ...paths: string[]) {
  // TODO
  return [base, ...paths].join('/')
}

export function filename(urlOrPath: string) {
  const slashPos = urlOrPath.lastIndexOf('/')
  if (slashPos >= 0) urlOrPath = urlOrPath.slice(slashPos + 1)
  return urlOrPath
}

export function stripExt(urlOrPath: string) {
  const slashPos = urlOrPath.lastIndexOf('/')
  const dotPos = urlOrPath.lastIndexOf('.')
  if (dotPos > slashPos + 1) return urlOrPath.slice(0, dotPos)
  return urlOrPath
}

/** get extname, with dot. e.g. `.txt` */
export function extname(urlOrPath: string) {
  return urlOrPath.slice(stripExt(urlOrPath).length)
}
