import crypto from 'node:crypto'
import fs from 'node:fs'
import http from 'node:http'
import net from 'node:net'
import os from 'node:os'
import path from 'node:path'
import { Buffer } from 'node:buffer'
import type { Plugin, ViteDevServer } from 'vite'

// Browser Hijack Plugin redirects selected browser requests during local
// development by connecting to Chrome DevTools Protocol. The plugin does not
// launch Chrome itself; it prints a Chrome command with a remote debugging port
// and then attaches to all page targets exposed by that Chrome instance.
// Matching requests are fulfilled with a 307 redirect to the current Vite dev
// server, preserving the original HTTP method and request body.

const defaultRemoteDebuggingPort = 9223

export interface BrowserHijackPluginOptions {
  /** The origin to hijack requests from */
  origin: string
  /**
   * Path patterns to hijack under `origin`.
   *
   * Each route should start with `/` and may contain `*` as a wildcard for any
   * path segment text. Query strings are not part of the pattern; matched
   * requests keep their original query when redirected to the Vite dev server.
   * For example: `/sign-in` or `/api/identity-providers/:provider/callback`
   * with `:provider` replaced by `*`.
   */
  routes: string[]
  /** The remote debugging port for Chrome */
  remoteDebuggingPort?: number
  /** The URL to start Chrome with */
  chromeStartURL: string
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
            browserHijack = result
          })
          .catch((error: unknown) => {
            if (stopped) return
            server.config.logger.error(`Failed to start browser hijack: ${error instanceof Error ? error.message : String(error)}`)
          })
      })
      server.httpServer?.once('close', () => {
        stopped = true
        browserHijack?.close()
      })
    }
  }
}

