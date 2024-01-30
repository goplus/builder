/*
 * @Author: Zhang Zhi Yang
 * @Date: 2024-01-16 10:59:27
 * @FilePath: /builder/spx-gui/src/plugins/code-editor/index.ts
 * @Description: 
 */
import * as monaco from 'monaco-editor'
import { keywords, typeKeywords, options, MonarchTokensProviderConfig, LanguageConfig, function_completions } from "./config.ts"
import { editerTheme } from "@/assets/theme.ts";
import wasmModuleUrl from '/wasm/format.wasm?url&wasmModule';


const initFormat = async () => {
    // console.log(window.Go)
    const go = new Go();
    console.log(go)
    const result = await WebAssembly.instantiateStreaming(fetch(wasmModuleUrl), go.importObject)
    console.log("result")
    // TODO:abstract the logic of wasm
    go.run(result.instance)
}

const initCodeEditor = async () => {

    monaco.languages.register({
        id: 'spx',
    })
    monaco.languages.setLanguageConfiguration('spx', LanguageConfig)

    // Match token and highlight
    monaco.languages.setMonarchTokensProvider('spx', MonarchTokensProviderConfig);
    // Code hint
    monaco.languages.registerCompletionItemProvider('spx', completionItemProvider);

    // set theme
    monaco.editor.defineTheme('spx', {
        base: 'vs',
        inherit: true,
        rules: [
            { token: 'comment', foreground: editerTheme.comment,},
            { token: 'keyword', foreground: editerTheme.keyword },
            { token: 'string', foreground: editerTheme.string },
            { token: 'number', foreground: editerTheme.number },
            { token: 'function', foreground: editerTheme.function },
            { token: 'operator', foreground: editerTheme.operator },
        ],
        colors: {
            // "editor.background": editerTheme.background,
        }
    });
    initFormat()
}

const completionItemProvider: monaco.languages.CompletionItemProvider = {
    provideCompletionItems: (model, position) => {
        const word = model.getWordUntilPosition(position);
        const range = {
            startLineNumber: position.lineNumber,
            endLineNumber: position.lineNumber,
            startColumn: word.startColumn,
            endColumn: word.endColumn,
        };
        const suggestions: monaco.languages.CompletionItem[] = completionItem(range)
        return { suggestions }
    }
}

function completionItem(range: monaco.IRange | monaco.languages.CompletionItemRanges): monaco.languages.CompletionItem[] {
    return [
        ...keywords.map((keyword) => ({
            label: keyword,
            insertText: keyword,
            kind: monaco.languages.CompletionItemKind.Keyword,
            detail: 'This is a keyword',
            range
        })),
        ...function_completions.map(e => ({
            ...e,
            range
        })),
        ...typeKeywords.map((typeKeyword) => ({
            label: typeKeyword,
            insertText: typeKeyword,
            kind: monaco.languages.CompletionItemKind.TypeParameter,
            detail: 'This is a type',
            range
        }))
    ]
}

export {
    monaco,
    keywords,
    options,
    initCodeEditor
}