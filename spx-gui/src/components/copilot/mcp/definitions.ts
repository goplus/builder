import { z } from 'zod'
import { createToolDescription } from './registry'

/**
 * Project Management Tools
 * Tools for creating and managing XBuilder projects
 */

/**
 * Schema for validating project creation parameters
 */
export const CreateProjectArgsSchema = z.object({
  projectName: z
    .string()
    .describe(
      'The project name (English characters only) where the new Go+ XBuilder SPX project will be created and initialized.'
    )
})

/**
 * Tool description for project creation functionality
 * Allows creating a new SPX project with default structure
 */
export const createProjectToolDescription = createToolDescription(
  'create_project',
  'Create a new SPX language project for Go+ XBuilder with the specified name and initialize default project structure.',
  CreateProjectArgsSchema,
  'project'
)

/**
 * Game Execution Tools
 * Tools for controlling project execution in the runtime environment
 */

/**
 * Schema for validating game execution parameters
 */
export const RunGameArgsSchema = z.object({
  projectName: z.string().describe('The name of the project to run in XBuilder.')
})

/**
 * Tool description for running project gameplay
 * Executes the current project in the runtime environment
 */
export const runGameToolDescription = createToolDescription(
  'run_game',
  'Run the current Go+ XBuilder SPX project in the XBuilder environment.',
  RunGameArgsSchema,
  'game'
)

/**
 * Schema for validating game termination parameters
 */
export const StopGameArgsSchema = z.object({
  projectName: z.string().describe('The name of the project to stop in XBuilder.')
})

/**
 * Tool description for stopping project gameplay
 * Terminates the execution of the current project
 */
export const stopGameToolDescription = createToolDescription(
  'stop_game',
  'Stop the current Go+ XBuilder SPX project in the XBuilder environment.',
  StopGameArgsSchema,
  'game'
)

/**
 * Sprite Management Tools
 * Tools for creating and manipulating visual sprites in projects
 */

/**
 * Schema for validating sprite creation parameters
 * Used when creating sprites from canvas drawings
 */
export const AddSpriteFromCanvasArgsSchema = z.object({
  spriteName: z
    .string()
    .describe('The identifier of the specific sprite or visual component to add to the current SPX workspace.'),
  size: z.number().describe('The size of the square in pixels'),
  color: z.string().describe('The color of the square (CSS color format)')
})

/**
 * Tool description for adding sprites from canvas
 * Creates a new sprite from a canvas drawing
 */
export const addSpriteFromCanvasToolDescription = createToolDescription(
  'add_sprite_from_canvos',
  'Add a new visual sprite or component from the canvos to the current Go+ XBuilder project workspace.',
  AddSpriteFromCanvasArgsSchema,
  'sprite'
)

/**
 * Stage Management Tools
 * Tools for modifying the stage and its properties
 */

/**
 * Schema for validating stage backdrop creation parameters
 * Used when creating backdrops from canvas drawings
 */
export const AddStageBackdropFromCanvasArgsSchema = z.object({
  backdropName: z
    .string()
    .describe('The identifier of the specific sprite or visual component to add to the current SPX workspace.'),
  color: z.string().describe('The color of the backdrop (CSS color format)')
})

/**
 * Tool description for adding stage backdrops from canvas
 * Creates a new backdrop from a canvas drawing
 */
export const addStageBackdropFromCanvasToolDescription = createToolDescription(
  'add_stage_backdrop_from_canvos',
  'Add a new visual backdrop from the canvas to the current Go+ XBuilder project stage.',
  AddStageBackdropFromCanvasArgsSchema,
  'stage'
)

/**
 * Code Management Tools
 * Tools for manipulating source code in project files
 */

/**
 * Schema for validating code insertion parameters
 * Defines where and how code should be inserted or replaced
 */
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

/**
 * Tool description for code insertion functionality
 * Allows inserting or replacing code in project files
 */
export const insertCodeToolDescription = createToolDescription(
  'insert_code',
  'Insert or replace SPX language code at specific locations in project files within the Go+ XBuilder environment.',
  InsertCodeArgsSchema,
  'code'
)

/**
 * Schema for validating file listing parameters
 * Defines how to list files in a project or directory
 */
export const ListFilesArgsSchema = z.object({})

/**
 * Tool description for listing files in a project
 * Allows retrieving file structure information from the project
 */
export const listFilesToolDescription = createToolDescription(
  'list_files',
  'List files in the current Go+ XBuilder project, optionally filtering by path or pattern.',
  ListFilesArgsSchema,
  'filesystem'
)

export const GetDiagnosticsArgsSchema = z.object({})

export const getDiagnosticsToolDescription = createToolDescription(
  'get_diagnostics',
  'Get the diagnostics of the current Go+ XBuilder project, including errors and warnings in the code.',
  GetDiagnosticsArgsSchema,
  'diagnostics'
)