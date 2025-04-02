<template>
    <div class="node-task-editor">
        <div class="node-task-header">
            <span>{{ $t({ en: 'Node Task Editor', zh: '节点任务编辑' }) }}</span>
            <span>{{ $t({ en: 'Node Task Count:', zh: '节点任务数量：' }) }} {{ props.nodeTasks.length }}</span>
        </div>
        <div class="node-task-content">
            <UIForm :form="form">
                <UICard class="node-task-item" v-for="(task, index) in form.value.nodeTasks" :key="task.name.en">  
                    <div class="node-task-item-header">
                        <span>{{ $t({ en: 'Node Task', zh: '节点任务' }) }} {{ index + 1 }}</span>
                        <UIButton type="danger" icon="trash" @click="form.value.nodeTasks.splice(index, 1); emit('update:nodeTasks', form.value.nodeTasks)">
                            {{ $t({ en: 'Delete', zh: '删除' }) }}
                        </UIButton>
                    </div>
                    <UIDivider />
                    <div class="node-task-item-content">
                        <UIFormItem label="节点名称">
                            <UITextInput v-model:value="task.name.zh" placeholder="请输入节点任务名称" />
                        </UIFormItem>
                        <UIFormItem label="name">
                            <UITextInput v-model:value="task.name.en" placeholder="Enter node task name" />
                        </UIFormItem>
                        <UIFormItem :label="$t({zh: '触发时间', en: 'Trigger time'})">
                            <UINumberInput v-model:value="task.triggerTime" placeholder="请输入节点任务触发时间" />
                        </UIFormItem>
                        <UIFormItem :label="$t({zh: '节点视频', en: 'Node task video'})">
                            <UITextInput v-model:value="task.video" readonly />
                            <UIButton type="primary" icon="file" @click="handleUploadVideo(index)" style="width: 150px; margin-left: 20px;">
                                {{ $t({ en: 'Upload', zh: '上传' }) }}
                            </UIButton>
                        </UIFormItem>
                    </div>
                </UICard>
            </UIForm>
        </div>
        <UIButton type="primary" icon="plus" @click="handleCreateTask">
            {{ $t({ en: 'Add Task', zh: '添加任务' }) }}
        </UIButton>
    </div>
</template>

<script lang="ts" setup>
import { ref } from 'vue'
import { UICard, UIForm, UIDivider, UIButton, UIFormItem, UITextInput, UINumberInput } from '@/components/ui'
import { useForm } from '@/components/ui/form'
import type { NodeTask, Step } from '@/apis/guidance'
import { TaggingHandlerType } from '@/apis/guidance'
import { selectImg } from '@/utils/file'
import { fromNativeFile } from '@/models/common/file'
import { useNetwork } from '@/utils/network'
import { saveFile, universalUrlToWebUrl } from '@/models/common/cloud'
import { useMessage } from '@/components/ui/message'
import { useI18n } from '@/utils/i18n'

const { t } = useI18n()


const props = defineProps<{
    nodeTasks: NodeTask[]
}>()

const emit = defineEmits(['update:nodeTasks'])
const form = useForm({
    nodeTasks: [props.nodeTasks]
});

const m = useMessage()
const { isOnline } = useNetwork()
async function handleUploadVideo(index: number) {
    try {
        const video = await selectImg()
        const file = await fromNativeFile(video)
        if (isOnline) {
            const fileUrl = await m.withLoading(saveFile(file), t({ en: 'Uploading image...', zh: '正在上传图片...' }))
            const url = await universalUrlToWebUrl(fileUrl)
            form.value.nodeTasks[index].video = url
        }
    } catch (err) {
        m.error(t({
            en: 'Failed to upload video',
            zh: '上传视频失败'
        }))
    }
    
}

function handleCreateTask() {
    const newTask: NodeTask = {
        name: {
            zh: '',
            en: ''
        },
        video: '',
        steps: [
            {
                title: {
                    zh: '',
                    en: ''
                }, // 步骤名称
                description: {
                    zh: '',
                    en: ''
                }, // 步骤描述
                tip: {
                    zh: '',
                    en: ''
                }, // 互动提示（需要条件触发）
                duration: 0, // 用户当前步骤卡顿距离给提示的时长（单位：秒）
                target: '', // 目标元素语义化标注的key（用于高亮元素）
                taggingHandler: {'': TaggingHandlerType.ClickToNext}, // 元素的语义化标注 及其 处理方式
                type: 'coding', // 存在两种类型的步骤，分别是Following步骤和Coding步骤
                isCheck: false, // 该步骤是否涉及快照比对
                isApiControl: false, // 是否需要去控制API Reference的展示
                apis: [''], // 该步骤中需要展示的API Reference的definition列表
                isAssetControl: false, // 是否需要去控制素材的展示
                assets: [''], // 该步骤中需要被展示的素材的id列表
                isSpriteControl: false, // 是否需要去控制精灵的展示
                sprites: [''], // 该步骤中需要被展示的精灵的id列表
                isSoundControl: false, // 是否需要去控制声音的展示
                sounds: [''], // 该步骤中需要被展示的声音的id列表
                isCostumeControl: false, // 是否需要去控制造型的展示
                costumes: [''], // 该步骤中需要被展示的造型的id列表
                isAnimationControl: false, // 是否需要去控制动画的展示
                animations: [''], // 该步骤中需要被展示的动画的id列表
                isWidgetControl: false, // 是否需要去控制组件的展示
                widgets: [''], // 该步骤中需要被展示的组件的id列表
                isBackdropControl: false, // 是否需要去控制背景的展示
                backdrops: [''], // 该步骤中需要被展示的背景的id列表
                snapshot: {
                    startSnapshot: '', // 初始快照
                    endSnapshot: '' // 结束快照
                },
                coding: {
                    // coding任务独有的数据结构
                    path: '', // 编码文件路径
                    codeMasks: [
                        {
                            startPos: {line: 0, column: 0}, // 答案展示的开始位置
                            endPos: {line: 0, column: 0}  // 答案展示的结束位置
                        } 
                    ], // 完形填空的mask数组，一个mask对应一个空的答案
                    startPosition: {line: 0, column: 0}, // 答案展示的开始位置
                    endPosition: {line: 0, column: 0} // 答案展示的结束位置
                }
            }
        ],
        triggerTime: 0
    }
    form.value.nodeTasks.push(newTask)
    emit('update:nodeTasks', form.value.nodeTasks)
}
</script>

<style lang="scss" scoped>
.node-task-editor {
    .node-task-header {
        margin-bottom: 20px;
        font-size: 20px;
        font-weight: bold;
        display: flex;
        justify-content: space-between;
        align-items: center;
        padding: 0 30px;
    }
    .node-task-content {
        .node-task-item {
            box-sizing: border-box;
            padding: 20px 20px;
            margin-bottom: 20px;
        
            .node-task-item-header {
                font-size: 20px;
                font-weight: bold;
                margin-bottom: 20px;
                padding: 0 30px;
                display: flex;
                justify-content: space-between;
                align-items: center;
            }
            .node-task-item-content {
                padding: 20px;
            }
        }
    }

}
</style>