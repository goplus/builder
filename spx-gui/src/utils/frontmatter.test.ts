import { describe, expect, it } from 'vitest'

import { parseFrontmatter, parseMarkdownWithFrontmatter } from './frontmatter'

describe('parseFrontmatter', () => {
  it('parses simple frontmatter fields', () => {
    expect(
      parseFrontmatter(`
name: Demo Skill
description: "Demo description"
ignored line
# comment
tag: 'quoted value'
`)
    ).toEqual({
      name: 'Demo Skill',
      description: 'Demo description',
      tag: 'quoted value'
    })
  })
})

describe('parseMarkdownWithFrontmatter', () => {
  it('splits markdown frontmatter from content', () => {
    const parsed = parseMarkdownWithFrontmatter(`---
name: Demo
---

# Body
`)

    expect(parsed).toEqual({
      frontmatter: {
        name: 'Demo'
      },
      content: expect.stringContaining('# Body')
    })
  })

  it('returns null for markdown without frontmatter', () => {
    expect(parseMarkdownWithFrontmatter('# Body')).toBeNull()
  })
})
