# Sounds Edit Module

## Module Purpose

The Sound Editing Module is designed to provide an interface through which users can edit sound files in their project. This includes operations such as play, pause, adjust playback speed, volume control, and audio region editing operations like cut, copy, paste, and delete.

## Module Scope

This module allows users to load an audio file and visually edit it on a waveform graph. Users can visually select audio regions on the waveform for different editing operations. Moreover, users can download or save the edited audio file.

## Module Structure

Components:

- `SoundsHome.vue` - Main page for audio editing
- `SoundsEdit.vue` - Main operational part of audio editing
- `SoundsEditCard.vue` - Renders audio cards
- `wavesurfer-edit.ts` - Waveform operations

## Module Interface

### Inputs

| Parameter | Required | Type    | Description        |
|-----------| -------- |---------|--------------------|
| SoundList | Yes      | Asset[] | Project Audio List |


### Outputs

## Example Usage

```
<template>
  <n-layout has-sider style="height: calc(100vh - 60px - 54px - 12px)">
    <n-layout-sider
      :native-scrollbar="false"
      content-style="paddingLeft: 130px;"
      style="width: 175px"
    >
      <SoundsEditCard
        v-for="asset in assets"
        :key="asset.id"
        :asset="asset"
        :style="{ 'margin-bottom': '26px' }"
        @click="handleSelect(asset)"
      />
    </n-layout-sider>
    <n-layout-content>
      <SoundsEdit
        :key="componentKey"
        :asset="selectedAsset"
        style="margin-left: 10px"
      />
    </n-layout-content>
  </n-layout>
</template>
```

