# Editor Component Refactor Follow-up

This draft PR tracks the follow-up from PR #3166 review feedback:

> Nit: consider splitting `ui/prototype/src/pages/editor/index.vue` into smaller components, similar to the real frontend.

Initial target: refactor without visual or behavior changes.

Suggested split order:

1. Extract editor navbar and project/profile menus.
2. Extract preview panel and quick config controls.
3. Extract sprites/stage asset panel.
4. Extract map editor side config and sprite list.
5. Extract publish and sprite generator modals.

Keep `index.vue` responsible for page-level state wiring until smaller state boundaries are clear.
