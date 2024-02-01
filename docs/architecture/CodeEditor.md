# CodeEditor Module

## Module Purpose

The CodeEditor module is designed to Edit spx code.
These features include:Code hints, formatting, error hints，and  insert snippets。

## Module Scope
This module enters the code to be edited and the configuration of the editor. 
It will send the edited new code and let the user accept the new code. 
It exposes the code snippets that it supports by default and exposes a method that allows the user to insert the code snippet into the specified location in the editor. 
It exposes the method of formatting the code, allowing the user to trigger the format

### Inputs

| Parameter | Required | Type    | Description                                                  |
| --------- | -------- | ------- | ------------------------------------------------------------ |
| `modelValue`     | Yes      | `String`  | Code to be edited |
| `height`      | No      | `String` | Container height of code editor    |
| `width`      | No      | `String` | Container width of code editor    |
| `editorOptions` | No | `EditorOptions` | Some configuration of the editor, such as whether to display minimap, whether read-only, and the style of cursor |

### Outputs

#### Emits event
| Event Name | Event Data Type | Description |
| --------- | -------- | ------- | 
| `change` | `String` | The code change event|
| `updateValue`| `String` | same as change event，in order to cooperate with modelValue to form v-modal grammar sugar|

#### Expose function
|Function| Interface | Description |
| --------- | -------- | ------- | 
|`insertSnippet`|`{position?: monaco.Position;snippet: monaco.languages.CompletionItem}`|Inserts a code snippet into the editor, allowing you to specify a location|
|`format`||Notify the code editor component to format current code|

#### Expose Constant
|Name| Type | Description |
| --------- | -------- | ------- | 
|`onStartSnippet`,`stepSnippet`,`changeEffectSnippet`...|Snippet|Default spx snippet|
|`motion_fn_completions`,`event_fn_completions`,`control_fn_completions`,`sound_fn_completions`,`look_fn_completions`|Snippet[]|Code snippets of different categories|

## Example Usage
In the following example, we configure the `editor-options` to `{minimap: {enabled: false}, readOnly: false}`, the current configuration determines that minimap is not displayed and writable. 

Its `width` and `height` are configured as `500px`, which determines the size of the editor container.

Then dynamically bind different codes by `model-value`, and trigger the update code in the `update:model-value` event. In this example, after the event is triggered, we set the value of the currently edited code to achieve the code update. 
The above features also allow users to directly use `v-model` syntax candy to perform some simple tasks.

You can also import `onStartSnippet` from the Snippet exposed by the component. After obtaining the component instance, you can insert the code by calling the `insertSnippet` method exposed by the component and passing in a function returned as `onStartSnippet`.

In this example, we also trigger the `format` method exposed by the component by clicking the format button to format the code and trigger the code update.

```vue
<template>
    <div class="demo">
        <pre>{{ editorContent }}</pre>
        <div>
            <button @click="format">format</button>
            <button @click="insertSnippet">start snippet</button>
            <div v-for="(item, index) in codeArray" @click="codeIndex = index"> code: {{ index }} </div>
        </div>

        <CodeEditor width="500px" height="500px" ref="codeEditor"
            :editor-options="{ minimap: { enabled: false }, readOnly: false }" :model-value="editorContent"
            @update:model-value="onCodeChange" />
    </div>
</template>
<script setup lang="ts">
import CodeEditor, { onStartSnippet } from "../code-editor/CodeEditor"
import { ref, computed } from "vue"
let codeEditor = ref();
const editorContent = computed(() => {
    return codeArray.value[codeIndex.value].code;
})
const codeIndex = ref(0);
const codeArray = ref([{
    code: "onStart => { }",
}, {
    code: "onClone => { }",
}])

const insertSnippet = () => {
    codeEditor.value.insertSnippet(() => {
        return {
            snippet: onStartSnippet
        }
    });
}

const onCodeChange = (e: string) => {
    codeArray.value[codeIndex.value].code = e;
}
const format = () => {
    codeEditor.value.format();
}
```