async function startBrowserHijack(server: ViteDevServer, options: BrowserHijackPluginOptions, isStopped: () => boolean) {
  const devOrigin = server.resolvedUrls?.local[0]?.replace(/\/$/, '') ?? `http://localhost:${server.config.server.port}`
  const hijackedOrigin = options.origin
  const remoteDebuggingPort = options.remoteDebuggingPort ?? defaultRemoteDebuggingPort
  const portState = await checkRemoteDebuggingPort(remoteDebuggingPort)
  if (portState === 'available') {
    server.config.logger.info(`Browser hijack Chrome command:\n${createChromeCommand(options, remoteDebuggingPort)}`)
  } else {
    server.config.logger.info(`Browser hijack reusing Chrome remote debugging port ${remoteDebuggingPort}`)
    if ((await getCDPTargets(remoteDebuggingPort)).length === 0) {
      server.config.logger.info(`Browser hijack is waiting for a Chrome page target. Open ${options.chromeStartURL} in that Chrome instance.`)
    }
  }
  const hijackedURLPatterns = options.routes.map((route) => `${hijackedOrigin.replace(/\/$/, '')}${route}*`)
  const cdps = new Map<string, CDPWebSocket>()
  const connectTarget = async (target: CDPTarget) => {
    if (cdps.has(target.id)) return
    const cdp = await CDPWebSocket.connect(target.webSocketDebuggerUrl)
    cdps.set(target.id, cdp)

    cdp.send('Fetch.enable', {
      patterns: hijackedURLPatterns.map((urlPattern) => ({ urlPattern, requestStage: 'Request' }))
    })
    cdp.on('Fetch.requestPaused', (params) => {
      handlePausedBrowserHijackedRequest(cdp, params as unknown as CDPRequestPausedParams, devOrigin, options.routes)
    })
  }

  for (const target of await waitForCDPTargets(remoteDebuggingPort, isStopped)) await connectTarget(target)
  const interval = setInterval(() => {
    if (isStopped()) return
    void getCDPTargets(remoteDebuggingPort).then((targets) => {
      for (const target of targets) void connectTarget(target)
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

function createChromeCommand(options: BrowserHijackPluginOptions, remoteDebuggingPort: number) {
  const executable = findChromeExecutable()
  const userDataDirPrefix = 'browser-hijack-chrome-'
  const userDataDir = fs.mkdtempSync(path.join(os.tmpdir(), userDataDirPrefix))
  const args = [
    `--remote-debugging-port=${remoteDebuggingPort}`,
    `--user-data-dir=${userDataDir}`,
    '--no-first-run',
    '--no-default-browser-check',
    options.chromeStartURL
  ]
  return [executable, ...args].map((arg) => shellQuote(arg)).join(' ')
}

function findChromeExecutable() {
  const candidates = [
    process.env.CHROME_PATH ?? null,
    '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
    '/Applications/Google Chrome Canary.app/Contents/MacOS/Google Chrome Canary',
    '/Applications/Chromium.app/Contents/MacOS/Chromium',
    'google-chrome',
    'chromium',
    'chromium-browser'
  ]
  const executable = candidates.find(
    (candidate) => candidate != null && (candidate.includes('/') ? fs.existsSync(candidate) : true)
  )
  if (executable == null) throw new Error('Chrome executable not found')
  return executable
}

async function checkRemoteDebuggingPort(port: number) {
  const portCheckResult = await checkPortAvailable(port)
  if (portCheckResult === 'available') return 'available'

  const version = await getCDPVersion(port)
  if (version != null) return 'connected'

  throw new Error(`Chrome remote debugging port ${port} is already in use by another process`)
}

function checkPortAvailable(port: number) {
  return new Promise<void>((resolvePort, reject) => {
    const server = net.createServer()
    server.once('error', (error: NodeJS.ErrnoException) => {
      if (error.code === 'EADDRINUSE') {
        reject(error)
        return
      }
      reject(error)
    })
    server.listen(port, '127.0.0.1', () => {
      server.close(() => resolvePort())
    })
  }).then(
    () => 'available' as const,
    (error: NodeJS.ErrnoException) => {
      if (error.code === 'EADDRINUSE') return 'occupied' as const
      throw error
    }
  )
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
  const version = await readJSON<CDPVersion>(`http://127.0.0.1:${port}/json/version`).catch(() => null)
  if (version == null || typeof version.Browser !== 'string') return null
  return version
}

function readJSON<T>(url: string) {
  return new Promise<T>((resolveJSON, reject) => {
    http
      .get(url, (response) => {
        const chunks: Buffer[] = []
        response.on('data', (chunk) => chunks.push(chunk))
        response.on('end', () => {
          resolveJSON(JSON.parse(Buffer.concat(chunks).toString()) as T)
        })
      })
      .on('error', reject)
  })
}

function handlePausedBrowserHijackedRequest(
  cdp: CDPWebSocket,
  params: CDPRequestPausedParams,
  devOrigin: string,
  routes: string[]
) {
  const requestURL = new URL(params.request.url)
  const route = routes.find((item) => matchPathPattern(item, requestURL.pathname))
  if (route == null) {
    cdp.send('Fetch.continueRequest', { requestId: params.requestId })
    return
  }

  const target = new URL(requestURL.pathname, devOrigin)
  for (const [key, value] of requestURL.searchParams) target.searchParams.append(key, value)
  cdp.send('Fetch.fulfillRequest', {
    requestId: params.requestId,
    responseCode: 307,
    responseHeaders: [
      { name: 'Location', value: target.toString() },
      { name: 'Cache-Control', value: 'no-store' }
    ]
  })
}

function matchPathPattern(pattern: string, pathname: string) {
  const escaped = pattern.replace(/[.+?^${}()|[\]\\]/g, '\\$&').replace(/\*/g, '.*')
  return new RegExp(`^${escaped}$`).test(pathname)
}

function shellQuote(value: string) {
  return `'${value.replace(/'/g, `'\\''`)}'`
}

interface CDPCommand {
  id: number
  method: string
  params?: Record<string, unknown>
}

interface CDPEvent {
  method: string
  params?: Record<string, unknown>
}

interface CDPRequestPausedParams {
  requestId: string
  request: {
    url: string
    method: string
    headers: Record<string, string>
    postData?: string
  }
}

interface CDPTarget {
  id: string
  type: string
  url?: string
  webSocketDebuggerUrl: string
}

interface CDPVersion {
  Browser?: string
  webSocketDebuggerUrl?: string
}

class CDPWebSocket {
  private socket: net.Socket
  private buffer = Buffer.alloc(0)
  private nextID = 1
  private eventListeners = new Map<string, Array<(params: Record<string, unknown>) => void>>()

  private constructor(socket: net.Socket) {
    this.socket = socket
    socket.on('data', (chunk) => this.handleData(chunk))
  }

  static async connect(rawURL: string) {
    const url = new URL(rawURL)
    const socket = await connectSocket(url.hostname, Number(url.port || 80))
    const key = crypto.randomBytes(16).toString('base64')
    socket.write(
      [
        `GET ${url.pathname}${url.search} HTTP/1.1`,
        `Host: ${url.host}`,
        'Upgrade: websocket',
        'Connection: Upgrade',
        `Sec-WebSocket-Key: ${key}`,
        'Sec-WebSocket-Version: 13',
        '',
        ''
      ].join('\r\n')
    )

    await readHandshake(socket)
    return new CDPWebSocket(socket)
  }

  on(event: string, listener: (params: Record<string, unknown>) => void) {
    const listeners = this.eventListeners.get(event) ?? []
    listeners.push(listener)
    this.eventListeners.set(event, listeners)
  }

  send(method: string, params?: Record<string, unknown>) {
    const command: CDPCommand = { id: this.nextID++, method, params }
    this.socket.write(encodeWebSocketFrame(JSON.stringify(command)))
  }

  close() {
    this.socket.end()
  }

  private handleData(chunk: Buffer) {
    this.buffer = Buffer.concat([this.buffer, chunk])
    while (this.buffer.length > 0) {
      const frame = decodeWebSocketFrame(this.buffer)
      if (frame == null) return
      this.buffer = this.buffer.subarray(frame.length)
      const message = JSON.parse(frame.payload.toString()) as CDPEvent
      if (message.method == null || message.params == null) continue
      for (const listener of this.eventListeners.get(message.method) ?? []) listener(message.params)
    }
  }
}

function connectSocket(host: string, port: number) {
  return new Promise<net.Socket>((resolveSocket, reject) => {
    const socket = net.connect(port, host)
    socket.once('connect', () => resolveSocket(socket))
    socket.once('error', reject)
  })
}

function readHandshake(socket: net.Socket) {
  return new Promise<void>((resolveHandshake, reject) => {
    let buffer = Buffer.alloc(0)
    const onData = (chunk: Buffer) => {
      buffer = Buffer.concat([buffer, chunk])
      if (!buffer.includes('\r\n\r\n')) return
      socket.off('data', onData)
      resolveHandshake()
    }
    socket.on('data', onData)
    socket.once('error', reject)
  })
}

function encodeWebSocketFrame(payload: string) {
  const payloadBuffer = Buffer.from(payload)
  const mask = crypto.randomBytes(4)
  const headerLength = payloadBuffer.length < 126 ? 6 : 8
  const frame = Buffer.alloc(headerLength + payloadBuffer.length)
  frame[0] = 0x81
  if (payloadBuffer.length < 126) {
    frame[1] = 0x80 | payloadBuffer.length
    mask.copy(frame, 2)
  } else {
    frame[1] = 0x80 | 126
    frame.writeUInt16BE(payloadBuffer.length, 2)
    mask.copy(frame, 4)
  }
  const maskOffset = headerLength - 4
  for (let i = 0; i < payloadBuffer.length; i++) {
    frame[headerLength + i] = payloadBuffer[i] ^ frame[maskOffset + (i % 4)]
  }
  return frame
}

function decodeWebSocketFrame(buffer: Buffer): { length: number; payload: Buffer } | null {
  if (buffer.length < 2) return null
  const baseLength = buffer[1] & 0x7f
  let offset = 2
  let payloadLength = baseLength
  if (baseLength === 126) {
    if (buffer.length < 4) return null
    payloadLength = buffer.readUInt16BE(2)
    offset = 4
  } else if (baseLength === 127) {
    if (buffer.length < 10) return null
    payloadLength = Number(buffer.readBigUInt64BE(2))
    offset = 10
  }
  const masked = (buffer[1] & 0x80) !== 0
  const maskOffset = offset
  if (masked) offset += 4
  const length = offset + payloadLength
  if (buffer.length < length) return null
  const payload = Buffer.from(buffer.subarray(offset, length))
  if (masked) {
    for (let i = 0; i < payload.length; i++) payload[i] ^= buffer[maskOffset + (i % 4)]
  }
  return { length, payload }
}
