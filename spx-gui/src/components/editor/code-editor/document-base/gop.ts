import { DefinitionKind, type DefinitionDocumentationItem, makeBasicMarkdownString, categories } from '../common'

// TODO: https://github.com/goplus/builder/issues/1257
// * Add more frequently-used statements for gop
// * Review naming for these definitions

export const forIterate: DefinitionDocumentationItem = {
  categories: [categories.control.flowControl],
  kind: DefinitionKind.Statement,
  definition: { name: 'for_iterate' },
  insertText: 'for ${1:i}, ${2:v} <- ${3:set} {\n\t${4:}\n}',
  overview: 'for i, v <- set {}',
  detail: makeBasicMarkdownString({
    en: 'Iterate within given set',
    zh: '遍历指定集合'
  })
}

export const forLoopWithCondition: DefinitionDocumentationItem = {
  categories: [categories.control.flowControl],
  kind: DefinitionKind.Statement,
  definition: { name: 'for_loop_with_condition' },
  insertText: 'for ${1:condition} {\n\t${2:}\n}',
  overview: 'for condition {}',
  detail: makeBasicMarkdownString({
    en: 'Loop with condition',
    zh: '条件循环'
  })
}

export const forLoopWithRange: DefinitionDocumentationItem = {
  categories: [categories.control.flowControl],
  kind: DefinitionKind.Statement,
  definition: { name: 'for_loop_with_range' },
  insertText: 'for ${1:i} <- ${2:start}:${3:end} {\n\t${4:}\n}',
  overview: 'for i <- start:end {}',
  detail: makeBasicMarkdownString({
    en: 'Loop with range',
    zh: '指定范围循环'
  })
}

export const ifStatement: DefinitionDocumentationItem = {
  categories: [categories.control.flowControl],
  kind: DefinitionKind.Statement,
  definition: { name: 'if_statement' },
  insertText: 'if ${1:condition} {\n\t${2:}\n}',
  overview: 'if condition {}',
  detail: makeBasicMarkdownString({
    en: 'If statement',
    zh: '条件语句'
  })
}

export const ifElseStatement: DefinitionDocumentationItem = {
  categories: [categories.control.flowControl],
  kind: DefinitionKind.Statement,
  definition: { name: 'if_else_statement' },
  insertText: 'if ${1:condition} {\n\t${2:}\n} else {\n\t${3:}\n}',
  overview: 'if condition {} else {}',
  detail: makeBasicMarkdownString({
    en: 'If else statement',
    zh: '条件否则语句'
  })
}

export const varDeclaration: DefinitionDocumentationItem = {
  categories: [categories.control.declaration],
  kind: DefinitionKind.Statement,
  definition: { name: 'var_declaration' },
  insertText: 'var ${1:name} ${2:type}',
  overview: 'var name type',
  detail: makeBasicMarkdownString({
    en: 'Variable declaration, e.g., `var count int`',
    zh: '变量声明，如 `var count int`'
  })
}

export const importStatement: DefinitionDocumentationItem = {
  categories: [categories.control.declaration],
  kind: DefinitionKind.Statement,
  definition: { name: 'import_declaration' },
  insertText: 'import "${1:package}"',
  overview: 'import "package"',
  detail: makeBasicMarkdownString({
    en: 'Import package declaration, e.g., `import "fmt"`',
    zh: '导入包声明，如 `import "fmt"`'
  })
}

export const functionDeclaration: DefinitionDocumentationItem = {
  categories: [categories.control.declaration],
  kind: DefinitionKind.Statement,
  definition: { name: 'func_declaration' },
  insertText: 'func ${1:name}(${2:params}) ${3:returnType} {\n\t${4}\n}',
  overview: 'func name(params) {}',
  detail: makeBasicMarkdownString({
    en: 'Function declaration, e.g., `func add(a int, b int) int {}`',
    zh: '函数定义，如 `func add(a int, b int) int {}`'
  })
}

export const println: DefinitionDocumentationItem = {
  categories: [categories.game.others],
  kind: DefinitionKind.Command,
  definition: {
    package: 'fmt',
    name: 'println'
  },
  insertText: 'println ${1}',
  overview: 'println msg, ...',
  detail: makeBasicMarkdownString({
    en: 'Print line, e.g., `println "Hello, world!"`',
    zh: '打印行，如 `println "Hello, world!"`'
  })
}
