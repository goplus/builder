/*
 * @Author: Yao xinyue kother@qq.com
 * @Date: 2024-01-18 01:56:51
 * @LastEditors: xuning 453594138@qq.com
 * @LastEditTime: 2024-02-21 16:17:42
 * @FilePath: /spx-gui/src/language/index.ts
 * @Description:
 */
import type { App } from 'vue'
import { useLanguageStore } from '@/store/modules/language'
import { createI18n } from 'vue-i18n'

export const initI18n = async (app: App) => {
  console.log('init i18n start')
  const messages = {
    en: {
      language: 'English',
      tab: {
        code: 'Code',
        sound: 'Sound',
        costume: 'Costume'
      },
      sounds: {
        hint: '🎵 Sound Edit',
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
        download: 'Download',
        save: 'Save'
      },
      toolbox: {
        event: 'Event',
        look: 'Look',
        sound: 'Sound',
        motion: 'Motion',
        control: 'Control'
      },
      top: {
        file: 'File',
        save: 'Save',
        publish: 'Publish',
        untitled: 'Untitled',
        code: 'Code',
        tutorial: 'Tutorial'
      },
      editor: {
        clear: 'clear',
        format: 'format'
      },
      component: {
        code: 'Code',
        stage: 'Stage',
        edit: 'Editor'
      },
      stage: {
        stage: 'Stage',
        sprite: 'Sprite',
        show: 'Show',
        size: 'Size',
        direction: 'Dir',
        upload: 'Upload',
        choose: 'Choose',
        add: 'Add New',
        run: 'Run',
        download: 'Download',
        save: 'Save'
      },
      list: {
        name: 'Name',
        costumes: 'Costumes',
        submit: 'Submit'
      }
    },
    zh: {
      language: '中文',
      tab: {
        code: '编程',
        sound: '音频',
        costume: '造型'
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
      },
      toolbox: {
        event: '事件',
        look: '外观',
        sound: '声音',
        motion: '运动',
        control: '控制'
      },
      top: {
        file: '文件',
        save: '保存',
        publish: '发布',
        untitled: '未命名',
        code: '代码',
        tutorial: '教程'
      },
      editor: {
        clear: '清空',
        format: '格式化'
      },
      component: {
        code: '编程',
        stage: '舞台',
        edit: '编辑'
      },
      stage: {
        stage: '舞台',
        sprite: '角色',
        show: '显示',
        size: '尺寸',
        direction: '方向',
        upload: '上传',
        choose: '选择',
        add: '新建',
        run: '运行',
        download: '下载',
        save: '保存'
      },
      list: {
        name: '精灵名称',
        costumes: '上传造型',
        submit: '提交'
      }
    }
  }

  if (useLanguageStore().getLanguage() === null) {
    useLanguageStore().setLanguage('en')
  }

  const i18n = createI18n({
    legacy: false,
    locale: useLanguageStore().getLanguage(),
    fallbackLocale: useLanguageStore().getLanguage(),
    messages
  })

  app.use(i18n)
  console.log('init i18n')
}
