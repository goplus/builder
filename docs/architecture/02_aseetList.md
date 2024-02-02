# Asset List Module

## Module Purpose

The Asset List module is responsible for managing the display of assets, including uploading new assets, deleting existing ones, and presenting a list of assets. It includes separate components for handling sprites (`SpriteList.vue`) and backdrops (`BackdropList.vue`).

## Module Scope

The module provides the ability to upload and delete assets, as well as to display a list of current assets. It takes specific information about sprites and backdrops as input and provides functions for deleting them as output.

## Module Structure

Components:

- `SpriteList.vue` - Manages the display and deletion of sprites.
- `BackdropList.vue` - Manages the display and deletion of backdrops.

## Module Interface

### Inputs

**BackdropList.vue**

| Parameter     | Required | Type     | Description                     |
| ------------- | -------- | -------- | ------------------------------- |
| backdropInfos | Yes      | Backdrop | Information about the backdrop. |

**SpriteList.vue**

| Parameter   | Required | Type     | Description                 |
| ----------- | -------- | -------- | --------------------------- |
| spriteInfos | Yes      | Sprite[] | List of sprite information. |

### Outputs

**BackdropList.vue**

- Function: `handleBackdropDelete(file: File)`
- Description: Deletes the provided file from the backdrop list.

**SpriteList.vue**

- Function: `handleSpriteDelete(spriteName: string)`
- Description: Deletes the sprite with the given name from the sprite list.

## User Stories

Users can interact with the asset list components to upload new assets, remove existing ones, and view the list of assets. When an asset is selected for deletion, the corresponding deletion function is triggered, which updates the state in the respective store.

## Example Usage

```TypeScript

```



## Example Usage

```
<template>
	<BackdropList :backdropInfos="backdropInfos" @delete-backdrop-to-store="handleBackdropDelete"/>
	<SpriteList :spriteInfos="spriteInfos" @delete-sprite-to-store="handleSpriteDelete"/>
</template>
<script>
import BackdropList from "@/components/spritelist/BackdropList.vue";
import SpriteList from "@/components/sprite-list/SpriteList.vue";
// BackdropList.vue
import { useBackdropStore } from "@/store/modules/backdrop";
const backdropStore = useBackdropStore();
const backdropInfos : ComputedRef<Backdrop> = computed(() => backdropStore.backdrop as Backdrop);
const handleBackdropDelete = (file: File) => {
    backdropStore.removeFile(file)
};
// SpriteList.vue
import { useSpriteStore } from "@/store/modules/sprite";
const spriteStore = useSpriteStore()
const spriteInfos : ComputedRef< Sprite[]> = computed(() => spriteStore.list  as Sprite[]);
const handleSpriteDelete = (spriteName: string) => {
    spriteStore.removeItemByName(spriteName)
};
</script>
```

In the given example, the `handleBackdropDelete` and `handleSpriteDelete` functions are defined within the Vue component's setup function and are used to update the store based on user interactions with the list of assets. This modular approach allows for the easy management of assets within the application.