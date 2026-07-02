# Account Local Debugging

The Account app can be developed locally even when the test Account environment
strictly limits allowed browser origins. This document explains the local
debugging setup and why it works without asking the Account backend to trust
arbitrary localhost origins.

For the broader reason why Account is a separate app under `spx-gui/src/apps`,
see [spx-gui Apps](./spx-gui-apps.md).

## Two Separate Problems

Account local development has two different boundaries:

1. Local Account frontend code needs to call Account APIs.
2. OAuth and identity-provider flows sometimes need the browser to visit a
   remote Account Web origin that is already configured in the test
   environment.

The first boundary is solved by Vite's `/api` proxy. The second boundary is
solved by Browser Hijack Plugin, which uses Chrome DevTools Protocol during
local development.

## Local `/api` Proxy

The Account app calls Account APIs through local same-origin `/api/*` paths.
During Vite development, `vite.config.account.ts` can proxy those requests:

```env
VITE_ACCOUNT_API_PROXY_TARGET="https://goplus-builder-account.qiniu.io"
VITE_ACCOUNT_WEB_ORIGIN="https://goplus-builder-account.qiniu.io"
```

`VITE_ACCOUNT_API_PROXY_TARGET` answers: "Where should the local Account dev
server send `/api/*` requests?"

`VITE_ACCOUNT_WEB_ORIGIN` answers: "Which public Account Web origin should
these proxied API requests look like they came through?" It should match the
corresponding Account Backend's `ACCOUNT_WEB_BASE_URL` origin.

When the proxy target is set, the Vite proxy forwards local `/api/*` requests to
that target. It also sets the proxied request's `Origin`, `Host`,
`X-Forwarded-Host`, and `X-Forwarded-Proto` headers from
`VITE_ACCOUNT_WEB_ORIGIN`. This is important because the Account backend can
reject requests whose browser/Web origin does not match its configured Account
Web base URL.

These two values are often the same when developing against a remote Account
Web deployment. They can differ when the Account backend runs locally. For
example:

```env
VITE_ACCOUNT_API_PROXY_TARGET="http://localhost:8080/account"
VITE_ACCOUNT_WEB_ORIGIN="https://goplus-builder-account.qiniu.io"
```

In that setup, requests are physically sent to the local backend, while origin
and host headers still represent the test Account Web origin that the backend is
configured to trust.

## Browser Hijack With Chrome DevTools Protocol

OAuth and identity-provider flows have one extra constraint: parts of the flow
must visit the Account origin that is configured in the remote environment. For
example, a third-party provider callback may only be allowed to return to a
fixed test or production callback domain.

Mapping that domain to a local Vite dev server through `hosts` is awkward. It
also introduces HTTPS certificate problems. Instead, the Account Vite config can
enable Browser Hijack Plugin:

```env
VITE_ACCOUNT_WEB_ORIGIN="https://goplus-builder-account.qiniu.io"
```

This variable answers: "Which browser origin should be intercepted and
redirected back to my local Account dev server?"

In development, `vite.config.account.ts` passes this origin to
`createBrowserHijackPlugin`. The plugin is configured for Account routes such as:

- `/sign-in`
- `/api/identity-providers/*/callback`

The plugin uses Chrome DevTools Protocol instead of changing DNS, certificates,
or backend trust rules.

## How the Hijack Works

1. Start the Account Vite dev server.
2. If the Chrome debugging port is free, the plugin prints a command for
   launching Chrome with remote debugging enabled.
3. The developer runs that command manually.
4. The plugin connects to Chrome page targets through CDP.
5. It enables the CDP `Fetch` domain for selected remote URL patterns.
6. When Chrome requests a matching URL under `VITE_ACCOUNT_WEB_ORIGIN`, the
   plugin fulfills that request with a `307` redirect to the current local Vite
   dev server.

The redirect keeps the original path and query string. It uses HTTP `307` so a
GET remains a GET and a POST remains a POST.

For example:

```text
https://goplus-builder-account.qiniu.io/sign-in?clientID=...&requestURI=...
```

is redirected in the browser to:

```text
http://localhost:5174/sign-in?clientID=...&requestURI=...
```

The local Account app then runs normally, while its `/api/*` requests still go
through the Vite proxy described above.

## Why This Works With Strict Origin Checks

Browser Hijack and the Vite proxy solve different parts of the flow.

Browser Hijack handles browser navigation and provider callbacks. The browser is
still sent to the remote configured Account origin, so OAuth and provider
configuration remain valid. CDP then redirects selected page/callback requests
back to local Vite for development.

The Vite proxy handles local frontend API calls. Local Account code calls
`/api/*`; the proxy forwards those requests to the configured Account
deployment/backend and sets Web-origin-related headers from
`VITE_ACCOUNT_WEB_ORIGIN`. That keeps the backend's strict origin policy
meaningful while still allowing local UI development.

This is an explicit local development tool. It does not change production
behavior, and it does not require the Account backend to trust arbitrary
localhost origins.

## Maintenance Notes

- Keep Browser Hijack Plugin development-only.
- Keep `VITE_ACCOUNT_API_PROXY_TARGET` and `VITE_ACCOUNT_WEB_ORIGIN`
  conceptually separate. They are often set to the same remote Account Web
  URL, but they solve different problems.
- If new remote Account routes must return to the local dev server, add them to
  the Browser Hijack route list in `vite.config.account.ts`.
- Production Account deployment is a normal static frontend plus Nginx `/api`
  proxy; it does not use Browser Hijack Plugin.
