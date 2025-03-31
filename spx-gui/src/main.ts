import './polyfills'
import { createApp } from 'vue'
import VueKonva from 'vue-konva'
import { VueQueryPlugin } from '@tanstack/vue-query'
import dayjs from 'dayjs'
import localizedFormat from 'dayjs/plugin/localizedFormat'
import relativeTime from 'dayjs/plugin/relativeTime'
import utc from 'dayjs/plugin/utc'
import timezone from 'dayjs/plugin/timezone'
import 'dayjs/locale/zh'

import { initI18n } from './i18n'
import App from './App.vue'
import { initRouter } from './router'
import { initUserStore, useUserStore } from './stores/user'
import { setTokenProvider } from './apis/common'
import { CustomTransformer } from './components/editor/preview/stage-viewer/custom-transformer'
import { setProjectProvider } from '@/mcp/operations/project'
import { getProject, Visibility } from '@/apis/project'
import { ApiException, ApiExceptionCode } from '@/apis/common/exception'
import { Project } from '@/models/project'
import { getDefaultProjectFile } from '@/components/project'
import router from '@/router'
import { getProjectEditorRoute } from '@/router'

dayjs.extend(localizedFormat)
dayjs.extend(relativeTime)
dayjs.extend(utc)
dayjs.extend(timezone)

setProjectProvider({
  getUserInfo: () => {
    const userStore = useUserStore()
    return userStore.getSignedInUser()
  },
  getProject: async (username: string, projectName: string): Promise<any> => {
    try {
      const project = await getProject(username, projectName)
      return project
    } catch (e) {
      if (e instanceof ApiException && e.code === ApiExceptionCode.errorNotFound) {
        // 项目不存在，继续创建流程
        return null
      } else {
        console.error('Error fetching project:', e)
        throw e
      }
    }
  },
  createProject: async (username: string, projectName: string): Promise<any> => {
    const project = new Project(username, projectName)
    project.setVisibility(Visibility.Private)

    try {
      const defaultProjectFile = await getDefaultProjectFile()
      await project.loadGbpFile(defaultProjectFile)
      await project.saveToCloud()

      const projectRoute = getProjectEditorRoute(projectName)
      router.push(projectRoute)
    } catch (e) {
      console.error('Error creating project:', e)
      throw e
    }
  }
})

const initApiClient = async () => {
  const userStore = useUserStore()
  setTokenProvider(userStore.ensureAccessToken)
}

async function initApp() {
  const app = createApp(App)

  initUserStore(app)
  initApiClient()
  initRouter(app)
  initI18n(app)

  app.use(VueKonva as any, {
    customNodes: { CustomTransformer }
  })

  app.use(VueQueryPlugin)

  app.mount('#app')
}

initApp()
