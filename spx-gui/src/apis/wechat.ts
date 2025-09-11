export const getWechatChatJSSDKConfig = ({ url }: { url: string | undefined }) => {
  if (!url) {
    return {
      appid: '',
      timestamp: '',
      nonceStr: '',
      signature: ''
    }
  }

  const timestamp = Date.now()
  const nonceStr = Math.random().toString(36).substring(2, 15)

  return {
    appid: '',
    timestamp: timestamp,
    nonceStr: nonceStr,
    signature: ''
  }
}
