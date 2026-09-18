import { describe, expect, it, vi } from 'vitest'

import { Copilot } from '../copilot'
import { createBuiltInSkillRegistry } from './built-in'
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

describe('copilot skill catalog context', () => {
  it('formats the catalog in normal copilot context injection', async () => {
    const registry = createBuiltInSkillRegistry()
    const copilot = new Copilot(registry)

    expect((await copilot.getContextMessage()).content).toContain('# Skills')
    expect((await copilot.getContextMessage()).content).toContain(
      'call `load_skill` with the exact skill name to read the skill'
    )
    expect((await copilot.getContextMessage()).content).toContain(
      'You can also read resources in a skill by calling `load_skill_resource` with the skill name and the resource path'
    )
    expect((await copilot.getContextMessage()).content).toContain('Skill name: spx-project')
  })
})

describe('copilot preload skills', () => {
  it('adds preload skills to context through Copilot', async () => {
    const registry = createBuiltInSkillRegistry()
    const copilot = new Copilot(registry)

    copilot.registerContextProvider({
      providePreloadSkills() {
        return ['spx-project', 'spx-project']
      }
    })

    const context = (await copilot.getContextMessage()).content
    expect(context).toContain('# Preloaded skills')
    expect(context).toContain('These skills are already preloaded')
    expect(context).toContain('<skill_content name="spx-project" path="SKILL.md">')
    expect(context.match(/<skill_content name="spx-project" path="SKILL\.md">/g)).toHaveLength(1)
    expect(context).toContain('<file>references/apis.md</file>')
  })

  it('keeps context available when preloading a skill fails', async () => {
    const error = new Error('load failed')
    const registry: SkillRegistry = {
      register: vi.fn(),
      list: vi.fn(async () => [{ name: 'broken-skill', description: 'Broken skill.' }]),
      load: vi.fn(async () => {
        throw error
      }),
      loadResource: vi.fn()
    }
    const copilot = new Copilot(registry)

    copilot.registerContextProvider({
      providePreloadSkills() {
        return ['broken-skill']
      }
    })

    const context = (await copilot.getContextMessage()).content

    expect(context).toContain('Failed to preload skill "broken-skill".')
  })

  it('omits preload skills when no skill name is configured', async () => {
    const registry = createBuiltInSkillRegistry()
    const copilot = new Copilot(registry)

    copilot.registerContextProvider({
      providePreloadSkills() {
        return []
      }
    })

    expect((await copilot.getContextMessage()).content).not.toContain('# Preloaded skills')
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

  it('does not reload preloaded skills', async () => {
    const registry = createBuiltInSkillRegistry()
    const tool = createLoadSkillTool(registry, (skillName) => skillName === 'spx-project')

    expect(await tool.implementation({ skillName: 'spx-project' })).toBe('Skill "spx-project" is already preloaded.')
  })
})
