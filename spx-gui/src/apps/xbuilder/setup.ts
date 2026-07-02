import type { App as VueApp } from 'vue'
import type { Router } from 'vue-router'

import { client } from '@/apis/common'
import { accountOAuthClientForXBuilder } from '@/apis/account/oauth'
import { cloudHelpers } from '@/models/common/cloud'
import { initUserState } from '@/stores/user'
import { configureApp, setup } from '@/setup'
import { provideDisableAIGC } from '@/components/asset/preprocessing/config'
import { provideCommunityConfig } from '@/components/community/config'
import { provideSpxVersion } from '@/components/project/runner/config'

import * as env from './env'

export function setupXBuilder() {
  client.setBaseUrl(env.apiBaseUrl)
  accountOAuthClientForXBuilder.setBaseUrl(env.apiBaseUrl + '/account')
  cloudHelpers.setConfig({
    baseUrl: env.usercontentBaseUrl,
    bucket: env.usercontentBucket
  })
  initUserState(env.accountOAuthClientId)
  setup()
}

export function configureXBuilderApp(app: VueApp, router?: Router) {
  provideCommunityConfig(app, {
    showLicense: env.showLicense,
    showTutorialsEntry: env.showTutorialsEntry
  })
  provideDisableAIGC(app, env.disableAIGC)
  provideSpxVersion(app, env.spxVersion)
  configureApp(app, router, env)
}
