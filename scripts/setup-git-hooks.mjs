import { execFile } from 'node:child_process'
import { promisify } from 'node:util'

import { getRepoRoot } from './pen-protection.mjs'

const execFileAsync = promisify(execFile)
const repoRoot = getRepoRoot()

await execFileAsync('git', ['config', 'core.hooksPath', '.githooks'], {
  cwd: repoRoot
})

console.log('Configured git hooks path to .githooks')
