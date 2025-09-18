export function analyzePlatformShare(platform: string) {
  return fetch(`/api/analyze/platform-share?platform=${platform}`)
}
