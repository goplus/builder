/**
 * gox.mod parsing and serialization.
 * Format documentation: https://github.com/goplus/xgo/wiki/gox.mod-Detail
 * Reference parser (version used by our language server):
 * https://github.com/goplus/mod/blob/v0.22.0/modfile/rule.go
 */

/** A classfile registration in gox.mod. */
export type ClassFile = {
  pattern: string
  className: string
}

export type WorkClass = ClassFile & {
  prefix: string
  embedded: boolean
  prototype: string | null
}

/** One project declaration and the directives that follow it in gox.mod. */
export type ClassFramework = {
  projectClass: ClassFile
  workClasses: WorkClass[]
  pkgPaths: string[]
  autoImports: Array<{ name: string | null; path: string }>
  flat: boolean
  pack: { directory: string; indexFile: string } | null
  autoLambdas: Record<string, number>
}

export type GoxMod = {
  xgoVersion: string | null
  projects: ClassFramework[]
}

function fail(line: number, message: string): never {
  throw new Error(`gox.mod:${line}: ${message}`)
}

function unquote(token: string): string {
  if (!token.startsWith('"')) return token
  const escapes: Record<string, string> = {
    a: '\x07',
    b: '\b',
    f: '\f',
    n: '\n',
    r: '\r',
    t: '\t',
    v: '\v',
    '\\': '\\',
    '"': '"'
  }
  return token
    .slice(1, -1)
    .replace(/\\(U[\da-fA-F]{8}|u[\da-fA-F]{4}|x[\da-fA-F]{2}|[0-7]{3}|.)/g, (_, escape: string) => {
      if (escape in escapes) return escapes[escape]
      const value = /^[0-7]{3}$/.test(escape) ? parseInt(escape, 8) : parseInt(escape.slice(1), 16)
      if (
        !Number.isInteger(value) ||
        value > 0x10ffff ||
        (/^[0-7]/.test(escape) && value > 255) ||
        (value >= 0xd800 && value <= 0xdfff)
      ) {
        throw new Error(`Invalid gox.mod string escape: \\${escape}`)
      }
      return String.fromCodePoint(value)
    })
}

function tokenize(source: string, line: number) {
  const tokens: string[] = []
  const token = /\s+|\/\/.*|"(?:\\.|[^"\\])*"|[(),]|[^\s(),"'`]+/y
  let offset = 0
  while (offset < source.length) {
    token.lastIndex = offset
    const match = token.exec(source)
    if (match == null) fail(line, 'invalid token or unterminated string')
    const value = match[0]
    if (value.startsWith('//')) break
    if (!/^\s/.test(value)) tokens.push(value)
    offset = token.lastIndex
  }
  return tokens
}

function isExtension(value: string, project: boolean) {
  return value.length > 1 && (/^(?:\*|_|\.)/.test(value) || (project && /^main[_.]/.test(value)))
}

/** Get the classfile extension from a gox.mod file pattern. */
export function getClassFileExtension(pattern: string): string {
  return pattern.replace(/^(?:\*|main(?=[_.]))/, '')
}

