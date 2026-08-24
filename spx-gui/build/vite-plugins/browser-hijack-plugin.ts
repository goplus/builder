import fs from 'node:fs'
import net from 'node:net'
import path from 'node:path'
import type { Plugin, ViteDevServer } from 'vite'

// Browser Hijack Plugin redirects selected browser requests during local
// development by connecting to Chrome DevTools Protocol or Firefox WebDriver
// BiDi. The plugin does not launch a browser itself. It prints browser commands
// with a remote debugging port and waits for the developer to run one of them.
// Matching requests are fulfilled with a 307 redirect to the current Vite dev
// server, preserving the original HTTP method and request body.

const defaultRemoteDebuggingPort = 9223

export interface BrowserHijackPluginOptions {
  /** The origin to hijack requests from */
  origin: string
  /**
   * Path patterns to hijack under `origin`.
   *
   * Each route should start with `/` and may contain `*` as a wildcard for a
   * single path segment. Query strings are not part of the pattern. Matched
   * requests keep their original query when redirected to the Vite dev server.
   */
  routes: string[]
  /** The remote debugging port for Chrome or Firefox */
  remoteDebuggingPort?: number
  /** The URL to open when starting the browser */
  startURL: string
}

export function createBrowserHijackPlugin(options: BrowserHijackPluginOptions): Plugin {
  return {
    name: 'browser-hijack',
    apply: 'serve',
    configureServer(server) {
      let browserHijack: Awaited<ReturnType<typeof startBrowserHijack>> | null = null
      let stopped = false
      server.httpServer?.once('listening', () => {
        void startBrowserHijack(server, options, () => stopped)
          .then((result) => {
            if (stopped) result.close()
            else browserHijack = result
          })
          .catch((error: unknown) => {
            if (stopped) return
            server.config.logger.error(
              `Failed to start browser hijack: ${error instanceof Error ? error.message : String(error)}`
            )
          })
      })
      server.httpServer?.once('close', () => {
        stopped = true
        browserHijack?.close()
      })
    }
  }
}

async function startBrowserHijack(
  server: ViteDevServer,
  options: BrowserHijackPluginOptions,
  isStopped: () => boolean
) {
  const devOrigin = server.resolvedUrls?.local[0]?.replace(/\/$/, '') ?? `http://localhost:${server.config.server.port}`
  const remoteDebuggingPort = options.remoteDebuggingPort ?? defaultRemoteDebuggingPort
  const resolveHijackedRequest = createHijackedRequestResolver(devOrigin, options.origin, options.routes)
  let browser: RemoteBrowser | null = null
  if (await checkPortAvailable(remoteDebuggingPort)) {
    server.config.logger.info(
      [
        `Browser hijack Chrome command:\n${createChromeCommand(options, remoteDebuggingPort, server.config.root)}`,
        `Browser hijack Firefox command:\n${createFirefoxCommand(options, remoteDebuggingPort, server.config.root)}`
      ].join('\n')
    )
  } else {
    browser = await detectRemoteBrowser(remoteDebuggingPort)
    if (browser == null) {
      throw new Error(`Remote debugging port ${remoteDebuggingPort} is already in use by an unsupported process`)
    }
    server.config.logger.info(
      `Browser hijack reusing ${browser.type === 'chrome' ? 'Chrome' : 'Firefox'} remote debugging port ${remoteDebuggingPort}`
    )
  }

  browser ??= await waitForRemoteBrowser(remoteDebuggingPort, isStopped)
  if (browser.type === 'chrome') {
    return startChromeBrowserHijack(server, options, resolveHijackedRequest, remoteDebuggingPort, isStopped)
  }
  return startFirefoxBrowserHijack(server, options, resolveHijackedRequest, browser.webSocket)
}

