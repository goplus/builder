import { monaco } from "./index";
import type { Snippet } from "./index"
// motion snippet
export const stepSnippet: Snippet = {
    label: "step",
    insertText: "step ${1:}",
    insertTextRules:
        monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
    kind: monaco.languages.CompletionItemKind.Function,
    range: new monaco.Range(1, 1, 1, 1),
}
export const moveSnippet: Snippet = {
    label: "move",
    insertText: "move ${1:}",
    insertTextRules:
        monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
    kind: monaco.languages.CompletionItemKind.Function,
    range: new monaco.Range(1, 1, 1, 1),
}
export const turnSnippet: Snippet = {
    label: "turn",
    insertText: "turn ${1:}",
    insertTextRules:
        monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
    kind: monaco.languages.CompletionItemKind.Function,
    range: new monaco.Range(1, 1, 1, 1),
}
export const changeHeadingSnippet: Snippet = {
    label: "changeHeading",
    insertText: "changeHeading ${1:}",
    insertTextRules:
        monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
    kind: monaco.languages.CompletionItemKind.Function,
    range: new monaco.Range(1, 1, 1, 1),
}
export const gotoSnippet: Snippet = {

    label: "goto",
    insertText: "goto ${1:}",
    insertTextRules:
        monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
    kind: monaco.languages.CompletionItemKind.Function,
    range: new monaco.Range(1, 1, 1, 1),
}
export const setXYposSnippet: Snippet = {
    label: "setXYpos",
    insertText: "setXYpos ${1:X}, ${2:Y}",
    insertTextRules:
        monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
    kind: monaco.languages.CompletionItemKind.Function,
    range: new monaco.Range(1, 1, 1, 1),
}
export const glideSnippet: Snippet = {
    label: "glide",
    insertText: "glide ${1:X} ${2:Y} ${3:N}",
    insertTextRules:
        monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
    kind: monaco.languages.CompletionItemKind.Function,
    range: new monaco.Range(1, 1, 1, 1),
}
export const turnToSnippet: Snippet = {
    label: "turnTo",
    insertText: "turnTo ${1:}",
    insertTextRules:
        monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
    kind: monaco.languages.CompletionItemKind.Function,
    range: new monaco.Range(1, 1, 1, 1),
}
export const setHeadingSnippet: Snippet = {

    label: "setHeading",
    insertText: "setHeading ${1:}",
    insertTextRules:
        monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
    kind: monaco.languages.CompletionItemKind.Function,
    range: new monaco.Range(1, 1, 1, 1),
}
export const setRotationStyleSnippet: Snippet = {

    label: "setRotationStyle",
    insertText: "setRotationStyle",
    insertTextRules:
        monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
    kind: monaco.languages.CompletionItemKind.Function,
    range: new monaco.Range(1, 1, 1, 1),
}
export const changeXposSnippet: Snippet = {
    label: "changeXpos",
    insertText: "changeXpos ${1:}",
    insertTextRules:
        monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
    kind: monaco.languages.CompletionItemKind.Function,
    range: new monaco.Range(1, 1, 1, 1),
}
export const setXposSnippet: Snippet = {
    label: "setXpos",
    insertText: "setXpos ${1:}",
    insertTextRules:
        monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
    kind: monaco.languages.CompletionItemKind.Function,
    range: new monaco.Range(1, 1, 1, 1),
}

export const changeYposSnippet: Snippet = {
    label: "changeYpos",
    insertText: "changeYpos ${1:}",
    insertTextRules:
        monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
    kind: monaco.languages.CompletionItemKind.Function,
    range: new monaco.Range(1, 1, 1, 1),
}
export const setYposSnippet: Snippet = {
    label: "setYpos",
    insertText: "setYpos ${1:}",
    insertTextRules:
        monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
    kind: monaco.languages.CompletionItemKind.Function,
    range: new monaco.Range(1, 1, 1, 1),
}
export const changeXYposSnippet: Snippet = {

    label: "changeXYpos",
    insertText: "changeXYpos ${1:X}, ${2:Y}",
    insertTextRules:
        monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
    kind: monaco.languages.CompletionItemKind.Function,
    range: new monaco.Range(1, 1, 1, 1),
}

