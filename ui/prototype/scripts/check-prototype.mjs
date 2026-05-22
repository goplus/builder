import { readFileSync, readdirSync } from 'node:fs'
import { join, relative } from 'node:path'

const root = new URL('..', import.meta.url).pathname
const srcRoot = join(root, 'src')

function read(path) {
  return readFileSync(join(root, path), 'utf8')
}

function walk(dir) {
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const path = join(dir, entry.name)
    if (entry.name === 'node_modules' || entry.name === 'dist') return []
    if (entry.isDirectory()) return walk(path)
    return [path]
  })
}

const failures = []
const sourceFiles = walk(srcRoot).filter((path) => /\.(ts|vue|css)$/.test(path))
const prototypeBlockItem = read('src/components/editor/UIBlockItem.vue')
const prototypeBlockItemTitle = read('src/components/editor/UIBlockItemTitle.vue')
const prototypeEditorSpriteItem = read('src/components/editor/UIEditorSpriteItem.vue')
const prototypeSpriteItem = read('src/components/editor/SpriteItem.vue')

if (
  prototypeBlockItem.includes('<button') ||
  !prototypeBlockItem.includes('<div') ||
  !prototypeBlockItem.includes('.ui-block-item-active::before') ||
  !prototypeBlockItem.includes('border-width: 2px;')
) {
  failures.push('prototype UIBlockItem must mirror the real block item root and keep a 2px active pseudo-border')
}

if (
  !prototypeSpriteItem.includes("import UIEditorSpriteItem from '@/components/editor/UIEditorSpriteItem.vue'") ||
  !prototypeSpriteItem.includes('<UIEditorSpriteItem') ||
  prototypeSpriteItem.includes("import eyeOffIcon from '@/assets/editor/ui-icons/eye-off.svg?raw'")
) {
  failures.push('prototype SpriteItem must reuse UIEditorSpriteItem instead of duplicating title and hidden icon layout')
}

if (
  !prototypeBlockItemTitle.includes('w-full') ||
  !prototypeBlockItemTitle.includes('px-1.5') ||
  !prototypeEditorSpriteItem.includes('<UIBlockItemTitle class="gap-0.5 px-1"') ||
  prototypeEditorSpriteItem.includes('w-[76px]') ||
  prototypeEditorSpriteItem.includes('width: 76px') ||
  prototypeEditorSpriteItem.includes('width: calc(100% - 8px)') ||
  prototypeEditorSpriteItem.includes('px-0') ||
  prototypeEditorSpriteItem.includes('title="Invisible"')
) {
  failures.push('prototype UIEditorSpriteItem title row must use width 100% with 4px padding and no hidden-icon tooltip override')
}

for (const file of sourceFiles) {
  const text = readFileSync(file, 'utf8')
  const rel = relative(root, file)

  if (text.includes('spx-gui')) failures.push(`forbidden real frontend reference: ${rel}`)
  if (/\baxios\b/.test(text)) failures.push(`forbidden server call primitive: ${rel}`)
  if (/\bfetch\s*\(\s*['"`]https?:\/\//.test(text)) failures.push(`forbidden remote fetch call: ${rel}`)
  if (text.includes('@scalar/api-reference')) failures.push(`forbidden docs runtime reference: ${rel}`)
}

if (failures.length > 0) {
  console.error(`Prototype contract check failed with ${failures.length} issue(s):`)
  for (const failure of failures) console.error(`- ${failure}`)
  process.exitCode = 1
} else {
  console.log('Prototype contract check passed.')
}
