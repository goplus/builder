/*
 * @Author: Zhang Zhi Yang
 * @Date: 2024-01-16 10:59:32
 * @LastEditors: Zhang Zhi Yang
 * @LastEditTime: 2024-01-18 09:08:03
 * @FilePath: /builder/spx-gui/src/plugins/code-editor/config.ts
 * @Description: 
 */

import * as monaco from 'monaco-editor';

const keywords = [
    'func', 'main', 'println', 'if', 'else', 'for', 'range', 'break', 'continue', 'return', 'switch', 'case', 'default', 'type', 'struct', 'map', 'chan', 'nil', 'true', 'false', 'iota', 'const', 'import', 'package', 'var', 'error', 'interface', 'struct', 'fallthrough', 'go', 'defer', 'select',
]
const typeKeywords = [
    'int', 'string', 'bool', 'void', 'map', 'chan', 'error', 'interface', 'struct', 'nil'
]

const motion_function = [
    'step', 'move', 'turn', 'changeHeading', 'goto',
    'setXYpos', 'glide', 'turnTo', 'setHeading', 'turnTo',
    'changeXpos', 'setXpos', 'changeYpos', 'setYpos', 'changeXYpos',
    'bounceOffEdge', 'setRotationStyle',
]

const looks_function = [
    'say', 'think', 'setCostume', 'nextCostume', 'prevCostume', 'animate',
    'startScene ', 'startScene', 'nextScene', 'nextScene', 'prevScene', 'prevScene',
    'Camera', 'changeSize', 'setSize',
    'clearGraphEffects',
    'show', 'hide', 'gotoFront', 'gotoBack', 'goBackLayers'
]

const sound_function = ['play', 'stopAllSounds', 'changeEffect', 'setEffect', 'clearSoundEffect', 'changeVolume', 'setVolume']

const event_function = [
    'onStart', 'onAnyKey', 'onKey', 'onEnd', 'onClick', 'onMsg', 'onScene', 'onMoving', 'onTurning', 'broadcast'
]
const control_function = [
    'wait', 'stop', 'onCloned', 'clone', 'destroy', 'die', 'setDying'
]


const functions = [
    ...looks_function,
    ...motion_function,
    ...sound_function,
    ...event_function,
    ...control_function
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
    functions,
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
    keywords, typeKeywords, functions, operators, brackets
}