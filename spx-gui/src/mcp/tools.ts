import { computed } from 'vue'
import { getProjectEditorRoute } from '@/router';
import { useUserStore } from '@/stores/user';
import { getProject, Visibility } from '@/apis/project';
import { Project } from '@/models/project';
import { ApiException, ApiExceptionCode } from '@/apis/common/exception'
import { getDefaultProjectFile } from '@/components/project'
import { hasActiveProject, isInEditor, getCurrentProject } from '@/pages/editor/context'
import router from '@/router';
import { useEditorCtx } from '@/components/editor/EditorContextProvider.vue'
import { useCodeEditorUICtx } from '@/components/editor/code-editor/ui/CodeEditorUI.vue'
/**
 * Create a new project with the specified name.
 * @param projectName [REQUIRED] The name of the project to be created.
 * @returns A promise that resolves to an object containing project information and success status
 */
export async function createProject(projectName: string): Promise<{
  success: boolean;
  message?: string;
}> {
  try {
    // 验证项目名
    if (!projectName || typeof projectName !== 'string') {
      return {
        success: false,
        message: 'Project name is required and must be a string'
      };
    }

    // 验证项目名格式 (只允许字母、数字、连字符和下划线)
    const namePattern = /^[a-zA-Z0-9\-_]+$/;
    if (!namePattern.test(projectName)) {
      return {
        success: false,
        message: 'Project name can only contain letters, numbers, hyphens and underscores'
      };
    }

    // 限制项目名长度
    if (projectName.length > 100) {
      return {
        success: false,
        message: 'Project name cannot exceed 100 characters'
      };
    }

    const userStore = useUserStore();
    if (!userStore.isSignedIn) {
      // 用户未登录时，尝试登录
      return {
        success: false,
        message: 'Please sign in to create a project'
      };
    }

    const signedInUser = computed(() => userStore.getSignedInUser())
    if (signedInUser.value == null) {
      return {
        success: false,
        message: 'Please sign in to create a project'
      };
    }
    const username = signedInUser.value.name

    let projectExists = false;

    try {
      await getProject(username, projectName);
      // 如果没有抛出异常，说明项目已存在
      projectExists = true;
    } catch (e) {
      // 如果异常是 "not found"，说明项目不存在，可以继续创建
      if (e instanceof ApiException && e.code === ApiExceptionCode.errorNotFound) {
        // 项目不存在，继续创建流程
        projectExists = false;
      } else {
        // 其他API异常，返回错误
        return {
          success: false,
          message: `Failed to check if project exists: ${e instanceof Error ? e.message : String(e)}`
        };
      }
    }
    if (projectExists) {
      return {
        success: false,
        message: `Project "${projectName}" already exists`
      };
    }

    const defaultProjectFile = await getDefaultProjectFile()
    const project = new Project(username, projectName)
    project.setVisibility(Visibility.Private)
    await project.loadGbpFile(defaultProjectFile)
    await project.saveToCloud()

    // 构建项目URL
    const projectRoute = getProjectEditorRoute(projectName)
    router.push(projectRoute)

    // 返回成功结果
    return {
      success: true,
      message: `Project "${projectName}" created successfully`,
    };
  } catch (error) {
    // 捕获并返回错误
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error('Failed to create project:', errorMessage);
    
    return {
      success: false,
      message: `Failed to create project: ${errorMessage}`
    };
  }
}

/**
 * Navigate to a specific page using the provided location URL.
 * @param location [REQUIRED] The URL or path of the page to navigate to.
 */
export function navigatePage(location: string): Promise<void> {
  // Placeholder implementation that doesn't cause errors
  return Promise.resolve()
}

/**
 * Add a new sprite to the currently active project.
 * @param spriteHubName [REQUIRED] The name of the sprite hub containing the sprite.
 * @param spriteName [REQUIRED] The name of the sprite to be added.
 * @returns A promise resolving to an object with success status and optional message
 */
export async function addSprite(
  spriteHubName: string, 
  spriteName: string
): Promise<{
  success: boolean;
  message?: string;
}> {
  try {
    // 验证输入参数
    if (!spriteHubName || typeof spriteHubName !== 'string') {
      return {
        success: false,
        message: 'Sprite hub name is required and must be a string'
      };
    }

    if (!spriteName || typeof spriteName !== 'string') {
      return {
        success: false,
        message: 'Sprite name is required and must be a string'
      };
    }

    // 检查是否在编辑器页面中
    if (!isInEditor) {
      return {
        success: false,
        message: 'This operation requires being in a project editor. Please open a project first.'
      };
    }

    // 检查是否存在活跃的项目
    if (!hasActiveProject()) {
      return {
        success: false,
        message: 'No active project found. Please wait for the project to load or open another project.'
      };
    }

    // 获取当前项目
    const project = getCurrentProject();
    if (!project) {
      return {
        success: false,
        message: 'Failed to get the current project'
      };
    }

    // 检查项目编辑器是否有 addSprite 方法
    if (typeof project.addSprite !== 'function') {
      console.error('Project.addSprite method not found');
      return {
        success: false,
        message: 'The current project does not support adding sprites'
      };
    }

    try {
      // 添加精灵到项目
      await project.addSprite(spriteHubName, spriteName);
      
      // 保存更改到云端
      await project.saveToCloud();
      
      return {
        success: true,
        message: `Successfully added sprite "${spriteName}" from hub "${spriteHubName}" to project "${project.name}"`
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      console.error(`Failed to add sprite:`, errorMessage);
      
      return {
        success: false,
        message: `Failed to add sprite: ${errorMessage}`
      };
    }
  } catch (error) {
    // 捕获其他未预期的错误
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error(`Unexpected error adding sprite:`, errorMessage);
    
    return {
      success: false,
      message: `Unexpected error adding sprite: ${errorMessage}`
    };
  }
}

/**
 * Insert or replace code at a specific location in the file.
 * @param code [REQUIRED] The code to be inserted or replaced.
 * @param insertRange [REQUIRED] The range where the code will be inserted { startLine, endLine }.
 * @param insertRange.startLine [REQUIRED] The starting line number for insertion.
 * @param insertRange.endLine [REQUIRED] The ending line number for insertion.
 * @param replaceRange [OPTIONAL] The range of code to be replaced { startLine, endLine }.
 * @param replaceRange.startLine The starting line number of code to replace.
 * @param replaceRange.endLine The ending line number of code to replace.
 */
export function insertCode(
  code: string,
  file: string,
  insertRange: { startLine: number; endLine: number },
  replaceRange?: { startLine: number; endLine: number }
): Promise<boolean> {
  const editorCtx = useEditorCtx()
  const codeEditorUICtx = useCodeEditorUICtx()
  codeEditorUICtx.ui.open(file)
  editorCtx.project.history.doAction({ name: { en: 'Insert code', zh: '插入代码' } }, () =>
    codeEditorUICtx.ui.insertBlockText(code, insertRange)
  )
  return Promise.resolve(true)
}
