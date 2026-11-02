# XBuilder Account facades

An Account facade is the unified sign-in entry point provided by XBuilder Account on each platform. It hosts
authentication, account interactions, and the return of authorization results. This document refers to first-party apps
that use these entry points to sign in as integrating apps.

This document defines the product behavior and system boundaries of Account facades. See [XBuilder Account](account.md)
for account principals and core capabilities. The relationship between first-party apps and OAuth clients follows the
[app registration and integration design](account-app-integration.md). See the
[technical design](../develop/account-facades.md) for API and implementation details. The complete OpenAPI contract is
defined in `docs/openapi.yaml`.

## Background and goals

XBuilder and other first-party apps use the same XBuilder account across browsers, mini programs, and native apps. Each
environment obtains third-party identities, opens sign-in entry points, and returns results differently. Account facades
handle these platform differences while integrating apps use common account and authorization rules.

Goals include:

- Provide consistent sign-in, account selection, authorization, and return experiences
- Reuse an Account session within the same facade while authorizing each integrating app separately
- Have Account centrally integrate third-party identity providers and enforce account rules
- Handle cancellation and expiration, and support recovery after interruptions or failed returns

Non-goals include:

- Sharing Account session credentials across facades or products
- Centrally managing each integrating app's product roles and business permissions
- A public identity platform for arbitrary third-party apps or self-service app registration

## Entry points and hosts

| Account facade | Host | Supported environments |
| - | - | - |
| Account Web | `account.xbuilder.com` | Regular browsers, H5 pages in WeChat's built-in browser, and system authentication browsers |
| Account WeChat | The Account module in the XBuilder main mini program | Mini programs in mobile and desktop WeChat |
| Account iOS / Android | The Account module in the XBuilder main app on the corresponding platform | iOS and Android native apps in a later phase |

The initial design covers Account Web and Account WeChat. For Account iOS / Android, this document describes only their
hosts and common rules.

