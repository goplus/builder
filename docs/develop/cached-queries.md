# Cached query modes

`useQueryWithCache` exposes a consumer-local `mode`. Consumers sharing a query key can choose different modes without clearing or freezing the shared cache.

| Mode | Behavior |
| --- | --- |
| `background` (default) | Keep the existing result and loading semantics during refresh. Publish new data on success; retain data and expose the error on refresh failure. |
| `blocking` | While waiting for the required result, expose null data/error and loading, including while offline. Publish the new result on success, or null data and an error on failure. |
| `snapshot` | Read the first valid success for the current key, then retain its data and observable state despite shared refreshes, failures, writes, and invalidations. |

A fresh successful cache hit can satisfy a read immediately. An invalidated or expired cache hit that requires revalidation cannot satisfy a blocking/snapshot read. Successful null, false, zero, empty strings and empty collections count as results. A successful fetch can satisfy the read even with `staleTime: 0`; expiry alone does not retroactively hide a published result.

Changing the query key starts a new snapshot read. Explicit `refetch()` in blocking/snapshot mode immediately clears the consumer's data/error and starts loading. A failed read ends loading with null data and an error; another refetch can retry. A canceled required read does not make old cached data usable again; it still needs a successful result or retry.

```ts
const display = useUser(() => username.value) // background
const initial = useUser(() => username.value, 'snapshot')
```

The user, signed-in-state/user, following and liking hooks accept a `mode` argument and pass it to the underlying cached query. Their defaults remain background. Signed-in state maps the underlying result directly so background profile updates and blocking/snapshot state reach derived consumers. There is no separate identity snapshot across query keys.

`untilLoaded` rechecks readiness after awaiting, so invalidation between readiness and the resumed read cannot return an old/null result. `composeQuery` tracks observable data/error as well as loading, so a background update can reach a composed query without a loading transition.

