# Asset List Module

## Module Purpose

The Asset List module is responsible for managing the display of assets, including uploading new assets, deleting existing ones, and presenting a list of assets. It includes separate components for handling sprites (`SpriteList.vue`) and backdrops (`BackdropList.vue`).

## Module Scope

The module provides the ability to upload and delete assets, as well as to display a list of current assets. It takes specific information about sprites and backdrops as input and provides functions for deleting them as output.

## Module Structure

Components:

- `BackdropList.vue` - Manages the display and deletion of backdrop.
- `SpriteList.vue` - Manages the display and deletion of sprite.

## Module Interface

### Inputs

None.

### Outputs

None.

## User Stories

Users can interact with the asset list components to upload new assets, remove existing ones, and view the list of assets. When an asset is selected for deletion, the corresponding deletion function is triggered, which updates the state in the respective store.

## Example Usage

```vue
<template>
	<BackdropList/>
	<SpriteList/>
</template>
```