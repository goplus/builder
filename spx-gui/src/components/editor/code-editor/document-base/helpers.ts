/**
 * @file Definition-related helpers
 * @desc Here we define some helper functions to get definitions for XGo and spx.
 *       They are expected to be generated, then copy-pasted to spx-backend code as part of prompt for Copilot.
 */

import { SnippetParser } from '@/utils/snippet-parser'
import { type DefinitionDocumentationItem } from '../common'
import * as xgoDefinitions from './xgo'
import * as spxDefinitions from './spx'
import { keys as spxKeyDefinitions } from './spx/key'

let parser: SnippetParser

function sampleOf(ddi: DefinitionDocumentationItem) {
  parser ??= new SnippetParser()
  const parsed = parser.parse(ddi.insertSnippet)
  const sample = parsed.toString().replace(/{\n\s*\n}/g, '{}')
  if (sample === ddi.definition.name) return undefined
  return sample
}

function descOf(ddi: DefinitionDocumentationItem) {
  return typeof ddi.detail.value === 'string' ? ddi.detail.value : ddi.detail.value.en
}

// Run `copy(await getXGoDefinitions())` / `copy(await getSpxDefinitions())` in browser console to copy generated definitions.
;(globalThis as any).getXGoDefinitions = async () => {
  const csvStringify = await import('csv-stringify/browser/esm/sync').then((m) => m.stringify)
  const xgoTable = csvStringify(
    Object.values(xgoDefinitions)
      .filter((d) => !d.hiddenFromList)
      .map((d) => ({
        Package: d.definition.package,
        Name: d.definition.name,
        Sample: sampleOf(d),
        Description: descOf(d)
      })),
    { header: true }
  ).trim()
  return `\
# XGo Syntax

\`\`\`csv
${xgoTable}
\`\`\`
`
}
;(globalThis as any).getSpxDefinitions = async () => {
  const csvStringify = await import('csv-stringify/browser/esm/sync').then((m) => m.stringify)
  const items = Object.values(spxDefinitions)
  const gameItems: DefinitionDocumentationItem[] = []
  const spriteItems: DefinitionDocumentationItem[] = []
  const otherItems: Array<DefinitionDocumentationItem> = []
  items.forEach((item) => {
    const name = item.definition.name ?? ''
    if (name.startsWith('Game.'))
      gameItems.push({
        ...item,
        definition: {
          ...item.definition,
          name: name.slice(5)
        }
      })
    else if (name.startsWith('Sprite.'))
      spriteItems.push({
        ...item,
        definition: {
          ...item.definition,
          name: name.slice(7)
        }
      })
    else otherItems.push(item)
  })
  const makeSpxTable = (items: DefinitionDocumentationItem[]) => {
    items = items.filter((d) => !d.hiddenFromList)
    return csvStringify(
      items.map((d) => ({
        Name: d.definition.name,
        Sample: sampleOf(d),
        Description: descOf(d)
      })),
      { header: true }
    ).trim()
  }
  const keyTable = csvStringify(
    [
      {
        Name: getKeyNames(),
        Sample: 'onKey Key1, => {}',
        Description: 'Key definitions, used for keyboard event listening.'
      }
    ],
    { header: true }
  ).trim()
  return `\
# spx APIs

## Game

\`\`\`csv
${makeSpxTable(gameItems)}
\`\`\`

## Sprite

\`\`\`csv
${makeSpxTable(spriteItems)}
\`\`\`

## Others

\`\`\`csv
${makeSpxTable(otherItems)}
\`\`\`

## Keys

\`\`\`csv
${keyTable}
\`\`\`
`
}

const mergedKeyNames = 'Key0-Key9,KeyA-KeyZ,KeyF1-KeyF12,KeyKP0-KeyKP9'
const mergedKeysPattern = /^Key([0-9A-Z]|F\d+|KP\d)$/

function getKeyNames() {
  const keyNames = spxKeyDefinitions.map((d) => d.definition.name)
  const extraKeyNames = keyNames.filter((n) => !mergedKeysPattern.test(n!)).join(',')
  return `${mergedKeyNames},${extraKeyNames}`
}
