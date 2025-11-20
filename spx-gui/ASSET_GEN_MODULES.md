## AssetGenerator

### GeneratorApis

Include

```ts
enrichSettings(initialSettings: Partial<Settings>, assetType: AssetType): Promise<Settings>
generateAnimationDescriptions(settings: SpriteSettings): Promise<string[]>
generateCostumeImage(settings: CostumeSettings): Promise<string> // return image URL
generateAnimationFrames(settings: AnimationSettings): Promise<{startFrameUrl: string, endFrameUrl: string}>
generateAnimationVideo(settings: AnimationSettings, startFrameUrl: string, endFrameUrl: string): Promise<string> // return video URL
getFramesFromVideo(videoUrl: string, interval: number): Promise<string[]> // return frame URLs
generateBackdropImage(settings: BackdropSettings): Promise<string> // return image URL
generateSoundAudio(settings: SoundSettings): Promise<string> // return audio URL
```

### SettingsInput

Display the currently using settings and allow to modify them.

### SpriteGenerator

1. Accept initial settings from props and enrich them.
2. Display the enriched settings and allow the user to modify them.
3. Generate the default costume with CostumeGenerator based on the settings.
4. Generate a list of animation descriptions for the sprite based on the settings.
5. Display the generated animation descriptions and allow the user to modify them.
6. For each animation description, generate the animation with AnimationGenerator.
7. Create the sprite with the generated costume and animations and return it.

### CostumeGenerator

1. Accept initial settings from props and enrich them.
2. Display the enriched settings and allow the user to modify them.
3. Generate the image based on the settings.
4. Display the generated image and allow the user to regenerate it if needed.
5. Create the costume with the generated image and return it.

### AnimationGenerator

1. Accept initial settings from props and enrich them.
2. Display the enriched settings and allow the user to modify them.
3. Generate the start and end frames based on the settings.
4. Display the generated frames and allow the user to regenerate them if needed.
5. Generate the video based on the settings and the selected frames.
6. Display the generated video and allow the user to trim it if needed.
7. Create the animation with the generated video and return it.

### BackdropGenerator

1. Accept initial settings from props and enrich them.
2. Display the enriched settings and allow the user to modify them.
3. Generate the image based on the settings.
4. Display the generated image and allow the user to regenerate it if needed.
5. Create the backdrop with the generated image and return it.

### SoundGenerator

1. Accept initial settings from props and enrich them.
2. Display the enriched settings and allow the user to modify them.
3. Generate the audio based on the settings.
4. Display the generated audio and allow the user to trim or regenerate it if needed.
5. Create the sound with the generated audio and return it.

## Sprite Costumes

Add entry for CostumeGenerator in "add new costume" options.

## Sprite Animations

Add entry for AnimationGenerator in "add new animation" options.

## AssetLibraryModal

Add entry for one of SpriteGenerator, BackdropGenerator and SoundGenerator (depends on the current asset type) when there's no searching results.
