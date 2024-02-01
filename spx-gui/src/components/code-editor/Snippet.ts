import { ExitToAppRound } from "@vicons/material";
import { monaco, Snippet } from "./CodeEditor";
// motion snippet
export const stepSnippet: Snippet = {
    spxSnippetType: "motion",
    label: "step",
    insertText: "step ${1:}",
    insertTextRules:
        monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
    kind: monaco.languages.CompletionItemKind.Function,
    range: new monaco.Range(1, 1, 1, 1),
}
export const moveSnippet: Snippet = {
    spxSnippetType: "motion",
    label: "move",
    insertText: "move ${1:}",
    insertTextRules:
        monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
    kind: monaco.languages.CompletionItemKind.Function,
    range: new monaco.Range(1, 1, 1, 1),
}
export const turnSnippet: Snippet = {
    spxSnippetType: "motion",
    label: "turn",
    insertText: "turn ${1:}",
    insertTextRules:
        monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
    kind: monaco.languages.CompletionItemKind.Function,
    range: new monaco.Range(1, 1, 1, 1),
}
export const changeHeadingSnippet: Snippet = {
    spxSnippetType: "motion",
    label: "changeHeading",
    insertText: "changeHeading ${1:}",
    insertTextRules:
        monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
    kind: monaco.languages.CompletionItemKind.Function,
    range: new monaco.Range(1, 1, 1, 1),
}
export const gotoSnippet: Snippet = {
    spxSnippetType: "motion",
    label: "goto",
    insertText: "goto ${1:}",
    insertTextRules:
        monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
    kind: monaco.languages.CompletionItemKind.Function,
    range: new monaco.Range(1, 1, 1, 1),
}
export const setXYposSnippet: Snippet = {
    spxSnippetType: "motion",
    label: "setXYpos",
    insertText: "setXYpos ${1:X}, ${2:Y}",
    insertTextRules:
        monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
    kind: monaco.languages.CompletionItemKind.Function,
    range: new monaco.Range(1, 1, 1, 1),
}
export const glideSnippet: Snippet = {
    spxSnippetType: "motion",
    label: "glide",
    insertText: "glide ${1:X} ${2:Y} ${3:N}",
    insertTextRules:
        monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
    kind: monaco.languages.CompletionItemKind.Function,
    range: new monaco.Range(1, 1, 1, 1),
}
export const turnToSnippet: Snippet = {
    spxSnippetType: "motion",
    label: "turnTo",
    insertText: "turnTo ${1:}",
    insertTextRules:
        monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
    kind: monaco.languages.CompletionItemKind.Function,
    range: new monaco.Range(1, 1, 1, 1),
}
export const setHeadingSnippet: Snippet = {
    spxSnippetType: "motion",
    label: "setHeading",
    insertText: "setHeading ${1:}",
    insertTextRules:
        monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
    kind: monaco.languages.CompletionItemKind.Function,
    range: new monaco.Range(1, 1, 1, 1),
}
export const setRotationStyleSnippet: Snippet = {
    spxSnippetType: "motion",
    label: "setRotationStyle",
    insertText: "setRotationStyle",
    insertTextRules:
        monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
    kind: monaco.languages.CompletionItemKind.Function,
    range: new monaco.Range(1, 1, 1, 1),
}
export const changeXposSnippet: Snippet = {
    spxSnippetType: "motion",
    label: "changeXpos",
    insertText: "changeXpos ${1:}",
    insertTextRules:
        monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
    kind: monaco.languages.CompletionItemKind.Function,
    range: new monaco.Range(1, 1, 1, 1),
}
export const setXposSnippet: Snippet = {
    spxSnippetType: "motion",
    label: "setXpos",
    insertText: "setXpos ${1:}",
    insertTextRules:
        monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
    kind: monaco.languages.CompletionItemKind.Function,
    range: new monaco.Range(1, 1, 1, 1),
}

export const changeYposSnippet: Snippet = {
    spxSnippetType: "motion",
    label: "changeYpos",
    insertText: "changeYpos ${1:}",
    insertTextRules:
        monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
    kind: monaco.languages.CompletionItemKind.Function,
    range: new monaco.Range(1, 1, 1, 1),
}
export const setYposSnippet: Snippet = {
    spxSnippetType: "motion",
    label: "setYpos",
    insertText: "setYpos ${1:}",
    insertTextRules:
        monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
    kind: monaco.languages.CompletionItemKind.Function,
    range: new monaco.Range(1, 1, 1, 1),
}
export const changeXYposSnippet: Snippet = {
    spxSnippetType: "motion",
    label: "changeXYpos",
    insertText: "changeXYpos ${1:X}, ${2:Y}",
    insertTextRules:
        monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
    kind: monaco.languages.CompletionItemKind.Function,
    range: new monaco.Range(1, 1, 1, 1),
}