With Account Web, the integrating app opens the Account authorization entry point in a browser. Native apps initially
use a system browser or system authentication session, following the
[OAuth requirements for native apps](https://www.rfc-editor.org/rfc/rfc8252.html).

With Account WeChat, the integrating app opens the entry point through WeChat's mini program navigation capabilities.
The XBuilder main mini program opens its local Account module directly. Business pages inside a mini program `web-view`
integrate through the host mini program. See [Web pages inside mini programs](#web-pages-inside-mini-programs) for the
flow.

## System boundary

| Module | Responsibility |
| - | - |
| Account facade | Display trusted request information, host sign-in and authentication assistance interactions, retain session credentials for this entry point, and return authorization results or authentication status |
| Account backend | Validate credentials, determine accounts, manage interaction state and sessions, validate authorization requests, and issue results |
| Integrating app frontend | Initiate sign-in and open the entry point, retain request correlation, validate the return, and restore the original business page |
| Integrating app backend | Create OAuth authorization requests, exchange authorization codes, establish or validate product sign-in state, and enforce product permission rules |

The integrating app frontend initiates authorization through its own backend. It does not implement the Account sign-in
interface or collect third-party credentials or passwords for Account sign-in.

The web, mini program, and native versions of a product can belong to the same app and use different OAuth clients.
`app.id` identifies the product, and `client_id` identifies a specific integration configuration. Account provides the
trusted requester name and avatar from the registered OAuth client and its owning app.

Product features in the XBuilder main app also obtain product sign-in state through their own OAuth client.

## Sessions and authorization

### Account session

An Account session records a user's sign-in through a facade in the current browser or app. It supports subsequent
authorization for different integrating apps. The Account backend creates, validates, and revokes sessions. Each facade
independently holds its own session credentials and does not distribute them to integrating apps. Users who choose to
reuse a valid session do not need to authenticate again unless the backend requires reauthentication.

| Entry point | Session credential |
| - | - |
| Account Web | A cookie under the Account Web domain, following the [Account session rules](account.md#token-and-session-strategy) |
| Account WeChat | An opaque session credential issued by Account, stored in the main mini program's own storage and submitted by the Account module |

Account sessions and product sign-in state are managed separately. User access tokens, app-only access tokens, and
`app_grant` cannot replace an Account session. An Account session is not a product API credential. Account Web endpoints
that change state using cookie authentication enforce CSRF protection. Mini program endpoints independently validate
their session credentials.

| Operation | Effect |
| - | - |
| Product sign-out | End the product session or revoke the corresponding OAuth tokens according to the chosen integration model |
| Cancel or deny an authorization | End that authorization request without revoking an established Account session |
| Sign out of an Account facade or revoke its session | End the corresponding Account session without revoking existing product tokens or sessions by default |
| Switch accounts | Affect subsequent authorization after explicit user confirmation, without replacing existing product sign-in state |

### Authorization flow

Integrating apps use authorization code flow, PAR, and PKCE S256. PAR stores the OAuth client, authorization scope,
callback, `state`, and PKCE challenge, and returns a short-lived opaque `request_uri`, following
[OAuth PAR](https://www.rfc-editor.org/rfc/rfc9126.html). PAR does not carry third-party credentials. The facade
initiates third-party authentication.

Request references only locate flows. The integrating app backend privately retains a recovery credential to query
authorization status, cancel unfinished requests, and prepare a continuation entry point. This credential does not
permit reading the authorization code. An Account facade privately retains a flow credential and operates on requests
according to its bindings. Only the facade hosting the original authorization flow reads authentication results.

1. The integrating app backend creates an authorization request and stores `state`, the PKCE verifier, and the recovery
   credential returned by Account. The frontend retains request correlation and the original business location
2. The integrating app frontend opens the platform's Account facade using entry information prepared by its backend. The
   PKCE verifier and recovery credential are not included in navigation parameters
3. The Account facade reads the request context stored by the backend and uses a valid Account session or initiates
   authentication
4. The Account facade hosts the necessary account interactions, and the Account backend determines the account and
   establishes or reuses an Account session for this entry point
5. After the user completes the necessary authorization confirmation, Account returns an authorization code bound to the
   original OAuth client and `state`, or an OAuth error and `state` if authorization is denied
6. The integrating app validates the return against the original request, exchanges the authorization code through its
   own backend, confirms product sign-in state, then shows sign-in success and restores the original business page

With an existing Account session, the facade displays the current account and offers options to continue or choose
another sign-in method. The first authorization for an app, or a request to expand its authorization scope, displays the
requester and requested permissions for user confirmation.

Supplemental information, account linking confirmation, identity conflicts, and reauthentication follow the Account
backend's common rules. Before issuing an authorization code, the backend validates that the Account session is valid
and its account matches the user's confirmation. An account change requires another user confirmation. Subsequent
account switching does not change the account associated with an issued authorization code.

Authorization requests, callbacks, PKCE, and authorization codes always bind to the original OAuth client. Different
OAuth clients within the same app complete their own flows separately. Integrating app backends continue to use
Account-issued token model or App-owned session model.

When returning to an integrating app, an Account facade carries only the Account authorization result. It does not carry
third-party credentials, Account session credentials, or product tokens. Sensitive credentials must not enter shared
content, analytics, error reports, or logs.

## Sign-in methods

### Available methods

Each facade offers configured sign-in methods that can complete authentication on its platform. Browser selection
follows identity provider requirements, such as
[Google's browser security requirements](https://developers.google.com/identity/protocols/oauth2/policies#use-secure-browsers).
When authentication requires another entry point, explain the required steps in advance. Users do not select the method
again after choosing it.

For regular sign-in, Account Web offers WeChat, QQ, GitHub, Apple, Google, X, and admin-managed password sign-in.
Account WeChat also offers entry points for these methods. WeChat and admin-managed password authentication complete
inside the mini program. Other third-party authentication completes through Account Web in a supported browser. Password
sign-in follows Account's admin-managed password rules.

### WeChat authentication

| Scenario | WeChat authentication method |
| - | - |
| Account Web in a regular desktop browser | WeChat website application sign-in |
| Account Web in a mobile browser outside WeChat | The user opens the XBuilder main mini program through a [URL Link](https://developers.weixin.qq.com/miniprogram/dev/framework/open-ability/url-link.html), authenticates, and resumes the original browser flow |
| Account Web in mobile or desktop WeChat H5 | [Service account `snsapi_userinfo` web authorization](https://developers.weixin.qq.com/doc/service/guide/h5/auth.html) |
| Account WeChat | The main mini program calls [`wx.login()`](https://developers.weixin.qq.com/miniprogram/dev/framework/open-ability/login.html), and the Account backend verifies the result through `code2Session` |

The `code` returned by `wx.login()` verifies WeChat identity. The integrating app receives an authorization code issued
by Account for its OAuth client.

Service account web authorization starts from a user action and asks for authorization confirmation when needed. Users
do not need to follow the service account. Incompatible clients offer an explicit option to use website application
sign-in.

### Authentication across entry points

In authentication across entry points, the facade hosting the original authorization flow is the initiating entry point.
The facade performing the selected authentication is the helping entry point. The helping entry point only verifies
identity for this attempt and does not create a separate authorization request for the integrating app.

The initiating entry point creates an authentication request bound to the method, operation purpose, and original
authorization request. The authentication link carries only the public request reference. The helping entry point
displays the trusted requester, initiating entry point, authentication method, operation purpose, and the same
comparison code as the initiating entry point. After the user checks and confirms, the helping entry point performs only
the specified authentication. It does not use its existing Account session in place of this identity verification.

| Initiating entry point and selected method | User flow |
| - | - |
| Other third-party sign-in in Account WeChat | Copy the authentication link in the mini program and complete the selected authentication through Account Web in a system browser |
| Third-party sign-in other than WeChat in Account Web is restricted by the browser | Copy the authentication link and complete the selected authentication through Account Web in a supported system browser |
| WeChat sign-in in Account Web in a mobile browser outside WeChat | Open the XBuilder main mini program through a URL Link and complete WeChat authentication at the helping entry point |

The Account backend stores authentication results. After authentication ends, the helping entry point explains the
result and guides the user back. This authentication does not create, switch, or revoke its own Account session. Offer a
return action when a direct return is supported. Otherwise, instruct the user to return manually.

On resuming, the initiating entry point reads the authentication result using its own flow credential. After successful
authentication, it hosts the necessary account interactions, establishes or reuses its own Account session after user
confirmation, and continues the original authorization. The two entry points do not exchange flow credentials or session
credentials.

URL Links are available to published mini programs operated by non-individual entities. They do not establish that a
returnable mini program navigation relationship exists or guarantee an automatic return to the original browser page.

### Configuration and identity

Account deployment configuration or controlled server-side configuration manages the application settings and secrets
needed for third-party sign-in. The Account backend selects a registered configuration according to the facade
performing authentication and the authentication method. This selection remains fixed for the attempt.

Facades share stable third-party subject identifiers and identity bindings. They do not automatically match Account
accounts using an email address or username returned by a third party.

The WeChat website application, verified service account, and XBuilder main mini program bind to the same WeChat Open
Platform account. Account resolves a unified WeChat identity using
[`unionid`](https://developers.weixin.qq.com/miniprogram/dev/framework/open-ability/union-id.html). `openid` is only an
auxiliary identifier in the corresponding application's namespace. A missing required `unionid` produces an
authentication or configuration error.

One-time credentials are consumed once during verification. Subsequent interactions use the verified identity without
reusing the original credential. Account sign-in results do not contain identity provider tokens or the WeChat
`session_key`.

## WeChat mini program integration

### Initiation and return

Integrating apps locate the entry point using the XBuilder main mini program's AppID and Account page path. For
authorization across mini programs, the Account backend also registers the allowed calling mini program AppIDs and
corresponding OAuth callbacks for each OAuth client. The integrating app manages the business page shown after
returning.

The Account backend verifies WeChat user identity using only the XBuilder main mini program's AppID/AppSecret.
Integrating apps do not provide their own WeChat AppSecrets.

For authorization across mini programs, enable the sign-in button after preparing the authorization request. The user
clicks to open the XBuilder main mini program's Account entry point and pass the prepared entry information. Full-screen
entry uses
[`wx.navigateToMiniProgram`](https://developers.weixin.qq.com/miniprogram/dev/api/navigate/wx.navigateToMiniProgram.html).
An established half-screen calling relationship can use
[`wx.openEmbeddedMiniProgram`](https://developers.weixin.qq.com/miniprogram/dev/framework/open-ability/openEmbeddedMiniProgram.html)
when supported by the client.

The Account module handles entry according to the request type stored by the backend:

| Request scenario | Handling and return |
| - | - |
| An integrating app authorizes across mini programs | On first entry, validate that the source mini program matches the registered caller. Return the authorization result to the original mini program through `extraData` in [`wx.navigateBackMiniProgram`](https://developers.weixin.qq.com/miniprogram/dev/api/navigate/wx.navigateBackMiniProgram.html) |
| Authorization inside the main mini program | Complete authorization through the local Account module and return to the business page that initiated it |
| Assist Account Web authentication | Complete only this WeChat identity verification and guide the user back to the original browser page to continue |

Recovery of authorization across mini programs uses the saved request correlation. The original request always
determines the return target. Use the return API only when the current navigation relationship matches the original
caller. If returning is impossible, guide the user back to the original integrating app. The integrating app validates
request correlation and the result in `App.onShow`, and recovers the original request when return data is missing.

### Web pages inside mini programs

The business H5 page creates an authorization request through its own backend, then opens the host's native sign-in page
through `wx.miniProgram.navigateTo`. If the host is the XBuilder main mini program, use the local Account module. Other
hosts open Account WeChat from a user click.

The page's backend retains the PKCE verifier and recovery credential. The page retains its own request correlation. The
host receives only the entry information and public correlation needed for navigation. It does not exchange the page's
authorization code or inject the host product's sign-in state into the page.

After receiving the result, the host opens the registered business callback in the original `web-view`, carrying the
authorization code and `state` or an OAuth error. The business callback has the same origin as the original page and
meets the host's business domain configuration requirements. The page validates the original request correlation,
exchanges the authorization code through its own backend, establishes business sign-in state, and restores the original
business page.

When return data is missing, first restore the original business page. The page queries status through its own backend
and reopens the original Account entry point when it needs to receive an issued result. The `web-view`
[`postMessage`](https://developers.weixin.qq.com/miniprogram/dev/component/web-view.html) is delivered only at specific
lifecycle points, such as navigating back or destroying the component. It is not a real-time completion notification.

### Release requirements

Account WeChat must meet the
[WeChat mini program operation rules](https://developers.weixin.qq.com/miniprogram/product/index.html) for dependencies
across mini programs and authorization sign-in. Without platform permission, using another mini program must not be a
prerequisite for using a feature. Shared ownership or Open Platform bindings do not replace that permission.

## Interruption and recovery

The Account backend separately stores authorization and authentication request status, expiration times, and results.
Integrating apps recover their own authorization requests, and initiating entry points recover their own authentication
requests. Interfaces reflect backend-confirmed results. Entering the foreground, receiving a callback, or missing return
data alone does not establish success or cancellation.

Within an authorization request, choosing another method or starting authentication again prevents the previous
authentication result from completing that authorization.

| Situation | Behavior |
| - | - |
| Authentication across entry points succeeds but the user has not returned | The initiating entry point recovers the still-valid authentication result, confirms the account, and continues the original flow |
| Authentication is cancelled, fails, expires, or its result cannot be recovered | Allow the user to authenticate again or choose another method at the initiating entry point while the original authorization request remains valid |
| An authorization code is issued but not returned | The integrating app prepares a continuation entry point, and the original facade redelivers the same valid, unconsumed authorization code through the registered return channel |
| The authorization code exchange result is unknown | The integrating app checks with its own backend and starts again if recovery is impossible, without reusing the authorization code |
| The flow is unfinished when the user returns | Display the unfinished state and offer options to continue or cancel |
| The facade flow credential is lost before authorization completes | Reenter and bind the entry point, cancel the old authentication and clear its result, then confirm the account or authenticate again |
| The facade flow credential for an authorized request is lost, or the integrating app cannot recover its local sign-in flow | The integrating app starts a new authorization without revoking an established Account session |
| The user cancels opening the integrating app's entry point, denies authorization to that app, or ends this sign-in | End the unfinished authorization request and return cancellation or denial according to the original request |
| An unfinished authorization request or authorization code becomes invalid | Explain the reason and have the integrating app start a new authorization |
| A temporary failure occurs within the request's validity period | Retain request correlation and allow explicit retries |
| Duplicate callbacks, foreground events, or concurrent processing occur | Deduplicate by request correlation and reuse confirmed results without issuing authorization codes or establishing product sign-in state more than once |

Later callbacks cannot overwrite a finished request's result. Recovery or reauthentication does not extend the original
authorization request's lifetime or reactivate consumed or revoked credentials.

## Initial delivery and acceptance

The initial delivery includes Account Web and Account WeChat, a real sign-in flow across mini programs for one
integrating app, and a second integrating app to verify reuse of the same Account session with separate authorization
for each OAuth client. Native platform facades and a complete account settings interface are outside this phase.

Acceptance includes:

- Authorization inside the main mini program and across mini programs, authentication through enabled sign-in methods,
  and assistance across entry points
- Bound and unbound identities, missing required identifiers, session reuse, account switching, and preservation of the
  helping entry point's session
- Expired or revoked sessions, disabled apps or OAuth clients, and mismatches between the requester and source
- Authentication and authorization cancellation, authentication and authorization expiration, old results arriving after
  method changes, temporary failures, lost return data, process recreation, and concurrent processing
- Complete flows in regular browsers, system authentication browsers, mobile and desktop WeChat H5, mini programs, and
  their embedded web pages

Validate WeChat flows in real clients with debugging disabled. Record client versions and calling scenarios, and verify
the full-screen flow when half-screen entry is unavailable.
