// vite.config.ts
import { defineConfig, loadEnv } from "file:///home/zxr/projections/Xbuilder/spx-gui/node_modules/vite/dist/node/index.js";
import vue from "file:///home/zxr/projections/Xbuilder/spx-gui/node_modules/@vitejs/plugin-vue/dist/index.mjs";
import VueDevTools from "file:///home/zxr/projections/Xbuilder/spx-gui/node_modules/vite-plugin-vue-devtools/dist/vite.mjs";
import { ViteEjsPlugin } from "file:///home/zxr/projections/Xbuilder/spx-gui/node_modules/vite-plugin-ejs/index.js";
import vercel from "file:///home/zxr/projections/Xbuilder/spx-gui/node_modules/vite-plugin-vercel/dist/index.js";
import path from "path";
var __vite_injected_original_dirname = "/home/zxr/projections/Xbuilder/spx-gui";
var resolve = (dir) => path.join(__vite_injected_original_dirname, dir);
var vite_config_default = defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "");
  return {
    plugins: [vue(), VueDevTools(), ViteEjsPlugin(), vercel()],
    resolve: {
      alias: {
        "@": resolve("src"),
        "@docs": resolve("../docs")
      }
    },
    build: {
      rollupOptions: {
        input: {
          main: resolve("index.html"),
          "spx-runner": resolve("src/widgets/spx-runner/index.ts")
        },
        output: {
          entryFileNames: (chunkInfo) => {
            if (chunkInfo.name === "main") {
              return "assets/[name]-[hash].js";
            }
            return "widgets/[name].js";
          }
        }
      }
    },
    optimizeDeps: {
      include: [`monaco-editor/esm/vs/editor/editor.worker`]
    },
    test: {
      environment: "happy-dom",
      alias: [
        // Alias for `monaco-editor` to avoid `Failed to resolve entry for package "monaco-editor"`, for details: https://github.com/vitest-dev/vitest/discussions/1806
        {
          find: /^monaco-editor$/,
          replacement: resolve("node_modules/monaco-editor/esm/vs/editor/editor.api")
        }
      ]
    },
    server: {
      headers: {
        "Cross-Origin-Embedder-Policy": "require-corp",
        "Cross-Origin-Opener-Policy": "same-origin"
      }
    },
    vercel: {
      // prevent redirection from `*/foo.html` (e.g., `spx_2.0.1/runner.html`) to `*/foo`
      cleanUrls: false,
      rewrites: [
        {
          source: "/api/(.*)",
          destination: env.VITE_VERCEL_PROXIED_API_BASE_URL + "/$1"
        },
        {
          source: "/(.*)",
          destination: "/index.html"
        }
      ],
      headers: [
        {
          source: "/(.*)",
          headers: [
            {
              key: "Cache-Control",
              value: "public, max-age=300"
            },
            {
              key: "Cross-Origin-Embedder-Policy",
              value: "require-corp"
            },
            {
              key: "Cross-Origin-Opener-Policy",
              value: "same-origin"
            }
          ]
        },
        {
          source: "/widgets/(.*)",
          headers: [
            {
              key: "Cache-Control",
              value: "public, max-age=300"
            }
          ]
        },
        {
          source: "/assets/(.*)",
          headers: [
            {
              key: "Cache-Control",
              value: "public, max-age=31536000, immutable"
            }
          ]
        },
        {
          // For files in folder `public/spx_*`
          source: "/spx_(.*)",
          headers: [
            {
              key: "Cache-Control",
              value: "public, max-age=31536000, immutable"
            }
          ]
        }
      ]
    }
  };
});
export {
  vite_config_default as default
};
//# sourceMappingURL=data:application/json;base64,ewogICJ2ZXJzaW9uIjogMywKICAic291cmNlcyI6IFsidml0ZS5jb25maWcudHMiXSwKICAic291cmNlc0NvbnRlbnQiOiBbImNvbnN0IF9fdml0ZV9pbmplY3RlZF9vcmlnaW5hbF9kaXJuYW1lID0gXCIvaG9tZS96eHIvcHJvamVjdGlvbnMvWGJ1aWxkZXIvc3B4LWd1aVwiO2NvbnN0IF9fdml0ZV9pbmplY3RlZF9vcmlnaW5hbF9maWxlbmFtZSA9IFwiL2hvbWUvenhyL3Byb2plY3Rpb25zL1hidWlsZGVyL3NweC1ndWkvdml0ZS5jb25maWcudHNcIjtjb25zdCBfX3ZpdGVfaW5qZWN0ZWRfb3JpZ2luYWxfaW1wb3J0X21ldGFfdXJsID0gXCJmaWxlOi8vL2hvbWUvenhyL3Byb2plY3Rpb25zL1hidWlsZGVyL3NweC1ndWkvdml0ZS5jb25maWcudHNcIjsvLy8gPHJlZmVyZW5jZSB0eXBlcz1cInZpdGVzdFwiIC8+XG5cbmltcG9ydCB7IGRlZmluZUNvbmZpZywgbG9hZEVudiB9IGZyb20gJ3ZpdGUnXG5pbXBvcnQgdnVlIGZyb20gJ0B2aXRlanMvcGx1Z2luLXZ1ZSdcbmltcG9ydCBWdWVEZXZUb29scyBmcm9tICd2aXRlLXBsdWdpbi12dWUtZGV2dG9vbHMnXG5pbXBvcnQgeyBWaXRlRWpzUGx1Z2luIH0gZnJvbSAndml0ZS1wbHVnaW4tZWpzJ1xuaW1wb3J0IHZlcmNlbCBmcm9tICd2aXRlLXBsdWdpbi12ZXJjZWwnXG5pbXBvcnQgcGF0aCBmcm9tICdwYXRoJ1xuXG5jb25zdCByZXNvbHZlID0gKGRpcjogc3RyaW5nKSA9PiBwYXRoLmpvaW4oX19kaXJuYW1lLCBkaXIpXG5cbmV4cG9ydCBkZWZhdWx0IGRlZmluZUNvbmZpZygoeyBtb2RlIH0pID0+IHtcbiAgY29uc3QgZW52ID0gbG9hZEVudihtb2RlLCBwcm9jZXNzLmN3ZCgpLCAnJylcbiAgcmV0dXJuIHtcbiAgICBwbHVnaW5zOiBbdnVlKCksIFZ1ZURldlRvb2xzKCksIFZpdGVFanNQbHVnaW4oKSwgdmVyY2VsKCldLFxuICAgIHJlc29sdmU6IHtcbiAgICAgIGFsaWFzOiB7XG4gICAgICAgICdAJzogcmVzb2x2ZSgnc3JjJyksXG4gICAgICAgICdAZG9jcyc6IHJlc29sdmUoJy4uL2RvY3MnKVxuICAgICAgfVxuICAgIH0sXG4gICAgYnVpbGQ6IHtcbiAgICAgIHJvbGx1cE9wdGlvbnM6IHtcbiAgICAgICAgaW5wdXQ6IHtcbiAgICAgICAgICBtYWluOiByZXNvbHZlKCdpbmRleC5odG1sJyksXG4gICAgICAgICAgJ3NweC1ydW5uZXInOiByZXNvbHZlKCdzcmMvd2lkZ2V0cy9zcHgtcnVubmVyL2luZGV4LnRzJylcbiAgICAgICAgfSxcbiAgICAgICAgb3V0cHV0OiB7XG4gICAgICAgICAgZW50cnlGaWxlTmFtZXM6IChjaHVua0luZm8pID0+IHtcbiAgICAgICAgICAgIGlmIChjaHVua0luZm8ubmFtZSA9PT0gJ21haW4nKSB7XG4gICAgICAgICAgICAgIHJldHVybiAnYXNzZXRzL1tuYW1lXS1baGFzaF0uanMnXG4gICAgICAgICAgICB9XG4gICAgICAgICAgICByZXR1cm4gJ3dpZGdldHMvW25hbWVdLmpzJ1xuICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgfVxuICAgIH0sXG4gICAgb3B0aW1pemVEZXBzOiB7XG4gICAgICBpbmNsdWRlOiBbYG1vbmFjby1lZGl0b3IvZXNtL3ZzL2VkaXRvci9lZGl0b3Iud29ya2VyYF1cbiAgICB9LFxuICAgIHRlc3Q6IHtcbiAgICAgIGVudmlyb25tZW50OiAnaGFwcHktZG9tJyxcbiAgICAgIGFsaWFzOiBbXG4gICAgICAgIC8vIEFsaWFzIGZvciBgbW9uYWNvLWVkaXRvcmAgdG8gYXZvaWQgYEZhaWxlZCB0byByZXNvbHZlIGVudHJ5IGZvciBwYWNrYWdlIFwibW9uYWNvLWVkaXRvclwiYCwgZm9yIGRldGFpbHM6IGh0dHBzOi8vZ2l0aHViLmNvbS92aXRlc3QtZGV2L3ZpdGVzdC9kaXNjdXNzaW9ucy8xODA2XG4gICAgICAgIHtcbiAgICAgICAgICBmaW5kOiAvXm1vbmFjby1lZGl0b3IkLyxcbiAgICAgICAgICByZXBsYWNlbWVudDogcmVzb2x2ZSgnbm9kZV9tb2R1bGVzL21vbmFjby1lZGl0b3IvZXNtL3ZzL2VkaXRvci9lZGl0b3IuYXBpJyksXG4gICAgICAgIH0sXG4gICAgICBdLFxuICAgIH0sXG4gICAgc2VydmVyOiB7XG4gICAgICBoZWFkZXJzOiB7XG4gICAgICAgICdDcm9zcy1PcmlnaW4tRW1iZWRkZXItUG9saWN5JzogJ3JlcXVpcmUtY29ycCcsXG4gICAgICAgICdDcm9zcy1PcmlnaW4tT3BlbmVyLVBvbGljeSc6ICdzYW1lLW9yaWdpbicsXG4gICAgICB9LFxuICAgIH0sXG4gICAgdmVyY2VsOiB7XG4gICAgICAvLyBwcmV2ZW50IHJlZGlyZWN0aW9uIGZyb20gYCovZm9vLmh0bWxgIChlLmcuLCBgc3B4XzIuMC4xL3J1bm5lci5odG1sYCkgdG8gYCovZm9vYFxuICAgICAgY2xlYW5VcmxzOiBmYWxzZSxcbiAgICAgIHJld3JpdGVzOiBbXG4gICAgICAgIHtcbiAgICAgICAgICBzb3VyY2U6ICcvYXBpLyguKiknLFxuICAgICAgICAgIGRlc3RpbmF0aW9uOiAoZW52LlZJVEVfVkVSQ0VMX1BST1hJRURfQVBJX0JBU0VfVVJMIGFzIHN0cmluZykgKyAnLyQxJ1xuICAgICAgICB9LFxuICAgICAgICB7XG4gICAgICAgICAgc291cmNlOiAnLyguKiknLFxuICAgICAgICAgIGRlc3RpbmF0aW9uOiAnL2luZGV4Lmh0bWwnXG4gICAgICAgIH1cbiAgICAgIF0sXG4gICAgICBoZWFkZXJzOiBbXG4gICAgICAgIHtcbiAgICAgICAgICBzb3VyY2U6ICcvKC4qKScsXG4gICAgICAgICAgaGVhZGVyczogW1xuICAgICAgICAgICAge1xuICAgICAgICAgICAgICBrZXk6ICdDYWNoZS1Db250cm9sJyxcbiAgICAgICAgICAgICAgdmFsdWU6ICdwdWJsaWMsIG1heC1hZ2U9MzAwJ1xuICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAga2V5OiAnQ3Jvc3MtT3JpZ2luLUVtYmVkZGVyLVBvbGljeScsXG4gICAgICAgICAgICAgIHZhbHVlOiAncmVxdWlyZS1jb3JwJ1xuICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAga2V5OiAnQ3Jvc3MtT3JpZ2luLU9wZW5lci1Qb2xpY3knLFxuICAgICAgICAgICAgICB2YWx1ZTogJ3NhbWUtb3JpZ2luJ1xuICAgICAgICAgICAgfVxuICAgICAgICAgIF1cbiAgICAgICAgfSxcbiAgICAgICAge1xuICAgICAgICAgIHNvdXJjZTogJy93aWRnZXRzLyguKiknLFxuICAgICAgICAgIGhlYWRlcnM6IFtcbiAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAga2V5OiAnQ2FjaGUtQ29udHJvbCcsXG4gICAgICAgICAgICAgIHZhbHVlOiAncHVibGljLCBtYXgtYWdlPTMwMCdcbiAgICAgICAgICAgIH1cbiAgICAgICAgICBdXG4gICAgICAgIH0sXG4gICAgICAgIHtcbiAgICAgICAgICBzb3VyY2U6ICcvYXNzZXRzLyguKiknLFxuICAgICAgICAgIGhlYWRlcnM6IFtcbiAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAga2V5OiAnQ2FjaGUtQ29udHJvbCcsXG4gICAgICAgICAgICAgIHZhbHVlOiAncHVibGljLCBtYXgtYWdlPTMxNTM2MDAwLCBpbW11dGFibGUnXG4gICAgICAgICAgICB9XG4gICAgICAgICAgXVxuICAgICAgICB9LFxuICAgICAgICB7XG4gICAgICAgICAgLy8gRm9yIGZpbGVzIGluIGZvbGRlciBgcHVibGljL3NweF8qYFxuICAgICAgICAgIHNvdXJjZTogJy9zcHhfKC4qKScsXG4gICAgICAgICAgaGVhZGVyczogW1xuICAgICAgICAgICAge1xuICAgICAgICAgICAgICBrZXk6ICdDYWNoZS1Db250cm9sJyxcbiAgICAgICAgICAgICAgdmFsdWU6ICdwdWJsaWMsIG1heC1hZ2U9MzE1MzYwMDAsIGltbXV0YWJsZSdcbiAgICAgICAgICAgIH1cbiAgICAgICAg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
