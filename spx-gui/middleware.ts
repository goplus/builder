import { rewrite } from '@vercel/edge'

const apiBaseUrl = process.env.VERCEL_PROXIED_API_BASE_URL as string

export const config = {
  matcher: ['/api/(.*)']
}

export default function middleware(request: Request) {
  const url = new URL(request.url)

  const apiPathPrefix = '/api/'
  if (url.pathname.startsWith(apiPathPrefix)) {
    return rewrite(apiBaseUrl + url.pathname.slice(apiPathPrefix.length - 1) + url.search)
  }
}
