<template>
  <div class="level-editor">
    <div class="opt">
      <div>
        <UIButton type="primary" @click="handleOpt('back')">
          {{ $t({ zh: '返回故事线', en: 'Back' }) }}
        </UIButton>
      </div>
      <div>
        <UIButton type="primary" @click="handleOpt('save')">
          {{ $t({ zh: '保存', en: 'Save' }) }}
        </UIButton>
      </div>
    </div>
    <div class="editor-info">
      <div class="editor-info-header">
        <UITabs v-model:value="selectedTab">
          <UITab value="level">{{ $t({ en: 'Level', zh: '关卡' }) }}</UITab>
          <UITab value="nodeTask">{{ $t({ en: 'Node tasks', zh: '节点任务' }) }}</UITab>
          <UITab value="step">{{ $t({ en: 'Steps', zh: '步骤' }) }}</UITab>
        </UITabs>
      </div>
      <div class="editor-info-content">
        <UICard v-show="selectedTab === 'level'" class="base-info">
          <div class="base-info-header">
            <span>{{ $t({ zh: '关卡基本信息', en: 'Level basic info' }) }}</span>
          </div>
          <UIDivider />
          <UIForm :form="form">
            <div class="base-info-content">
              <div class="content-top">
                <div class="title">
                  <UIFormItem label="标题">
                    <UITextInput v-model:value="form.value.titleZh" placeholder="请输入关卡标题" />
                  </UIFormItem>
                  <UIFormItem label="Title">
                    <UITextInput v-model:value="form.value.titleEn" placeholder="Please enter the title of the level" />
                  </UIFormItem>
                </div>
                <div class="cover">
                  <UIFormItem label="封面">
                    <UIImg
                      :src="form.value.cover || './icons/no-img.svg'"
                      style="height: 120px; width: 200px"
                      :loading="loading"
                      size="contain"
                    />
                    <UIButton
                      type="primary"
                      icon="file"
                      style="width: 120px; margin-left: 20px"
                      @click="handleUploadImg"
                    >
                      {{ $t({ en: 'Upload', zh: '上传' }) }}
                    </UIButton>
                  </UIFormItem>
                </div>
              </div>
              <div class="content-center">
                <UIFormItem label="关卡简介">
                  <UITextInput v-model:value="form.value.descriptionZh" type="textarea" placeholder="请输入关卡简介" />
                </UIFormItem>
                <UIFormItem label="Description">
                  <UITextInput
                    v-model:value="form.value.descriptionEn"
                    type="textarea"
                    placeholder="Please enter the description of the level"
                  />
                </UIFormItem>
              </div>
            </div>
          </UIForm>
          <UIDivider />
          <div class="base-info-header">
            <span>{{ $t({ zh: '当前关卡的节点任务列表', en: 'NodeList of current level' }) }}</span>
            <UIButton type="primary" @click="handleCreateTask">
              {{ $t({ zh: '添加节点任务', en: 'Add nodeTask' }) }}
            </UIButton>
          </div>
          <div class="node-list">
            <div v-for="(node, index) in form.value.nodeTasks" :key="node.name.en" class="node-item">
              <div class="node-top">
                <div class="node-top-left">
                  <div class="num">{{ index + 1 }}</div>
                  <div class="text">{{ $t(node.name) }}</div>
                  <div class="status">未完成</div>
                </div>
                <div class="node-top-right">
                  <div><img src="../icons/edit-level.svg" alt="edit nodetask" @click="handleNodeEdit(index)" /></div>
                  <div><img src="../icons/delete.svg" alt="delete nodetask" @click="handleRemoveNode(index)" /></div>
                </div>
              </div>
            </div>
          </div>
        </UICard>
        <NodeTaskEditor
          v-show="selectedTab === 'nodeTask'"
          v-model:node-task="currentNodeTaskInfo"
          @select-current-step="handleToStep"
        />
        <StepEditor v-show="selectedTab === 'step'" v-model:step="currentStepInfo" />
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, watch } from 'vue'
import {
  UIForm,
  UIFormItem,
  UITextInput,
  UICard,
  useForm,
  UIImg,
  UITab,
  UITabs,
  UIDivider,
  UIButton
} from '@/components/ui'
import type { Level, NodeTask } from '@/apis/guidance'
import { type Step } from '@/apis/guidance'
import { useI18n } from '@/utils/i18n'
import { useNetwork } from '@/utils/network'
import { selectImg } from '@/utils/file'
import { fromNativeFile } from '@/models/common/file'
import { saveFile, universalUrlToWebUrl } from '@/models/common/cloud'
import { useMessage } from '@/components/ui/message'
import NodeTaskEditor from './NodeTaskEditor.vue'
import StepEditor from './StepEditor.vue'

const props = defineProps<{
  level: Level
}>()
const emit = defineEmits<{
  (e: 'update:level', data: Level): void
  (e: 'back'): void
}>()

