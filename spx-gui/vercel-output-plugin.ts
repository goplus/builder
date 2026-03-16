import fs from 'node:fs/promises'
import path from 'node:path'
import type { Plugin, ResolvedConfig } from 'vite'

// Generates the Vercel build output used by this static deployment.

type HeaderRule = {
  source: string
  headers: Array<{
    key: string
    value: string
  }>
}

type RewriteRule = {
  source: string
  destination: string
}

type Route =
  | {
      src: string
      headers: Record<string, string>
      continue: true
    }
  | {
      handle: 'filesystem'
    }
  | {
      src: string
      dest: string
      check: true
    }

type Options = {
  outputDir?: string
  headers: HeaderRule[]
  rewrites: RewriteRule[]
}

const defaultOutputDir = '.vercel/output'

const buildRouteSource = (source: string): string => {
  if (source === '/(.*)') {
    return '^(?:/(.*))$'
  }

  const segmentCatchAllMatch = source.match(/^\/([^()]+)\/\(\.\*\)$/)
  if (segmentCatchAllMatch != null) {
    return `^/${segmentCatchAllMatch[1]}(?:/(.*))$`
  }

  if (source.startsWith('/')) {
    return `^${source}$`
  }

  return source
}

const toHeaderRoute = (rule: HeaderRule): Route => ({
  src: buildRouteSource(rule.source),
  headers: Object.fromEntries(rule.headers.map(({ key, value }) => [key, value])),
  continue: true
})

const toRewriteRoute = (rule: RewriteRule): Route => ({
  src: buildRouteSource(rule.source),
  dest: rule.destination,
  check: true
})

const getOutputDir = (config: ResolvedConfig, outputDir: string): string => path.resolve(config.root, outputDir)

const getStaticDir = (config: ResolvedConfig, outputDir: string): string =>
  path.join(getOutputDir(config, outputDir), 'static')

const getConfigPath = (config: ResolvedConfig, outputDir: string): string =>
  path.join(getOutputDir(config, outputDir), 'config.json')

export const createVercelOutputPlugin = ({ outputDir = defaultOutputDir, headers, rewrites }: Options): Plugin => {
  let resolvedConfig: ResolvedConfig | null = null

  return {
    apply: 'build',
    name: 'local-vercel-output',
    enforce: 'post',
    configResolved(config) {
      resolvedConfig = config
    },
    async closeBundle() {
      if (resolvedConfig == null || resolvedConfig.build.ssr) {
        return
      }

      const distDir = path.resolve(resolvedConfig.root, resolvedConfig.build.outDir)
      const outputRoot = getOutputDir(resolvedConfig, outputDir)
      const staticDir = getStaticDir(resolvedConfig, outputDir)

      await fs.rm(outputRoot, { recursive: true, force: true })
      await fs.mkdir(staticDir, { recursive: true })
      await fs.cp(distDir, staticDir, { recursive: true })

      const routes: Route[] = [...headers.map(toHeaderRoute), { handle: 'filesystem' }, ...rewrites.map(toRewriteRoute)]

      await fs.writeFile(
        getConfigPath(resolvedConfig, outputDir),
        JSON.stringify(
          {
            version: 3,
            routes,
            overrides: {}
          },
          null,
          2
        ),
        'utf-8'
      )
    }
  }
}
