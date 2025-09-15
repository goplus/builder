/**
 * @desc Project Context Generation APIs for internal management
 */

import { apiBaseUrl } from '@/utils/env'

/** 生成项目上下文关键词请求参数 */
export interface ProjectContextGenerateRequest {
  /** 项目ID */
  project_id: number
  /** 项目名称，1-255字符 */
  project_name: string
  /** 项目描述 */
  project_description?: string
}

/**
 * 生成项目上下文关键词（内部管理接口）
 * @param projectId 项目ID
 * @param projectName 项目名称，1-255字符
 * @param projectDescription 项目描述（可选）
 */
export async function generateProjectContext(
  projectId: number,
  projectName: string,
  projectDescription?: string
): Promise<void> {
  const payload: ProjectContextGenerateRequest = {
    project_id: projectId,
    project_name: projectName
  }

  // 如果提供了项目描述，则添加到payload中
  if (projectDescription) {
    payload.project_description = projectDescription
  }

  const url = apiBaseUrl + '/projects/context/generate'

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(payload)
  })

  if (!response.ok) {
    const errorText = await response.text()
    throw new Error(`Request failed: ${response.status} ${response.statusText} - ${errorText}`)
  }

  // 接口会返回内容，但我们忽略返回的任何数据
  await response.json() // 消费响应体但不使用返回值
}
