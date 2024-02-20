/* eslint-disable @typescript-eslint/naming-convention */
const config: SdkConfig = {
  serverUrl: import.meta.env.VITE_CASDOOR_ENDPOINT,
  clientId: import.meta.env.VITE_CASDOOR_CLIENT_ID,
  organizationName: import.meta.env.VITE_CASDOOR_ORGANIZATION_NAME,
  appName: import.meta.env.VITE_CASDOOR_APP_NAME,
  redirectPath: '/callback'
}

// The following content is copied from the casdoor-sdk package, as
// we need to modify some of the code.
// Original source:
// https://github.com/casdoor/casdoor-js-sdk/blob/master/src/sdk.ts

// Copyright 2021 The casbin Authors. All Rights Reserved.
//
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
//      http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.

import PKCE from 'js-pkce'
import type IObject from 'js-pkce/dist/IObject'

interface SdkConfig {
  serverUrl: string // your Casdoor server URL, e.g., "https://door.casbin.com" for the official demo site
  clientId: string // the Client ID of your Casdoor application, e.g., "014ae4bd048734ca2dea"
  appName: string // the name of your Casdoor application, e.g., "app-casnode"
  organizationName: string // the name of the Casdoor organization connected with your Casdoor application, e.g., "casbin"
  redirectPath?: string // the path of the redirect URL for your Casdoor application, will be "/callback" if not provided
  signinPath?: string // the path of the signin URL for your Casdoor applcation, will be "/api/signin" if not provided
  scope?: string // apply for permission to obtain the user information, will be "profile" if not provided
  storage?: Storage // the storage to store the state, will be sessionStorage if not provided
}

// reference: https://github.com/casdoor/casdoor-go-sdk/blob/90fcd5646ec63d733472c5e7ce526f3447f99f1f/auth/jwt.go#L19-L32
export interface CasdoorAccount {
  organization: string
  username: string
  type: string
  name: string
  avatar: string
  email: string
  phone: string
  affiliation: string
  tag: string
  language: string
  score: number
  isAdmin: boolean
  accessToken: string
}

class Sdk {
  config: SdkConfig
  pkce: PKCE

  constructor(config: SdkConfig) {
    this.config = config
    if (config.redirectPath === undefined || config.redirectPath === null) {
      this.config.redirectPath = '/callback'
    }

    if (config.scope === undefined || config.scope === null) {
      this.config.scope = 'profile'
    }

    this.pkce = new PKCE({
      client_id: this.config.clientId,
      redirect_uri: `${window.location.origin}${this.config.redirectPath}`,
      authorization_endpoint: `${this.config.serverUrl.trim()}/login/oauth/authorize`,
      token_endpoint: `${this.config.serverUrl.trim()}/api/login/oauth/access_token`,
      requested_scopes: this.config.scope || 'profile',
      storage: this.config.storage
    })
  }

  getOrSaveState(): string {
    const state = sessionStorage.getItem('casdoor-state')
    if (state !== null) {
      return state
    } else {
      const state = Math.random().toString(36).slice(2)
      sessionStorage.setItem('casdoor-state', state)
      return state
    }
  }

  clearState() {
    sessionStorage.removeItem('casdoor-state')
  }

  public getSignupUrl(enablePassword: boolean = true): string {
    if (enablePassword) {
      sessionStorage.setItem('signinUrl', this.getSigninUrl())
      return `${this.config.serverUrl.trim()}/signup/${this.config.appName}`
    } else {
      return this.getSigninUrl().replace('/login/oauth/authorize', '/signup/oauth/authorize')
    }
  }

  public getSigninUrl(): string {
    const redirectUri =
      this.config.redirectPath && this.config.redirectPath.includes('://')
        ? this.config.redirectPath
        : `${window.location.origin}${this.config.redirectPath}`
    const state = this.getOrSaveState()
    return `${this.config.serverUrl.trim()}/login/oauth/authorize?client_id=${this.config.clientId}&response_type=code&redirect_uri=${encodeURIComponent(redirectUri)}&scope=${this.config.scope}&state=${state}`
  }

  // TODO: Rewrite this function. Is access_token really need to be passed with the url?
  public getUserProfileUrl(userName: string, account: CasdoorAccount): string {
    let param = ''
    if (account !== undefined && account !== null) {
      param = `?access_token=${account.accessToken}`
    }
    return `${this.config.serverUrl.trim()}/users/${this.config.organizationName}/${userName}${param}`
  }

  // TODO: The same as getUserProfileUrl
  public getMyProfileUrl(account: CasdoorAccount, returnUrl: String = ''): string {
    let params = ''
    if (account !== undefined && account !== null) {
      params = `?access_token=${account.accessToken}`
      if (returnUrl !== '') {
        params += `&returnUrl=${returnUrl}`
      }
    } else if (returnUrl !== '') {
      params = `?returnUrl=${returnUrl}`
    }
    return `${this.config.serverUrl.trim()}/account${params}`
  }

  public async signinWithRedirection(additionalParams?: IObject): Promise<void> {
    window.location.assign(this.pkce.authorizeUrl(additionalParams))
  }

  // TODO: move to axios service
  public async getUserInfo(accessToken: string) {
    return fetch(`${this.config.serverUrl.trim()}/api/userinfo`, {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json'
      }
    }).then((res) => res.json())
  }
}

export const casdoorSdk = new Sdk(config)
