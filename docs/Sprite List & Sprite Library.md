# Sprite List & Sprite Library

# **Competitive Analysis**

|                | Scratch                                                      | Code Monkey                                                  |
| -------------- | ------------------------------------------------------------ | ------------------------------------------------------------ |
| Sprite List    | Multiple layers can be superimposed, click on the layer to switch the Sprite file<br />🌟🌟Support choose whether the layer is displayed or not | Multiple layers can be superimposed, click on the layer to switch the Sprite file |
| Sprite Library | Support for importing materials from the librarySupport for searching materialsSupport for local uploading of materials<br />🌟🌟Support for hovering over the clip to show multi-frame animation<br />🌟🌟Support for clicking on the SURPRISE button to randomize the clip. | Supports importing materials from the librarySupport for searching materials<br />🌟🌟Support for your own material library |

## **STEM** Functional Design

| **模块**                       | **功能名称**                                                 | **功能描述**                                                 |
| ------------------------------ | ------------------------------------------------------------ | ------------------------------------------------------------ |
| **Sprite**** Library**(User)   | ✅ Add a Sprite file to your stage                            | You can select a Sprite file from the Sprite library, or you can import it locally, you can import jpg, png, gif |
|                                | ✅Delete the Sprite file                                      | ✅Delete directly, ⭕️ expires 30 days after being placed in the recycle bin |
|                                | ✅Find a Sprite file                                          | Support name search, fuzzy search, later can support multi-language |
|                                | ✅ Online preview of the Multi-Modeling Sprite file           | The hover state plays a multistyled Sprite animation (gif).  |
| **Sprite**** Library**(Market) | ⭕️ Publishing Sprite Files                                    | User can  publish their Sprite files to market               |
|                                | ⭕️ download Sprite file                                       | User can download Sprite from market to their own local area |
|                                | ✅Sprite Ranking                                              | Sort by heat, posting time, etc.                             |
| **Innovative**                 | - ⭕️ Support user sprite cloud material library- ⭕️ Sprite Favorites- ✅Support for clicking on the SURPRISE button to randomly generate material- ✅Support for hiding sprite layers | - Users upload their own Sprites to add to their own cloud library for easy recall, and users uploading gifs are automatically split into multi-graphic materials.- Users create their own Sprite favorites- Randomly import a clip from the clip market to the stage- User can choose whether a layer is visible or not |

# **Difficulty analysis**

## **Overall process understanding**

1. **User access to a game project**

   1. Get data **[**wasm**, **spx code, resource file, index.json**] **
      - No differences in versions: front-end reads from IndexedDB
      - Front-end version update: front-end reads from IndexedDB(asynchronously synchronizes resource files to back-end)
      - Backend version update: fetching data from the backend
   2. Rendering wasm
2. **User modification of the project**

   - Modify spx code
     - (save/autosave) pass **[**spx code**] **to backend (asynchronous synchronous IndexedDB)
   - Modify resource files (sprites/sounds/backgrounds)
     - (save/autosave) update **[**index.json**]**, pass **[**resource file, index.json**] **to backend (asynchronous synchronization IndexedDB)
3. **User clicks run**

   1. Pass [spx code, resource file, index.json**] **to backend (save asynchronously to IndexedDB)
   2. Receive compiled wasm from the backend
   3. Rendering wasm

## **How to realize **sprite preview online

Application: Frame Animation with Multi-Shape Sprite Material

### Scratch **practices**

Switch image URL : a material corresponds to multiple shapes, each shape is saved with a svg, switch md5ext(.svg) to switch the image to realize the animation.

### **Other possible approaches**

Automatically generate animations on multiple images in the cloud and save the animations to show the animations directly instead of cutting them one by one.

### Step-by-step Comparison

### Scratch Example

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

## How to deal with users uploading sprite files of different types

### Users upload a single image

Basic file uploading is sufficient.

### User upload gif

#### Front-end method

Use JavaScript to process GIFs and break them down into individual frames.

1. Parse GIF: Use a JavaScript library, such as `gif.js` or `libgif-js`, to parse the gif file and extract each frame.
2. Generate separate images: Convert each frame to a separate image file, such as PNG format.
3. Output: These images can be converted to Blob objects via Canvas and then downloaded using JavaScript or displayed in other forms.

#### Back-end method

Python and Pillow libraries

