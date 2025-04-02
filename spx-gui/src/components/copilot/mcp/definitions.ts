import { z } from 'zod'
import { createToolDescription } from './registry'

// 项目相关工具
export const CreateProjectArgsSchema = z.object({
  projectName: z
    .string()
    .describe(
      'The project name (English characters only) where the new Go+ XBuilder SPX project will be created and initialized.'
    )
})

export const createProjectToolDescription = createToolDescription(
  'create_project',
  'Create a new SPX language project for Go+ XBuilder with the specified name and initialize default project structure.',
  CreateProjectArgsSchema,
  'project'
)

// 游戏控制工具
export const RunGameArgsSchema = z.object({
  projectName: z.string().describe('The name of the project to run in XBuilder.')
})

export const runGameToolDescription = createToolDescription(
  'run_game',
  'Run the current Go+ XBuilder SPX project in the XBuilder environment.',
  RunGameArgsSchema,
  'game'
)

export const StopGameArgsSchema = z.object({
  projectName: z.string().describe('The name of the project to stop in XBuilder.')
})

export const stopGameToolDescription = createToolDescription(
  'stop_game',
  'Stop the current Go+ XBuilder SPX project in the XBuilder environment.',
  StopGameArgsSchema,
  'game'
)

// 精灵相关工具
export const AddSpriteFromCanvasArgsSchema = z.object({
  spriteName: z
    .string()
    .describe('The identifier of the specific sprite or visual component to add to the current SPX workspace.'),
  size: z.number().describe('The size of the square in pixels'),
  color: z.string().describe('The color of the square (CSS color format)')
})

export const addSpriteFromCanvasToolDescription = createToolDescription(
  'add_sprite_from_canvos',
  'Add a new visual sprite or component from the canvos to the current Go+ XBuilder project workspace.',
  AddSpriteFromCanvasArgsSchema,
  'sprite'
)

// 舞台相关工具
export const AddStageBackdropFromCanvasArgsSchema = z.object({
  backdropName: z
    .string()
    .describe('The identifier of the specific sprite or visual component to add to the current SPX workspace.'),
  color: z.string().describe('The color of the backdrop (CSS color format)')
})

export const addStageBackdropFromCanvasToolDescription = createToolDescription(
  'add_stage_backdrop_from_canvos',
  'Add a new visual backdrop from the canvas to the current Go+ XBuilder project stage.',
  AddStageBackdropFromCanvasArgsSchema,
  'stage'
)

// 代码相关工具
export const InsertCodeArgsSchema = z.object({
  file: z.string().describe('The Spx file path where the code will be inserted. This should be a valid file path. example: "file:///stage.spx"'),
  code: z.string().describe('The SPX language code segment to be inserted into the Go+ XBuilder project file.'),
  insertRange: z
    .object({
      startLine: z.number().describe('The starting line number in the SPX file where code insertion will begin.'),
      endLine: z.number().describe('The ending line number in the SPX file where code insertion will complete.')
    })
    .describe('The line range in the SPX file where new code will be inserted.'),
  replaceRange: z
    .object({
      startLine: z.number().optional().describe('The starting line number in the SPX file where existing code will be replaced.'),
      endLine: z.number().optional().describe('The ending line number in the SPX file where code replacement will end.')
    })
    .optional()
    .describe('Optional range defining which existing SPX code should be replaced with the new code.')
})

export const insertCodeToolDescription = createToolDescription(
  'insert_code',
  'Insert or replace SPX language code at specific locations in project files within the Go+ XBuilder environment.',
  InsertCodeArgsSchema,
  'code'
)

// 导出所有工具描述
export const standardToolDescriptions = [
  createProjectToolDescription,
  runGameToolDescription,
  stopGameToolDescription,
  addSpriteFromCanvasToolDescription,
  addStageBackdropFromCanvasToolDescription,
  insertCodeToolDescription
]