Ordinary `useQuery` behavior is unchanged. Its future `legacy`/`blocking` interface and the Tutorial v2 `clearResultOnFetch` migration are separate work. These modes do not replace mutation cache writes or define authentication session identity (#3590).

## Consumer audit on dev

The four cached-query entry points are `useUser`, the internal `useSignedInUserQuery`, `useIsFollowing`, and `useIsLikingProject`. The following inventory includes their direct hooks and derived business consumers. Paths are relative to `spx-gui/src/`.

### Public user information — background

| Consumer | Data and reason |
| --- | --- |
| `apps/xbuilder/pages/community/project.vue` | Owner details should reflect profile edits. |
| `apps/xbuilder/pages/community/user/index.vue` | Profile, error display and explicit retry remain live. |
| `apps/xbuilder/pages/community/user/overview.vue` | Profile/page title and ownership-derived project list stay current. |
| `apps/xbuilder/pages/community/user/projects.vue` | Ownership-derived public/private listing stays current. |
| `apps/xbuilder/pages/community/user/likes.vue` | Profile-derived title stays current; list query remains independently owned. |
| `apps/xbuilder/pages/community/user/followers.vue` | Profile-derived title stays current; list query remains independently owned. |
| `apps/xbuilder/pages/community/user/following.vue` | Profile-derived title stays current; list query remains independently owned. |
| `components/community/project/OwnerInfo.vue` | Owner presentation stays current. |
| `components/community/project/RemixedFrom.vue` | Remix-source owner presentation stays current. |
| `components/community/user/UserLink.vue` | Display name stays current. |
| `components/community/user/UserAvatar.vue` | Avatar stays current. |
| `components/editor/navbar/EditorProjectDisplayName.vue` | Owner information and ownership-derived navigation stay current. |

### Signed-in state and derived user

| Consumer | Choice and reason |
| --- | --- |
| `apps/xbuilder/pages/editor/own-project.vue` | **snapshot**: resolve the canonical username for one mounted redirect, waiting for a valid initial result. No ongoing display or mutable session is owned here. |
| `apps/xbuilder/pages/editor/index.vue` → `components/editor/editing.ts` (`EditorState`) | Background: save/ownership checks read current signed-in state; project initialization and local cache have their own lifecycle. |
| `components/asset/gen/sprite/SpriteGen.vue` → `EditorState` | Background: preview editor save state must follow identity changes. |
| `components/project/ProjectCreateModal.vue` | Background: validation/submission read current identity. The form owns its draft and is not initialized from refreshed profile data. |
| `components/project/runner/ProjectRunner.vue` | Background: runner requests use current identity; engine lifecycle is separately owned. |
| `components/copilot/CopilotRoot.vue` → `UserContextProvider` | Background: context reads the current signed-in user. |
| `components/copilot/CopilotUI.vue` | Background: action-time identity reads must remain current. |
| `components/navbar/NavbarProfile.vue` | Background: avatar, menu capabilities, loading and sign-in presentation should update. |
| `apps/xbuilder/pages/admin/index.vue` | Background: admin access should follow capabilities. |
| `apps/xbuilder/pages/admin/users.vue` | Background: account-management permission controls its independent queries. |
| `apps/xbuilder/pages/admin/user.vue` | Background: account/authorization permissions control independent queries; edited account drafts come from those queries, not this cached profile. |
| `apps/xbuilder/pages/admin/apps.vue` | Background: account-management permission stays current. |
| `apps/xbuilder/pages/admin/app.vue` | Background: account-management permission stays current. |
| `apps/xbuilder/pages/admin/grant.vue` | Background: account-management permission stays current. |
| `apps/xbuilder/pages/community/home.vue` | Background: current-user project links stay current. |
| `apps/xbuilder/pages/community/project.vue` | Background: ownership-derived actions stay current. |
| `apps/xbuilder/pages/community/user/overview.vue` | Background: ownership-derived project listing stays current. |
| `apps/xbuilder/pages/community/user/projects.vue` | Background: ownership-derived project listing stays current. |
| `components/project/ProjectItem.vue` | Background: ownership-derived actions stay current. |
| `components/editor/navbar/EditorNavbar.vue` | Background: editor actions use current identity. |
| `components/editor/navbar/EditorProjectDisplayName.vue` | Background: owner-dependent navigation stays current. |
| `components/editor/preview/EditorPreview.vue` | Background: publish/ownership eligibility stays current; runner lifecycle remains independent. |
| `components/copilot/UserMessage.vue` | Background: user presentation stays current. |
| `components/community/user/FollowButton.vue` | Background: self-follow eligibility stays current. |
| `components/community/user/UserHeader.vue` | Background: own-profile actions stay current. |
| `components/asset/library/AssetSaveModal.vue` | Background: ownership/permission checks stay current; its asset query and form draft retain their own lifecycle. |
| `components/course/management/CourseSeriesEditModal.vue` | Background: creator eligibility/identity stays current; its form initializes from modal props, not this query. No course query is migrated here. |
| `stores/following.ts` (`useIsFollowing`, `useFollow`, `useUnfollow`) | Background identity dependency: relationship keys and writes follow the current canonical username. The chosen relationship mode does not freeze this dependency. |
| `stores/liking.ts` (`useIsLikingProject`, `useLikeProject`, `useUnlikeProject`) | Background identity dependency: relationship keys and writes follow the current canonical username. The chosen relationship mode does not freeze this dependency. |

### Relationship queries — background

| Consumer | Data and reason |
| --- | --- |
| `components/community/user/FollowButton.vue` | Follow state should reflect successful follow/unfollow cache writes and refreshes. |
| `apps/xbuilder/pages/community/project.vue` | Like state should reflect successful like/unlike cache writes and refreshes. |
| `components/project/ProjectItem.vue` | Like state should reflect successful like/unlike cache writes and refreshes. |

`useFollow`/`useUnfollow` and `useLikeProject`/`useUnlikeProject` keep their optimistic cache writes. Profile/avatar/username mutation hooks keep invalidating the user-key prefix. None of these operations clears shared data to satisfy a blocking consumer.

No existing continuous business consumer requires blocking mode. There is no forced migration merely to demonstrate it. Tutorial v2-only course consumers and #3644 are deferred until this change is merged into dev.