export const bounceOffEdgeSnippet: Snippet = {
    label: "bounceOffEdge",
    insertText: "bounceOffEdge ${1:}",
    insertTextRules:
        monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
    kind: monaco.languages.CompletionItemKind.Function,
    range: new monaco.Range(1, 1, 1, 1),
}


// look snippet

export const saySnippet: Snippet = {
    label: "say",
    insertText: "say ${1:}",
    insertTextRules:
        monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
    kind: monaco.languages.CompletionItemKind.Function,
    range: new monaco.Range(1, 1, 1, 1),
    detail: "This is a say function",
}

export const thinkSnippet: Snippet = {
    label: "think",
    insertText: "think ${1:}",
    insertTextRules:
        monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
    kind: monaco.languages.CompletionItemKind.Function,
    range: new monaco.Range(1, 1, 1, 1),
    detail: "This is a think function",
}
export const setCostumeSnippet: Snippet = {
    label: "setCostume",
    insertText: "setCostume ${1:costumeName}",
    insertTextRules:
        monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
    kind: monaco.languages.CompletionItemKind.Function,
    range: new monaco.Range(1, 1, 1, 1),
    detail: "This is a setCostume function",
}
export const nextCostumeSnippet: Snippet = {
    label: "nextCostume",
    insertText: "nextCostume",
    kind: monaco.languages.CompletionItemKind.Function,
    range: new monaco.Range(1, 1, 1, 1),
    detail: "This is a nextCostume function",
}
export const prevCostumeSnippet: Snippet = {
    label: "prevCostume",
    insertText: "prevCostume",
    kind: monaco.languages.CompletionItemKind.Function,
    range: new monaco.Range(1, 1, 1, 1),
    detail: "This is a prevCostume function",
}
export const animateSnippet: Snippet = {
    label: "animate",
    insertText: "animate ${1:name}",
    insertTextRules:
        monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
    kind: monaco.languages.CompletionItemKind.Function,
    range: new monaco.Range(1, 1, 1, 1),
    detail: "This is a animate function",
}

export const startSceneSnippet: Snippet = {
    label: "startScene ",
    insertText: "startScene ${1:costumeName}, ${2:wait}",
    insertTextRules:
        monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
    kind: monaco.languages.CompletionItemKind.Function,
    range: new monaco.Range(1, 1, 1, 1),
    detail: "This is a startScene function",
}
export const nextSceneSnippet: Snippet = {
    label: "nextScene",
    insertText: "nextScene ${1:condition}",
    kind: monaco.languages.CompletionItemKind.Function,
    range: new monaco.Range(1, 1, 1, 1),
    detail: "This is a nextScene function",
}
export const CameraSnippet: Snippet = {
    label: "Camera",
    insertText: "Camera",
    kind: monaco.languages.CompletionItemKind.Function,
    range: new monaco.Range(1, 1, 1, 1),
    detail: "This is a Camera function",
}
export const changeSizeSnippet: Snippet = {
    label: "changeSize",
    insertText: "changeSize ${1:N}",
    insertTextRules:
        monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
    kind: monaco.languages.CompletionItemKind.Function,
    range: new monaco.Range(1, 1, 1, 1),
    detail: "This is a changeSize function",
}
export const setSizeSnippet: Snippet = {
    label: "setSize",
    insertText: "setSize ${1:G}, ${2:N}",
    insertTextRules:
        monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
    kind: monaco.languages.CompletionItemKind.Function,
    range: new monaco.Range(1, 1, 1, 1),
    detail: "This is a setSize function",
}
export const clearGraphEffectsSnippet: Snippet = {
    label: "clearGraphEffects",
    insertText: "clearGraphEffects",
    kind: monaco.languages.CompletionItemKind.Function,
    range: new monaco.Range(1, 1, 1, 1),
    detail: "This is clearGraphEffects function",
}
export const showSnippet: Snippet = {
    label: "show",
    insertText: "show",
    kind: monaco.languages.CompletionItemKind.Function,
    range: new monaco.Range(1, 1, 1, 1),
    detail: "This is show function",
}
export const hideSnippet: Snippet = {
    label: "hide",
    insertText: "hide",
    kind: monaco.languages.CompletionItemKind.Function,
    range: new monaco.Range(1, 1, 1, 1),
    detail: "This is hide function",
}
export const gotoFrontSnippet: Snippet = {
    label: "gotoFront",
    insertText: "gotoFront",
    kind: monaco.languages.CompletionItemKind.Function,
    range: new monaco.Range(1, 1, 1, 1),
    detail: "This is gotoFront function",
}

