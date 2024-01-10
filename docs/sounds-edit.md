# Research on Sounds Edit

## Overview
Serving a STEM education platform, the core goal is to implement an online audio editor like Scratch, a personal audio library, and an audio market. It allows users to upload, edit, process, and save audio files, or publish them to the community. This module can be considered a comprehensive audio management component that integrates creation, learning, and community interaction, primarily serving spx animations by providing audio services.

## Audio Editor Research

| Name          | Introduction                                                                                   | Documentation                                            | Advantages                                                                                       | Disadvantages                                                                 | Additional Analysis                                                                                   |
|---------------|------------------------------------------------------------------------------------------------|----------------------------------------------------------|--------------------------------------------------------------------------------------------------|-------------------------------------------------------------------------------|-------------------------------------------------------------------------------------------------------|
| Web Audio API | Advanced audio control interface for web browsers.                                              | [MDN Docs](https://developer.mozilla.org/en-US/docs/Web/API/Web_Audio_API) | - Direct audio manipulation.<br>- Rich audio processing capabilities.                              | - Poor visualization support.<br>- Requires integration with other libraries.                          | Ideal for complex audio processing tasks, not suitable for simple audio tasks without additional tools. |
| Wavesurfer.js | Library for visualizing audio waveforms.                                                        | [Wavesurfer.js Basic](https://wavesurfer.xyz/examples/?basic.js) | - Detailed waveform display.<br>- Interactive UI.<br>- Supports basic audio editing operations.   | - Limited to visualization.<br>- Does not support direct audio modification.                           | Best for audio visualization and basic editing; requires supplementary tools for advanced editing.     |
| Tone.js       | Framework for audio synthesis and music creation.                                                | [Tone.js Docs](https://tonejs.github.io/docs/)           | - Advanced audio synthesis.<br>- Strong timing and looping.<br>- Variety of effects.               | - Requires combination with other libraries for complete functionality.                                 | Suitable for music production and creative audio projects, but not for simple audio editing tasks.      |
| Howler.js     | JavaScript library for audio playback control.                                                  | [Audio Player Demos](#)                                  | - Precise playback control.<br>- Supports 3D spatial effects.                                      | - Lacks audio editing and waveform display.<br>- Limited compared to Wavesurfer.js.                    | Good for straightforward audio playback, lacks capabilities for audio editing or advanced manipulation.|
| Recorder.js   | Library for recording audio and basic editing.                                                  |                                                          | - Easy to use for basic recording.<br>- Outputs in various formats.                                 | - Limited editing capabilities.<br>- Less suitable for complex editing tasks.                         | Ideal for simple recording tasks; not recommended for advanced editing or processing.                  |
| Audiomass     | Open-source web audio editor with intuitive interface and tools.                                | [Audiomass GitHub](https://github.com/pkalogiros/audiomass) | - Strong customization based on Wavesurfer.js.<br>- Professional and comprehensive demo.          | - Complex codebase.<br>- Limited potential for secondary creation.                                   | Comprehensive for audio editing and processing, but complexity may hinder adaptation for specific needs.|

### Wavesurfer.js
- **Live Demo**: [Wavesurfer.js Regions Example](https://wavesurfer.xyz/examples/?regions.js)
- **Documentation**: [Wavesurfer.js Basic Example](https://wavesurfer.xyz/examples/?basic.js)
- **Description**: A library for visualizing audio waveforms. Offers a rich API for playback, pause, loading, and editing of audio.
- **Features**:
  - Implements most of the visual functionalities required for audio editing: fast-forwarding, selecting, deleting, copying audio parts.
  - Requires an auxiliary library for modifying audio effects.
  - Supports audio waveform visualization but does not support modifying audio or exporting modified audio directly. May require manipulating the original `AudioBuffer` for such purposes.

### Tone.js
- **Live Demo**: [Tone.js Example](https://wavesurfer.xyz/examples/?regions.js)
- **Documentation**: [Tone.js Documentation](https://tonejs.github.io/)
- **Description**: A Web Audio framework for creating interactive music in the browser. The architecture is designed to be familiar to both musicians and audio programmers. Offers DAW-like features such as a global transport for synchronization and prebuilt synths and effects.
- **Features**:
  - `Tone.FMSynth`: Produces complex sound waveforms, often used for metallic sounds, bells, etc.
  - `Tone.AMSynth`: Modulates audio signals' amplitude to produce sound.
  - `Tone.NoiseSynth`: A synthesizer for generating noise, useful for percussion and sound effects.

  

### Sounds Edit Process Flow
1. **Backend Storage of Audio Files**: Audio file information is stored in the backend.
2. **Frontend Retrieval**: The frontend retrieves the audio file information from the backend.
3. **Audio Editing in Frontend**: Users modify the audio using an audio editor on the frontend.
4. **Save Action**:
  - The user clicks 'save' after editing the audio.
  - The modified audio data is prepared to be sent back to the backend.
5. **Backend Update**:
  - The edited audio is sent to the backend.
  - The backend processes and stores the updated audio information.



