/*
 * @Author: Zhang Zhi Yang
 * @Date: 2024-01-16 10:59:27
 * @LastEditors: Zhang Zhi Yang
 * @LastEditTime: 2024-01-18 17:57:39
 * @FilePath: /builder/spx-gui/src/plugins/code-editor/index.ts
 * @Description: 
 */
import * as monaco from 'monaco-editor'
import { keywords, typeKeywords, options, MonarchTokensProviderConfig, LanguageConfig, functions } from "./config.ts"

import wasmModuleUrl from '/wasm/main.wasm?url&wasmModule';



monaco.editor.registerCommand(
    "editor.suggest",
    (accessor, ...args) => {
        // DO SOMETHING
        console.log(accessor, args)
        const editor = accessor.get(monaco.editor.IStandaloneCodeEditor);

        // Perform an edit operation to move the cursor to the first line
        editor.executeEdits('', [{
            range: new monaco.Range(1, 1, 1, 1),
            text: ''
        }]);
    }
);

const initCodeEditor = async () => {




    monaco.languages.register({
        id: 'spx',
    })
    monaco.languages.setLanguageConfiguration('spx', LanguageConfig)

    // Match token and highlight
    monaco.languages.setMonarchTokensProvider('spx', MonarchTokensProviderConfig);

    // Code hint
    monaco.languages.registerCompletionItemProvider('spx', {
        provideCompletionItems: (model, position) => {
            var word = model.getWordUntilPosition(position);
            var range = {
                startLineNumber: position.lineNumber,
                endLineNumber: position.lineNumber,
                startColumn: word.startColumn,
                endColumn: word.endColumn,
            };
            let suggestions: monaco.languages.CompletionItem[] = [
                ...keywords.map((keyword) => ({
                    label: keyword,
                    insertText: keyword,
                    kind: monaco.languages.CompletionItemKind.Keyword,
                    detail: 'This is a keyword',
                    range
                })),
                ...functions.map((func) => ({
                    label: func,
                    // If you can match the function at the beginning of 'on', The content inserted is onFunc => { }
                    // Then the input box will be jumped to the function
                    insertText: func.match(/^on/) ? `${func} => {\n\t\${1:condition}\t\n}` : `${func}`,
                    insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
                    kind: monaco.languages.CompletionItemKind.Function,
                    detail: 'This is a function',
                    range: {
                        startLineNumber: position.lineNumber,
                        endLineNumber: position.lineNumber,
                        startColumn: word.startColumn,
                        endColumn: word.endColumn
                    },
                    command: {
                        id: "editor.suggest",
                        arguments: ['est1']
                    }
                })),
                ...typeKeywords.map((typeKeyword) => ({
                    label: typeKeyword,
                    insertText: typeKeyword,
                    kind: monaco.languages.CompletionItemKind.TypeParameter,
                    detail: 'This is a type',
                    range
                }))

            ]
            return { suggestions }
        }
    })
    console.log(window.Go)
    const go = new window.Go();
    const result = await WebAssembly.instantiateStreaming(fetch(wasmModuleUrl), go.importObject)
    await go.run(result.instance)
}
export {
    monaco,
    keywords,
    options,
    initCodeEditor
}
