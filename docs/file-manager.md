# FileManager

|                       | File System API                                              | JavaScript Tree                                              |
| :-------------------- | :----------------------------------------------------------- | ------------------------------------------------------------ |
| **Local Disk Access** | Provides a standard API for interacting with the local file system, supporting reading and writing local files and directories, as well as accessing the disk, but requires user authorization. | Requires uploading directories through file compression, unable to read and write to the disk in real-time, and necessitates abstracting the directory structure. |
| **Performance**       | High                                                         | Depends on the implementation                                |
| **Compatibility**     | Good                                                         | Depends on the browser environment, may vary significantly across different browsers |
| **Security**          | File system operations are subject to browser permission controls and provide built-in security measures. | Has good security in the browser environment; manual implementation of security may require additional work. |
| **Flexibility**       | Can flexibly operate on files in the browser environment, avoiding direct handling of underlying operating system differences. | Has high customization capabilities, but may vary in different environments. |
| **docs**              | [File System API - Web APIs](https://developer.mozilla.org/en-US/docs/Web/API/File_System_API) | -                                                            |

Considering specific use cases, using the local file read/write disk method is not advisable. Therefore, we choose to manage files using an abstract JavaScript tree. We will save this directory structure and pass it to the backend in JSON format.

In this structure, the `filename` will serve as the file name, `code` will generate a corresponding code file with the `.spx` extension for the sprite, and `config` represents the configuration file for that item, generating the corresponding `index.json` file.

Below is a possible demo. 

```js
const sprites = [
    {
        filename: "Monkey",
        code: `onStart => {\n\tsay "hello monkey"\n}`,
        config: {
            x: 10,
            y: 20
        }
    },
    {
        filename: "Banana",
        code: `onStart => {\n\tsay "hello banana"\n}`,
        config: {
            x: 10,
            y: 20
        }
    }
]

const sounds = [
    {
        filename: "audioName",
        config: {
            path: "xx.wav",
            rate: 11025,
            sampleCount: 2912
        }
    }
]

const backdrop = {
    scenes: [
        {
            "name": "backdropName",
            "path": "xx.png"
        }
    ],
    zorder: [
        "Monkey",
        "Banana"
    ]
}

const project = {
    sprites,
    sounds,
    backdrop
}
```

