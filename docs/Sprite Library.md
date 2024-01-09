# Sprite Library

# Competitive Analysis

|                | Scratch                                                      | Code Monkey                                                  |
| -------------- | ------------------------------------------------------------ | ------------------------------------------------------------ |
| Sprite Library | Support for importing materials from the librarySupport for searching materialsSupport for local uploading of materials<br />🌟🌟Support for hovering over the clip to show multi-frame animation<br />🌟🌟Support for clicking on the SURPRISE button to randomize the clip. | Supports importing materials from the librarySupport for searching materials<br />🌟🌟Support for your own material library |

## **STEM** Functional Design

| Module                 | Function                                                     | Description                                                  |
| ---------------------- | ------------------------------------------------------------ | ------------------------------------------------------------ |
| Sprite Library(User)   | ✅ Add a Sprite file to your stage                            | You can select a Sprite file from the Sprite library, or you can import it locally, you can import jpg, png, gif |
|                        | ✅Delete the Sprite file                                      | ✅Delete directly <br/>⭕️ expires 30 days after being placed in the recycle bin |
|                        | ✅Find a Sprite file                                          | Support name search, fuzzy search, later can support multi-language |
|                        | ✅ Online preview of the Multi-Modeling Sprite file           | The hover state plays a multistyled Sprite animation (gif)   |
| Sprite Library(Market) | ⭕️ Publishing Sprite Files                                    | User can  publish their Sprite files to market               |
|                        | ⭕️ download Sprite file                                       | User can download Sprite from market to their own local area |
|                        | ✅Sprite Ranking                                              | Sort by heat, posting time, etc                              |
| Innovative             | ⭕️ Support user sprite cloud material library<br/>⭕️ Sprite Favorites<br/> ✅Support for clicking on the SURPRISE button to randomly generate material<br/>✅Support for hiding sprite layers | Users upload their own Sprites to add to their own cloud library for easy recall, and users uploading gifs are automatically split into multi-graphic materials<br/>Users create their own Sprite favorites- Randomly import a clip from the clip market to the stage- User can choose whether a layer is visible or not |

# Difficulty analysis

## How to realize sprite preview online

Application: Frame Animation with Multi-Shape Sprite Material

### Scratch practices

Switch image URL : a material corresponds to multiple shapes, each shape is saved with a svg, switch md5ext(.svg) to switch the image to realize the animation.

#### Scratch Example

```typescript
[
    {
        "name": "Abby",
        "tags": [
            "people",
            "person",
            "drawing"
        ],
        "isStage": false,
        "variables": {},
        "costumes": [
            {
                "assetId": "809d9b47347a6af2860e7a3a35bce057",
                "name": "abby-a",
                "bitmapResolution": 1,
                "md5ext": "809d9b47347a6af2860e7a3a35bce057.svg",
                "dataFormat": "svg",
                "rotationCenterX": 31,
                "rotationCenterY": 100
            }，
            ...
        ],
        "sounds": [
            {
                "assetId": "83a9787d4cb6f3b7632b4ddfebf74367",
                "name": "pop",
                "dataFormat": "wav",
                "format": "",
                "rate": 44100,
                "sampleCount": 1032,
                "md5ext": "83a9787d4cb6f3b7632b4ddfebf74367.wav"
            }
        ],
        "blocks": {}
    },
    ...
 ]
```

### Other possible approaches

#### generate gif animations

Automatically generate animations on multiple images in the cloud and save the animations to show the animations directly instead of cutting them one by one.

| Library/Tool | Processing Area | Processing Method  | Brief Description                                            |
| ------------ | --------------- | ------------------ | ------------------------------------------------------------ |
| GIF.js       | Client-Side     | JavaScript Library | Generates GIF animations directly in the browser using JavaScript. Suitable for small or client-heavy projects. |
| ImageMagick  | Server-Side     | Command-Line Tool  | Creating complex GIFs or other image formats on the server.  |

##### GIF.js example

```
import GIF from 'gif.js';

function createGif() {
    let gif = new GIF({
        workers: 2,
        quality: 10
    });

    // Let's say images are an array of images that you want to convert into GIFs
    images.forEach(image => {
        gif.addFrame(image, {delay: 200}); // 200ms delay per frame
    });

    gif.on('finished', function(blob) {
        window.open(URL.createObjectURL(blob));
    });

    gif.render();
}

```

#### generate real-time canvas animations

| Library/Tool | Processing Area | Processing Method  | Brief Description                                            |
| ------------ | --------------- | ------------------ | ------------------------------------------------------------ |
| konva.js     | Clisent-Side    | JavaScript Library | Uses the Canvas API to dynamically draw image frames to create animation effects, entirely running in the browser, suitable for real-time rendering animations. |

