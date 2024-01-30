/*
 * @Author: Zhang Zhi Yang
 * @Date: 2024-01-16 10:59:32
 * @LastEditors: Zhang Zhi Yang
 * @LastEditTime: 2024-01-22 17:50:44
 * @FilePath: /builder/spx-gui/src/plugins/code-editor/config.ts
 * @Description:
 */
// reference documentation  https://github.com/xushiwei/goplus-spx-vs-scratch/blob/main/scratch-vs-spx-v1.0.0-rc4.pdf
import * as monaco from "monaco-editor";

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

const motion_fn_completions = [
  {
    label: "step",
    insertText: "step ${1:}",
    insertTextRules:
      monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
    kind: monaco.languages.CompletionItemKind.Function,
    range: new monaco.Range(1, 1, 1, 1),
  },
  {
    label: "move",
    insertText: "move ${1:}",
    insertTextRules:
      monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
    kind: monaco.languages.CompletionItemKind.Function,
    range: new monaco.Range(1, 1, 1, 1),
  },
  {
    label: "turn",
    insertText: "turn ${1:}",
    insertTextRules:
      monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
    kind: monaco.languages.CompletionItemKind.Function,
    range: new monaco.Range(1, 1, 1, 1),
  },
  {
    label: "changeHeading",
    insertText: "changeHeading ${1:}",
    insertTextRules:
      monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
    kind: monaco.languages.CompletionItemKind.Function,
    range: new monaco.Range(1, 1, 1, 1),
  },
  {
    label: "goto",
    insertText: "goto ${1:}",
    insertTextRules:
      monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
    kind: monaco.languages.CompletionItemKind.Function,
    range: new monaco.Range(1, 1, 1, 1),
  },
  {
    label: "setXYpos",
    insertText: "setXYpos ${1:X}, ${2:Y}",
    insertTextRules:
      monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
    kind: monaco.languages.CompletionItemKind.Function,
    range: new monaco.Range(1, 1, 1, 1),
  },
  {
    label: "glide",
    insertText: "glide ${1:X} ${2:Y} ${3:N}",
    insertTextRules:
      monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
    kind: monaco.languages.CompletionItemKind.Function,
    range: new monaco.Range(1, 1, 1, 1),
  },
  {
    label: "turnTo",
    insertText: "turnTo ${1:}",
    insertTextRules:
      monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
    kind: monaco.languages.CompletionItemKind.Function,
    range: new monaco.Range(1, 1, 1, 1),
  },
  {
    label: "setHeading",
    insertText: "setHeading ${1:}",
    insertTextRules:
      monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
    kind: monaco.languages.CompletionItemKind.Function,
    range: new monaco.Range(1, 1, 1, 1),
  },
  {
    label: "setRotationStyle",
    insertText: "setRotationStyle",
    insertTextRules:
      monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
    kind: monaco.languages.CompletionItemKind.Function,
    range: new monaco.Range(1, 1, 1, 1),
  },
  {
    label: "changeXpos",
    insertText: "changeXpos ${1:}",
    insertTextRules:
      monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
    kind: monaco.languages.CompletionItemKind.Function,
    range: new monaco.Range(1, 1, 1, 1),
  },
  {
    label: "setXpos",
    insertText: "setXpos ${1:}",
    insertTextRules:
      monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
    kind: monaco.languages.CompletionItemKind.Function,
    range: new monaco.Range(1, 1, 1, 1),
  },
  {
    label: "changeYpos",
    insertText: "changeYpos ${1:}",
    insertTextRules:
      monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
    kind: monaco.languages.CompletionItemKind.Function,
    range: new monaco.Range(1, 1, 1, 1),
  },
  {
    label: "setYpos",
    insertText: "setYpos ${1:}",
    insertTextRules:
      monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
    kind: monaco.languages.CompletionItemKind.Function,
    range: new monaco.Range(1, 1, 1, 1),
  },
  {
    label: "changeXYpos",
    insertText: "changeXYpos ${1:X}, ${2:Y}",
    insertTextRules:
      monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
    kind: monaco.languages.CompletionItemKind.Function,
    range: new monaco.Range(1, 1, 1, 1),
  },
  {
    label: "bounceOffEdge",
    insertText: "bounceOffEdge ${1:}",
    insertTextRules:
      monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
    kind: monaco.languages.CompletionItemKind.Function,
    range: new monaco.Range(1, 1, 1, 1),
  },
];
const look_fn_completions = [
  {
    label: "say",
    insertText: "say ${1:}",
    insertTextRules:
      monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
    kind: monaco.languages.CompletionItemKind.Function,
    range: new monaco.Range(1, 1, 1, 1),
    detail: "This is a say function",
  },
  {
    label: "think",
    insertText: "think ${1:}",
    insertTextRules:
      monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
    kind: monaco.languages.CompletionItemKind.Function,
    range: new monaco.Range(1, 1, 1, 1),
    detail: "This is a think function",
  },
  {
    label: "setCostume",
    insertText: "setCostume ${1:costumeName}",
    insertTextRules:
      monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
    kind: monaco.languages.CompletionItemKind.Function,
    range: new monaco.Range(1, 1, 1, 1),
    detail: "This is a setCostume function",
  },
  {
    label: "nextCostume",
    insertText: "nextCostume",
    kind: monaco.languages.CompletionItemKind.Function,
    range: new monaco.Range(1, 1, 1, 1),
    detail: "This is a nextCostume function",
  },
  {
    label: "prevCostume",
    insertText: "prevCostume",
    kind: monaco.languages.CompletionItemKind.Function,
    range: new monaco.Range(1, 1, 1, 1),
    detail: "This is a prevCostume function",
  },
  {
    label: "animate",
    insertText: "animate ${1:name}",
    insertTextRules:
      monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
    kind: monaco.languages.CompletionItemKind.Function,
    range: new monaco.Range(1, 1, 1, 1),
    detail: "This is a animate function",
  },
  {
    label: "startScene ",
    insertText: "startScene ${1:costumeName}, ${2:wait}",
    insertTextRules:
      monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
    kind: monaco.languages.CompletionItemKind.Function,
    range: new monaco.Range(1, 1, 1, 1),
    detail: "This is a startScene function",
  },
  {
    label: "nextScene",
    insertText: "nextScene ${1:condition}",
    kind: monaco.languages.CompletionItemKind.Function,
    range: new monaco.Range(1, 1, 1, 1),
    detail: "This is a nextScene function",
  },
  {
    label: "Camera",
    insertText: "Camera",
    kind: monaco.languages.CompletionItemKind.Function,
    range: new monaco.Range(1, 1, 1, 1),
    detail: "This is a Camera function",
  },
  {
    label: "changeSize",
    insertText: "changeSize ${1:N}",
    insertTextRules:
      monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
    kind: monaco.languages.CompletionItemKind.Function,
    range: new monaco.Range(1, 1, 1, 1),
    detail: "This is a changeSize function",
  },
  {
    label: "setSize",
    insertText: "setSize ${1:G}, ${2:N}",
    insertTextRules:
      monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
    kind: monaco.languages.CompletionItemKind.Function,
    range: new monaco.Range(1, 1, 1, 1),
    detail: "This is a setSize function",
  },
  {
    label: "clearGraphEffects",
    insertText: "clearGraphEffects",
    kind: monaco.languages.CompletionItemKind.Function,
    range: new monaco.Range(1, 1, 1, 1),
    detail: "This is clearGraphEffects function",
  },
  {
    label: "show",
    insertText: "show",
    kind: monaco.languages.CompletionItemKind.Function,
    range: new monaco.Range(1, 1, 1, 1),
    detail: "This is show function",
  },
  {
    label: "hide",
    insertText: "hide",
    kind: monaco.languages.CompletionItemKind.Function,
    range: new monaco.Range(1, 1, 1, 1),
    detail: "This is hide function",
  },
  {
    label: "gotoFront",
    insertText: "gotoFront",
    kind: monaco.languages.CompletionItemKind.Function,
    range: new monaco.Range(1, 1, 1, 1),
    detail: "This is gotoFront function",
  },
  {
    label: "gotoBack",
    insertText: "gotoBack",
    kind: monaco.languages.CompletionItemKind.Function,
    range: new monaco.Range(1, 1, 1, 1),
    detail: "This is gotoBack function",
  },
  {
    label: "goBackLayers",
    insertText: "goBackLayers ${1:N}",
    insertTextRules:
      monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
    kind: monaco.languages.CompletionItemKind.Event,
    range: new monaco.Range(1, 1, 1, 1),
    detail: "This is goBackLayers function",
  },
];