1. Parsing GIF: Use the Pillow library to read the GIF file and extract each frame.
2. Generate separate pictures: Save each frame as a separate image file.
3. Output: These images can be stored on the server for download or sent in binary format via the API.

#### S**ample code **

Assuming that each frame of the GIF is the same size

##### Front-end JavaScript example

```javascript
javascriptCopy code
function extractFramesFromGif(gifFile) {
// The front-end JavaScript shows parsing the GIF file using gif.js or other libraries 
// for example, extracting each frame and converting it into an image URL example
// ...
}

// Process uploaded GIF files var input = document.getElementById('gifInput');
input.addEventListener('change', function(event) {
  var file = event.target.files[0];
  extractFramesFromGif(file);
});
```

##### Backend Python Examples

```python
pythonCopy code
from PIL import Image, ImageSequence

def extract_frames_from_gif(gif_path):with Image.open(gif_path) as img:for i, frame in enumerate(ImageSequence.Iterator(img)):
            frame.save(f'frame_{i}.png')
extract_frames_from_gif('path_to_gif.gif')
```

### **User uploaded Sprite image**

In front-end technologies, working with Sprite charts usually involves the use of JavaScript and related web technologies.

#### **What users need to provide**

1. Sprite File: The user needs to upload a Sprite with all the frames.
2. Frame information: The user needs to provide the size (width and height) of each frame and the number of frames. If the size of each frame is different, you also need to provide the position information of each frame.

#### **Code Processing Flow**

1. Load Sprite Chart: First, the user uploaded Sprite Chart is loaded via HTML and JavaScript.
2. Parsing frame information: Use JavaScript to parse user-supplied frame information (e.g. frame size and number).
3. Cutting Frames: Utilizes the HTML5 Canvas API to draw each frame on the Canvas according to the frame information provided.
4. Animation: you can choose to generate GIF or use CSS and JavaScript to create animation.

#### **Whether manual data entry is required**

- Fixed frame size: If the size of each frame is fixed, the position of each frame can be calculated automatically by code.
- Irregular frame size: If the frame size or position is irregular, additional position information may be required from the user, or a more sophisticated image recognition algorithm may be used to automatically determine the position of the frame.

#### **Format of presentation**

1. Generate GIFs: Use JavaScript combined with Canvas to create GIFs that can then be displayed on a web page or allowed to be downloaded by the user.
2. CSS Animation: Display the animation effect of the Sprite image directly using CSS. Instead of generating a GIF, this method displays the animation by changing the background position of the Sprite image.
3. JavaScript animation: Use JavaScript to change the frames drawn on the Canvas to show animation effects.

#### S**ample code **

Here's a simple example showing how to process a Sprite image using Canvas and JavaScript:

Fixed-size frames and horizontally aligned Sprite diagrams are assumed.

```typescript
<!DOCTYPE html>
<html>
<body>

<canvas id="myCanvas" width="500" height="500"></canvas>

<script>
// Suppose each frame is 100x100 in width and height, and there are 10 frames in total
var frameWidth = 100;
var frameHeight = 100;
var frameCount = 10;

var spriteSheet = new Image();
spriteSheet.src = 'path_to_sprite_sheet.png'; // Sprite map path uploaded by the user
spriteSheet.onload = function() {
    var canvas = document.getElementById('myCanvas');
    var context = canvas.getContext('2d');

    for(var i = 0; i < frameCount; i++) {
        var x = i * frameWidth;
        context.drawImage(spriteSheet, x, 0, frameWidth, frameHeight, 0, 0, frameWidth, frameHeight);
        // You can add code here to make GIFs or animations
    }
};
</script>

</body>
</html>
```

### Summary

Front-end and back-end technical options for handling different types of image uploads (Sprite, GIF, single image), along with related processing steps and output formats.

Although we investigated a variety of uploading possibilities, we are currently focusing our efforts on realizing a single styling sprite upload.

## **Official sprite material library construction**

### **Homemade **sprite material

1. gifs
2. breakdown
3. scratch add modeling

### **Ready-made **sprite material library

Free:https://q18vvabpxaw.feishu.cn/docx/JtrzdSWkkoJOybxQQJhclfPVnqd#doxcnp2UZQgMJiiNSyaYdqifLKg

Paid:https://q18vvabpxaw.feishu.cn/docx/JtrzdSWkkoJOybxQQJhclfPVnqd#doxcnoysErlmqQ57fSxHGxzRo4g

 
