/**
 * @file Definition-related helpers
 * @desc Here we define some helper functions to get definitions for Go+ and SPX.
 *       They are expected to be generated, then copy-pasted to spx-backend code as part of prompt for Copilot.
 */

import { type DefinitionDocumentationItem } from '../common'
import * as gopDefinitions from './gop'
import * as spxDefinitions from './spx'

function transformItems(items: DefinitionDocumentationItem[]) {
  function simplifyPackage(pkg: string | undefined) {
    if (pkg === 'github.com/goplus/spx') return 'spx'
    return pkg
  }
  const result = items.map((d) => {
    return {
      pkg: simplifyPackage(d.definition.package),
      name: d.definition.name,
      sample: d.overview,
      desc: typeof d.detail.value === 'string' ? d.detail.value : d.detail.value.en
    }
  })
  return result
}

// Run `copy(getGopDefinitions())` / `copy(getSpxDefinitions())` in browser console to copy generated definitions.
;(globalThis as any).getGopDefinitions = () => JSON.stringify(transformItems(Object.values(gopDefinitions)))
;(globalThis as any).getSpxDefinitions = () => {
  const items = Object.values(spxDefinitions)
  const gameItems: DefinitionDocumentationItem[] = []
  const spriteItems: DefinitionDocumentationItem[] = []
  const others: DefinitionDocumentationItem[] = []
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
    else others.push(item)
  })
  return JSON.stringify({
    game: transformItems(gameItems),
    sprite: transformItems(spriteItems),
    others: transformItems(others)
  })
}
