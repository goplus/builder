import { z } from 'zod'
import { computed } from 'vue'
import { useUserStore } from '@/stores/user'
import { registerTools } from './registry'
import { createProjectToolDescription, CreateProjectArgsSchema } from './definitions'
import { getProject, Visibility } from '@/apis/project'
import { useRouter } from 'vue-router'
import { getProjectEditorRoute } from '@/router'
import { Project } from '@/models/project'
import { genAssetFromCanvos } from '@/components/asset'

type CreateProjectOptions = z.infer<typeof CreateProjectArgsSchema>

export const initBasicTools = async () => {
    return registerTools([
      {
        description: createProjectToolDescription,
        implementation: {
          validate: (args) => {
            const result = CreateProjectArgsSchema.safeParse(args)
            if (!result.success) {
              throw new Error(`Invalid arguments for ${createProjectToolDescription.name}: ${result.error}`)
            }
            return result.data
          },
          execute: async (args: CreateProjectOptions) => {            
            return createProject(args)
          }
        }
      }
    ], 'basic-tools')
  }

const userStore = useUserStore()

async function createProject(options: CreateProjectOptions) {
  const projectName = options.projectName

  // Check if user is signed in
  const signedInUser = computed(() => userStore.getSignedInUser())
  if (signedInUser.value == null) {
    return {
      success: false,
      message: 'Please sign in to create a project'
    }
  }

  const username = signedInUser.value.name

  try {
    // Check if project already exists
    const project = await getProject(username, options.projectName)
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

  const project = new Project(username, projectName)
  project.setVisibility(Visibility.Private)

  try {
    const thumbnail = await genAssetFromCanvos("stage.png",800, 600, '#000000')
    project.setThumbnail(thumbnail)
    await project.saveToCloud()

    const projectRoute = getProjectEditorRoute(projectName)
    const router = useRouter()
    router.push(projectRoute)
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