async function startChromeBrowserHijack(
  server: ViteDevServer,
  options: BrowserHijackPluginOptions,
  resolveHijackedRequest: ResolveHijackedRequest,
  remoteDebuggingPort: number,
  isStopped: () => boolean
) {
  const hijackedURLPatterns = options.routes.map((route) => `${options.origin.replace(/\/$/, '')}${route}*`)
  const cdps = new Map<string, ProtocolConnection>()
  const connectTarget = async (target: CDPTarget) => {
    if (cdps.has(target.id)) return
    const cdp = await ProtocolConnection.connect(target.webSocketDebuggerUrl)

    cdp.setEventListener('Fetch.requestPaused', (params) => {
      handleCDPPausedRequest(cdp, params, resolveHijackedRequest)
    })
    try {
      await cdp.request('Fetch.enable', {
        patterns: hijackedURLPatterns.map((urlPattern) => ({ urlPattern, requestStage: 'Request' }))
      })
      cdps.set(target.id, cdp)
    } catch (error) {
      cdp.close()
      throw error
    }
  }

  for (const target of await waitForCDPTargets(remoteDebuggingPort, isStopped)) await connectTarget(target)
  const interval = setInterval(() => {
    if (isStopped()) return
    void getCDPTargets(remoteDebuggingPort).then((targets) => {
      for (const target of targets) {
        void connectTarget(target).catch((error: unknown) => {
          if (isStopped()) return
          server.config.logger.error(
            `Failed to connect browser hijack target: ${error instanceof Error ? error.message : String(error)}`
          )
        })
      }
    })
  }, 1000)
  server.config.logger.info(`Browser hijack enabled for ${hijackedURLPatterns.join(', ')}`)
  return {
    close() {
      clearInterval(interval)
      for (const cdp of cdps.values()) cdp.close()
    }
  }
}

async function startFirefoxBrowserHijack(
  server: ViteDevServer,
  options: BrowserHijackPluginOptions,
  resolveHijackedRequest: ResolveHijackedRequest,
  bidi: ProtocolConnection
) {
  const hijackedOrigin = new URL(options.origin)
  try {
    await bidi.request('session.new', { capabilities: { alwaysMatch: { browserName: 'firefox' } } })
    bidi.setEventListener('network.beforeRequestSent', (params) => {
      handleBiDiBeforeRequestSent(bidi, params, resolveHijackedRequest)
    })
    await bidi.request('session.subscribe', { events: ['network.beforeRequestSent'] })
    // BiDi pathnames match exactly, so wildcard routes are filtered after intercepting the origin.
    await bidi.request('network.addIntercept', {
      phases: ['beforeRequestSent'],
      urlPatterns: [
        {
          type: 'pattern',
          protocol: hijackedOrigin.protocol.slice(0, -1),
          hostname: hijackedOrigin.hostname,
          ...(hijackedOrigin.port === '' ? {} : { port: hijackedOrigin.port })
        }
      ]
    })
  } catch (error) {
    bidi.close()
    throw error
  }

  const hijackedURLPatterns = options.routes.map((route) => `${options.origin.replace(/\/$/, '')}${route}`)
  server.config.logger.info(`Browser hijack enabled for ${hijackedURLPatterns.join(', ')}`)
  return { close: () => bidi.close() }
}

function createChromeCommand(options: BrowserHijackPluginOptions, remoteDebuggingPort: number, projectRoot: string) {
  const executable = findChromeExecutable()
  const userDataDir = path.join(projectRoot, 'node_modules/.cache/browser-hijack-chrome')
  fs.mkdirSync(userDataDir, { recursive: true })
  return [
    executable,
    `--remote-debugging-port=${remoteDebuggingPort}`,
    `--user-data-dir=${userDataDir}`,
    '--no-first-run',
    '--no-default-browser-check',
    options.startURL
  ]
    .map((arg) => shellQuote(arg))
    .join(' ')
}

function createFirefoxCommand(options: BrowserHijackPluginOptions, remoteDebuggingPort: number, projectRoot: string) {
  const executable = findFirefoxExecutable()
  const profileDir = path.join(projectRoot, 'node_modules/.cache/browser-hijack-firefox')
  fs.mkdirSync(profileDir, { recursive: true })
  return [
    executable,
    `--remote-debugging-port=${remoteDebuggingPort}`,
    '--profile',
    profileDir,
    '--no-remote',
    options.startURL
  ]
    .map((arg) => shellQuote(arg))
    .join(' ')
}

function findChromeExecutable() {
  return (
    [
      process.env.CHROME_PATH ?? null,
      '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
      '/Applications/Google Chrome Canary.app/Contents/MacOS/Google Chrome Canary',
      '/Applications/Chromium.app/Contents/MacOS/Chromium'
    ].find((candidate) => candidate != null && (candidate.includes('/') ? fs.existsSync(candidate) : true)) ??
    'google-chrome'
  )
}

function findFirefoxExecutable() {
  return (
    [
      process.env.FIREFOX_PATH ?? null,
      '/Applications/Firefox.app/Contents/MacOS/firefox',
      '/Applications/Firefox Developer Edition.app/Contents/MacOS/firefox',
      '/Applications/Firefox Nightly.app/Contents/MacOS/firefox'
    ].find((candidate) => candidate != null && (candidate.includes('/') ? fs.existsSync(candidate) : true)) ?? 'firefox'
  )
}

