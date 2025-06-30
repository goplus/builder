# Tech design for In-editor Routing

## Route Structure

```
<editor>/stage
<editor>/stage/code
<editor>/stage/widgets
<editor>/stage/widgets/<widget_name>
<editor>/stage/backdrops
<editor>/stage/backdrops/<backdrop_name>

<editor>/sprites/<sprite_name>
<editor>/sprites/<sprite_name>/code
<editor>/sprites/<sprite_name>/costumes
<editor>/sprites/<sprite_name>/costumes/<costume_name>
<editor>/sprites/<sprite_name>/animations
<editor>/sprites/<sprite_name>/animations/<animation_name>

<editor>/sounds/<sound_name>
```

## State Management

We define the `EditorState` module to manage hoisted UI state for the editor. This "hoisted UI state" may includes:

* Current selection of sprites, backdrops, widgets, or sounds, which is reflected in both the URL and UI components
* Shared runtime state across editor components (`CodeEditor`, `EditorPreview`, `EditorPanel`, etc.)

### Why not use (Vue) Router directly as the (selection) state holder?

Routes are derived from URLs, which use resource names rather than IDs. When a resource is renamed, the URL should ideally update to reflect this change.

However, this is difficult to achieve using Router directly. Without additional state management, we cannot distinguish between a resource being renamed versus deleted, making it impossible to update the URL appropriately.

Therefore, we need a separate state layer that holds resource IDs as the source of truth. The URL and UI components are then derived from this authoritative state.

### What is the relationship between EditorState, Router and UI?

EditorState acts as the central state manager with bidirectional data flow to both the Router and UI components.

**EditorState ↔ Router:**

- **Router → EditorState**: On editor initialization, the current URL is parsed to establish the initial state
- **EditorState → Router**: State changes (sprite selection, resource renaming) trigger URL updates to maintain synchronization

**EditorState ↔ UI:**

- **UI → EditorState**: User interactions (clicks, selections) update the centralized state
- **EditorState → UI**: State changes propagate to UI components, ensuring consistent visual representation

This architecture ensures that URL, state, and UI remain synchronized while maintaining clear separation of concerns.

### What is the difference between EditorState and (model) Project?

`EditorState` manages the UI state and user interactions within the project editor, while `Project` represents the underlying data model of the project being edited.

These modules serve distinct purposes but may interact in certain scenarios. For instance, when a user selects a costume, `EditorState` updates to reflect this UI selection, while `Project` may simultaneously update to set that costume as the sprite's default.

The key distinction is that `EditorState` handles transient UI concerns (selections, view states), whereas `Project` manages persistent domain data (sprites, costumes, sounds).

### How is EditorState implemented?

`EditorState` serves as the centralized state manager that maintains current selections and other relevant UI state information for the entire editor. Its implementation is modularized across multiple components for better organization and maintainability.

The state logic for specific editor areas is implemented within their respective components. For instance, the `SpriteEditor` component contains both sprite-specific state management (`SpriteState`) and its corresponding UI logic. This co-location ensures tight coupling between related state and presentation concerns.

Each specialized module exports both its state class and UI component as a cohesive unit. The `EditorState` module then orchestrates these individual modules, assembling them into a unified instance that serves as the primary interface for other application components to interact with editor state.

### API Design

See [EditorState API](./module_EditorState.ts) for detailed API design.

### Sample Implementation & Usage

See [EditorState Implementation](./impl_EditorState.ts) for a sample implementation of the `EditorState` module.

See [SpriteEditor Implementation](./impl_SpriteEditor.ts) for a sample implementation for sub-state management within the `SpriteEditor` component, which includes both the `SpriteState` and its UI logic.

See [CodeEditor Implementation](./impl_CodeEditorUI.ts) and [SpritesPanel Implementation](./impl_SpritesPanel.ts) for a sample usage of `EditorState` within other parts of the editor.