/** Parse gox.mod declarations. Comments and layout are discarded; invalid directives throw. */
export function parseGoxMod(source: string): GoxMod {
  const config: GoxMod = { xgoVersion: null, projects: [] }
  let block: string | null = null
  const lines = source.split('\n')
  for (let i = 0; i < lines.length; i++) {
    const line = i + 1
    const tokens = tokenize(lines[i], line)
    if (tokens.length === 0) continue
    if (tokens[0] === ')') {
      if (block == null || tokens.length !== 1) fail(line, 'unexpected closing parenthesis')
      block = null
      continue
    }
    if (tokens.length === 2 && tokens[1] === '(') {
      if (block != null) fail(line, 'nested directive block')
      block = tokens[0]
      continue
    }
    const directive = block ?? tokens.shift()!
    if (directive !== 'autolambda' && tokens.some((token) => ['(', ')', ','].includes(token))) {
      fail(line, 'unexpected punctuation')
    }
    const args = tokens.map(unquote)
    const requireArgs = (min: number, max = min) => {
      if (args.length < min || args.length > max) fail(line, `invalid ${directive} arguments`)
    }
    if (directive === 'xgo' || directive === 'gop') {
      requireArgs(1)
      if (config.xgoVersion != null) fail(line, 'repeated xgo declaration')
      if (!/^\d+\.\d+(?:\.\d+)?(?:[a-z]+\d+)?$/.test(args[0])) fail(line, 'invalid xgo version')
      config.xgoVersion = args[0]
      continue
    }
    if (directive === 'project') {
      let flat = false
      while (args[0]?.startsWith('-')) {
        if (args.shift() !== '-flat') fail(line, 'unknown project flag')
        flat = true
      }
      requireArgs(1, Infinity)
      let projectClass: ClassFile = { pattern: '', className: '' }
      if (isExtension(args[0], true)) {
        requireArgs(3, Infinity)
        if (!/^\*?[A-Z]\w*$/.test(args[1])) fail(line, 'invalid project class name')
        projectClass = { pattern: args.shift()!, className: args.shift()! }
      }
      if (args.some((path) => path === '' || /^[._]/.test(path))) fail(line, 'invalid package path')
      config.projects.push({
        projectClass,
        workClasses: [],
        pkgPaths: args,
        autoImports: [],
        flat,
        pack: null,
        autoLambdas: Object.create(null)
      })
      continue
    }
    const project = config.projects.at(-1)
    if (project == null) fail(line, `${directive} must follow a project declaration`)
    switch (directive) {
      case 'class': {
        if (project.flat) fail(line, 'class is not allowed in a flat project')
        let prefix = ''
        let embedded = false
        while (args[0]?.startsWith('-')) {
          const flag = args.shift()!
          if (flag === '-embed') embedded = true
          else if (flag.startsWith('-prefix=')) prefix = flag.slice(8)
          else fail(line, 'unknown class flag')
        }
        requireArgs(2, 3)
        if (!isExtension(args[0], false)) fail(line, 'invalid class extension')
        if (!args.slice(1).every((name) => /^\*?[A-Z]\w*$/.test(name))) fail(line, 'invalid work class name')
        project.workClasses.push({ pattern: args[0], className: args[1], prefix, embedded, prototype: args[2] ?? null })
        break
      }
      case 'import':
        requireArgs(1, 2)
        if (args.at(-1) === '' || /^[._]/.test(args.at(-1)!)) fail(line, 'invalid import path')
        project.autoImports.push({ name: args.length === 2 ? args[0] : null, path: args.at(-1)! })
        break
      case 'pack':
        requireArgs(2)
        if (project.pack != null) fail(line, 'duplicate pack declaration')
        if (/^[/\\]/.test(args[0]) || args[0].includes('..')) fail(line, 'invalid pack directory')
        if (/[/\\]/.test(args[1])) fail(line, 'invalid pack index file')
        project.pack = { directory: args[0], indexFile: args[1] }
        break
      case 'autolambda': {
        requireArgs(1, Infinity)
        let offset = 0
        while (offset < args.length) {
          const [name, open, count, close] = args.slice(offset, offset + 4)
          if (!/^\w+$/.test(name) || open !== '(' || !/^\d+$/.test(count) || close !== ')') {
            fail(line, 'expected autolambda name(nonnegativeInteger)')
          }
          if (Object.hasOwn(project.autoLambdas, name)) fail(line, `duplicate autolambda ${name}`)
          project.autoLambdas[name] = Number(count)
          offset += 4
          if (offset < args.length && (args[offset++] !== ',' || offset === args.length)) {
            fail(line, 'expected another autolambda after comma')
          }
        }
        break
      }
      default:
        fail(line, `unknown directive: ${directive}`)
    }
  }
  if (block != null) fail(lines.length, 'unterminated directive block')
  return config
}

function quote(value: string) {
  return value !== '' && /^[^\s(),"'`]+$/.test(value) && !value.includes('//') ? value : JSON.stringify(value)
}

/** Serialize semantic gox.mod data as canonical, unblocked declarations. */
export function serializeGoxMod(config: GoxMod): string {
  const lines: string[] = []
  const add = (directive: string, args: string[]) => lines.push([directive, ...args.map(quote)].join(' '))
  if (config.xgoVersion != null) add('xgo', [config.xgoVersion])
  for (const project of config.projects) {
    add('project', [
      ...(project.flat ? ['-flat'] : []),
      ...(project.projectClass.pattern === '' ? [] : [project.projectClass.pattern, project.projectClass.className]),
      ...project.pkgPaths
    ])
    for (const work of project.workClasses) {
      add('class', [
        ...(work.embedded ? ['-embed'] : []),
        ...(work.prefix === '' ? [] : [`-prefix=${work.prefix}`]),
        work.pattern,
        work.className,
        ...(work.prototype == null ? [] : [work.prototype])
      ])
    }
    for (const { name, path } of project.autoImports) add('import', name == null ? [path] : [name, path])
    if (project.pack != null) add('pack', [project.pack.directory, project.pack.indexFile])
    const lambdas = Object.entries(project.autoLambdas).map(([name, count]) => `${name}(${count})`)
    if (lambdas.length > 0) lines.push(`autolambda ${lambdas.join(', ')}`)
  }
  return lines.length === 0 ? '' : lines.join('\n') + '\n'
}
