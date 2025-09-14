import { client } from './common'

/**
 * WeChat JS-SDK configuration data returned by the API
 */
export type WeChatJSSDKConfigData = {
  /** WeChat AppID */
  appId: string
  /** Random nonce string */
  nonceStr: string
  /** Timestamp */
  timestamp: number
  /** Signature for verification */
  signature: string
}

export type GetWeChatJSSDKConfigParams = {
  /** Current page URL (without hash fragment) */
  url: string
}

export async function getWeChatJSSDKConfig(
  params: GetWeChatJSSDKConfigParams,
  signal?: AbortSignal
): Promise<WeChatJSSDKConfigData> {
  return client.post('/wechat/jssdk-config', params, { signal }) as Promise<WeChatJSSDKConfigData>
}
