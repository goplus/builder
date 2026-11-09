# XBuilder Account app registration and integration

XBuilder Account maintains a shared registry of first-party apps and provides stable app identifiers, user identity
integration, and restricted data access. First-party apps can read a user's account data with that user's authorization,
or read necessary data as the app after receiving platform approval.

This document defines the product and system boundaries for first-party apps, OAuth clients, and authorization to access
Account APIs. See [XBuilder Account](account.md) for user sign-in methods, third-party identities, account sessions, and
account management behavior. This document governs app registration, OAuth clients, and access authorization. The
implementation design and `docs/openapi.yaml` define the database schema and complete OpenAPI contract.

## Background and goals

First-party apps such as XBuilder, X3D, the order system, and XBuilder Pay need shared, stable account and app
identities. Each owns its business resources, API credentials, and permission rules, and uses Account identity
capabilities for user access, background tasks, and administrative operations.

Users viewing their own profiles, order administrators viewing buyer profiles, and shared services querying the app
directory rely on different authorization sources. Background execution can also use an existing user authorization or
the app's own permissions. The authorization source determines the access mode, regardless of whether the user is
currently online.

Goals include:

- Identify first-party apps with stable `app.id` values that shared services can reference
- Support OAuth clients for different integration environments within the same app
- Support delegated user access and app-only access with separately managed authorization
- Provide restricted access to the app directory and user profiles
- Define the permission responsibilities of Account, integrating apps, and business services
- Preserve audit associations for identity registration, authorization, credentials, and data access

Non-goals include:

- Self-service registration for arbitrary third-party apps or a public developer platform
- Centrally managing merchants, workspaces, orders, payments, or product permissions across businesses
- Replacing the integration credentials and permission rules of business services such as orders and payments
- Simulating user sign-in with a machine identity
- Generic token exchange, user token forwarding across business services, or arbitrary resource authorization
- Merging apps, accounts, or authorizations across deployments

## Core concepts

| Concept | Meaning |
| - | - |
| `user` | XBuilder Account principal, referenced by stable `user.id` |
| `app` | Platform-registered and managed first-party app, referenced by stable `app.id` |
| `oauth_client` | A specific OAuth integration configuration for an app, defining client type, grant types, callbacks, and credentials |
| `app_grant` | A record of a user authorizing an app to access Account user capabilities |
| User access token | An access token issued by Account under user authorization, associated with the user, app, and OAuth client |
| App-only access token | An access token issued by Account under app-only permissions, representing the app and bound to a specific OAuth client |

An app can have zero, one, or multiple OAuth clients. Registering a first-party app does not automatically grant user
authorization, app-only permissions, or access to other systems.

## System boundary

| Capability or data | Responsible system |
| - | - |
| User accounts, display names, avatars, and account sign-in | XBuilder Account |
| First-party app registration, basic display data, and OAuth clients | XBuilder Account |
| Authorization for delegated user access and app-only access to Account APIs | XBuilder Account |
| Assignment and evaluation of the Account administrator role | XBuilder Authorization |
| Orders, merchant scope, approvals, and fulfillment permissions | The order system or the corresponding business system |
| Payments, refunds, business source authorization, and payment management permissions | XBuilder Pay |
| Credentials and operation scopes for access to other business services | The corresponding business service |

`/account/*` identifies APIs owned by Account. Each endpoint's contract defines the calling identity and access scope.
Account Web uses account sessions, delegated user access uses user access tokens, and app-only access uses app-only
access tokens.

A first-party app's frontend calls its own backend. The backend calls Account APIs directly for the capabilities it
needs, and returns necessary data to the frontend under its own business permissions. Account identities and app
identifiers can pass along trusted business call chains. Each recipient validates access permissions independently.

## First-party app registration

An app represents a product or service with independent business responsibilities and an integration identity, such as
XBuilder, the order system, or Pay. An app's web, mobile, and background components can share the app identity while
using different OAuth clients or business service credentials.

The platform registers apps through the admin console or controlled operational procedures. Registration data includes:

| Field | Meaning |
| - | - |
| `id` | Stable app identifier |
| `name` | Unique management name |
| `displayName` | User-facing display name, defaulting to `name` when omitted at creation |
| `avatar` | Optional app avatar, returned as a displayable HTTP URL |
| `description` | Optional short description |
| `status` | App status in Account, either `active` or `disabled` |
| `createdAt`, `updatedAt` | Registration creation and update times |

