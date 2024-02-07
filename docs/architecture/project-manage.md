# Project Manage Module

## Module Purpose

The main purpose of the Project Manage module is to organise project, i.e. project management.

Through project manage, the client can configure the project's sprites, sounds, backdrop, title, entry code, etc. without knowing the underlying file organisation of the project.

## Module Scope

Project manage module provides project-related instance and functions.

## Module Structure

class:

- `Project` - Project class, used to create project instance and organise project.

store:

- `ProjectStore` - Project management, for sharing project status and providing functions.

## Module Interface

Project Management.

```ts
enum ProjectSource {
    local,
    cloud
}

interface ProjectSummary {
    // Temporary id when not uploaded to cloud, replace with real id after uploaded
    id: string
    // Project title
    title: string
    // version number
    version: number
    // Project source
    source: ProjectSource
}

interface ProjectData {
    // Sprite list
    sprite: SpriteList
    // Sound list
    sound: SoundList
    // Backdrop
    backdrop: Backdrop
    // Entry code of the project
    entryCode: string
    // Documents not identified
    unidentifiedFile: rawDir
}

class Project implements ProjectSummary, ProjectData {
    // Save project to Cloud.
    save(): Promise<void>;
    // Download project to computer.
    download(): Promise<void>;
}

type ProjectStoreExports = {
    // Instance of project.
    project: Project
    // Get local and cloud projects.
    getProjects(): Promise<ProjectSummary[]>
    // Load the item with the id.
    load(id: string, source: ProjectSource = ProjectSource.local): Promise<void>;
    // Load zip file.
    loadFromZip(file: File): Promise<void>;
}

function useProjectStore(): ProjectStoreExports;
```

## User Stories

Users can access project-related information through project management. If you need to modify the contents of a project, you can do so directly, and all changes will be responsively updated to other uses of the project. Users can use the `getProjects` function to get a list of all cloud or local projects and then load this project via `loadProject`. If the user already has a project zip locally, it can load this zip into the project using `loadFromZip`. If the user needs to save the project to the cloud, just call the `save` function, and to save it locally call the `download` function.

## Example Usage

Here is the basic usage of Project Management.

```vue
<template>
    <input type="file" @change="loadFile" accept=".zip">
</template>

<script setup lang="ts">
import { useProjectStore } from "@/store/modules/project";
    
const projectStore = useProjectStore();

const loadFile = async (e: any) => {
    await projectStore.loadFromZip(e.target.files[0]);  // load project by zip file
}

const loadProjects = async () => {
    const projects = await projectStore.getProjects();  // [ProjectSummary{}, ProjectSummary{}]
    const id = projects[0].id;
    const source = projects[0].source;
    await projectStore.load(id, source);  // load the first project
}

const download = () => {
    projectStore.project.value.download();  // save project to computer
}
</script>
```