const { t } = useI18n()
const m = useMessage()
const loading = ref<boolean>(false)
const currentNodeTaskInfo = ref<NodeTask>(props.level.nodeTasks[0])
const currentStepInfo = ref<Step>(props.level.nodeTasks[0].steps[0])

const selectedTab = ref<'level' | 'nodeTask' | 'step'>('level')
const form = useForm({
  titleZh: [props.level.title.zh],
  titleEn: [props.level.title.en],
  descriptionZh: [props.level.description.zh],
  descriptionEn: [props.level.description.en],
  cover: [props.level.cover],
  video: [props.level.video],
  achievement: [props.level.achievement],
  nodeTasks: [props.level.nodeTasks],
  placement: [props.level.placement]
})

watch(
  () => props.level,
  (newVal) => {
    form.value.titleZh = newVal.title.zh
    form.value.titleEn = newVal.title.en
    form.value.descriptionZh = newVal.description.zh
    form.value.descriptionEn = newVal.description.en
    form.value.cover = newVal.cover
    form.value.video = newVal.video
    form.value.achievement = newVal.achievement
    form.value.nodeTasks = newVal.nodeTasks
    form.value.placement = newVal.placement
  }
)
watch(
  () => form.value,
  (newVal) => {
    emit('update:level', {
      title: {
        zh: newVal.titleZh,
        en: newVal.titleEn
      },
      description: {
        zh: newVal.descriptionZh,
        en: newVal.descriptionEn
      },
      cover: newVal.cover,
      video: newVal.video,
      achievement: newVal.achievement,
      nodeTasks: newVal.nodeTasks,
      placement: newVal.placement
    })
  },
  { deep: true }
)

function handleOpt(option: string): void {
  switch (option) {
    case 'save':
      // Save the form data
      emit('update:level', {
        title: {
          zh: form.value.titleZh,
          en: form.value.titleEn
        },
        description: {
          zh: form.value.descriptionZh,
          en: form.value.descriptionEn
        },
        cover: form.value.cover,
        video: form.value.video,
        achievement: form.value.achievement,
        nodeTasks: form.value.nodeTasks,
        placement: form.value.placement
      })
      break
    case 'back':
      // Go back to the previous page
      emit('back')
      break
    default:
      break
  }
}
async function handleUploadImg() {
  const { isOnline } = useNetwork()
  try {
    const img = await selectImg()
    const file = fromNativeFile(img)
    if (isOnline) {
      loading.value = true
      const fileUrl = await m.withLoading(saveFile(file), t({ en: 'Uploading image...', zh: '正在上传图片...' }))
      const url = await universalUrlToWebUrl(fileUrl)
      form.value.cover = url
      loading.value = false
    }
  } catch (error) {
    console.error('Error uploading image:', error)
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
        taggingHandler: {}, // 元素的语义化标注 及其 处理方式
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
              startPos: { line: 0, column: 0 }, // 答案展示的开始位置
              endPos: { line: 0, column: 0 } // 答案展示的结束位置
            }
          ], // 完形填空的mask数组，一个mask对应一个空的答案
          startPosition: { line: 0, column: 0 }, // 答案展示的开始位置
          endPosition: { line: 0, column: 0 } // 答案展示的结束位置
        }
      }
    ],
    triggerTime: 0
  }
  form.value.nodeTasks.push(newTask)
}

function handleRemoveNode(index: number) {
  form.value.nodeTasks.splice(index, 1)
}

function handleNodeEdit(index: number) {
  currentNodeTaskInfo.value = form.value.nodeTasks[index]
  selectedTab.value = 'nodeTask'
}

function handleToStep(index: number) {
  currentStepInfo.value = currentNodeTaskInfo.value.steps[index]
  selectedTab.value = 'step'
}
</script>

<style lang="scss" scoped>
.level-editor {
  padding: 16px;
  display: flex;
}

.opt {
  width: 300px;
  div {
    margin-bottom: 16px;
  }
}

button {
  margin-left: 8px;
}
.editor-info {
  flex: 1;
  display: flex;
  width: 1200px;
  flex-direction: column;
  gap: 16px;
  position: absolute;
  left: 50%;
  right: 0;
  bottom: 0;
  transform: translateX(-50%);
  top: 30px;
  .editor-info-header {
    border-top-left-radius: var(--ui-border-radius-3);
    border-top-right-radius: var(--ui-border-radius-3);
    border-bottom: 1px solid var(--ui-color-grey-400);
  }
}
.base-info {
  box-sizing: border-box;
  min-height: 500px;

  padding: 20px;
  .content-top {
    display: flex;
    justify-content: space-between;
    div {
      flex: 1;
      padding: 0 10px;
    }

    margin: 20px;
  }
  .content-center {
    padding: 0 10px;
    margin: 20px;
    height: 100%;
    min-height: 200px;
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
</style>