export const bounceOffEdgeSnippet: Snippet = {
    spxSnippetType: "motion",
    label: "bounceOffEdge",
    insertText: "bounceOffEdge ${1:}",
    insertTextRules:
        monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
    kind: monaco.languages.CompletionItemKind.Function,
    range: new monaco.Range(1, 1, 1, 1),
}


// look snippet

export const saySnippet: Snippet = {
    spxSnippetType: "look",
    label: "say",
    insertText: "say ${1:}",
    insertTextRules:
        monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
    kind: monaco.languages.CompletionItemKind.Function,
    range: new monaco.Range(1, 1, 1, 1),
    detail: "This is a say function",
}

export const thinkSnippet: Snippet = {
    spxSnippetType: "look",
    label: "think",
    insertText: "think ${1:}",
    insertTextRules:
        monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
    kind: monaco.languages.CompletionItemKind.Function,
    range: new monaco.Range(1, 1, 1, 1),
    detail: "This is a think function",
}
export const setCostumeSnippet: Snippet = {
    spxSnippetType: "look",
    label: "setCostume",
    insertText: "setCostume ${1:costumeName}",
    insertTextRules:
        monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
    kind: monaco.languages.CompletionItemKind.Function,
    range: new monaco.Range(1, 1, 1, 1),
    detail: "This is a setCostume function",
}
export const nextCostumeSnippet: Snippet = {
    spxSnippetType: "look",
    label: "nextCostume",
    insertText: "nextCostume",
    kind: monaco.languages.CompletionItemKind.Function,
    range: new monaco.Range(1, 1, 1, 1),
    detail: "This is a nextCostume function",
}
export const prevCostumeSnippet: Snippet = {
    spxSnippetType: "look",
    label: "prevCostume",
    insertText: "prevCostume",
    kind: monaco.languages.CompletionItemKind.Function,
    range: new monaco.Range(1, 1, 1, 1),
    detail: "This is a prevCostume function",
}
export const animateSnippet: Snippet = {
    spxSnippetType: "look",
    label: "animate",
    insertText: "animate ${1:name}",
    insertTextRules:
        monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
    kind: monaco.languages.CompletionItemKind.Function,
    range: new monaco.Range(1, 1, 1, 1),
    detail: "This is a animate function",
}

export const startSceneSnippet: Snippet = {
    spxSnippetType: "look",
    label: "startScene ",
    insertText: "startScene ${1:costumeName}, ${2:wait}",
    insertTextRules:
        monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
    kind: monaco.languages.CompletionItemKind.Function,
    range: new monaco.Range(1, 1, 1, 1),
    detail: "This is a startScene function",
}
export const nextSceneSnippet: Snippet = {
    spxSnippetType: "look",
    label: "nextScene",
    insertText: "nextScene ${1:condition}",
    kind: monaco.languages.CompletionItemKind.Function,
    range: new monaco.Range(1, 1, 1, 1),
    detail: "This is a nextScene function",
}
export const CameraSnippet: Snippet = {
    spxSnippetType: "look",
    label: "Camera",
    insertText: "Camera",
    kind: monaco.languages.CompletionItemKind.Function,
    range: new monaco.Range(1, 1, 1, 1),
    detail: "This is a Camera function",
}
export const changeSizeSnippet: Snippet = {
    spxSnippetType: "look",
    label: "changeSize",
    insertText: "changeSize ${1:N}",
    insertTextRules:
        monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
    kind: monaco.languages.CompletionItemKind.Function,
    range: new monaco.Range(1, 1, 1, 1),
    detail: "This is a changeSize function",
}
export const setSizeSnippet: Snippet = {
    spxSnippetType: "look",
    label: "setSize",
    insertText: "setSize ${1:G}, ${2:N}",
    insertTextRules:
        monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
    kind: monaco.languages.CompletionItemKind.Function,
    range: new monaco.Range(1, 1, 1, 1),
    detail: "This is a setSize function",
}
export const clearGraphEffectsSnippet: Snippet = {
    spxSnippetType: "look",
    label: "clearGraphEffects",
    insertText: "clearGraphEffects",
    kind: monaco.languages.CompletionItemKind.Function,
    range: new monaco.Range(1, 1, 1, 1),
    detail: "This is clearGraphEffects function",
}
export const showSnippet: Snippet = {
    spxSnippetType: "look",
    label: "show",
    insertText: "show",
    kind: monaco.languages.CompletionItemKind.Function,
    range: new monaco.Range(1, 1, 1, 1),
    detail: "This is show function",
}
export const hideSnippet: Snippet = {
    spxSnippetType: "look",
    label: "hide",
    insertText: "hide",
    kind: monaco.languages.CompletionItemKind.Function,
    range: new monaco.Range(1, 1, 1, 1),
    detail: "This is hide function",
}
export const gotoFrontSnippet: Snippet = {
    spxSnippetType: "look",
    label: "gotoFront",
    insertText: "gotoFront",
    kind: monaco.languages.CompletionItemKind.Function,
    range: new monaco.Range(1, 1, 1, 1),
    detail: "This is gotoFront function",
}

