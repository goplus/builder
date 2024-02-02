/*
 * @Author: Yao xinyue kother@qq.com
 * @Date: 2024-01-18 01:56:51
 * @LastEditors: Xu Ning
 * @LastEditTime: 2024-02-01 14:51:57
 * @FilePath: /builder/spx-gui/src/language/index.ts
 * @Description:
*/
import { App } from "vue";
import { useLanguageStore } from "@/store/modules/language";
import { createI18n } from "vue-i18n";

export const initI18n = async (app:App) => {
    console.log("init i18n start")
    const messages = {
        en: {
            language: "English",
            tab: {
                code: 'Code',
                sound: 'Sounds',
                costume:'Costume',
            },
            sounds: {
                hint: '🎵 Sounds Edit',
                undo: 'Undo',
                reUndo: 'ReUndo',
                delete: 'Delete',
                forward: 'Forward',
                backward: 'Backward',
                mute: 'Mute',
                volumeHigh: 'Volume+',
                volumeLow: 'Volume-',
                replay: 'Replay',
                cut: 'Cut',
                paste: 'Paste',
                copy: 'Copy',
                insert: 'Insert',
                download: 'Download'
            }
        },
        zh: {
            language: "中文",
            tab: {
                code: '编程',
                sound: '音频',
                costume: '造型',
            },
            sounds: {
                hint: '🎵 音频编辑',
                undo: '撤销',
                reUndo: '返回',
                delete: '删除',
                forward: '快进',
                backward: '后退',
                mute: '静音',
                volumeHigh: '音量+',
                volumeLow: '音量-',
                volume: '音量',
                replay: '重放',
                cut: '剪切',
                paste: '粘贴',
                copy: '复制',
                insert: '插入',
                download: '下载'
            }
        }
    };

    if (useLanguageStore().getLanguage() === null) {
        useLanguageStore().setLanguage('en');
    }

    const i18n = createI18n({
        legacy: false,
        locale: useLanguageStore().getLanguage(),
        fallbackLocale: useLanguageStore().getLanguage(),
        messages,
    });

    app.use(i18n)
    console.log("init i18n")
}