type RemoteBrowser =
  | { type: 'chrome' }
  | {
      type: 'firefox'
      webSocket: ProtocolConnection
    }

async function detectRemoteBrowser(port: number): Promise<RemoteBrowser | null> {
  if ((await getCDPVersion(port)) != null) return { type: 'chrome' }
  const webSocket = await ProtocolConnection.connect(`ws://127.0.0.1:${port}/session`).catch(() => null)
  return webSocket == null ? null : { type: 'firefox', webSocket }
}

async function waitForRemoteBrowser(port: number, isStopped: () => boolean): Promise<RemoteBrowser> {
  for (let i = 0; i < 1200; i++) {
    if (isStopped()) throw new Error('Browser hijack stopped')
    const browser = await detectRemoteBrowser(port)
    if (browser != null) return browser
    await new Promise((resolveTimeout) => setTimeout(resolveTimeout, 500))
  }
  throw new Error('Timed out waiting for a supported browser remote debugging endpoint')
}

function checkPortAvailable(port: number) {
  return new Promise<boolean>((resolvePort, reject) => {
    const server = net.createServer()
    server.once('error', (error: NodeJS.ErrnoException) => {
      if (error.code === 'EADDRINUSE') {
        resolvePort(false)
        return
      }
      reject(error)
    })
    server.listen(port, '127.0.0.1', () => {
      server.close(() => resolvePort(true))
    })
  })
}

async function waitForCDPTargets(port: number, isStopped: () => boolean) {
  for (let i = 0; i < 1200; i++) {
    if (isStopped()) throw new Error('Browser hijack stopped')
    const targets = await getCDPTargets(port)
    if (targets.length > 0) return targets
    await new Promise((resolveTimeout) => setTimeout(resolveTimeout, 500))
  }
  throw new Error('Timed out waiting for Chrome DevTools Protocol target')
}

async function getCDPTargets(port: number) {
  const targets = await readJSON<CDPTarget[]>(`http://127.0.0.1:${port}/json/list`).catch(() => null)
  return targets?.filter((item) => item.type === 'page' && item.webSocketDebuggerUrl != null) ?? []
}

async function getCDPVersion(port: number) {
  const version = await readJSON<{ Browser?: string }>(`http://127.0.0.1:${port}/json/version`).catch(() => null)
  if (version == null || typeof version.Browser !== 'string') return null
  return version
}

async function readJSON<T>(url: string) {
  const response = await fetch(url, { signal: AbortSignal.timeout(1000) })
  if (!response.ok) throw new Error(`Request failed with status ${response.status}`)
  return response.json() as Promise<T>
}

function handleCDPPausedRequest(
  cdp: ProtocolConnection,
  params: Record<string, unknown>,
  resolveHijackedRequest: ResolveHijackedRequest
) {
  const requestID = typeof params.requestId === 'string' ? params.requestId : null
  const request = isRecord(params.request) ? params.request : null
  const requestURL = request != null && typeof request.url === 'string' ? request.url : null
  if (requestID == null || requestURL == null) return

  const target = resolveHijackedRequest(requestURL)
  if (target == null) {
    cdp.send('Fetch.continueRequest', { requestId: requestID })
    return
  }
  cdp.send('Fetch.fulfillRequest', {
    requestId: requestID,
    responseCode: 307,
    responseHeaders: [
      { name: 'Location', value: target },
      { name: 'Cache-Control', value: 'no-store' }
    ]
  })
}

function handleBiDiBeforeRequestSent(
  bidi: ProtocolConnection,
  params: Record<string, unknown>,
  resolveHijackedRequest: ResolveHijackedRequest
) {
  const request = isRecord(params.request) ? params.request : null
  const requestID = request != null && typeof request.request === 'string' ? request.request : null
  const requestURL = request != null && typeof request.url === 'string' ? request.url : null
  if (params.isBlocked !== true || requestID == null || requestURL == null) return

  const target = resolveHijackedRequest(requestURL)
  if (target == null) {
    bidi.send('network.continueRequest', { request: requestID })
    return
  }
  bidi.send('network.provideResponse', {
    request: requestID,
    statusCode: 307,
    headers: [
      { name: 'Location', value: { type: 'string', value: target } },
      { name: 'Cache-Control', value: { type: 'string', value: 'no-store' } }
    ]
  })
}

