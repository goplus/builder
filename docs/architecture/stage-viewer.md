# StageViewer Module

## Module Purpose

The StageViewer module is designed to show the sprite and stage status of  different spx project and operate the sprite.

Through the StageViewer module, users can configure the project's sprite, backdrop, stage size, zorder and soon, without caring about the actual rendering logic.

## Module Scope
This module passes the spx project, the width and height of the container,and the list of sprite names that currently need to be selected on the stage. 
When the user select new sprite, which sends the onSelectedSpritesChange event, allowing the user to get the selected sprite in the component.


## Module Interface

```ts
// Props of StageViewer
export interface StageViewerProps {
    // Instance of spx project
    project: Project
    // Container height of stage viewer
    height?: number
    // Container width of stage viewer
    width?: number
    // Sprites's name that selected on the stage
    selectedSpriteNames: string[]
}

//  The selected sprites name change event
export interface SelectedSpritesChangeEvent {
    // sprites name
    names: string[]
}

// Events of StageViewer
export interface StageViewerEmits {
    // selected sprites name change event
    (e: 'onSelectedSpritesChange', value: SelectedSpritesChangeEvent): void
}
```


## Base Usage
In the following example, we pass the project  into the stage viewer, and you can see that the sprite and backdrop in the project and the corresponding stage size are rendered in stage viewer. 
```vue
<template>
  <input type="file" accept=".zip" @change="importFile" />
  <StageViewer :selected-sprite-names="[]" :project="project as Project" />
</template>
<script setup lang="ts">
import { storeToRefs } from 'pinia'
import { useProjectStore } from '@/store/modules/project'
import type { Project } from '@/class/project'
import StageViewer from '@/components/stage-viewer';
const projectStore = useProjectStore()
const { project } = storeToRefs(projectStore)
const importFile = async (e: any) => {
  const file = e.target.files[0]
  projectStore.loadFromZip(file)
}
</script>
```