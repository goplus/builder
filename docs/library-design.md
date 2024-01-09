# Sprite Library

# Competitive Analysis

|                | Scratch                                                      | Code Monkey                                                  |
| -------------- | ------------------------------------------------------------ | ------------------------------------------------------------ |
| Sprite Library | Support for importing materials from the librarySupport for searching materialsSupport for local uploading of materials<br />🌟🌟Support for hovering over the clip to show multi-frame animation<br />🌟🌟Support for clicking on the SURPRISE button to randomize the clip. | Supports importing materials from the librarySupport for searching materials<br />🌟🌟Support for your own material library |

## STEM Functional Design

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

#### Scratch Sprite Json Example

```json
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

#### option 1: generate gif animations

Automatically generate animations on multiple images in the cloud and save the animations to show the animations directly instead of cutting them one by one.

| Library/Tool | Processing Area | Processing Method  | Brief Description                                            |
| ------------ | --------------- | ------------------ | ------------------------------------------------------------ |
| GIF.js       | Client-Side     | JavaScript Library | Generates GIF animations directly in the browser using JavaScript. Suitable for small or client-heavy projects. |
| ImageMagick  | Server-Side     | Command-Line Tool  | Creating complex GIFs or other image formats on the server.  |
| Qiniu Dora   | Server-Side     | API                | Currently only available for images stored in Qiniu Limitations of the original image: Supported formats are JPEG and PNG The maximum number of frames supported is 20 The maximum supported image size is 1080*1080 |

##### GIF.js example

```js
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

##### Qiniu Dora Animate API

https://developer.qiniu.com/dora/5448/animate

API

```
animate/duration/<duration>
       /merge/key/<encodedImageKey>
             /key/<encodedImageKey>
             ...
       /effect/<effectType>
```

Params

| Name              | Required | Description                                                  |
| ----------------- | -------- | ------------------------------------------------------------ |
| <duration>        | Y        | The interval between each frame of a GIF (unit: 0.01s) must be an integer greater than 0. |
| <encodedImageKey> | N        | The source image key (Base64 encoded) of the synthetic GIF ensures that all the source images come from the same bucket. |
| <effectType>      | N        | Define the playback order, with values of 0 and 1. (0: Loop playback in positive order; 1: Reverse loop playback; The default is 0. |

#### option 2: generate real-time canvas animations

| Library/Tool | Processing Area | Processing Method  | Brief Description                                            |
| ------------ | --------------- | ------------------ | ------------------------------------------------------------ |
| konva.js     | Clisent-Side    | JavaScript Library | Uses the Canvas API to dynamically draw image frames to create animation effects, entirely running in the browser, suitable for real-time rendering animations. |

##### generate canvas by konva.js

Need Sprite Chart to render.

### Step-by-step Comparison

| Step | Scratch                                                      | Gif(gif.js/dora)                                             | Canvas(konva.js)                                             |
| ---- | ------------------------------------------------------------ | ------------------------------------------------------------ | ------------------------------------------------------------ |
| 1    | Contains the official default library's material array in the project json file. | Generate gif animations in the cloud and display them directly. | Create a canvas                                              |
| 2    | Retrieve json data from the sprite-library component; pass it to the LibraryComponent. | Randomize import positions using a random function in Scratch. | Create real-time canvas animations for sprite graphics with multi-frame compositions |
| 3    | LibraryComponent processes data; categorizes sprite materials by tags. | -                                                            |                                                              |
| 4    | Pass processed sprite materials to LibraryItem for rendering, includes multi/single frame modeling objects. | -                                                            |                                                              |
| 5    | Handle mouse hover over sprites in library-item for multi-frame materials; rotate icons and update URL in LibraryItemComponent. | -                                                            |                                                              |
| 6    | Render image in LibraryItemComponent.                        | -                                                            |                                                              |

## How to construct official sprite library

### Homemade sprite material

There are three sources of homemade official sprite stock footage: GIFs, videos, and existing sprites.

#### GiFs

| Implementation method | Tools/techniques | Advantages                                                   | Treatment area | Scene                                                 |
| --------------------- | ---------------- | ------------------------------------------------------------ | -------------- | ----------------------------------------------------- |
| Diffraction (physics) | FFmpeg           | Highly efficient with multimedia data handling<br/>Supports multiple video and image formats, including GIF<br/>Highly customizable with command line arguments | Server-side    | More power in video and audio processing              |
| Diffraction (physics) | ImageMagick      | Powerful in image editing and conversion<br/>Supports a wide range of image formats | Server-side    | Excellent performance in image editing and conversion |

Use FFmpeg

```js
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

```js
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

```python
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

Free: https://www.aigei.com/game2d/character/dynamic_1

Paid: https://craftpix.net/categorys/sprites/



## How to save the library

### Qiniu Kodo

> Kodo is a self-developed unstructured data storage management platform that supports both central and edge storage

https://developer.qiniu.com/kodo/1234/upload-types

#### Methods

| Method         | Description                                                  | Advantage                                                    | Disadvantage                                                 |
| -------------- | ------------------------------------------------------------ | ------------------------------------------------------------ | ------------------------------------------------------------ |
| Form upload    | Complete the upload of a file in a single HTTP POST request  | Ideal for simple application scenarios and small file sizes  | If the file size is large (larger than 1GB) or the network environment is poor, the HTTP connection may time out and the upload may fail. |
| Chunked Upload | A Chunked Upload divides a file into multiple small chunks, each of which is uploaded separately in a separate HTTP request. | It is suitable for large file transfers, and uses sharding to avoid connection timeouts caused by the large amount of single HTTP data.Resumable upload is supported. | require multiple HTTP requests to complete the upload process, which will incur additional costsIncreased code complexity |

#### Form Upload Example

```html
<form method="post" action="http://upload.qiniup.com/"
 enctype="multipart/form-data">
  <input name="key" type="hidden" value="<resource_key>">
  <input name="x:<custom_name>" type="hidden" value="<custom_value>">
  <input name="token" type="hidden" value="<upload_token>">
  <input name="crc32" type="hidden" />
  <input name="accept" type="hidden" />
  <input name="file" type="file" />
  <input type="submit" value="上传文件" />
</form>
```


## Recommended Solutions

- **How to realize sprite preview online:** Generate gif animations by Qiniu Dora animate API. 
- **Official sprite material library construction:** Generate our official stock footage library from Gif and Video by FFmpeg, and from Sprite Chart by PIL(Python). The same library is used to reduce the development cost. Because it is an official material library production without offline problem, and we use server-side processing to reduce the overhead of the client.
- **How to save the library:** Use form-upload method to store library in Qiniu's kodo.