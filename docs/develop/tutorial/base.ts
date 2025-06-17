import { Copilot } from './module_Copilot'
import { CopilotApis } from './module_CopilotApis'
import { CourseApis } from './module_CourseApis'

export type TODO = any
export declare const TODO: TODO

export type UI = any

export type LocaleMessage = {
  en: string
  zh: string
}

export type Disposer = () => void

export type JSONSchemaObject = any

export declare function validateSchema(schema: JSONSchemaObject, data: any): void

export type Component = any

type Router = {
  push(to: string): Promise<void>
  currentRoute: {
    value: {
      name: string
      path: string
      params: any
      meta: any
    }
  }
}

export declare function onMounted(arg0: () => void): void
export declare function watchEffect(arg0: () => void): void

export declare const project: any
export declare const copilot: Copilot
export declare const router: Router
export declare const copilotApis: CopilotApis
export declare const courseApis: CourseApis
export declare const projectApis: any
export declare function loadProject(projectFullName: string): Promise<any>