const sound_fn_completions: monaco.languages.CompletionItem[] = [
  {
    label: "play",
    insertText: "play ${1:S}",
    insertTextRules:
      monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
    kind: monaco.languages.CompletionItemKind.Function,
    range: new monaco.Range(1, 1, 1, 1),
    detail: "play function",
  },
  {
    label: "play",
    insertText: "play ${1:S}, ${2:condition}",
    insertTextRules:
      monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
    kind: monaco.languages.CompletionItemKind.Function,
    range: new monaco.Range(1, 1, 1, 1),
    detail: "play function with condition",
  },
  {
    label: "stopAllSounds",
    insertText: "stopAllSounds",
    kind: monaco.languages.CompletionItemKind.Function,
    range: new monaco.Range(1, 1, 1, 1),
    detail: "This is stopAllSounds function",
  },
  {
    label: "changeEffect",
    insertText: "changeEffect ${1:S}, ${2:N}",
    insertTextRules:
      monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
    kind: monaco.languages.CompletionItemKind.Event,
    range: new monaco.Range(1, 1, 1, 1),
    detail: "This is changeEffect function",
  },
  {
    label: "setEffect",
    insertText: "setEffect ${1:S}, ${2:N}",
    insertTextRules:
      monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
    kind: monaco.languages.CompletionItemKind.Event,
    range: new monaco.Range(1, 1, 1, 1),
    detail: "This is setEffect function",
  },
  {
    label: "clearSoundEffect",
    insertText: "clearSoundEffect",
    kind: monaco.languages.CompletionItemKind.Function,
    range: new monaco.Range(1, 1, 1, 1),
    detail: "This is clearSoundEffect function",
  },
  {
    label: "changeVolume",
    insertText: "changeVolume ${1:N}",
    insertTextRules:
      monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
    kind: monaco.languages.CompletionItemKind.Function,
    range: new monaco.Range(1, 1, 1, 1),
    detail: "This is changeVolume function",
  },
  {
    label: "setVolume",
    insertText: "setVolume ${1:N}",
    insertTextRules:
      monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
    kind: monaco.languages.CompletionItemKind.Event,
    range: new monaco.Range(1, 1, 1, 1),
    detail: "This is setVolume function",
  },
];

