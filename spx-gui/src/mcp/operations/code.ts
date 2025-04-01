import { z } from 'zod'
import { getCodeEditorUI } from '@/pages/editor/context'

export const InsertCodeArgsSchema = z.object({
  file: z.string().describe(''),
  code: z.string().describe('The SPX language code segment to be inserted into the Go+ XBuilder project file.'),
  insertRange: z
    .object({
      startLine: z.number().describe('The starting line number in the SPX file where code insertion will begin.'),
      endLine: z.number().describe('The ending line number in the SPX file where code insertion will complete.')
    })
    .describe('The line range in the SPX file where new code will be inserted.'),
  replaceRange: z
    .object({
      startLine: z.number().describe('The starting line number in the SPX file where existing code will be replaced.'),
      endLine: z.number().describe('The ending line number in the SPX file where code replacement will end.')
    })
    .optional()
    .describe('Optional range defining which existing SPX code should be replaced with the new code.')
})

export type InsertCodeOptions = z.infer<typeof InsertCodeArgsSchema>

export function insertCode(options: InsertCodeOptions) {
  const code = options.code
  const file = options.file
  const iRange = options.insertRange
  const rRange = options.replaceRange
  const codeEditorUICtx = getCodeEditorUI()
  if (rRange && rRange.startLine > 0 && rRange.endLine > 0 && rRange.startLine <= rRange.endLine) {
    codeEditorUICtx.open(
      { uri: file },
      {
        start: { line: rRange.startLine, column: 0 },
        end: { line: rRange.endLine, column: 0 }
      }
    )
  } else {
    codeEditorUICtx.open({ uri: file })
  }

  codeEditorUICtx.insertBlockText(code, {
    start: { line: iRange.startLine, column: 0 },
    end: { line: iRange.endLine, column: 0 }
  })
  return {
    success: true,
    message: `Successfully insertCode`
  }
}
