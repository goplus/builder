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
      'The project name (English characters only) where the new XBuilder SPX project will be created and initialized.'
    )
})

/**
 * Tool description for project creation functionality
 * Allows creating a new SPX project with default structure
 */
export const createProjectToolDescription = createToolDescription(
  'create_project',
  'Create a new SPX language project for XBuilder with the specified name and initialize default project structure.',
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
  'Run the current XBuilder SPX project in the XBuilder environment.',
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
  'Stop the current XBuilder SPX project in the XBuilder environment.',
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
  'add_sprite_from_canvas',
  'Add a sprite (File) to the current XBuilder project workspace through canvas',
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
  'add_stage_backdrop_from_canvas',
  'Add a backdrop to the Stage and automatically use that backdrop',
  AddStageBackdropFromCanvasArgsSchema,
  'stage'
)

/**
 * Code Management Tools
 * Tools for manipulating source code in project files
 */

/**
 * Schema for validating file write parameters
 * Defines the file to write and its complete content
 */
export const WriteToFileArgsSchema = z.object({
  file: z
    .string()
    .describe(
      'The Spx file path where the content will be written. This should be a valid file path. example: "file:///stage.spx"'
    ),
  content: z.string().describe('The complete content to write to the file, replacing any existing content.')
})

/**
 * Tool description for writing complete file content
 * Allows overwriting a file with new content
 */
export const writeToFileToolDescription = createToolDescription(
  'write_to_file',
  'Write complete content to a specific file in the XBuilder project, replacing any existing content.',
  WriteToFileArgsSchema,
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
  'List files in the current XBuilder project, optionally filtering by path or pattern.',
  ListFilesArgsSchema,
  'filesystem'
)

export const GetDiagnosticsArgsSchema = z.object({})

export const getDiagnosticsToolDescription = createToolDescription(
  'get_diagnostics',
  'Get the diagnostics of the current XBuilder project, including errors and warnings in the code.',
  GetDiagnosticsArgsSchema,
  'diagnostics'
)

export const GetFileCodeArgsSchema = z.object({
  file: z
    .string()
    .describe('The Spx file path to get the code from. This should be a valid file path. example: "file:///stage.spx"')
})
export const getFileCodeToolDescription = createToolDescription(
  'get_file_code',
  'Get the code from a specific Spx file in the current XBuilder project.',
  GetFileCodeArgsSchema,
  'code'
)

export const AddMonitorArgsSchema = z.object({
  monitorName: z.string().describe('The identifier of the specific monitor to add to the current SPX workspace.'),
  label: z.string().describe('The label of the monitor.'),
  variableName: z.string().describe('The name of the variable to monitor.'),
  x: z.number().describe('The x position of the monitor.'),
  y: z.number().describe('The y position of the monitor.'),
  size: z.number().default(1).describe('The size of the monitor. default: 1'),
  visible: z.boolean().describe('Whether the monitor is visible or not.')
})
export const addMonitorToolDescription = createToolDescription(
  'add_monitor',
  'Add a monitor to the current XBuilder project workspace.',
  AddMonitorArgsSchema,
  'monitor'
)

export const ListMonitorsArgsSchema = z.object({})
export const listMonitorsToolDescription = createToolDescription(
  'list_monitors',
  'List all monitors in the current XBuilder project workspace.',
  ListMonitorsArgsSchema,
  'monitor'
)
