/*
 * @Author: Zhang Zhi Yang
 * @Date: 2024-01-30 17:29:35
 * @LastEditors: Zhang Zhi Yang
 * @LastEditTime: 2024-02-01 15:55:04
 * @FilePath: /builder/spx-gui/src/components/code-editor/register.ts
 * @Description: 
 */
import { keywords, typeKeywords, LanguageConfig, MonarchTokensProviderConfig } from './Language'
import wasmModuleUrl from '/wasm/format.wasm?url&wasmModule';
import function_completions from './Snippet';
import { monaco } from './CodeEditor';
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

const completionItemProvider: monaco.languages.CompletionItemProvider = {
    provideCompletionItems: (model, position) => {
        var word = model.getWordUntilPosition(position);
        var range = {
            startLineNumber: position.lineNumber,
            endLineNumber: position.lineNumber,
            startColumn: word.startColumn,
            endColumn: word.endColumn,
        };
        let suggestions: monaco.languages.CompletionItem[] = completionItem(range)
        return { suggestions }
    }
}



const initFormat = async () => {
    const go = new Go();
    const result = await WebAssembly.instantiateStreaming(fetch(wasmModuleUrl), go.importObject)
    go.run(result.instance)
}

export const register=()=>{
    monaco.languages.register({
        id: 'spx',
    })
    monaco.languages.setLanguageConfiguration('spx', LanguageConfig)
    
    // Match token and highlight
    monaco.languages.setMonarchTokensProvider('spx', MonarchTokensProviderConfig);
    // Code hint
    monaco.languages.registerCompletionItemProvider('spx', completionItemProvider);
    initFormat()
}