export const gotoBackSnippet: Snippet = {
    spxSnippetType: "look",
    label: "gotoBack",
    insertText: "gotoBack",
    kind: monaco.languages.CompletionItemKind.Function,
    range: new monaco.Range(1, 1, 1, 1),
    detail: "This is gotoBack function",
}
export const goBackLayersSnippet: Snippet = {
    spxSnippetType: "look",
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
    spxSnippetType: "sound",
    label: "play",
    insertText: "play ${1:S}, ${2:condition}",
    insertTextRules:
        monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
    kind: monaco.languages.CompletionItemKind.Function,
    range: new monaco.Range(1, 1, 1, 1),
    detail: "play function with condition",
}
export const stopAllSoundsSnippet: Snippet = {
    spxSnippetType: "sound",
    label: "stopAllSounds",
    insertText: "stopAllSounds",
    kind: monaco.languages.CompletionItemKind.Function,
    range: new monaco.Range(1, 1, 1, 1),
    detail: "This is stopAllSounds function",
}
export const changeEffectSnippet: Snippet = {
    spxSnippetType: "sound",
    label: "changeEffect",
    insertText: "changeEffect ${1:S}, ${2:N}",
    insertTextRules:
        monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
    kind: monaco.languages.CompletionItemKind.Event,
    range: new monaco.Range(1, 1, 1, 1),
    detail: "This is changeEffect function",
}
export const setEffectSnippet: Snippet = {
    spxSnippetType: "sound",
    label: "setEffect",
    insertText: "setEffect ${1:S}, ${2:N}",
    insertTextRules:
        monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
    kind: monaco.languages.CompletionItemKind.Event,
    range: new monaco.Range(1, 1, 1, 1),
    detail: "This is setEffect function",
}
export const clearSoundEffectSnippet: Snippet = {
    spxSnippetType: "sound",
    label: "clearSoundEffect",
    insertText: "clearSoundEffect",
    kind: monaco.languages.CompletionItemKind.Function,
    range: new monaco.Range(1, 1, 1, 1),
    detail: "This is clearSoundEffect function",
}
export const changeVolumeSnippet: Snippet = {
    spxSnippetType: "sound",
    label: "changeVolume",
    insertText: "changeVolume ${1:N}",
    insertTextRules:
        monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
    kind: monaco.languages.CompletionItemKind.Function,
    range: new monaco.Range(1, 1, 1, 1),
    detail: "This is changeVolume function",
}

export const setVolumeSnippet: Snippet = {
    spxSnippetType: "sound",
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
    spxSnippetType: "control",
    label: "wait",
    insertText: "wait ${1:seconds}",
    insertTextRules:
        monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
    kind: monaco.languages.CompletionItemKind.Function,
    range: new monaco.Range(1, 1, 1, 1),
    detail: "This is a wait function",
}

