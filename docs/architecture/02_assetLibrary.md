# Asset Library Module

## Module Purpose

The Asset Library module is designed to showcase and manage assets such as sprites, backdrops, and sounds. It allows users to add new assets to their project's asset list.

## Module Scope

The module inputs the type of assets to be displayed and a boolean indicating if the asset library should be shown. It outputs selected asset details through an emitted function for addition into the asset store.

## Module Structure

Components:

- `LibraryModal.vue` - Manages the display and addition of assets.

## Module Interface

### Inputs

| Parameter | Required | Type    | Description                                                  |
| --------- | -------- | ------- | ------------------------------------------------------------ |
| type      | Yes      | String  | The type of assets to display: 'sprite', 'backdrop', 'sound'. |
| show      | Yes      | Boolean | Whether the asset library is visible to the user.            |

### Outputs

Emits a function `handleAssetAddition(name: string, file: File[])` with the asset's name and file content as parameters.

## User Stories

When a user interacts with the Asset Library, they can add selected assets to their respective store lists. 

## Example Usage

```
vueCopy code
<template>
    <LibraryModal
        v-model:show="showModal"
        :type="sprite"
        @add-asset-to-store="handleAssetAddition"
     />
</template>

<script>
import LibraryModal from "@/components/spx-library/LibraryModal.vue";
import { useSpriteStore } from "@/store/modules/sprite";
import Sprite from "@/class/sprite";

const spriteStore = useSpriteStore();
const backdropStore = useBackdropStore();

const handleAssetAddition = async (name: string, address: string) => {
  if (props.type === 'sprite') {
    const file = await urlToFile(address, name);
    const sprite = new Sprite(name, [file]);
    spriteStore.addItem(sprite);
    message.success(`add ${name} successfully!`)
  } else if (props.type === 'backdrop') {
    const file = await urlToFile(address, name);
    backdropStore.backdrop.addFile(file);
    message.success(`add ${name} successfully!`)
  }
};
</script>
```

In the above example, the `handleAssetAddition` function determines the type of asset and updates the respective store accordingly. This modular approach decouples the asset selection logic from the store update logic, providing clear separation of concerns.