export const gotoBackSnippet: Snippet = {
    label: "gotoBack",
    insertText: "gotoBack",
    kind: monaco.languages.CompletionItemKind.Function,
    range: new monaco.Range(1, 1, 1, 1),
    detail: "This is gotoBack function",
}
export const goBackLayersSnippet: Snippet = {
    label: "goBackLayers",
    insertText: "goBackLayers ${1:N}",
    insertTextRules:
        monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
    kind: monaco.languages.CompletionItemKind.Event,
    range: new monaco.Range(1, 1, 1, 1),
    detail: "This is goBackLayers function",
}

// sound snippet 


export const playSnippet: Snippet = {
    label: "play",
    insertText: "play ${1:S}, ${2:condition}",
    insertTextRules:
        monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
    kind: monaco.languages.CompletionItemKind.Function,
    range: new monaco.Range(1, 1, 1, 1),
    detail: "play function with condition",
}
export const stopAllSoundsSnippet: Snippet = {
    label: "stopAllSounds",
    insertText: "stopAllSounds",
    kind: monaco.languages.CompletionItemKind.Function,
    range: new monaco.Range(1, 1, 1, 1),
    detail: "This is stopAllSounds function",
}
export const changeEffectSnippet: Snippet = {
    label: "changeEffect",
    insertText: "changeEffect ${1:S}, ${2:N}",
    insertTextRules:
        monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
    kind: monaco.languages.CompletionItemKind.Event,
    range: new monaco.Range(1, 1, 1, 1),
    detail: "This is changeEffect function",
}
export const setEffectSnippet: Snippet = {
    label: "setEffect",
    insertText: "setEffect ${1:S}, ${2:N}",
    insertTextRules:
        monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
    kind: monaco.languages.CompletionItemKind.Event,
    range: new monaco.Range(1, 1, 1, 1),
    detail: "This is setEffect function",
}
export const clearSoundEffectSnippet: Snippet = {
    label: "clearSoundEffect",
    insertText: "clearSoundEffect",
    kind: monaco.languages.CompletionItemKind.Function,
    range: new monaco.Range(1, 1, 1, 1),
    detail: "This is clearSoundEffect function",
}
export const changeVolumeSnippet: Snippet = {
    label: "changeVolume",
    insertText: "changeVolume ${1:N}",
    insertTextRules:
        monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
    kind: monaco.languages.CompletionItemKind.Function,
    range: new monaco.Range(1, 1, 1, 1),
    detail: "This is changeVolume function",
}

export const setVolumeSnippet: Snippet = {
    label: "setVolume",
    insertText: "setVolume ${1:N}",
    insertTextRules:
        monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
    kind: monaco.languages.CompletionItemKind.Event,
    range: new monaco.Range(1, 1, 1, 1),
    detail: "This is setVolume function",
}
// control snippet

export const waitSnippet: Snippet = {
    label: "wait",
    insertText: "wait ${1:seconds}",
    insertTextRules:
        monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
    kind: monaco.languages.CompletionItemKind.Function,
    range: new monaco.Range(1, 1, 1, 1),
    detail: "This is a wait function",
}

