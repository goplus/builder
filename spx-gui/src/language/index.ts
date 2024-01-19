/*
 * @Author: Yao xinyue kother@qq.com
 * @Date: 2024-01-18 01:56:51
 * @LastEditors: Xu Ning
 * @LastEditTime: 2024-01-17 21:26:53
 * @FilePath: src/language/index.ts
 * @Description:
*/
import { App } from "vue";
import { useLanguageStore } from "store/modules/language";
import { useLanguageStore } from "@/store/modules/language";
import { createI18n } from "vue-i18n";

export const initI18n = async (app:App) => {
    console.log("init i18n start")
    const messages = {
        en: {
            language: "English",
            tab: {
                code: 'Code',
                sound: 'Sound'
            },
            sounds: {
                hint: 'Sounds',
                undo: 'Undo',
                reUndo: 'ReUndo',
                delete: 'Delete',
                forward: 'Forward',
                rewind: 'Rewind',
                mute: 'Mute',
                volume: 'Volume',
                replay: 'Replay',
            }
        },
        zh: {
            language: "中文",
            tab: {
                code: '编程',
                sound: '音频'
            },
            sounds: {
                hint: '音频',
                undo: '撤销',
                reUndo: '返回',
                delete: '删除',
                forward: '快进',
                rewind: '倒带',
                mute: '静音',
                volume: '音量',
                replay: '重放',
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


