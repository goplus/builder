import { computed } from 'vue'
import { getProject, Visibility } from '@/apis/project'
import { ApiException, ApiExceptionCode } from '@/apis/common/exception'
import { useUserStore } from '@/stores/user'
import { getProjectEditorRoute } from '@/router'
import { Project } from '@/models/project'
import { z } from 'zod'
import router from '@/router'

// Schema definitions
export const CreateProjectArgsSchema = z.object({
  projectName: z
    .string()
    .describe(
      'The project name (English characters only) where the new Go+ XBuilder SPX project will be created and initialized.'
    )
})

export type CreateProjectOptions = z.infer<typeof CreateProjectArgsSchema>

export async function createProject(options: CreateProjectOptions) {
  try {
    const userStore = useUserStore()
    const projectName = options.projectName

    if (!userStore.isSignedIn) {
      // 用户未登录时，尝试登录
      return {
        success: false,
        message: 'Please sign in to create a project'
      }
    }

    const signedInUser = computed(() => userStore.getSignedInUser())
    if (signedInUser.value == null) {
      return {
        success: false,
        message: 'Please sign in to create a project'
      }
    }
    const username = signedInUser.value.name

    let projectExists = false

    try {
      await getProject(username, options.projectName)
      // 如果没有抛出异常，说明项目已存在
      projectExists = true
    } catch (e) {
      // 如果异常是 "not found"，说明项目不存在，可以继续创建
      if (e instanceof ApiException && e.code === ApiExceptionCode.errorNotFound) {
        // 项目不存在，继续创建流程
        projectExists = false
      } else {
        // 其他API异常，返回错误
        return {
          success: false,
          message: `Failed to check if project exists: ${e instanceof Error ? e.message : String(e)}`
        }
      }
    }
    if (projectExists) {
      return {
        success: false,
        message: `Project "${projectName}" already exists`
      }
    }

    // const defaultProjectFile = await getDefaultProjectFile()
    const project = new Project(username, projectName)
    project.setVisibility(Visibility.Private)
    // await project.loadGbpFile(defaultProjectFile)
    await project.saveToCloud()

    // 构建项目URL
    const projectRoute = getProjectEditorRoute(projectName)
    router.push(projectRoute)

    // 返回成功结果
    return {
      success: true,
      message: `Project "${projectName}" created successfully`
    }
  } catch (error) {
    // 捕获并返回错误
    const errorMessage = error instanceof Error ? error.message : String(error)

    return {
      success: false,
      message: `Failed to create project: ${errorMessage}`
    }
  }
}