export const forSnippet: Snippet = {
    label: "for",
    insertText: "for ${1:} {\n\t${2:}\t\n}",
    insertTextRules:
        monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
    kind: monaco.languages.CompletionItemKind.Function,
    range: new monaco.Range(1, 1, 1, 1),
    detail: "This is a for function",
}
export const forRangeSnippet: Snippet = {
    label: "forr",
    insertText: "for range :${1:N} {\n\t${2:code}\t\n}",
    insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
    kind: monaco.languages.CompletionItemKind.Function,
    range: new monaco.Range(1, 1, 1, 1),
    detail: "This is a for range function",
}
export const stopSnippet: Snippet = {
    label: "stop",
    insertText: "stop ${1:all}",
    insertTextRules:
        monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
    kind: monaco.languages.CompletionItemKind.Function,
    range: new monaco.Range(1, 1, 1, 1),
    detail: "This is a stop function",
}
export const onClonedSnippet: Snippet = {
    label: "onCloned",
    insertText: "onCloned => {\n\t${1:param}\t\n}",
    insertTextRules:
        monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
    kind: monaco.languages.CompletionItemKind.Function,
    range: new monaco.Range(1, 1, 1, 1),
    detail: "This is a onCloned function",
}
export const cloneSnippet: Snippet = {
    label: "clone",
    insertText: "clone ${1:param}",
    insertTextRules:
        monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
    kind: monaco.languages.CompletionItemKind.Function,
    range: new monaco.Range(1, 1, 1, 1),
    detail: "This is a clone function",
}
export const destroySnippet: Snippet = {
    label: "destroy",
    insertText: "destroy ${1:param}",
    insertTextRules:
        monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
    kind: monaco.languages.CompletionItemKind.Function,
    range: new monaco.Range(1, 1, 1, 1),
    detail: "This is a destroy function",
}
export const dieSnippet: Snippet = {
    label: "die",
    insertText: "die ${1:param}",
    insertTextRules:
        monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
    kind: monaco.languages.CompletionItemKind.Event,
    range: new monaco.Range(1, 1, 1, 1),
    detail: "This is a die function",
}
export const setDyingSnippet: Snippet = {
    label: "setDying",
    insertText: "setDying ${1:param}",
    insertTextRules:
        monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
    kind: monaco.languages.CompletionItemKind.Event,
    range: new monaco.Range(1, 1, 1, 1),
    detail: "This is a setDying function",
}
// event snippet
export const onStartSnippet: Snippet = {
    label: "onStart",
    insertText: "onStart => {\n\t${1:condition}\t\n}",
    insertTextRules:
        monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
    kind: monaco.languages.CompletionItemKind.Function,
    range: new monaco.Range(1, 1, 1, 1),
    detail: "This is onStart Function",
}
export const onAnyKeySnippet: Snippet = {
    label: "onAnyKey",
    insertText: "onAnyKey ${1:key} => {\n\t${2:condition}\t\n}",
    insertTextRules:
        monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
    kind: monaco.languages.CompletionItemKind.Function,
    range: new monaco.Range(1, 1, 1, 1),
    detail: "This is onAnyKey Function",
}
export const onKeySnippet: Snippet = {
    label: "onKey",
    insertText: "onKey ${1:key},=> {\n\t${2:condition}\t\n}",
    insertTextRules:
        monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
    kind: monaco.languages.CompletionItemKind.Function,
    range: new monaco.Range(1, 1, 1, 1),
}
export const onEndSnippet: Snippet = {
    label: "onEnd",
    insertText: "onEnd => {\n\t${1:condition}\t\n}",
    insertTextRules:
        monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
    kind: monaco.languages.CompletionItemKind.Function,
    range: new monaco.Range(1, 1, 1, 1),
}
export const onClickSnippet: Snippet = {
    label: "onClick",
    insertText: "onClick => {\n\t${1:condition}\t\n}",
    insertTextRules:
        monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
    kind: monaco.languages.CompletionItemKind.Function,
    range: new monaco.Range(1, 1, 1, 1),
    detail: "This is a click event",
}
export const onMsgSnippet: Snippet = {
    label: "onMsg",
    insertText: "onMsg ${1:key},=> {\n\t${2:condition}\t\n}",
    insertTextRules:
        monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
    kind: monaco.languages.CompletionItemKind.Function,
    range: new monaco.Range(1, 1, 1, 1),
}
export const onSceneSnippet: Snippet = {
    label: "onScene",
    insertText: "onScene => {\n\t${1:condition}\t\n}",
    insertTextRules:
        monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
    kind: monaco.languages.CompletionItemKind.Function,
    range: new monaco.Range(1, 1, 1, 1),
}
export const onMovingSnippet: Snippet = {
    label: "onMoving",
    insertText: "onMoving => {\n\t${1:condition}\t\n}",
    insertTextRules:
        monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
    kind: monaco.languages.CompletionItemKind.Function,
    range: new monaco.Range(1, 1, 1, 1),
}
export const onTurningSnippet: Snippet = {
    label: "onTurning",
    insertText: "onTurning => {\n\t${1:condition}\t\n}",
    insertTextRules:
        monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
    kind: monaco.languages.CompletionItemKind.Function,
    range: new monaco.Range(1, 1, 1, 1),
}
export const broadcastSnippet: Snippet = {
    label: "broadcast",
    insertText: 'broadcast "${1:condition}"',
    insertTextRules:
        monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
    kind: monaco.languages.CompletionItemKind.Function,
    range: new monaco.Range(1, 1, 1, 1),
}
const motionSnippets = [
    stepSnippet,
    moveSnippet,
    turnSnippet,
    changeHeadingSnippet,
    gotoSnippet,
    setXYposSnippet,
    glideSnippet,
    turnToSnippet,
    setHeadingSnippet,
    setRotationStyleSnippet,
    changeXposSnippet,
    setXposSnippet,
    changeYposSnippet,
    setYposSnippet,
    changeXYposSnippet,
    bounceOffEdgeSnippet,
]
const lookSnippets = [
    saySnippet,
    thinkSnippet,
    setCostumeSnippet,
    changeSizeSnippet,
    nextCostumeSnippet,
    prevCostumeSnippet,
    animateSnippet,
    startSceneSnippet,
    nextSceneSnippet,
    CameraSnippet,
    changeSizeSnippet,
    setSizeSnippet,
    clearGraphEffectsSnippet,
    showSnippet,
    hideSnippet,
    gotoFrontSnippet,
    gotoBackSnippet,
    goBackLayersSnippet
]
const soundSnippets = [
    playSnippet,
    stopAllSoundsSnippet,
    changeEffectSnippet,
    setEffectSnippet,
    clearSoundEffectSnippet,
    changeVolumeSnippet,
    setVolumeSnippet,
]
const controlSnippets = [
    waitSnippet,
    forSnippet,
    forRangeSnippet,
    stopSnippet,
    onClonedSnippet,
    cloneSnippet,
    destroySnippet,
    dieSnippet,
    setDyingSnippet,
]
const eventSnippets = [
    onStartSnippet,
    onAnyKeySnippet,
    onKeySnippet,
    onEndSnippet,
    onClickSnippet,
    onMsgSnippet,
    onSceneSnippet,
    onMovingSnippet,
    onTurningSnippet,
    broadcastSnippet,
]
const function_completions = [
    ...motionSnippets,
    ...eventSnippets,
    ...controlSnippets,
    ...soundSnippets,
    ...lookSnippets,
];
export default function_completions;
export {
    motionSnippets,
    eventSnippets,
    controlSnippets,
    soundSnippets,
    lookSnippets,
}