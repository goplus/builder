/*
 * @Author: Yao xinyue kother@qq.com
 * @Date: 2024-01-18 01:56:51
 * @LastEditors: xuning 453594138@qq.com
 * @LastEditTime: 2024-03-13 15:25:17
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
        costume: 'Costume',
        signIn: 'Sign in',
        logOut: 'Logout'
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
        save: 'Save',
        record: 'Record',
        soundName: 'Sound Name',
        startRecording: 'Start Recording',
        stopRecording: 'Stop Recording'
      },
      toolbox: {
        event: 'Event',
        look: 'Look',
        sound: 'Sound',
        motion: 'Motion',
        control: 'Control'
      },
      topMenu: {
        file: 'File',
        save: 'Save',
        publish: 'Publish',
        untitled: 'Untitled',
        code: 'Code',
        tutorial: 'Tutorial',
        settings: 'Settings',
        theme: 'Theme',
        upload: 'Upload',
        load: 'Load',
        local: 'Local',
        cloud: 'Cloud',
        blank: 'Blank',
        video: 'Video',
        app: 'App',
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
        stop:'Stop',
        sprite: 'Sprite',
        spriteHolder: 'Please Input Name',
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
        selectCategory:'Please choose sprite category',
        uploadLimited:'A single image less than 2 MB'
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
      },
      project: {
        local: 'Local',
        cloud: 'Cloud',
        own: 'Own',
        load: 'Load',
        public: 'Public',
        private: 'Private',
        delete: 'Delete',
        search: 'Search',
        nothing: 'There\'s nothing.',
        publicStatus: 'status: Public',
        privateStatus: 'status: Private',
        create: 'create',
        update: 'update',
        removeTitle: 'Remove Project',
        removeCloudContent: 'Are you sure you want to remove this project ({name}) from cloud? ' +
            'This action cannot be undone.(This project will be deleted from local if it is existed as well)',
        removeLocalContent: 'Are you sure you want to remove this project ({name}) from local? ' +
            'This action cannot be undone.(Deleting local projects does not affect cloud projects)',
        removeMessage: 'Delete the current project and reload a blank project.',
        changeStatusTitle: 'Change Project Status',
        changeStatusContent: 'Are you sure to change the status of this project ({name})?',
        successMessage: 'change project status success',
        errMessage: 'change project status failed',
        yes: 'Yes',
        no: 'No',
        localProject: 'Local Project',
        cloudProjectInLocal: 'Cloud Project In Local',
      },
      library:{
        search: 'Search',
        public: 'public',
        private: 'private',
        empty:'There\'s nothing',
      },
      layer: {
        up: 'up',
        down: 'down',
        top: 'top',
        bottom: 'bottom'
      },
      message: {
        image: 'Unsupported image type',
        sound: 'Unsupported sound type',
        fileType: 'Unsupported file type',
        other: 'Invalid or non-existent uploaded files',
        success: 'Added {uploadSpriteName} to list successfully!',
        fail: 'Failed to upload {uploadSpriteName}',
        addSuccess: 'add {name} successfully!',
        update: 'update name successfully!',
        save: 'save successfully!',
        import: 'import successfully!',
        updateNameError: 'Cannot update asset name. Name is invalid! ',
      }
    },
    zh: {
      language: '中文',
      tab: {
        code: '编程',
        sound: '音频',
        costume: '造型',
        signIn: '登录',
        logOut: '登出'
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
        save: '保存',
        record: '录音',
        soundName: '音频名称',
        startRecording: '开始录音',
        stopRecording: '停止录音'
      },
      toolbox: {
        event: '事件',
        look: '外观',
        sound: '声音',
        motion: '运动',
        control: '控制'
      },
      topMenu: {
        file: '文件',
        save: '保存',
        publish: '发布',
        untitled: '未命名',
        code: '代码',
        tutorial: '教程',
        settings: '设置',
        theme: '主题',
        upload: '上传',
        load: '加载',
        blank: '空项目',
        local: '本地',
        cloud: '云端',
        video: '视频',
        app: '应用',
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
        stop:'停止',
        sprite: '角色',
        spriteHolder: '请输入名字',
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
        selectCategory:'请选择类别',
        uploadLimited:'单张图片小于 2 MB'
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
      },
      project: {
        local: '本地',
        cloud: '云端',
        own: '个人',
        load: '加载',
        public: '公开',
        private: '私有',
        delete: '删除',
        search: '搜索',
        nothing: '这里空空如也',
        publicStatus: '状态: 公开',
        privateStatus: '状态: 私有',
        create: '创建时间',
        update: '更新时间',
        removeTitle: '移除项目',
        removeCloudContent: '您确定要从云端移除这个项目（{name}）吗？此操作无法撤销。（如果此项目也存在于本地，则本地项目也将删除）',
        removeLocalContent: '您确定要从本地移除这个项目（{name}）吗？此操作无法撤销。（删除本地项目不会影响云端项目）',
        removeMessage: '删除当前项目并重新加载一个空项目',
        changeStatusTitle: '更改项目状态',
        changeStatusContent: '您确定要更改此项目（{name}）的状态吗？',
        successMessage: '项目状态更改成功',
        errMessage: '项目状态更改失败',
        yes: '是',
        no: '否',
        localProject: '本地项目',
        cloudProjectInLocal: '本地的云端项目',
      },
      library:{
        search: '搜索',
        public: '公开',
        private: '私有',
        empty: '空空如也',
      },
      layer: {
        up: '上移',
        down: '下移',
        top: '置顶',
        bottom: '置底'
      },
      message: {
        image: '不支持的图片类型',
        sound: '不支持的音频类型',
        fileType: '不支持的文件类型',
        other: '上传的文件无效或不存在',
        success: '成功将 {uploadSpriteName} 添加到列表！',
        fail: '上传 {uploadSpriteName} 失败',
        addSuccess: '成功添加 {name}！',
        update: '名称更新成功！',
        save: '保存成功！',
        import: '导入成功！',
        updateNameError: '无法更新资源名称。名称无效！',
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