type ResolveHijackedRequest = (rawURL: string) => string | null

function createHijackedRequestResolver(devOrigin: string, hijackedOrigin: string, routes: string[]) {
  const origin = new URL(hijackedOrigin).origin
  const routePatterns = routes.map((route) => {
    const escaped = route.replace(/[.+?^${}()|[\]\\]/g, '\\$&').replace(/\*/g, '[^/]*')
    return new RegExp(`^${escaped}$`)
  })

  return (rawURL: string) => {
    const requestURL = new URL(rawURL)
    if (requestURL.origin !== origin) return null
    if (!routePatterns.some((pattern) => pattern.test(requestURL.pathname))) return null

    const target = new URL(requestURL.pathname, devOrigin)
    target.search = requestURL.search
    return target.toString()
  }
}

function shellQuote(value: string) {
  return `'${value.replace(/'/g, `'\\''`)}'`
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value != null && !Array.isArray(value)
}

interface CDPTarget {
  id: string
  type: string
  webSocketDebuggerUrl: string
}

interface PendingProtocolRequest {
  resolve: (result: Record<string, unknown>) => void
  reject: (error: Error) => void
}

class ProtocolConnection {
  private nextID = 1
  private eventListeners = new Map<string, (params: Record<string, unknown>) => void>()
  private pendingRequests = new Map<number, PendingProtocolRequest>()

  private constructor(private webSocket: WebSocket) {
    webSocket.addEventListener('message', (event) => {
      if (typeof event.data === 'string') this.handleMessage(event.data)
    })
    webSocket.addEventListener('close', () => {
      this.rejectPendingRequests(new Error('Browser remote debugging connection closed'))
    })
    webSocket.addEventListener('error', () => {
      this.rejectPendingRequests(new Error('Browser remote debugging connection failed'))
    })
  }

  static connect(url: string) {
    return new Promise<ProtocolConnection>((resolve, reject) => {
      const webSocket = new WebSocket(url)
      const timeout = setTimeout(() => {
        cleanup()
        webSocket.close()
        reject(new Error(`Timed out connecting to browser remote debugging endpoint ${url}`))
      }, 1000)
      const onOpen = () => {
        cleanup()
        resolve(new ProtocolConnection(webSocket))
      }
      const onError = () => {
        cleanup()
        reject(new Error(`Failed to connect to browser remote debugging endpoint ${url}`))
      }
      const cleanup = () => {
        clearTimeout(timeout)
        webSocket.removeEventListener('open', onOpen)
        webSocket.removeEventListener('error', onError)
      }
      webSocket.addEventListener('open', onOpen)
      webSocket.addEventListener('error', onError)
    })
  }

  setEventListener(event: string, listener: (params: Record<string, unknown>) => void) {
    this.eventListeners.set(event, listener)
  }

  send(method: string, params: Record<string, unknown> = {}) {
    this.writeCommand(this.nextID++, method, params)
  }

  request(method: string, params: Record<string, unknown> = {}) {
    const id = this.nextID++
    const result = new Promise<Record<string, unknown>>((resolve, reject) => {
      this.pendingRequests.set(id, { resolve, reject })
    })
    this.writeCommand(id, method, params)
    return result
  }

  close() {
    this.webSocket.close()
  }

  private writeCommand(id: number, method: string, params: Record<string, unknown>) {
    this.webSocket.send(JSON.stringify({ id, method, params }))
  }

  private handleMessage(payload: string) {
    const message: unknown = JSON.parse(payload)
    if (!isRecord(message)) return
    if (typeof message.id === 'number') {
      const pending = this.pendingRequests.get(message.id)
      if (pending == null) return
      this.pendingRequests.delete(message.id)
      if (message.type === 'error' || message.error != null) {
        const description =
          typeof message.message === 'string'
            ? message.message
            : isRecord(message.error) && typeof message.error.message === 'string'
              ? message.error.message
              : String(message.error)
        pending.reject(new Error(description))
      } else {
        pending.resolve(isRecord(message.result) ? message.result : {})
      }
      return
    }
    if (typeof message.method !== 'string' || !isRecord(message.params)) return
    this.eventListeners.get(message.method)?.(message.params)
  }

  private rejectPendingRequests(error: Error) {
    for (const pending of this.pendingRequests.values()) pending.reject(error)
    this.pendingRequests.clear()
  }
}