export const forSnippet: Snippet = {
    spxSnippetType: "control",
    label: "for",
    insertText: "for ${1:} {\n\t${2:}\t\n}",
    insertTextRules:
        monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
    kind: monaco.languages.CompletionItemKind.Function,
    range: new monaco.Range(1, 1, 1, 1),
    detail: "This is a for function",
}
export const forRangeSnippet: Snippet = {
    spxSnippetType: "control",
    label: "forr",
    insertText: "for range :${1:N} {\n\t${2:code}\t\n}",
    insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
    kind: monaco.languages.CompletionItemKind.Function,
    range: new monaco.Range(1, 1, 1, 1),
    detail: "This is a for range function",
}
export const stopSnippet: Snippet = {
    spxSnippetType: "control",
    label: "stop",
    insertText: "stop ${1:all}",
    insertTextRules:
        monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
    kind: monaco.languages.CompletionItemKind.Function,
    range: new monaco.Range(1, 1, 1, 1),
    detail: "This is a stop function",
}
export const onClonedSnippet: Snippet = {
    spxSnippetType: "control",
    label: "onCloned",
    insertText: "onCloned => {\n\t${1:param}\t\n}",
    insertTextRules:
        monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
    kind: monaco.languages.CompletionItemKind.Function,
    range: new monaco.Range(1, 1, 1, 1),
    detail: "This is a onCloned function",
}
export const cloneSnippet: Snippet = {
    spxSnippetType: "control",
    label: "clone",
    insertText: "clone ${1:param}",
    insertTextRules:
        monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
    kind: monaco.languages.CompletionItemKind.Function,
    range: new monaco.Range(1, 1, 1, 1),
    detail: "This is a clone function",
}
export const destroySnippet: Snippet = {
    spxSnippetType: "control",
    label: "destroy",
    insertText: "destroy ${1:param}",
    insertTextRules:
        monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
    kind: monaco.languages.CompletionItemKind.Function,
    range: new monaco.Range(1, 1, 1, 1),
    detail: "This is a destroy function",
}
export const dieSnippet: Snippet = {
    spxSnippetType: "control",
    label: "die",
    insertText: "die ${1:param}",
    insertTextRules:
        monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
    kind: monaco.languages.CompletionItemKind.Event,
    range: new monaco.Range(1, 1, 1, 1),
    detail: "This is a die function",
}
export const setDyingSnippet: Snippet = {
    spxSnippetType: "control",
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
    spxSnippetType: "event",
    label: "onStart",
    insertText: "onStart => {\n\t${1:condition}\t\n}",
    insertTextRules:
        monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
    kind: monaco.languages.CompletionItemKind.Function,
    range: new monaco.Range(1, 1, 1, 1),
    detail: "This is onStart Function",
}
export const onAnyKeySnippet: Snippet = {
    spxSnippetType: "event",
    label: "onAnyKey",
    insertText: "onAnyKey ${1:key} => {\n\t${2:condition}\t\n}",
    insertTextRules:
        monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
    kind: monaco.languages.CompletionItemKind.Function,
    range: new monaco.Range(1, 1, 1, 1),
    detail: "This is onAnyKey Function",
}
export const onKeySnippet: Snippet = {
    spxSnippetType: "event",
    label: "onKey",
    insertText: "onKey ${1:key},=> {\n\t${2:condition}\t\n}",
    insertTextRules:
        monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
    kind: monaco.languages.CompletionItemKind.Function,
    range: new monaco.Range(1, 1, 1, 1),
}
export const onEndSnippet: Snippet = {
    spxSnippetType: "event",
    label: "onEnd",
    insertText: "onEnd => {\n\t${1:condition}\t\n}",
    insertTextRules:
        monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
    kind: monaco.languages.CompletionItemKind.Function,
    range: new monaco.Range(1, 1, 1, 1),
}
export const onClickSnippet: Snippet = {
    spxSnippetType: "event",
    label: "onClick",
    insertText: "onClick => {\n\t${1:condition}\t\n}",
    insertTextRules:
        monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
    kind: monaco.languages.CompletionItemKind.Function,
    range: new monaco.Range(1, 1, 1, 1),
    detail: "This is a click event",
}
export const onMsgSnippet: Snippet = {
    spxSnippetType: "event",
    label: "onMsg",
    insertText: "onMsg ${1:key},=> {\n\t${2:condition}\t\n}",
    insertTextRules:
        monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
    kind: monaco.languages.CompletionItemKind.Function,
    range: new monaco.Range(1, 1, 1, 1),
}
export const onSceneSnippet: Snippet = {
    spxSnippetType: "event",
    label: "onScene",
    insertText: "onScene => {\n\t${1:condition}\t\n}",
    insertTextRules:
        monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
    kind: monaco.languages.CompletionItemKind.Function,
    range: new monaco.Range(1, 1, 1, 1),
}
export const onMovingSnippet: Snippet = {
    spxSnippetType: "event",
    label: "onMoving",
    insertText: "onMoving => {\n\t${1:condition}\t\n}",
    insertTextRules:
        monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
    kind: monaco.languages.CompletionItemKind.Function,
    range: new monaco.Range(1, 1, 1, 1),
}
export const onTurningSnippet: Snippet = {
    spxSnippetType: "event",
    label: "onTurning",
    insertText: "onTurning => {\n\t${1:condition}\t\n}",
    insertTextRules:
        monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
    kind: monaco.languages.CompletionItemKind.Function,
    range: new monaco.Range(1, 1, 1, 1),
}
export const broadcastSnippet: Snippet = {
    spxSnippetType: "event",
    label: "broadcast",
    insertText: 'broadcast "${1:condition}"',
    insertTextRules:
        monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
    kind: monaco.languages.CompletionItemKind.Function,
    range: new monaco.Range(1, 1, 1, 1),
}
const motion_fn_completions = [
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
const look_fn_completions = [
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
const sound_fn_completions = [
    playSnippet,
    stopAllSoundsSnippet,
    changeEffectSnippet,
    setEffectSnippet,
    clearSoundEffectSnippet,
    changeVolumeSnippet,
    setVolumeSnippet,
]
const control_fn_completions = [
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
const event_fn_completions = [
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
    ...motion_fn_completions,
    ...event_fn_completions,
    ...control_fn_completions,
    ...sound_fn_completions,
    ...look_fn_completions,
];
export default function_completions;
export {
    motion_fn_completions,
    event_fn_completions,
    control_fn_completions,
    sound_fn_completions,
    look_fn_completions,
}