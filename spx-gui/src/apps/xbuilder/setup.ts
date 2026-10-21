import type { App as VueApp } from 'vue'
import type { Router } from 'vue-router'

import { client } from '@/apis/common'
import { accountOAuthClientForXBuilder } from '@/apis/account/oauth'
import { cloudHelpers } from '@/models/common/cloud'
import { setSpriteEditDemoEnabled } from '@/models/spx/gen/edit-demo'
import { initUserState } from '@/stores/user'
import { configureApp, setup } from '@/setup'
import { provideDisableAIGC } from '@/components/asset/preprocessing/config'
import { provideCommunityConfig } from '@/components/community/config'
import { provideProjectConfig } from '@/components/project/config'

import * as env from './env'

export function setupXBuilder() {
  // This branch is an interaction demo; AI edits return the input media after 3 seconds.
  setSpriteEditDemoEnabled(true)
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
  provideProjectConfig(app, { defaultFontPreferences: env.defaultFontPreferences })
  configureApp(app, router, env)
}
