# spx-gui Apps

`spx-gui` maintains multiple browser apps in the same package. It currently has:

- `xbuilder`: the main XBuilder product app.
- `account`: the Account Web facade, including hosted sign-in pages.

They are split at the app-entry level, but share the same codebase, package
scripts, UI primitives, API helpers, styles, linting, type-checking, and build
tooling.

## Why Multiple Apps

The apps have different runtime roles.

`xbuilder` is the product app. It owns editor, community, tutorials, widgets,
and the main OAuth client flow. When it needs a user to sign in, it starts an
OAuth request against the Account backend and lets `/account/oauth/authorize`
decide whether hosted sign-in is needed.

`account` is the hosted Account facade. It serves pages under the Account
origin, such as `/sign-in`, and talks to Account APIs through same-origin
`/api/*` paths. It does not need the full XBuilder app bootstrap, product
routes, widgets, editor setup, or other main-app-only plugins.

Keeping both apps in one codebase gives us two useful properties:

- Account UI can reuse Builder UI components, API clients, styles, linting,
  type-checking, and deployment conventions.
- Account can still be built and served as an independent static frontend, with
  its own Vite config and runtime origin.

## App Layout

App-specific code lives under `spx-gui/src/apps`:

```text
spx-gui/src/apps/
├── account/
│   ├── index.html
│   ├── main.ts
│   ├── App.vue
│   ├── router.ts
│   └── pages/
└── xbuilder/
    ├── index.html
    ├── main.ts
    ├── App.vue
    ├── router.ts
    └── pages/
```

The root `spx-gui/index.html` is only a thin Vite entry placeholder. The real
HTML documents are maintained beside each app. `createAppHtmlEntryPlugin`
replaces the placeholder with the selected app HTML during Vite dev/build:

- `vite.config.ts` selects `src/apps/xbuilder/index.html`.
- `vite.config.account.ts` selects `src/apps/account/index.html`.

This keeps Vite's normal single-root entry behavior while letting each app own
its document metadata and script entry.

## Shared Code

The apps share normal `spx-gui/src` modules:

- `components/ui/*` for reusable UI primitives.
- `apis/account/*` for Account-facing API and OAuth helpers.
- `utils/*`, `stores/*`, app styles, polyfills, and other common utilities when
  they are genuinely app-independent.

App-specific pages, routers, and bootstraps should stay under `src/apps/<app>`.
Shared code should not assume it is running in only one app unless the module
name or path makes that ownership explicit.

The Account app intentionally has a smaller bootstrap in `src/apps/account/main.ts`.
It sets up only what Account currently needs, such as dayjs, i18n, and router.
The main XBuilder app continues to use the broader shared setup because it needs
product-level plugins such as editor-related setup, Sentry, VueQuery, and radar.

## Build and Deployment

The main app uses `vite.config.ts`. The Account app uses `vite.config.account.ts`
and the package scripts:

```sh
npm run dev:account
npm run build:account
```

For the test Account facade, `spx-gui/build/Dockerfile.account` builds the
Account bundle and serves it through Nginx. `spx-gui/build/nginx.account.conf`
serves the static frontend and proxies `/api/*` to the test Builder backend's
`/account/*` API paths.

This means the browser sees a normal Account facade origin, while Account
frontend code can consistently call same-origin `/api/*`.

## Maintenance Notes

- Keep app-owned pages, routers, and bootstraps under `src/apps/<app>`.
- Put reusable UI and API helpers in shared directories only when they are not
  tied to one app's runtime assumptions.
- Prefer same-origin `/api/*` calls inside the Account app. Let deployment or
  dev-server proxying decide where those requests go.
- When adding another app, give it its own `src/apps/<app>/index.html`,
  `main.ts`, router, and Vite config entry selection instead of making the
  existing app bootstrap branch on runtime flags.
