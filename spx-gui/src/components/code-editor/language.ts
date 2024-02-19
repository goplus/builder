/*
 * @Author: Zhang Zhi Yang
 * @Date: 2024-01-30 17:12:58
 * @LastEditors: Zhang Zhi Yang
 * @LastEditTime: 2024-01-31 09:04:00
 * @FilePath: /builder/spx-gui/src/components/code-editor/Language.ts
 * @Description: 
 */
import { monaco } from "."
import function_completions from "./snippet";
const keywords = [
    "func",
    "main",
    "println",
    "if",
    "else",
    "for",
    "range",
    "break",
    "continue",
    "return",
    "switch",
    "case",
    "default",
    "type",
    "struct",
    "map",
    "chan",
    "nil",
    "true",
    "false",
    "iota",
    "const",
    "import",
    "package",
    "var",
    "error",
    "interface",
    "struct",
    "fallthrough",
    "go",
    "defer",
    "select",
];

const typeKeywords = [
    "int",
    "string",
    "bool",
    "void",
    "map",
    "chan",
    "error",
    "interface",
    "struct",
    "nil",
];

const operators = [
    "=",
    ">",
    "<",
    "!",
    "~",
    "?",
    ":",
    "==",
    "<=",
    ">=",
    "!=",
    "&&",
    "||",
    "++",
    "--",
    "+",
    "-",
    "*",
    "/",
    "&",
    "|",
    "^",
    "%",
    "<<",
    ">>",
    "+=",
    "-=",
    "*=",
    "/=",
    "&=",
    "|=",
    "^=",
    "%=",
    "<<=",
    ">>=",
];

const brackets = [
    { open: "{", close: "}", token: "delimiter.curly" },
    { open: "[", close: "]", token: "delimiter.bracket" },
    { open: "(", close: ")", token: "delimiter.parenthesis" },
];

// editor options
export const editorOptions: monaco.editor.IStandaloneEditorConstructionOptions = {
    language: "spx", // define the language mode
    // theme: "vs", // choose vs, hc-black, or vs-dark
    minimap: { enabled: true },
    selectOnLineNumbers: true, // select the line number's of the code
    roundedSelection: true, // rounded selection
    readOnly: false, // read/write
    cursorStyle: "line", // line, block, 'line-thin', 'block-outline', 'underline', 'underline-thin'
    automaticLayout: true, // auto layout
    glyphMargin: true, // the margin is used for glyph margin and line numbers
    useTabStops: false, // use tab key
    renderControlCharacters: false, // render control characters
    fontSize: 16, // font size
    quickSuggestionsDelay: 100, // quick suggestions
    wordWrap: "on", // word wrap
    wordWrapColumn: 40,
    tabSize: 4, // tab size
    folding: true, // code folding
    foldingHighlight: true, // 折叠等高线
    foldingStrategy: "indentation", // 折叠方式  auto | indentation
    showFoldingControls: "mouseover", // 是否一直显示折叠 always | mouseover
    disableLayerHinting: true, // 等宽优 
};
export const MonarchTokensProviderConfig:
    | monaco.languages.IMonarchLanguage
    | monaco.Thenable<monaco.languages.IMonarchLanguage> = {
    defaultToken: "invalid",
    keywords,
    typeKeywords,
    operators,
    functions: function_completions.map((e) => e.label),
    brackets,
    symbols: /[=><!~?:&|+\-*\/\^%]+/,
    escapes: /\\(?:[abfnrtv\\"']|x[0-9A-Fa-f]{1,4}|u[0-9A-Fa-f]{4}|U[0-9A-Fa-f]{8})/,
    // digits
    digits: /\d+(_+\d+)*/,
    octaldigits: /[0-7]+(_+[0-7]+)*/,
    binarydigits: /[0-1]+(_+[0-1]+)*/,
    hexdigits: /[[0-9a-fA-F]+(_+[0-9a-fA-F]+)*/,
    // The main tokenizer for our languages 
    tokenizer: {
        root: [
            [
                /[a-z_$][\w$]*/,
                {
                    cases: {
                        "@typeKeywords": "typeKeywords",
                        "@keywords": "keyword",
                        "@functions": "functions",
                        "@default": "identifier",
                    },
                },
            ],
            [/[A-Z][\w$]*/, "type.identifier"],

            // whitespace
            { include: '@whitespace' },

            // delimiters and operators
            [/[{}()\[\]]/, '@brackets'],
            [/[<>](?!@symbols)/, '@brackets'],
            [/@symbols/, {
                cases: {
                    '@operators': 'operator',
                    '@default': ''
                }
            }],

            // numbers
            [/(@digits)[eE]([\-+]?(@digits))?/, 'number.float'],
            [/(@digits)\.(@digits)([eE][\-+]?(@digits))?/, 'number.float'],
            [/0[xX](@hexdigits)/, 'number.hex'],
            [/0[oO]?(@octaldigits)/, 'number.octal'],
            [/0[bB](@binarydigits)/, 'number.binary'],
            [/(@digits)/, 'number'],

            // delimiter: after number because of .\d floats
            [/[;,.]/, "delimiter"],
            [/[=><!~?:&|+\-*/^%]+/, "operator"],

            [/"([^"\\]|\\.)*$/, "string.invalid"],
            [/"/, { token: "string.quote", bracket: "@open", next: "@string" }],

            // characters
            [/'[^\\']'/, 'string'],
            [/(')(@escapes)(')/, ['string', 'string.escape', 'string']],
            [/'/, 'string.invalid']


        ],
        comment: [
            [/[^\/*]+/, 'comment'],
            [/\/\*/, 'comment', '@push'],
            ["\\*/", 'comment', '@pop'],
            [/[\/*]/, 'comment']
        ],

        string: [
            [/[^\\"]+/, 'string'],
            [/@escapes/, 'string.escape'],
            [/\\./, 'string.escape.invalid'],
            [/"/, { token: 'string.quote', bracket: '@close', next: '@pop' }]
        ],

        whitespace: [
            [/[ \t\r\n]+/, 'white'],
            [/\/\*/, 'comment', '@comment'],
            [/\/\/.*$/, 'comment'],
        ],

        bracketCounting: [
            [/\{/, 'delimiter.bracket', '@bracketCounting'],
            [/\}/, 'delimiter.bracket', '@pop'],
        ],
    },
};
export const LanguageConfig: monaco.languages.LanguageConfiguration = {
    // tokenize all words as identifiers
    wordPattern: /(-?\d*\.\d\w*)|([^`~!@#%^&*()\-=+[{\]}\\|;:'",.<>/?\s]+)/g,
    comments: {
        lineComment: "//",
        blockComment: ["/*", "*/"],
    },
    brackets: [
        ["{", "}"],
        ["[", "]"],
        ["(", ")"],
        ['"', '"'],
        ["'", "'"],
    ],
    onEnterRules: [
        // if current cursor is betwwen work and space，then will not indent
        {
            beforeText: /\w/,
            afterText: /^$/,
            action: { indentAction: monaco.languages.IndentAction.None },
        },
        {
            // match  /*
            beforeText: /^\s*(\/\*)/,
            // match */
            afterText: /^\s*\*\/$/,
            action: { indentAction: monaco.languages.IndentAction.IndentOutdent },
        },
    ],
};
export {
    keywords,
    typeKeywords,
    operators,
    brackets
}