import { z } from 'zod'

export const projectIdentifierSchema = z
  .string()
  .optional()
  .describe(
    'Project identifier. Format: `<owner_name>/<project_name>`. If not provided, current editing project (if there is one) will be used.'
  )

export function parseProjectIdentifier(target: string): { owner: string; name: string } {
  const parts = target.split('/')
  if (parts.length !== 2) throw new Error(`Invalid project identifier: ${target}`)
  return { owner: parts[0], name: parts[1] }
}

export const codeFilePathSchema = z
  .string()
  .describe('Code file path, e.g., `NiuXiaoQi.spx` for sprite NiuXiaoQi, `main.spx` for stage code')
