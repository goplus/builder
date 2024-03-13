/*
 * @Author: Zhang Zhi Yang
 * @Date: 2024-01-30 17:12:58
 * @LastEditors: Hu JingJing
 * @LastEditTime: 2024-03-06 21:31:47
 * @FilePath: /builder/spx-gui/src/components/code-editor/Language.ts
 * @Description: 
 */
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
    "=>",
];
const brackets = [
    { open: "{", close: "}", token: "delimiter.curly" },
    { open: "[", close: "]", token: "delimiter.bracket" },
    { open: "(", close: ")", token: "delimiter.parenthesis" },
];
export {
    keywords,
    typeKeywords,
    operators,
    brackets
}