##### generate canvas by konva.js

Need Sprite Chart to render.

### Step-by-step Comparison

| Step | Scratch Step Description                                     | GIF.js                                                       | konva.js                                                     |
| ---- | ------------------------------------------------------------ | ------------------------------------------------------------ | ------------------------------------------------------------ |
| 1    | Contains the official default library's material array in the project json file. | Generate gif animations in the cloud and display them directly. | Create a canvas                                              |
| 2    | Retrieve json data from the sprite-library component; pass it to the LibraryComponent. | Randomize import positions using a random function in Scratch. | Create real-time canvas animations for sprite graphics with multi-frame compositions |
| 3    | LibraryComponent processes data; categorizes sprite materials by tags. | -                                                            |                                                              |
| 4    | Pass processed sprite materials to LibraryItem for rendering, includes multi/single frame modeling objects. | -                                                            |                                                              |
| 5    | Handle mouse hover over sprites in library-item for multi-frame materials; rotate icons and update URL in LibraryItemComponent. | -                                                            |                                                              |
| 6    | Render image in LibraryItemComponent.                        | -                                                            |                                                              |

## Official sprite material library construction

### Homemade sprite material

There are three sources of homemade official sprite stock footage: GIFs, videos, and existing sprites.

#### GiFs

| Implementation method | Tools/techniques | Advantages                                                   | Treatment area | Scene                                                 |
| --------------------- | ---------------- | ------------------------------------------------------------ | -------------- | ----------------------------------------------------- |
| Diffraction (physics) | FFmpeg           | Highly efficient with multimedia data handling<br/>Supports multiple video and image formats, including GIF<br/>Highly customizable with command line arguments | Server-side    | More power in video and audio processing              |
| Diffraction (physics) | ImageMagick      | Powerful in image editing and conversion<br/>Supports a wide range of image formats | Server-side    | Excellent performance in image editing and conversion |

Use FFmpeg

```
const { exec } = require('child_process');

const generateFramesFromGIF = (inputGifPath, outputFramePrefix) => {
    const command = `ffmpeg -i ${inputGifPath} ${outputFramePrefix}_%04d.png`;
    exec(command, (error, stdout, stderr) => {
        if (error) {
            console.error(`Error: ${error.message}`);
            return;
        }
        console.log('Frames generated successfully');
    });
};

generateFramesFromGIF('input.gif', 'output_frame');

```



#### Videos

Use FFmpeg

```
const { exec } = require('child_process');

const extractFramesFromVideo = (inputVideoPath, outputFramePrefix) => {
    const command = `ffmpeg -i ${inputVideoPath} -vf fps=1 ${outputFramePrefix}_%04d.png`;
    exec(command, (error, stdout, stderr) => {
        if (error) {
            console.error(`Error: ${error.message}`);
            return;
        }
        console.log('Frames extracted successfully');
    });
};

extractFramesFromVideo('input.mp4', 'output_frame');

```



#### Sprite Charts

Use PIL (Python)

```
from PIL import Image

def extract_sprites(sprite_sheet_path, sprite_size, output_prefix):
    sprite_sheet = Image.open(sprite_sheet_path)
    width, height = sprite_sheet.size

    for i in range(0, width, sprite_size[0]):
        for j in range(0, height, sprite_size[1]):
            box = (i, j, i + sprite_size[0], j + sprite_size[1])
            sprite = sprite_sheet.crop(box)
            sprite.save(f"{output_prefix}_{i}_{j}.png")

extract_sprites("sprite_sheet.png", (64, 64), "sprite")

```



### Ready-made sprite material library

Free:https://q18vvabpxaw.feishu.cn/docx/JtrzdSWkkoJOybxQQJhclfPVnqd#doxcnp2UZQgMJiiNSyaYdqifLKg

Paid:https://q18vvabpxaw.feishu.cn/docx/JtrzdSWkkoJOybxQQJhclfPVnqd#doxcnoysErlmqQ57fSxHGxzRo4g

 

## Recommended Solutions

- **How to realize sprite preview online:** Generate gif animations by gif.js. The uploaded multi-frame images are stored in the cache and backend, and the images are asynchronously processed into GIF animations and stored, improving the invocation efficiency and reducing the rendering overhead.
- **Official sprite material library construction:** Generate our official stock footage library from Gif and Video by FFmpeg, and from Sprite Chart by PIL(Python). The same library is used to reduce the development cost. Because it is an official material library production without offline problem, and we use server-side processing to reduce the overhead of the client.