const control_fn_completions: monaco.languages.CompletionItem[] = [
  {
    label: "wait",
    insertText: "wait ${1:seconds}",
    insertTextRules:
      monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
    kind: monaco.languages.CompletionItemKind.Function,
    range: new monaco.Range(1, 1, 1, 1),
    detail: "This is a wait function",
  },
  {
    label: "for",
    insertText: "for ${1:} {\n\t${2:}\t\n}",
    insertTextRules:
      monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
    kind: monaco.languages.CompletionItemKind.Function,
    range: new monaco.Range(1, 1, 1, 1),
    detail: "This is a for function",
  },
  {
    label: "forr",
    insertText: "for range :${1:N} {\n\t${2:code}\t\n}",
    insertTextRules:
      monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
    kind: monaco.languages.CompletionItemKind.Function,
    range: new monaco.Range(1, 1, 1, 1),
    detail: "This is a for range function",
  },
  {
    label: "stop",
    insertText: "stop ${1:all}",
    insertTextRules:
      monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
    kind: monaco.languages.CompletionItemKind.Function,
    range: new monaco.Range(1, 1, 1, 1),
    detail: "This is a stop function",
  },
  {
    label: "onCloned",
    insertText: "onCloned => {\n\t${1:param}\t\n}",
    insertTextRules:
      monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
    kind: monaco.languages.CompletionItemKind.Function,
    range: new monaco.Range(1, 1, 1, 1),
    detail: "This is a onCloned function",
  },
  {
    label: "clone",
    insertText: "clone ${1:param}",
    insertTextRules:
      monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
    kind: monaco.languages.CompletionItemKind.Function,
    range: new monaco.Range(1, 1, 1, 1),
    detail: "This is a clone function",
  },
  {
    label: "destroy",
    insertText: "destroy ${1:param}",
    insertTextRules:
      monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
    kind: monaco.languages.CompletionItemKind.Function,
    range: new monaco.Range(1, 1, 1, 1),
    detail: "This is a destroy function",
  },
  {
    label: "die",
    insertText: "die ${1:param}",
    insertTextRules:
      monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
    kind: monaco.languages.CompletionItemKind.Event,
    range: new monaco.Range(1, 1, 1, 1),
    detail: "This is a die function",
  },
  {
    label: "setDying",
    insertText: "setDying ${1:param}",
    insertTextRules:
      monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
    kind: monaco.languages.CompletionItemKind.Event,
    range: new monaco.Range(1, 1, 1, 1),
    detail: "This is a setDying function",
  },
];
// event function
const event_fn_completions: monaco.languages.CompletionItem[] = [
  {
    label: "onStart",
    insertText: "onStart => {\n\t${1:condition}\t\n}",
    insertTextRules:
      monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
    kind: monaco.languages.CompletionItemKind.Function,
    range: new monaco.Range(1, 1, 1, 1),
    detail: "This is onStart Function",
  },
  {
    label: "onAnyKey",
    insertText: "onAnyKey ${1:key} => {\n\t${2:condition}\t\n}",
    insertTextRules:
      monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
    kind: monaco.languages.CompletionItemKind.Function,
    range: new monaco.Range(1, 1, 1, 1),
    detail: "This is onAnyKey Function",
  },
  {
    label: "onKey",
    insertText: "onKey ${1:key},=> {\n\t${2:condition}\t\n}",
    insertTextRules:
      monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
    kind: monaco.languages.CompletionItemKind.Function,
    range: new monaco.Range(1, 1, 1, 1),
  },
  {
    label: "onEnd",
    insertText: "onEnd => {\n\t${1:condition}\t\n}",
    insertTextRules:
      monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
    kind: monaco.languages.CompletionItemKind.Function,
    range: new monaco.Range(1, 1, 1, 1),
  },
  {
    label: "onClick",
    insertText: "onClick => {\n\t${1:condition}\t\n}",
    insertTextRules:
      monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
    kind: monaco.languages.CompletionItemKind.Function,
    range: new monaco.Range(1, 1, 1, 1),
    detail: "This is a click event",
  },
  {
    label: "onMsg",
    insertText: "onMsg ${1:key},=> {\n\t${2:condition}\t\n}",
    insertTextRules:
      monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
    kind: monaco.languages.CompletionItemKind.Function,
    range: new monaco.Range(1, 1, 1, 1),
  },
  {
    label: "onScene",
    insertText: "onScene => {\n\t${1:condition}\t\n}",
    insertTextRules:
      monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
    kind: monaco.languages.CompletionItemKind.Function,
    range: new monaco.Range(1, 1, 1, 1),
  },
  {
    label: "onMoving",
    insertText: "onMoving => {\n\t${1:condition}\t\n}",
    insertTextRules:
      monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
    kind: monaco.languages.CompletionItemKind.Function,
    range: new monaco.Range(1, 1, 1, 1),
  },
  {
    label: "onTurning",
    insertText: "onTurning => {\n\t${1:condition}\t\n}",
    insertTextRules:
      monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
    kind: monaco.languages.CompletionItemKind.Function,
    range: new monaco.Range(1, 1, 1, 1),
  },
  {
    label: "broadcast",
    insertText: 'broadcast "${1:condition}"',
    insertTextRules:
      monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
    kind: monaco.languages.CompletionItemKind.Function,
    range: new monaco.Range(1, 1, 1, 1),
  },
];

