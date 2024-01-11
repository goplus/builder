# FileManager

## Competitive Analysis

|                       | File System API                                              | JavaScript Tree                                              |
| :-------------------- | :----------------------------------------------------------- | ------------------------------------------------------------ |
| **Local Disk Access** | Provides a standard API for interacting with the local file system, supporting reading and writing local files and directories, as well as accessing the disk, but requires user authorization. | Requires uploading directories through file compression, unable to read and write to the disk in real-time, and necessitates abstracting the directory structure. |
| **Performance**       | High                                                         | Depends on the implementation                                |
| **Compatibility**     | Good                                                         | Depends on the browser environment, may vary significantly across different browsers |
| **Security**          | File system operations are subject to browser permission controls and provide built-in security measures. | Has good security in the browser environment; manual implementation of security may require additional work. |
| **Flexibility**       | Can flexibly operate on files in the browser environment, avoiding direct handling of underlying operating system differences. | Has high customization capabilities, but may vary in different environments. |
| **docs**              | [File System API - Web APIs](https://developer.mozilla.org/en-US/docs/Web/API/File_System_API) | -                                                            |

## Final Selection: Using JavaScript Tree with State Management Tools

Considering specific use cases, we do not advise using the local file read/write disk method. Therefore, we choose to manage files using an abstract JavaScript tree. To better manage this file structure and allow everyone to access corresponding functions, we use state management tools corresponding to mainstream frameworks, such as Vue’s `pinia` or React’s `Redux`.

Below is a type restriction for file management. In this structure, `name` will serve as the file name, `code` will generate a corresponding code file with the `.spx` extension, `file` will save related files (such as audio or images), and `config` represents the configuration file for that item, generating the corresponding `index.json` file.

```typescript
// types/FileType.ts

export type SpriteType = {
    name: string
    code?: string
    file?: FileType[]
    config: {
        [key: string]: any
    }
}

export type SoundType = {
    name: string
    file?: FileType[]
    config: {
        path: string
        rate?: number
        [key: string]: any
    }
}

export type BackdropType = {
    file?: FileType[]
    [key: string]: any
}


export type ProjectType = {
    title: string
    sprites: SpriteType[]
    sounds?: SoundType[]
    backdrop: BackdropType
}

export type FileType = {
    name: string
    value: Blob | string
    type: string
}
```

Finally, we unify them in the repository to form a JavaScript tree for the spx project.

```ts
// stores/FileManager.ts

export const useFileManagerStore = defineStore('FileManager', () => {
    const spriteStore = useSpriteStore()
    const { sprites } = storeToRefs(spriteStore)

    const soundStore = useSoundStore()
    const { sounds } = storeToRefs(soundStore)

    const backdropStore = useBackdropStore()
    const { backdrop } = storeToRefs(backdropStore)

    const title = ref('')

    const project = computed(() => ({
        title: title.value,
        sprites: sprites.value,
        sounds: sounds.value,
        backdrop: backdrop.value
    }))
    
    return {
        project: readonly(project)
    }
})
```

