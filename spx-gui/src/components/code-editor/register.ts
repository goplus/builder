/*
 * @Author: Zhang Zhi Yang
 * @Date: 2024-01-30 17:29:35
 * @LastEditors: Zhang Zhi Yang
 * @LastEditTime: 2024-02-02 11:20:28
 * @FilePath: /builder/spx-gui/src/components/code-editor/register.ts
 * @Description:
 */
import { keywords, typeKeywords, LanguageConfig, MonarchTokensProviderConfig } from './language'
import wasmModuleUrl from '@/assets/format.wasm?url';
import function_completions from './snippet';
import { monaco } from '.';
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



const initFormat = async () => {
    const go = new Go();
    const result = await WebAssembly.instantiateStreaming(fetch(wasmModuleUrl), go.importObject)
    go.run(result.instance)
}

export const register = () => {
    monaco.languages.register({
        id: 'spx',
    })

    monaco.editor.defineTheme("myTransparentTheme", {
        base: "vs",
        inherit: true,
        rules: [
            { token: 'comment', foreground: '#ffbdb398', fontStyle: 'italic' },
            { token: 'string', foreground: '#F96B6B' },
            { token: 'operator', foreground: '#FF8C00' },
            { token: 'number', foreground: '#3AA6D4' },
            { token: 'keyword', foreground: '#fa81a899' },
            { token: 'typeKeywords', foreground: '#fa81a899' },
            { token: 'functions', foreground: '#000000' },
            { token: 'brackets', foreground: '#000000' },
        ],
        colors: {
            "editor.background": "#FFFFFF", // 透明背景
            "scrollbar.shadow": "#FFFFFF00", // 滚动条阴影颜色
            "scrollbarSlider.background": "#fa81a833", // 滚动条背景颜色
            "scrollbarSlider.hoverBackground": "#fa81a866", // 鼠标悬停时滚动条背景颜色
            "scrollbarSlider.activeBackground": "#fa81a899", // 激活时滚动条背景颜色
            "scrollbarSlider.width": "8px !important", // 激活时滚动条背景颜色
            "minimap.background": "#fa81a810", // 小地图背景颜色
            "minimapSlider.background": "#fa81a833", // 小地图滑块背景颜色
            "minimapSlider.hoverBackground": "#FFFFFF66", // 小地图滑块鼠标悬停背景颜色
            "minimapSlider.activeBackground": "#FFFFFF99", // 小地图滑块激活背景颜色
        },
    });

    monaco.languages.setLanguageConfiguration('spx', LanguageConfig)

    // Match token and highlight
    monaco.languages.setMonarchTokensProvider('spx', MonarchTokensProviderConfig);
    // Code hint
    monaco.languages.registerCompletionItemProvider('spx', completionItemProvider);
    initFormat()
}