An app's `id` and `name` are immutable after creation. Its display name, avatar, and description can change. Business
systems use `app.id` for associations and must not identify the same app by display name, domain name, or OAuth client
identifier.

Apps cannot be deleted. Disabling an app preserves its identity, historical authorizations, and audit associations.
Existing IDs must not be assigned to another app.

Mainland China and overseas environments use the app and user registrations in their respective Account deployments.
Identical textual IDs or names do not establish the same identity across environments. Integration addresses,
credentials, and authorization scopes must match the deployment environment.

## OAuth clients

An OAuth client belongs to exactly one `appID`, and this association is immutable after creation. Client type, grant
types, callback configuration, and secrets belong to the client and are not part of the app's public registration data.

An app can register separate OAuth clients for different runtime environments and integration purposes. The number and
configuration of clients do not change the app's stable identity. See
[Google cross-client identity](https://developers.google.com/identity/protocols/oauth2/cross-client-identity) for the
relationship between app components and client configurations.

| Integration purpose | Client requirements |
| - | - |
| Interactive user authorization | Use authorization code flow, register a public or confidential client for the runtime environment, use PKCE, and configure a redirect URI allowlist |
| Continued backend access on behalf of a user | Use the refresh token associated with the original user authorization, preserving user, app, and client bindings |
| App-only access | Use a confidential client with `client_credentials` explicitly enabled and app-only permissions approved for its owning app |

Interactive access and app-only access use separate clients so credentials and integration status can be managed
independently. Only clients with authorization code flow enabled need redirect URIs. They validate callbacks, PKCE, and
OAuth state under Account's sign-in contract.

An OAuth client's `id` identifies the management resource and internal associations. Management API parameter
`oauthClientID` references this identifier. Account assigns the public `clientID`, which is immutable after creation.
New clients use independently generated random strings.

OAuth `client_id` and Hosted sign-in `clientID` use the same public identifier. Account uses it to locate the OAuth
client, then uses its `appID` to retrieve app registration and display data. Callers must not treat `client_id` as
`app.id`.

The PAR `request_uri`, authorization code, redirect URI, and PKCE parameters must bind to the same OAuth client. An
authorization flow cannot switch between different clients of the same app.

Confidential clients authenticate with `client_secret_basic`, using the public `clientID` as the username and the secret
as the password. The secret value is returned only at creation. The backend stores its hash and supports overlapping
rotation periods and immediate revocation. Public clients hold no secret and cannot obtain app-only access tokens.

Token introspection follows [RFC 7662](https://www.rfc-editor.org/rfc/rfc7662.html#section-2.2) and returns the
`client_id` bound to an active token. Account authenticates the requesting confidential client and permits introspection
only for tokens belonging to the same app.

Introspection results for active access tokens include `token_type` with the value `Bearer`. Refresh token results omit
this field. Validating API credentials through introspection requires checking `active`, `token_type`, subject, client
binding, and usage scope. Neither `active` alone nor the request's `token_type_hint` is sufficient to allow access.

## Account API scopes

Account APIs restrict access by token subject, corresponding authorization, and scope. Endpoint contracts define the
returned fields. Authorization for delegated user access and app-only access is managed separately.

| Scope | Delegated user access | App-only access |
| - | - | - |
| `account:app:read` | Not supported | Read basic registration data for first-party apps in the current Account deployment |
| `account:user:read` | Read the Account data of the token's user | Read the Account data of any user in the current Account deployment by user ID |
| `account:user:write` | Update the display name and avatar fields that the token's user is allowed to change | Not supported |

## Delegated user access

Delegated user access uses Account permissions granted to the app by the user. An `app_grant` associates a user with an
app. Issued authorization codes, access tokens, and refresh tokens are also bound to a specific OAuth client.

Trusted clients of the same app can share an `app_grant`, but only the original client can consume authorization codes
and refresh tokens under the protocol. Sharing an app registration or an existing `app_grant` does not directly provide
a user's tokens or grant app-only permissions.

An `app_grant` stores the scopes approved by that user for that app. Additional scopes require corresponding user
authorization. A client requesting a narrower scope does not automatically narrow the existing grant or revoke other
clients' active tokens.

Tokens issued in an OAuth flow contain only the scopes authorized for that request, not the full scope of the
`app_grant`. Additional user authorization for the app does not expand an existing refresh token's scope.

`GET /account/user` determines the current user from a valid user access token. The token permits reading that user's
profile. It does not permit selecting another user through request parameters or managing user lists, passwords,
identity bindings, or account sessions.

Delegated user access can continue while the user is offline. An app backend with a valid grant and refresh token can
continue access under the original authorization. Revoked authorization or an unrecoverable refresh token requires new
authorization.

When an administrator creates an access token for a valid `app_grant`, they must explicitly specify an active
`oauthClientID` belonging to that app with user authorization enabled. The token binds to that client and inherits the
user grant's scope. No refresh token is issued. Token management APIs return its `oauthClientID` for validation,
auditing, and disabling access by client.

First-party product APIs can use the
[Account-issued token model or App-owned session model](account.md#first-party-apps). With the Account-issued token
model, the backend accepts only valid user access tokens belonging to its app and validates the associated OAuth client,
user grant, and scope. The corresponding business system continues to determine product permissions.

With the App-owned session model, the backend stores the user's Account authorization and tokens and maintains its own
session. The frontend holds only the app's own session credentials. The backend reads Account data as needed. A failed
read does not automatically mean the app session has been revoked.

## App-only access

App-only access uses platform-approved permissions to call Account APIs as the app, without relying on a buyer's or
administrator's user token. Background tasks, data queries, and identity checks can use this access mode. See
[Microsoft permissions and consent](https://learn.microsoft.com/en-us/entra/identity-platform/permissions-consent-overview)
for the distinction between delegated user access and app-only access.

### Permission configuration

An app's `clientCredentialsScopes` stores the Account API scopes the app may request through `client_credentials`. It
can contain only scopes supported for app-only access. The field is an array of unique strings and defaults to `[]`.
Confidential clients of the same app allowing `client_credentials` share this approved set. An empty set means the app
cannot obtain app-only access tokens.

App management endpoints support creating, retrieving, and updating this configuration. Administrators with
`accountAdmin` or controlled operational procedures approve permissions for the actual purpose and record the previous
and new scope sets, actor, and reason.

Reading user data by user ID requires explicit platform approval of `account:user:read`. The target user does not need
an `app_grant` for that app. Account checks the calling client, its app, and approved scopes. It does not synchronize
business order, merchant, or workspace relationships into Account permissions. Business systems must still verify the
current actor's access to business resources and restrict the users actually queried and displayed.

For example, the order system has app ID `20`. An administrator approves its app directory and user profile reads:

```http
PATCH /admin/account/apps/20
Authorization: Bearer <admin-access-token>
Content-Type: application/json

{
  "clientCredentialsScopes": [
    "account:app:read",
    "account:user:read"
  ],
  "reason": "Read app registration and buyer profiles for order administration"
}
```

Management queries for this app return the stored `clientCredentialsScopes`. Ordinary directory queries omit the field.

### Token issuance and validation

App backends use `POST /account/oauth/token` with `grant_type=client_credentials` and explicitly request a nonempty
scope set. Account validates confidential client credentials, app and client status, allowed grant types, and the owning
app's `clientCredentialsScopes`. A request exceeding the approved scope set returns an OAuth error. This flow follows
the [OAuth client credentials grant](https://www.rfc-editor.org/rfc/rfc6749.html#section-4.4).

App-only access uses short-lived, revocable opaque access tokens. Each token binds to the app, OAuth client, and scopes
issued for that request, and is used only for the corresponding deployment's Account APIs. Business roles, data, and
mutable permissions are not encoded in the token value.

This flow does not issue refresh tokens. After expiration, the backend requests a new token with valid client
credentials. The backend holding the credentials coordinates concurrent token requests.

Account APIs validate token validity, app and client status, and allowed grant types on every request. The required
endpoint scope must be present in both the token scope and the owning app's current `clientCredentialsScopes`. The
token's intended resource and access scope must be explicitly restricted. See
[OAuth resource indicators](https://www.rfc-editor.org/rfc/rfc8707.html#section-2).

An app-only access token does not represent a user. Its introspection `sub` is `app:{appID}`, while a user token's `sub`
is the stable `user.id`. The backend must distinguish these subject types. App-only access tokens cannot be used for
`/account/user`, and an app subject cannot be interpreted as a business user.

The order system backend requests a token using one of its confidential clients with `client_credentials` enabled:

```http
POST /account/oauth/token
Authorization: Basic <client-credentials>
Content-Type: application/x-www-form-urlencoded

grant_type=client_credentials&scope=account%3Aapp%3Aread%20account%3Auser%3Aread
```

```json
{
  "access_token": "xb_at_opaque_app_only_reference",
  "token_type": "Bearer",
  "expires_in": 300,
  "scope": "account:app:read account:user:read"
}
```

Subsequent data requests use this app-only access token. Calls from the order system to Pay still use credentials and
payment permissions granted by Pay.

## Data access and display

### App directory

Directory queries return stable app IDs, management names, display names, status, timestamps, and optional avatars and
descriptions. They do not include OAuth callback configuration, secrets, user grant records, or business service
credentials.

Disabled app registrations remain queryable for historical references. Directory data can be cached. Display snapshots
do not replace stable identity.

For example, an app approved for directory access queries XBuilder's registration:

```http
GET /account/apps/1
Authorization: Bearer <account-app-only-access-token>
```

```json
{
  "id": "1",
  "createdAt": "2026-10-16T08:00:00+08:00",
  "updatedAt": "2026-10-16T08:00:00+08:00",
  "name": "xbuilder",
  "displayName": "XBuilder",
  "avatar": "https://avatars.example.com/apps/1.png",
  "description": "Visual programming and interactive projects",
  "status": "active"
}
```

Pay can use directory data to display business sources or identify an app in its integration configuration. Reading the
directory does not enable Pay for that app or authorize creating payments on its behalf.

### User profiles

App backends query user profiles by stable `userID`. Results use the same `AccountUser` structure as
`GET /account/user`. `createdAt` and `updatedAt` represent account creation and the most recent update. Account returns
only fields it owns, excluding product descriptions, plans, roles, quotas, merchant relationships, and business
statistics.

```http
GET /account/users/123
Authorization: Bearer <account-app-only-access-token>
```

```json
{
  "id": "123",
  "createdAt": "2026-10-16T08:00:00+08:00",
  "updatedAt": "2026-10-20T09:30:00+08:00",
  "username": "alice",
  "displayName": "Alice",
  "avatar": "https://avatars.example.com/users/123.png"
}
```

User IDs establish associations. Display names and avatars are for presentation. Shipping addresses, recipients,
logistics, and fulfillment data belong to the corresponding business systems and cannot be inferred from account display
data.

A successful query also confirms that `userID` belongs to the current Account deployment. It does not prove that the
user initiated the business operation or that the caller has access to the user's business resources.

The initiating app backend establishes the buyer identity from a verified identity and passes it through trusted service
calls. Order and payment services each validate their own callers and business authorization.

## Integration scenarios

### A user views their own profile in Pay

The user accesses Account through Pay's own OAuth client. The Pay backend stores the user authorization and Account
tokens and establishes a Pay session.

Pay Web calls its own backend with the Pay session. The backend validates the session, calls `GET /account/user` with a
user token carrying `account:user:read`, and returns the fields needed by the page.

This flow uses delegated user permissions and does not require app-only permissions for Pay.

### An order administrator views a buyer profile

The order administration interface first verifies the current actor's identity, merchant scope, and order permissions,
then determines the buyer's `userID` from an authorized order. The order backend uses an app-only access token approved
for user profile reads to query that buyer directly from Account.

Account checks the order system's app-only permissions and the calling client. The order system controls which orders
and users the actor may view. Both checks are required. Holding a valid app-only access token must not allow the
frontend to query arbitrary user IDs.

Account access auditing records the calling app, OAuth client, target user, and request correlation. The order system
records the actual actor, business resource, and query purpose, preserving the correlation between both sets of logs.

### A shared service selects an integrating app

Account administrators can query and manage apps through Account management APIs. When another shared service's
management module needs to select an app, its backend can use `account:app:read` to provide the necessary directory
data.

The management module validates the actor's permission to access that module before allowing directory queries or
integration operations. Directory access does not require the actor to have `accountAdmin` and does not replace the
service's own integration approval.

### The order system calls Pay

The product backend creates orders using an integration identity recognized by the order system and supplies a trusted
buyer association. The order system creates payments with its own Pay API credentials and supplies the actual business
source and buyer identifiers.

In Pay, `appID` identifies the order system, `businessAppID` identifies the actual product, and `userID` identifies the
buyer. Each association has a distinct business meaning. The order system owns its multi-tenancy, merchant, and order
models.

When Pay needs Account data, it calls Account directly with its own authorization. Calling Pay does not give the order
system Pay's Account permissions, and the order system does not need to forward the buyer's Account token to Pay.

## Credentials, authorization, and lifecycle

Account client secrets, Account user tokens, app-only access tokens, app sessions, and business service API credentials
are managed separately. They can reference the same app but have different issuers, intended resources, and
authorization sources.

A revoked client secret can no longer authenticate the client. Issued tokens are validated against their own validity
periods, grants, and revocation states. To end a client's existing access, disable that client or revoke the relevant
authorization.

When an app is disabled, Account stops issuing or accepting Account access tokens for its clients and revokes related
authorization codes, refresh tokens, and access tokens. App registration and historical associations remain.

Disabling an OAuth client ends its integration while preserving historical authorization and audit associations. It
revokes that client's unfinished authorization flows and tokens without affecting valid authorization for other clients
of the same app.

Narrowing or clearing an app's `clientCredentialsScopes` immediately invalidates app-only access tokens containing
removed scopes across all clients of that app, without affecting delegated user access. Expanding permissions does not
expand issued tokens' scopes. The client must request new tokens. Permission configuration, token issuance, and
invalidation of existing tokens must be reliably coordinated.

Authorization codes and tokens invalidated by disabling or permission reduction do not become valid again when access is
re-enabled or permissions are restored.

Revoking an `app_grant` ends that user's delegated access for the app and invalidates the grant's authorization codes
and tokens. It does not affect the app's app-only permissions, which do not create delegated user grants.

Account disabling or revocation does not automatically change API credentials, app sessions, or business resources in
other systems. Each system handles integration lifecycle under its own permission and session rules and continues to
fulfill existing transaction and audit responsibilities.

## Caching and unavailability

Basic display data can be cached. App registration is authoritative. Display snapshots in historical orders or payments
are preserved under business semantics. Directory updates do not require rewriting historical transactions.

Caching does not replace business permission checks for the current request. After the relevant app-only permission is
revoked, callers stop refreshing that data from Account through app-only access. Business purposes determine cache
retention and cleanup. Credentials and raw tokens must not enter display caches.

Callers distinguish insufficient permissions, missing resources, and temporary Account unavailability. They must not
interpret 401, 403, or network failures as a missing user, or treat a failed avatar refresh alone as invalidating the
account or business session.

If a mandatory identity check cannot be recovered, the affected new request returns an explicit unavailability result.
Persisted orders and payments continue notification handling, reconciliation, and necessary recovery using their stored
identity and funds associations, without requiring fresh avatars or names.

## Admin console and management permissions

The Account management module resides in XBuilder Admin Console. Administrators with `accountAdmin` manage app
registration, display data, and app-only permissions, OAuth clients and their credentials, user grants, and associated
tokens. XBuilder Authorization owns assignment and evaluation of this role.

Management operations record the actor, app, relevant OAuth client, change scope, and reason. Secrets are displayed only
at creation. Ordinary directory reads do not return credentials, OAuth configuration, or authorization management data.

App-only scopes represent only access to Account. Order administrators, Pay administrators, and other product roles are
managed by their respective business systems. App-only permissions do not automatically grant those roles.

## API boundary

This section describes the target endpoint boundaries. Requests, responses, authentication, errors, and field
constraints must be defined in `docs/openapi.yaml` when the endpoints are implemented.

### Current account endpoints

```http
GET   /account/user
PATCH /account/user
PUT   /account/user/avatar
```

- Require a valid user access token bound to the user, app, and OAuth client, and validate the relevant user scope
- Determine the current user from the token and reject other user IDs as criteria for querying the current profile
- Account Web continues to use account sessions under the account endpoint contract
- Third-party identities, account sessions, and passwords remain managed through the corresponding Account Web or admin
  endpoints

### App-only endpoints

```http
GET /account/apps
GET /account/apps/{appID}
GET /account/users/{userID}
```

- Require valid app-only access tokens and reject user tokens, app IDs, and business service API credentials as
  substitutes for authentication
- App directory and individual app queries require `account:app:read` and return basic registration data
- App lists follow the existing list contract and are queried after authentication and authorization
- User profile queries require `account:user:read`, return `AccountUser`, and can confirm account existence
- A missing user returns 404
- Authentication and authorization failures return 401 and 403 respectively, rather than indicating a missing resource

### Account OAuth endpoints

```http
POST /account/oauth/par
GET  /account/oauth/authorize
POST /account/oauth/token
POST /account/oauth/introspect
POST /account/oauth/revoke
```

- User authorization follows Account's PAR, authorization code, PKCE, and refresh token contracts
- App-only access obtains tokens through `client_credentials` without entering a user authorization page
- User tokens and app-only tokens have separate subject, client, scope, and usage restrictions
- Introspection requires confidential client authentication and is restricted to tokens of the same app
- OAuth revocation allows only the original client to revoke its tokens. Administrators revoke an entire `app_grant`
  through user grant management APIs

### Account admin endpoints

```http
GET   /admin/account/apps
POST  /admin/account/apps
GET   /admin/account/apps/{appID}
PATCH /admin/account/apps/{appID}
PUT   /admin/account/apps/{appID}/avatar

GET   /admin/account/apps/{appID}/oauth-clients
POST  /admin/account/apps/{appID}/oauth-clients
GET   /admin/account/apps/{appID}/oauth-clients/{oauthClientID}
PATCH /admin/account/apps/{appID}/oauth-clients/{oauthClientID}

GET    /admin/account/apps/{appID}/oauth-clients/{oauthClientID}/secrets
POST   /admin/account/apps/{appID}/oauth-clients/{oauthClientID}/secrets
DELETE /admin/account/apps/{appID}/oauth-clients/{oauthClientID}/secrets/{secretID}

GET    /admin/account/users/{userID}/app-grants
GET    /admin/account/app-grants/{appGrantID}
DELETE /admin/account/app-grants/{appGrantID}
GET    /admin/account/app-grants/{appGrantID}/tokens
POST   /admin/account/app-grants/{appGrantID}/tokens
DELETE /admin/account/app-grants/{appGrantID}/tokens/{tokenID}
```

- Require `accountAdmin` and follow Account management API access restrictions and audit rules
- Creating an app does not require creating an OAuth client at the same time
- App management queries return `clientCredentialsScopes`. App-only scopes default to an empty set at creation and must
  be explicitly supplied when approved
- Updating `clientCredentialsScopes` supplies the target scope set. An empty set revokes the app's app-only permissions
- Permission changes and invalidation of existing tokens must be reliably coordinated and cannot affect only future
  issuance
- Client creation requires a valid parent app and validates callbacks, client type, and credentials against its grant
  types
- Client secrets bind to a specific client. Rotation does not change app or client identity
- User grants are managed per app. Token lists return each token's bound `oauthClientID`
- Administrators creating user access tokens must specify an active `oauthClientID` belonging to the grant's app and
  cannot select a client restricted to app-only access
- Revoking an access token affects only that token. Revoking a refresh token affects its token family
- Revoking an entire `app_grant` ends all of that user's delegated access for the app

## Security boundary

The Account backend resolves the app, OAuth client, and user subject from valid credentials and persisted authorization.
App IDs, user IDs, and display data in a request cannot substitute for calling identity or authorization.

App-only access tokens can use only approved Account capabilities. Apps, OAuth clients, and deployment environments
cannot bypass bindings by reusing credentials. Product APIs accepting user tokens must reject app subjects as user
identities.

Delegated user access and app-only access separately check token subject, scope, and corresponding authorization.
Management roles and product permissions are checked independently. Controlled app registration and secret issuance do
not allow clients to expand their own authorization scope.

Client secrets and app-only access tokens are held by app backends and are not returned to frontends through business
APIs. The admin console temporarily displays a client secret's raw value only after successful creation and does not
write it to persistent browser storage.

Data access records the user or calling app, OAuth client, capability, target resource, result, and request correlation
according to the access mode. Business systems record the actual actor or task identity and the business purpose.
Tokens, secrets, raw authentication headers, and sensitive data must be redacted.

Account data includes only fields allowed by the contract. Display names and descriptions are treated as plain text.
Avatars use displayable URLs managed by Account.
