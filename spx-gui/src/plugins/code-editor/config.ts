/*
 * @Author: Zhang Zhi Yang
 * @Date: 2024-01-16 10:59:32
 * @LastEditors: Zhang Zhi Yang
 * @LastEditTime: 2024-01-19 10:18:34
 * @FilePath: /builder/spx-gui/src/plugins/code-editor/config.ts
 * @Description: 
 */
// reference documentation  https://github.com/xushiwei/goplus-spx-vs-scratch/blob/main/scratch-vs-spx-v1.0.0-rc4.pdf
import * as monaco from 'monaco-editor';


const keywords = [
    'func', 'main', 'println', 'if', 'else', 'for', 'range', 'break', 'continue', 'return', 'switch', 'case', 'default', 'type', 'struct', 'map', 'chan', 'nil', 'true', 'false', 'iota', 'const', 'import', 'package', 'var', 'error', 'interface', 'struct', 'fallthrough', 'go', 'defer', 'select',
]
const typeKeywords = [
    'int', 'string', 'bool', 'void', 'map', 'chan', 'error', 'interface', 'struct', 'nil'
]


const motion_fn_completions = [
    { label: 'step', insertText: 'step' },
    { label: 'move', insertText: 'move' },
    { label: 'turn', insertText: 'turn' },
    { label: 'changeHeading', insertText: 'changeHeading' },
    { label: 'goto', insertText: 'goto' },
    { label: 'setXYpos', insertText: 'setXYpos' },
    { label: 'glide', insertText: 'glide' },
    { label: 'turnTo', insertText: 'turnTo' },
    { label: 'setHeading', insertText: 'setHeading' },
    { label: 'setRotationStyle', insertText: 'setRotationStyle' },
    { label: 'changeXpos', insertText: 'changeXpos' },
    { label: 'setXpos', insertText: 'setXpos' },
    { label: 'changeYpos', insertText: 'changeYpos' },
    { label: 'setYpos', insertText: 'setYpos' },
    { label: 'changeXYpos', insertText: 'changeXYpos' },
    { label: 'bounceOffEdge', insertText: 'bounceOffEdge' },
    { label: 'setRotationStyle', insertText: 'setRotationStyle' },
]
const look_fn_completions = [
    { label: "say", insertText: 'say' },
    { label: "think", insertText: 'think' },
    { label: "setCostume", insertText: 'setCostume' },
    { label: "nextCostume", insertText: 'nextCostume' },
    { label: "prevCostume", insertText: 'prevCostume' },
    { label: "animate", insertText: 'animate' },
    { label: "startScene ", insertText: 'startScene ' },
    { label: "nextScene", insertText: 'nextScene' },
    { label: "Camera", insertText: 'Camera' },
    { label: 'changeSize', },
    { label: 'setSize', },
    { label: 'clearGraphEffects', },
    { label: 'show', },
    { label: 'hide', },
    { label: 'gotoFront', },
    { label: 'gotoBack', },
    { label: 'goBackLayers', },
]

const sound_fn_completions: monaco.languages.CompletionItem[] = [{
    label: "play",
}, {
    label: "stopAllSounds",
}, {
    label: "changeEffect",
}, {
    label: "setEffect",
}, {
    label: "clearSoundEffect",
}, {
    label: "changeVolume",
}, {
    label: "setVolume",
}]

const control_fn_completions: monaco.languages.CompletionItem[] = [{
    label: "wait",
    insertText: "wait"
}, {
    label: "stop",
}, {
    label: "onCloned"
}, {
    label: "clone",
}, {
    label: "destroy",
}, {
    label: "destroy",
}, {
    label: "die"
}, {
    label: "setDying"
}
]
// event function
const event_fn_completions: monaco.languages.CompletionItem[] = [
    {
        label: 'onStart',
        insertText: 'onStart => {\n\t\${1:condition}\t\n}',
        insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
        kind: monaco.languages.CompletionItemKind.Function,
        range: new monaco.Range(1, 1, 1, 1),
        detail: "This is onStart Function"
    },
    {
        label: 'onAnyKey',
        insertText: 'onAnyKey ${1:key} => {\n\t\${2:condition}\t\n}',
        insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
        kind: monaco.languages.CompletionItemKind.Function,
        range: new monaco.Range(1, 1, 1, 1),
        detail: "This is onAnyKey Function"
    },
    {
        label: 'onKey',
        insertText: 'onKey ${1:key},=> {\n\t\${2:condition}\t\n}',
        insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
        kind: monaco.languages.CompletionItemKind.Function,
        range: new monaco.Range(1, 1, 1, 1)
    },
    {
        label: 'onEnd',
        insertText: 'onEnd => {\n\t\${1:condition}\t\n}',
        insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
        kind: monaco.languages.CompletionItemKind.Function,
        range: new monaco.Range(1, 1, 1, 1)
    },
    {
        label: 'onClick',
        insertText: 'onClick => {\n\t\${1:condition}\t\n}',
        insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
        kind: monaco.languages.CompletionItemKind.Function,
        range: new monaco.Range(1, 1, 1, 1),
        detail: 'This is a click event'
    },
    {
        label: 'onMsg',
        insertText: 'onMsg => {\n\t\${1:condition}\t\n}',
        insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
        kind: monaco.languages.CompletionItemKind.Function,
        range: new monaco.Range(1, 1, 1, 1)
    },
    {
        label: 'onScene',
        insertText: 'onScene = ${func} => {\n\t\${1:condition}\t\n}',
        insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
        kind: monaco.languages.CompletionItemKind.Function,
        range: new monaco.Range(1, 1, 1, 1)
    },
    {
        label: 'onMoving',
        insertText: 'onMoving = ${func} => {\n\t\${1:condition}\t\n}',
        insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
        kind: monaco.languages.CompletionItemKind.Function,
        range: new monaco.Range(1, 1, 1, 1)
    },
    {
        label: 'onTurning',
        insertText: 'onTurning = ${func} => {\n\t\${1:condition}\t\n}',
        insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
        kind: monaco.languages.CompletionItemKind.Function,
        range: new monaco.Range(1, 1, 1, 1)
    },
    {
        label: 'broadcast',
        insertText: 'broadcast = ${func} => {\n\t\${1:condition}\t\n}',
        insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
        kind: monaco.languages.CompletionItemKind.Function,
        range: new monaco.Range(1, 1, 1, 1)
    }
]