const function_completions = [
  ...motion_fn_completions,
  ...event_fn_completions,
  ...control_fn_completions,
  ...sound_fn_completions,
  ...look_fn_completions,
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
export const options: monaco.editor.IStandaloneEditorConstructionOptions = {
  language: "spx", // define the language mode
  theme: "spx", // choose vs, hc-black, or vs-dark
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
  folding: true, // code folding
  wordWrap: "on", // word wrap
  wordWrapColumn: 40,
  tabSize: 4, // tab size
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
  tokenizer: {
    root: [
      [
        /[a-z_$][\w$]*/,
        {
          cases: {
            "@typeKeywords": "keyword",
            "@keywords": "keyword",
            "@functions": "keyword",
            "@default": "variable",
          },
        },
      ],
      [/[A-Z][\w$]*/, "type.identifier"],
      [/[{}[\]()]/, "@brackets"],

      [/\d*\.\d+([eE][-+]?\d+)?/, "number.float"],
      [/0[xX][0-9a-fA-F]+/, "number.hex"],
      [/\d+/, "number"],

      [/[;,.]/, "delimiter"],
      [/[=><!~?:&|+\-*/^%]+/, "operator"],

      [/"([^"\\]|\\.)*$/, "string.invalid"],
      [/"/, { token: "string.quote", bracket: "@open", next: "@string" }],
      [/'[^\\']'/, "string"],
      [/'/, "string.invalid"],
    ],
    comment: [
      [/[^/*]+/, "comment"],
      [/\/\*/, "comment", "@push"],
      ["\\*/", "comment", "@pop"],
      [/[/*]/, "comment"],
    ],
    string: [
      [/[^\\"]+/, "string"],
      [/"/, { token: "string.quote", bracket: "@close", next: "@pop" }],
    ],
    whitespace: [
      [/[ \t\r\n]+/, "white"],
      [/\/\*/, "comment", "@comment"],
      [/\/\/.*$/, "comment"],
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
  brackets,
  function_completions,
  motion_fn_completions,
  event_fn_completions,
  control_fn_completions,
  sound_fn_completions,
  look_fn_completions,
};
