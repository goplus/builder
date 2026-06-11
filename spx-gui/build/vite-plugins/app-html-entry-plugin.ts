import fs from 'node:fs'
import type { Plugin } from 'vite'

// Uses an app-specific HTML template while keeping the root `index.html` as
// Vite's entry placeholder. Vite dev/build still enter through the root HTML
// file, and this plugin replaces its content before later HTML transforms so
// each app can maintain its real document under `src/apps/<app>/index.html`.

export function createAppHtmlEntryPlugin(path: string): Plugin {
  return {
    name: 'app-html-entry',
    transformIndexHtml: {
      order: 'pre',
      async handler() {
        return await fs.promises.readFile(path, 'utf8')
      }
    }
  }
}
