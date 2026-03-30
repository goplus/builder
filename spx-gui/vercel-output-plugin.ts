import fs from 'node:fs/promises'
import path from 'node:path'
import type { Plugin, ResolvedConfig } from 'vite'

// Generates the `.vercel/output` artifacts for this static deployment following
// the Vercel Build Output API v3 spec: https://vercel.com/docs/build-output-api/v3
// This plugin only emits static assets and config.json; it does not manage functions or edge outputs.

type HeaderRule = {
  source: string
  headers: Array<{
    key: string
    value: string
  }>
}

type RewriteRule = {
  source: string
  destination: string | null
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

const escapeRegex = (value: string): string => value.replace(/[|\\{}()[\]^$+?.]/g, '\\$&')

const buildRouteSource = (source: string): string => {
  if (!source.startsWith('/')) {
    return source
  }

  const wildcard = '(.*)'
  const pattern = source.split(wildcard).map(escapeRegex).join(wildcard)

  return `^${pattern}$`
}

const toHeaderRoute = (rule: HeaderRule): Route => ({
  src: buildRouteSource(rule.source),
  headers: Object.fromEntries(rule.headers.map(({ key, value }) => [key, value])),
  continue: true
})

const toRewriteRoute = (rule: RewriteRule): Route => {
  if (rule.destination == null) {
    throw new Error(`rewrite destination for ${rule.source} is not set`)
  }

  return {
    src: buildRouteSource(rule.source),
    dest: rule.destination,
    check: true
  }
}

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
    async writeBundle() {
      if (resolvedConfig == null || resolvedConfig.build.ssr) {
        return
      }

      const distDir = path.resolve(resolvedConfig.root, resolvedConfig.build.outDir)
      const staticDir = getStaticDir(resolvedConfig, outputDir)
      const configPath = getConfigPath(resolvedConfig, outputDir)

      await fs.rm(staticDir, { recursive: true, force: true })
      await fs.rm(configPath, { force: true })
      await fs.mkdir(staticDir, { recursive: true })

      const routes: Route[] = [...headers.map(toHeaderRoute), { handle: 'filesystem' }, ...rewrites.map(toRewriteRoute)]

      await Promise.all([
        fs.cp(distDir, staticDir, { recursive: true }),
        fs.writeFile(
          configPath,
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
      ])
    }
  }
}
