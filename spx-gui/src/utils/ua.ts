import uaParser from 'ua-parser-js'

const ua = uaParser(navigator.userAgent)

export default ua

export function isMobile() {
  return ua.device.type === 'mobile' || ua.device.type === 'tablet'
}
