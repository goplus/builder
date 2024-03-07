/*
 * @Author: Yao xinyue kother@qq.com
 * @Date: 2024-01-18 01:56:51
 * @LastEditors: Zhang Zhi Yang
 * @LastEditTime: 2024-03-07 12:17:00
 * @FilePath: \spx-gui\src\language\index.ts
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
        tutorial: 'Tutorial',
        settings: 'Settings'
      },
      editor: {
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
        submit: 'Submit',
        category:'Category',
        public:'IsPublic',
        inputName:'Please input sprite name',
        selectCategory:'Please choose sprite category'
      },
      scratch: {
        import: 'Import Assets from Scratch',
        upload: 'Upload .sb3 Files',
        importToSpx:'Import to My Project',
        uploadToPrivateLibrary: 'Upload to private library',
        download:'Download'
      },
      category:{
        animals:'Animals',
        people:'People',
        sports:'Sports',
        food:'Food',
        fantasy:'Fantasy'
      },
      publicState:{
        notPublish:'Not publish',
        private:'Only publish to private asset library',
        public:'Publish to public asset library'
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
        download: '下载',
        save: '保存'
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
        tutorial: '教程',
        settings: '设置'
      },
      editor: {
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
        submit: '提交',
        category:'精灵类别',
        public:'是否公开',
        inputName:'请输入精灵名称',
        selectCategory:'请选择类别'
      },
      scratch: {
        import: '导入 Scratch 素材',
        upload: '上传 .sb3 文件',
        importToSpx:'导入至项目',
        uploadToPrivateLibrary: '上传到私人素材库',
        download:'下载'
      },
      category:{
        animals:'动物',
        people:'人物',
        sports:'体育',
        food:'食物',
        fantasy:'幻想'
      },
      publicState:{
        notPublish: '不上传',
        private: '仅上传到个人素材库',
        public: '上传到公开素材库',
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
