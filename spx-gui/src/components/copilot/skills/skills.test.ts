import { describe, expect, it } from 'vitest'

import { SkillCatalogContextProvider } from './context-provider'
import { createBuiltInSkillRegistry } from './index'
import { createLoadSkillResourceTool, createLoadSkillTool } from './tools'
import { parseSkillDocument } from './parser'
import type { SkillRegistry } from './types'

describe('parseSkillDocument', () => {
  it('parses frontmatter metadata and markdown body', () => {
    const parsed = parseSkillDocument(`---
name: Demo Skill
description: Demo description.
---

# Demo

Skill body.
`)

    expect(parsed).toEqual({
      name: 'Demo Skill',
      description: 'Demo description.',
      content: '# Demo\n\nSkill body.'
    })
  })

  it('requires name and description in frontmatter', () => {
    expect(() =>
      parseSkillDocument(`---
name: Demo Skill
---

Missing description.
`)
    ).toThrow('Skill frontmatter must contain a non-empty description')
  })
})

describe('built-in skill registry', () => {
  it('lists built-in skills and loads main and resource documents', async () => {
    const registry = createBuiltInSkillRegistry()

    expect(await registry.list()).toEqual([
      {
        name: 'spx-project',
        description:
          'Guidelines for developing spx projects (games), including file structure, code organization, and best practices. Use this skill when the task is specifically about building or modifying an spx game in XBuilder.'
      },
      {
        name: 'xgo-language',
        description:
          'Handbook for XGo language features, syntax, and classfile concepts. Use this skill to understand how to read and write code in XGo.'
      }
    ])

    expect(await registry.load('spx-project')).toEqual({
      name: 'spx-project',
      description:
        'Guidelines for developing spx projects (games), including file structure, code organization, and best practices. Use this skill when the task is specifically about building or modifying an spx game in XBuilder.',
      instructions: expect.stringContaining('# About spx'),
      resourcePaths: ['references/ai-interaction.md', 'references/apis.md']
    })
    expect(await registry.loadResource('spx-project', 'references/apis.md')).toContain('# spx APIs')
    expect(await registry.loadResource('xgo-language', 'references/syntax.md')).toContain('# XGo Syntax Cheatsheet')
    await expect(registry.load('Missing Skill')).rejects.toThrow('Skill not found: Missing Skill')
    await expect(registry.loadResource('spx-project', 'references/missing.md')).rejects.toThrow(
      'Skill resource not found: spx-project/references/missing.md'
    )
  })
})

describe('skill catalog context', () => {
  it('formats the catalog for normal copilot context injection', async () => {
    const registry = createBuiltInSkillRegistry()
    const provider = new SkillCatalogContextProvider(registry)
    const emptyRegistry: SkillRegistry = {
      register() {
        return () => {}
      },
      async list() {
        return []
      },
      async load() {
        throw new Error('Skill not found: empty')
      },
      async loadResource() {
        throw new Error('Skill resource not found: empty/resource')
      }
    }
    const emptyProvider = new SkillCatalogContextProvider(emptyRegistry)

    expect(await emptyProvider.provideContext()).toBe('')
    expect(await provider.provideContext()).toContain('# Skills')
    expect(await provider.provideContext()).toContain('call `load_skill` with the exact skill name to read the skill')
    expect(await provider.provideContext()).toContain(
      'You can also read resources in a skill by calling `load_skill_resource` with the skill name and the resource path'
    )
    expect(await provider.provideContext()).toContain('Skill name: spx-project')
  })
})

describe('load_skill tool', () => {
  it('loads skill documents and resources without session-specific state', async () => {
    const registry = createBuiltInSkillRegistry()
    const tool = createLoadSkillTool(registry)
    const resourceTool = createLoadSkillResourceTool(registry)

    const mainDocument = await tool.implementation({ skillName: 'spx-project' })
    expect(mainDocument).toContain('<skill_content name="spx-project" path="SKILL.md">')
    expect(mainDocument).toContain('# About spx')
    expect(mainDocument).toContain('<skill_resources>')
    expect(mainDocument).toContain('<file>references/ai-interaction.md</file>')
    expect(mainDocument).toContain('<file>references/apis.md</file>')

    const resourceDocument = await resourceTool.implementation({
      skillName: 'spx-project',
      resourcePath: 'references/apis.md'
    })
    expect(resourceDocument).toContain('path="references/apis.md"')
    expect(resourceDocument).toContain('# spx APIs')
    expect(resourceDocument).not.toContain('<skill_resources>')

    const directResourceDocument = await resourceTool.implementation({
      skillName: 'xgo-language',
      resourcePath: 'references/syntax.md'
    })
    expect(directResourceDocument).toContain('# XGo Syntax Cheatsheet')
    expect(directResourceDocument).toContain('for_iterate')
  })
})
