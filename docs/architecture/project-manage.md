# Project Manage Module

## Module Purpose

The main purpose of the Project Manage module is to organise project, i.e. project management.

Through project manage, the client can configure the project's sprites, sounds, backdrop, title, entry code, etc. without knowing the underlying file organisation of the project.

## Module Scope

Project manage module provides project-related instance and functions.

## Module Structure

class:

- `Project` - Project class, used to create project instance and organise project.

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

interface ProjectDetail {
    // Sprite list
    sprite: SpriteList
    // Sound list
    sound: SoundList
    // Backdrop
    backdrop: Backdrop
    // Entry code of the project
    entryCode: string
    // Documents not identified
    unidentifiedFile: RawDir
}

class Project implements ProjectSummary, ProjectDetail {
    constructor(id: string = "", source: ProjectSource = ProjectSource.local, title: string = "", version: number = 0, sprite: SpriteList = new SpriteList(), sound: SoundList = new SoundList(), backdrop: Backdrop = new Backdrop(), entryCode: string = "", unidentifiedFile: RawDir = {}) {
        this.id = id
        this.source = source
        this.title = title
        this.version = version
        this.sprite = sprite
        this.sound = sound
        this.backdrop = backdrop
        this.entryCode = entryCode
        this.unidentifiedFile = unidentifiedFile
    }
    // Save project to Cloud.
    save(): Promise<void>;
    // Load project.
    load(id: string, source: ProjectSource): Promise<void>;
    // Load project from zip file.
    loadFromZip(file: File, title?: string);
    // Download project to computer.
    download(): Promise<void>;
    // Get local and cloud projects.
    static getProjects(): Promise<ProjectSummary[]>
}
```

## User Stories

Users can access project-related information through project management. If you need to modify the contents of a project, you can do so directly, and all changes will be responsively updated to other uses of the project. Users can use the `getProjects` function to get a list of all cloud or local projects and then load this project via `load`. If the user needs to save the project to the cloud, just call the `save` function, and to save it locally call the `download` function.

## Example Usage

Here is the basic usage of Project Management.

```vue
<template>
    <input type="file" @change="loadFile" accept=".zip">
</template>

<script setup lang="ts">
import { Project } from "@/class/project";
    
const project = new Project();

const loadFile = async (e: any) => {
    await project.loadFromZip(e.target.files[0]);  // load project by zip file
}

const loadProject = async () => {
    const projects = await Project.getProjects();  // [ProjectSummary{}, ProjectSummary{}]
    await project.load(projects[0].id, projects[0].source);  // load the first project
}

const download = () => {
    project.download();  // save project to computer
}
</script>
```