const function_completions = [
    ...motion_fn_completions,
    ...event_fn_completions,
    ...control_fn_completions,
    ...sound_fn_completions,
    ...look_fn_completions
]
const operators = [
    '=', '>', '<', '!', '~', '?', ':', '==', '<=', '>=', '!=',
    '&&', '||', '++', '--', '+', '-', '*', '/', '&', '|', '^', '%',
    '<<', '>>', '+=', '-=', '*=', '/=', '&=', '|=', '^=',
    '%=', '<<=', '>>='
]
const brackets = [
    { open: '{', close: '}', token: 'delimiter.curly' },
    { open: '[', close: ']', token: 'delimiter.bracket' },
    { open: '(', close: ')', token: 'delimiter.parenthesis' }
]

// editor options
export const options: monaco.editor.IStandaloneEditorConstructionOptions = {
    language: 'spx', // define the language mode
    theme: 'vs-dark', // choose vs, hc-black, or vs-dark
    selectOnLineNumbers: true, // select the line number's of the code
    roundedSelection: true, // rounded selection
    readOnly: false, // read/write
    cursorStyle: 'line', // line, block, 'line-thin', 'block-outline', 'underline', 'underline-thin'
    automaticLayout: true, // auto layout
    glyphMargin: true, // the margin is used for glyph margin and line numbers
    useTabStops: false, // use tab key
    renderControlCharacters: false, // render control characters
    fontSize: 16, // font size
    quickSuggestionsDelay: 100, // quick suggestions
    folding: true, // code folding
    wordWrap: 'on', // word wrap
    wordWrapColumn: 40,
    tabSize: 4, // tab size
}
export const MonarchTokensProviderConfig: monaco.languages.IMonarchLanguage | monaco.Thenable<monaco.languages.IMonarchLanguage> = {
    defaultToken: 'invalid',
    keywords,
    typeKeywords,
    operators,
    functions: function_completions.map(e => e.label),
    brackets,
    tokenizer: {
        root: [
            [/[a-z_$][\w$]*/, {
                cases: {
                    '@typeKeywords': 'keyword',
                    '@keywords': 'keyword',
                    '@functions': 'keyword',
                    '@default': 'variable'
                }
            }],
            [/[A-Z][\w\$]*/, 'type.identifier'],
            [/[{}\[\]()]/, '@brackets'],

            [/\d*\.\d+([eE][\-+]?\d+)?/, 'number.float'],
            [/0[xX][0-9a-fA-F]+/, 'number.hex'],
            [/\d+/, 'number'],

            [/[;,.]/, 'delimiter'],
            [/[=><!~?:&|+\-*\/\^%]+/, 'operator'],

            [/"([^"\\]|\\.)*$/, 'string.invalid'],
            [/"/, { token: 'string.quote', bracket: '@open', next: '@string' }],
            [/'[^\\']'/, 'string'],
            [/'/, 'string.invalid'],
        ],
        comment: [
            [/[^\/*]+/, 'comment'],
            [/\/\*/, 'comment', '@push'],
            ["\\*/", 'comment', '@pop'],
            [/[\/*]/, 'comment']
        ],
        string: [
            [/[^\\"]+/, 'string'],
            [/"/, { token: 'string.quote', bracket: '@close', next: '@pop' }]
        ],
        whitespace: [
            [/[ \t\r\n]+/, 'white'],
            [/\/\*/, 'comment', '@comment'],
            [/\/\/.*$/, 'comment'],
        ],
    },
}
export const LanguageConfig: monaco.languages.LanguageConfiguration = {
    // tokenize all words as identifiers
    wordPattern: /(-?\d*\.\d\w*)|([^\`\~\!\@\#\%\^\&\*\(\)\-\=\+\[\{\]\}\\\|\;\:\'\"\,\.\<\>\/\?\s]+)/g,
    comments: {
        lineComment: '//',
        blockComment: ['/*', '*/'],
    },
    brackets: [
        ['{', '}'],
        ['[', ']'],
        ['(', ')'],
        ['"', '"'],
        ["'", "'"],
    ],
    onEnterRules: [
        // if current cursor is betwwen work and space，then will not indent
        {
            beforeText: /\w/,
            afterText: /^$/,
            action: { indentAction: monaco.languages.IndentAction.None }
        },
        {
            // match  /* 
            beforeText: /^\s*(\/\*)/,
            // match */
            afterText: /^\s*\*\/$/,
            action: { indentAction: monaco.languages.IndentAction.IndentOutdent }
        }
    ]
}
export {
    keywords, typeKeywords, operators, brackets,
    event_fn_completions, function_completions
}