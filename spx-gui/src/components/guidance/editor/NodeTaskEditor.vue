<template>
  <div class="node-task-editor">
    <div class="node-task-header">
      <span>{{ $t({ en: 'Node Task Editor', zh: '节点任务编辑' }) }}</span>
    </div>
    <div class="node-task-content">
      <UIForm :form="form">
        <UICard class="node-task-item">
          <div class="node-task-item-content">
            <UIFormItem label="节点名称">
              <UITextInput v-model:value="form.value.nodeTask.name.zh" placeholder="请输入节点任务名称" />
            </UIFormItem>
            <UIFormItem label="name">
              <UITextInput v-model:value="form.value.nodeTask.name.en" placeholder="Enter node task name" />
            </UIFormItem>
            <UIFormItem :label="$t({ zh: '触发时间', en: 'Trigger time' })">
              <UINumberInput v-model:value="form.value.nodeTask.triggerTime" placeholder="请输入节点任务触发时间" />
            </UIFormItem>
            <UIFormItem :label="$t({ zh: '节点视频', en: 'Node task video' })">
              <UITextInput v-model:value="form.value.nodeTask.video" readonly />
              <UIButton type="primary" icon="file" style="width: 150px; margin-left: 20px" @click="handleUploadVideo">
                {{ $t({ en: 'Upload', zh: '上传' }) }}
              </UIButton>
            </UIFormItem>
          </div>
          <UIDivider />
          <div class="base-info-header">
            <span>{{ $t({ zh: '当前节点的步骤列表', en: 'NodeList of current level' }) }}</span>
            <UIButton type="primary" @click="handleAddStep">
              {{ $t({ zh: '添加步骤', en: 'Add nodeTask' }) }}
            </UIButton>
          </div>
          <div class="node-list">
            <div class="node-item" v-for="(step, index) in form.value.nodeTask.steps" :key="step.title.en">
              <div class="node-top">
                <div class="node-top-left">
                  <div class="num">{{ index + 1 }}</div>
                  <div class="text">{{ $t(step.title) }}</div>
                  <div class="status">未完成</div>
                  <div class="type" :class="[`type-${step.type.toLowerCase()}`]">{{ step.type }}</div>
                </div>
                <div class="node-top-right">
                  <div><img src="../icons/edit-level.svg" alt="edit step" @click="handleToStep(index)" /></div>
                  <div><img src="../icons/delete.svg" alt="delete step" @click="handleRemoveStep(index)" /></div>
                </div>
              </div>
            </div>
          </div>
        </UICard>
      </UIForm>
    </div>
  </div>
</template>

<script lang="ts" setup>
import { UICard, UIForm, UIButton, UIFormItem, UITextInput, UINumberInput, UIDivider } from '@/components/ui'
import { useForm } from '@/components/ui/form'
import type { NodeTask } from '@/apis/guidance'
import { selectImg } from '@/utils/file'
import { fromNativeFile } from '@/models/common/file'
import { useNetwork } from '@/utils/network'
import { saveFile, universalUrlToWebUrl } from '@/models/common/cloud'
import { useMessage } from '@/components/ui/message'
import { useI18n } from '@/utils/i18n'
import { watch } from 'vue'

const props = defineProps<{
  nodeTask: NodeTask
}>()

const emit = defineEmits<{
  (e: 'update:nodeTask', nodeTask: NodeTask): void
  (e: 'selectCurrentStep', index: number): void
}>()

const { t } = useI18n()
const { isOnline } = useNetwork()
const m = useMessage()
const form = useForm({
  nodeTask: [props.nodeTask]
})

async function handleUploadVideo() {
  try {
    const video = await selectImg()
    const file = await fromNativeFile(video)
    if (isOnline) {
      const fileUrl = await m.withLoading(saveFile(file), t({ en: 'Uploading image...', zh: '正在上传图片...' }))
      const url = await universalUrlToWebUrl(fileUrl)
      form.value.nodeTask.video = url
    }
  } catch (err) {
    m.error(
      t({
        en: 'Failed to upload video',
        zh: '上传视频失败'
      })
    )
  }
}

function handleRemoveStep(index: number) {
  form.value.nodeTask.steps.splice(index, 1)
}

function handleToStep(index: number) {
  emit('selectCurrentStep', index)
}

function handleAddStep() {
  form.value.nodeTask.steps.push({
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
    taggingHandler: {}, // 元素的语义化标注 及其 处理方式
    type: 'coding', // 存在两种类型的步骤，分别是Following步骤和Coding步骤
    isCheck: false, // 该步骤是否涉及快照比对
    isApiControl: false, // 是否需要去控制API Reference的展示
    apis: [], // 该步骤中需要展示的API Reference的definition列表
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
          startPos: { line: 0, column: 0 }, // 答案展示的开始位置
          endPos: { line: 0, column: 0 } // 答案展示的结束位置
        }
      ], // 完形填空的mask数组，一个mask对应一个空的答案
      startPosition: { line: 0, column: 0 }, // 答案展示的开始位置
      endPosition: { line: 0, column: 0 } // 答案展示的结束位置
    }
  })
}

watch(
  () => props.nodeTask,
  (newNodeTask) => {
    form.value.nodeTask = newNodeTask
  },
  { deep: true, immediate: true }
)

watch(
  () => form.value.nodeTask,
  (newValue) => {
    emit('update:nodeTask', newValue)
  },
  { deep: true }
)
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

.base-info-header {
  font-size: 20px;
  font-weight: bold;
  margin: 20px 0;
  padding: 0 30px;
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.node-list {
  margin: 20px 0;
  min-height: 200px;
  .node-item {
    width: 100%;
    box-shadow: 0 1px 2px 0 rgba(0, 0, 0, 0.2);
    border: 1px solid #e5e7eb;
    border-radius: 20px;
    margin-top: 20px;
    padding: 15px 30px;
    transition: all 0.2s ease-in-out;

    &:hover {
      box-shadow: 0 4px 10px 0 rgba(0, 0, 0, 0.3);
    }
    .node-top {
      display: flex;
      height: 50px;
      justify-content: space-between;
      .node-top-left {
        display: flex;
        align-items: center;
        .status {
          font-size: 15px;
          color: #0ec1d0;
          margin-left: 10px;
          background-color: #d4f9ff;
          padding: 5px 10px;
          border-radius: 5px;
        }
        .type {
          font-size: 15px;
          margin-left: 10px;
          color: white;
          padding: 5px 10px;
          border-radius: 5px;
        }
        .text {
          font-size: 16px;
        }
        .num {
          font-size: 20px;
          font-weight: bold;
          border-radius: 50%;
          width: 30px;
          height: 30px;
          display: flex;
          justify-content: center;
          align-items: center;
          background-color: #0ec1d0;
          color: #fff;
          margin-right: 10px;
        }
      }
      .node-top-right {
        display: flex;
        align-items: center;
        div {
          padding: 0 10px;
          cursor: pointer;
          img {
            width: 20px;
            height: 20px;
          }
        }
      }
    }
  }
}

.type-coding {
  background: rgb(38, 116, 59);
}

.type-following {
  background: rgb(33, 98, 171);
}
</style>
