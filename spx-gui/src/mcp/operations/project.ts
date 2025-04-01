/**
 * Project Operations Module
 *
 * This module provides functionality for project management operations,
 * including creating projects and interacting with project data.
 * It uses a provider pattern to abstract the actual implementation,
 * making it easier to test and extend.
 *
 * @module operations/project
 */

import { computed } from 'vue'
import { z } from 'zod'

/**
 * Interface for project provider implementations
 * Abstracts project-related operations to enable dependency injection
 *
 * @interface ProjectProvider
 */
export interface ProjectProvider {
  /**
   * Gets information about the currently signed-in user
   *
   * @returns {any} User information object
   */
  getUserInfo: () => any

  /**
   * Retrieves a project by username and project name
   *
   * @param {string} username - Owner of the project
   * @param {string} projectName - Name of the project to retrieve
   * @returns {Promise<any>} Promise resolving to the project data
   */
  getProject: (username: string, projectName: string) => Promise<any>

  /**
   * Creates a new project
   *
   * @param {string} username - Owner of the new project
   * @param {string} projectName - Name for the new project
   * @returns {Promise<any>} Promise resolving to the created project data
   */
  createProject: (username: string, projectName: string) => Promise<any>
}

// Default implementation placeholder
let projectProvider: ProjectProvider | null = null

/**
 * Sets the project provider implementation
 * Should be called during application initialization
 *
 * @param {ProjectProvider} provider - The provider implementation to use
 */
export function setProjectProvider(provider: ProjectProvider) {
  projectProvider = provider
}

/**
 * Schema definition for project creation arguments
 * Uses Zod for validation and type inference
 */
export const CreateProjectArgsSchema = z.object({
  projectName: z
    .string()
    .describe(
      'The project name (English characters only) where the new Go+ XBuilder SPX project will be created and initialized.'
    )
})

/**
 * Type definition for project creation options
 * Inferred from the Zod schema
 */
export type CreateProjectOptions = z.infer<typeof CreateProjectArgsSchema>

/**
 * Creates a new project with the specified name
 *
 * This function validates that the user is signed in, checks if the project
 * already exists, and then creates the project if all checks pass.
 *
 * @param {CreateProjectOptions} options - Project creation options
 * @returns {Promise<{success: boolean, message: string}>} Result object with success status and message
 *
 * @example
 * // Create a new project
 * const result = await createProject({ projectName: 'my-awesome-game' });
 *
 * if (result.success) {
 *   console.log(result.message); // Project "my-awesome-game" created successfully
 * } else {
 *   console.error(result.message); // Error message if creation failed
 * }
 */
export async function createProject(options: CreateProjectOptions) {
  const projectName = options.projectName

  // Check if user is signed in
  const signedInUser = computed(() => projectProvider?.getUserInfo())
  if (signedInUser.value == null) {
    return {
      success: false,
      message: 'Please sign in to create a project'
    }
  }

  const username = signedInUser.value.name

  try {
    // Check if project already exists
    const project = await projectProvider?.getProject(username, options.projectName)
    if (project != null) {
      return {
        success: false,
        message: `Project "${projectName}" already exists`
      }
    }
  } catch (e) {
    // Handle error checking project existence
    return {
      success: false,
      message: `Failed to check if project exists: ${e instanceof Error ? e.message : String(e)}`
    }
  }

  try {
    // Create the new project
    await projectProvider?.createProject(username, projectName)
    return {
      success: true,
      message: `Project "${projectName}" created successfully`
    }
  } catch (error) {
    // Handle project creation error
    const errorMessage = error instanceof Error ? error.message : String(error)

    return {
      success: false,
      message: `Failed to create project: ${errorMessage}`
    }
  }
}
