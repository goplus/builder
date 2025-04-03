<template>
    <div class="node-task-editor">
      <div class="node-task-header">
        <span>{{ $t({ en: 'Node Task Editor', zh: '步骤编辑' }) }}</span>
      </div>
      <div class="node-task-content">
        <UIForm :form="form">
          <UICard class="node-task-item">
            <div class="node-task-item-content">
              <UIFormItem label="标题">
                <UITextInput v-model:value="form.value.step.title.zh" placeholder="请输入步骤标题" />
              </UIFormItem>
              <UIFormItem label="title">
                <UITextInput v-model:value="form.value.step.title.en" placeholder="Enter step title" />
              </UIFormItem>
              <UIFormItem label="步骤描述">
                <UITextInput 
                  v-model:value="form.value.step.description.zh" 
                  type="textarea" 
                  placeholder="请输入步骤描述" 
                />
              </UIFormItem>
              <UIFormItem label="Description">
                <UITextInput
                  v-model:value="form.value.step.description.en"
                  type="textarea"
                  placeholder="Please enter the description of the step"
                />
              </UIFormItem>
              <UIFormItem label="提示">
                <UITextInput v-model:value="form.value.step.tip.zh" placeholder="请输入步骤提示" />
              </UIFormItem>
              <UIFormItem label="tip">
                <UITextInput v-model:value="form.value.step.tip.en" placeholder="Enter step tip" />
              </UIFormItem>
              <UIFormItem :label="$t({ zh: '提示触发所需时间', en: 'Trigger time of tip' })">
                <UINumberInput v-model:value="form.value.step.duration" placeholder="请输入步骤触发所需时间" />
              </UIFormItem>
              <UIFormItem :label="$t({ zh: '目标元素', en: 'Target element' })">
                <UITextInput v-model:value="form.value.step.target" readonly />
                <UIButton type="primary" icon="check" style="width: 150px; margin-left: 20px" @click="() => {
                  isShowTagSelector = true
                  isShowIcon = true
                }">
                  {{ $t({ en: 'Select', zh: '选择' }) }}
                </UIButton>
              </UIFormItem>
              <!-- TODO: taggingHandler -->
              <UIFormItem :label="$t({ zh: '是否检查结束快照', en: 'Check ending snapshot' })">
                <UISwitch v-model:value="form.value.step.isCheck" :label="$t({ zh: '是', en: 'yes' })" />
              </UIFormItem>
              <UIFormItem :label="$t({ zh: '控制api', en: 'Control api' })">
                <div class="form-item-wrap">
                  <UISwitch v-model:value="form.value.step.isApiControl" :label="$t({ zh: '是', en: 'yes' })" />
                  <div class="form-item-content" v-if="form.value.step.isApiControl">
                    <div v-for="(item, index) in form.value.step.apis" class="content-header">
                      <UITextInput v-model:value="form.value.step.apis[index]" :placeholder="t({zh: '请输入api', en: 'Please input an api'})" />
                      <UIButton type="danger" icon="trash" style="width: 120px; margin-left: 20px;" @click="() => {
                        form.value.step.apis.splice(index, 1)
                      }">
                        {{ $t({ en: 'Delete', zh: '删除' }) }}
                      </UIButton>
                    </div>
                    <UIButton type="primary" icon="plus" style="width: 80px;" @click="handleControlContent('api')">
                      {{ $t({ en: 'Add', zh: '添加' }) }}
                    </UIButton>
                  </div>
                </div>
              </UIFormItem>
              <UIFormItem :label="$t({ zh: '控制素材', en: 'Control asset' })">
                <div class="form-item-wrap">
                  <UISwitch v-model:value="form.value.step.isAssetControl" :label="$t({ zh: '是', en: 'yes' })" />
                  <div class="form-item-content" v-if="form.value.step.isAssetControl">
                    <div v-for="(item, index) in form.value.step.assets" class="content-header">
                      <UITextInput v-model:value="form.value.step.assets[index]" :placeholder="t({zh: '请输入素材名称', en: 'Please input the name of an asset'})" />
                      <UIButton type="danger" icon="trash" style="width: 120px; margin-left: 20px;" @click="() => {
                        form.value.step.assets.splice(index, 1)
                      }">
                        {{ $t({ en: 'Delete', zh: '删除' }) }}
                      </UIButton>
                    </div>
                    <UIButton type="primary" icon="plus" style="width: 80px;" @click="handleControlContent('api')">
                      {{ $t({ en: 'Add', zh: '添加' }) }}
                    </UIButton>
                  </div>
                </div>
              </UIFormItem>
              <UIFormItem :label="$t({ zh: '控制精灵', en: 'Control sprite' })">
                <div class="form-item-wrap">
                  <UISwitch v-model:value="form.value.step.isSpriteControl" :label="$t({ zh: '是', en: 'yes' })" />
                  <div class="form-item-content" v-if="form.value.step.isSpriteControl">
                    <div v-for="(item, index) in form.value.step.sprites" class="content-header">
                      <UITextInput v-model:value="form.value.step.sprites[index]" :placeholder="t({zh: '请输入精灵名称', en: 'Please input the name of a sprite'})" />
                      <UIButton type="danger" icon="trash" style="width: 120px; margin-left: 20px;" @click="() => {
                        form.value.step.sprites.splice(index, 1)
                      }">
                        {{ $t({ en: 'Delete', zh: '删除' }) }}
                      </UIButton>
                    </div>
                    <UIButton type="primary" icon="plus" style="width: 80px;" @click="handleControlContent('sprite')">
                      {{ $t({ en: 'Add', zh: '添加' }) }}
                    </UIButton>
                  </div>
                </div>
              </UIFormItem>
              <UIFormItem :label="$t({ zh: '控制声音', en: 'Control sound' })">
                <div class="form-item-wrap">
                  <UISwitch v-model:value="form.value.step.isSoundControl" :label="$t({ zh: '是', en: 'yes' })" />
                  <div class="form-item-content" v-if="form.value.step.isSoundControl">
                    <div v-for="(item, index) in form.value.step.sounds" class="content-header">
                      <UITextInput v-model:value="form.value.step.sounds[index]" :placeholder="t({zh: '请输入声音文件名称', en: 'Please input the name of a sound file'})" />
                      <UIButton type="danger" icon="trash" style="width: 120px; margin-left: 20px;" @click="() => {
                        form.value.step.sounds.splice(index, 1)
                      }">
                        {{ $t({ en: 'Delete', zh: '删除' }) }}
                      </UIButton>
                    </div>
                    <UIButton type="primary" icon="plus" style="width: 80px;" @click="handleControlContent('sound')">
                      {{ $t({ en: 'Add', zh: '添加' }) }}
                    </UIButton>
                  </div>
                </div>
              </UIFormItem>
              <UIFormItem :label="$t({ zh: '控制舞台', en: 'Control backdrop' })">
                <div class="form-item-wrap">
                  <UISwitch v-model:value="form.value.step.isBackdropControl" :label="$t({ zh: '是', en: 'yes' })" />
                  <div class="form-item-content" v-if="form.value.step.isBackdropControl">
                      <div v-for="(item, index) in form.value.step.backdrops" class="content-header">
                        <UITextInput v-model:value="form.value.step.backdrops[index]" :placeholder="t({zh: '请输入舞台名称', en: 'Please input the name of a backdrop'})" />
                        <UIButton type="danger" icon="trash" style="width: 120px; margin-left: 20px;" @click="() => {
                          form.value.step.backdrops.splice(index, 1)
                        }">
                          {{ $t({ en: 'Delete', zh: '删除' }) }}
                        </UIButton>
                      </div>
                      <UIButton type="primary" icon="plus" style="width: 80px;" @click="handleControlContent('backdrop')">
                        {{ $t({ en: 'Add', zh: '添加' }) }}
                      </UIButton>
                    </div>
                  </div>
              </UIFormItem>
              <UIFormItem :label="$t({ zh: '控制造型', en: 'Control costume' })">
                <div class="form-item-wrap">
                  <UISwitch v-model:value="form.value.step.isCostumeControl" :label="$t({ zh: '是', en: 'yes' })" />
                  <div class="form-item-content" v-if="form.value.step.isCostumeControl">
                      <div v-for="(item, index) in form.value.step.costumes" class="content-header">
                        <UITextInput v-model:value="form.value.step.costumes[index]" :placeholder="t({zh: '请输入造型名称', en: 'Please input the name of a costume'})" />
                        <UIButton type="danger" icon="trash" style="width: 120px; margin-left: 20px;" @click="() => {
                          form.value.step.costumes.splice(index, 1)
                        }">
                          {{ $t({ en: 'Delete', zh: '删除' }) }}
                        </UIButton>
                      </div>
                      <UIButton type="primary" icon="plus" style="width: 80px;" @click="handleControlContent('costumes')">
                        {{ $t({ en: 'Add', zh: '添加' }) }}
                      </UIButton>
                    </div>
                  </div>
              </UIFormItem>
              <UIFormItem :label="$t({ zh: '控制动画', en: 'Control animation' })">
                <div class="form-item-wrap">
                <UISwitch v-model:value="form.value.step.isAnimationControl" :label="$t({ zh: '是', en: 'yes' })" />
                  <div class="form-item-content" v-if="form.value.step.isAnimationControl">
                    <div v-for="(item, index) in form.value.step.animations" class="content-header">
                      <UITextInput v-model:value="form.value.step.animations[index]" :placeholder="t({zh: '请输入动画名称', en: 'Please input name of an animation'})" />
                      <UIButton type="danger" icon="trash" style="width: 120px; margin-left: 20px;" @click="() => {
                        form.value.step.animations.splice(index, 1)
                      }">
                        {{ $t({ en: 'Delete', zh: '删除' }) }}
                      </UIButton>
                    </div>
                    <UIButton type="primary" icon="plus" style="width: 80px;" @click="handleControlContent('animations')">
                      {{ $t({ en: 'Add', zh: '添加' }) }}
                    </UIButton>
                  </div>
                </div>
              </UIFormItem>
              <UIFormItem :label="$t({ zh: '控制组件', en: 'Control widget' })">
                <div class="form-item-wrap">
                  <UISwitch v-model:value="form.value.step.isWidgetControl" :label="$t({ zh: '是', en: 'yes' })" />
                  <div class="form-item-content" v-if="form.value.step.isWidgetControl">
                    <div v-for="(item, index) in form.value.step.widgets" class="content-header">
                        <UITextInput v-model:value="form.value.step.widgets[index]" :placeholder="t({zh: '请输入声音文件名称', en: 'Please input name of a widget'})" />
                        <UIButton type="danger" icon="trash" style="width: 120px; margin-left: 20px;" @click="() => {
                          form.value.step.widgets.splice(index, 1)
                        }">
                          {{ $t({ en: 'Delete', zh: '删除' }) }}
                        </UIButton>
                      </div>
                      <UIButton type="primary" icon="plus" style="width: 80px;" @click="handleControlContent('widget')">
                        {{ $t({ en: 'Add', zh: '添加' }) }}
                      </UIButton>
                    </div>
                  </div>
              </UIFormItem>
              <UIFormItem :label="$t({ zh: '结束快照', en: 'Ending snapshot' })">
                <UITextInput v-model:value="form.value.step.snapshot.startSnapshot" readonly type="textarea" style="width: 600px;"/>
                <UIButton type="primary" icon="check" style="width: 150px; margin-left: 20px" @click="handleSnapshot('start')">
                  {{ $t({ en: 'Get an initial snapshot', zh: '获取初始快照' }) }}
                </UIButton>
              </UIFormItem>
              <UIFormItem v-if="form.value.step.isCheck && form.value.step.snapshot.endSnapshot" :label="$t({ zh: '结束快照', en: 'Ending snapshot' })">
                <UITextInput v-model:value="form.value.step.snapshot.endSnapshot" readonly type="textarea" style="width: 600px;"/>
                <UIButton type="primary" icon="check" style="width: 150px; margin-left: 20px" @click="handleSnapshot('end')">
                  {{ $t({ en: 'Get an ending snapshot', zh: '获取结束快照' }) }}
                </UIButton>
              </UIFormItem>
              <UIFormItem :label="$t({ zh: '步骤类型', en: 'Step type' })">
                <UIRadioGroup v-model:value="form.value.step.type">
                  <UIRadio value="coding" :label="$t({ zh: '编码', en: 'coding' })" />
                  <UIRadio value="following" :label="$t({ zh: '跟随', en: 'following' })" />
                </UIRadioGroup>
              </UIFormItem>
              <div v-if="form.value.step.coding && form.value.step.type === 'coding'" style="margin-top: 20px;" >
                <UIFormItem :label="$t({ zh: '文件路径', en: 'File path' })">
                  <UITextInput v-model:value="form.value.step.coding.path" placeholder="请输入文件路径" />
                </UIFormItem>
                <!-- TODO: 多个挖空 -->
                <!-- <UIFormItem :label="$t({ zh: '代码填空', en: 'Code token masks' })">
                  
                </UIFormItem> -->
                <UIFormItem :label="$t({ zh: '答案代码块开始坐标', en: 'Start position of answer' })">
                  <div>
                    line: 
                    <UINumberInput v-model:value="form.value.step.coding.startPosition.line" placeholder="请输入代码块开始坐标行" />
                  </div>
                  <div style="margin-left: 20px;">
                    column:
                    <UINumberInput v-model:value="form.value.step.coding.startPosition.column" placeholder="请输入代码块开始坐标列" />
                  </div>
                </UIFormItem>
                <UIFormItem :label="$t({ zh: '答案代码块结束坐标', en: 'End position of answer' })">
                  <div>
                    line: 
                    <UINumberInput v-model:value="form.value.step.coding.endPosition.line" placeholder="请输入代码块结束坐标行" />
                  </div>
                  <div style="margin-left: 20px;">
                    column:
                    <UINumberInput v-model:value="form.value.step.coding.endPosition.column" placeholder="请输入代码块结束坐标列" />
                  </div>
                </UIFormItem>
              </div>
            </div>
          </UICard>
        </UIForm>
      </div>
      <TagSelector
        v-if="isShowTagSelector"
        @selected="(path: string) => {
          form.value.step.target = path
          isShowTagSelector = false
          isShowIcon = false
        }"
      />
    </div>
    
  </template>
  
  <script lang="ts" setup>
  import { UICard, UIForm, UIButton, UIFormItem, UITextInput, UINumberInput, UIDivider, UIRadio, UIRadioGroup, UISwitch } from '@/components/ui'
  import { useForm } from '@/components/ui/form'
  import type { Step } from '@/apis/guidance'
  import { useNetwork } from '@/utils/network'
  import { saveFile, universalUrlToWebUrl } from '@/models/common/cloud'
  import { useMessage } from '@/components/ui/message'
  import { useI18n } from '@/utils/i18n'
  import { watch, ref, inject } from 'vue'
  import TagSelector from '@/utils/tagging/TagSelector.vue'

  const isShowIcon = inject<boolean>('isShowIcon')
  
  const props = defineProps<{
    step: Step
  }>()
  
  const emit = defineEmits<{
    (e: 'update:step', step: Step): void
  }>()
  
  const { t } = useI18n()
  const { isOnline } = useNetwork()
  const m = useMessage()
  const form = useForm({
    step: [props.step]
  })
  
  const isShowTagSelector = ref<boolean>(false)
  function handleSelectTarget() {

  }
  
  function handleToStep(index: number) {
    // emit('update:currentStep', index)
  }

  function handleControlContent(type: string) {
    switch(type) {
      case 'api':
        let newApi = ''
        form.value.step.apis.push(newApi)
        break
      case 'sound':
        let newSound = ''
        form.value.step.sounds.push(newSound)
        break
      case 'animation':
        let newAnimation = ''
        form.value.step.animations.push(newAnimation)
        break
      case 'backdrop':
        let newBackdrop = ''
        form.value.step.backdrops.push(newBackdrop)
        break
      case 'costume':
        let newCostume = ''
        form.value.step.costumes.push(newCostume)
        break
      case 'sprite':
        let newSprite = ''
        form.value.step.sprites.push(newSprite)
        break
      case 'widget':
        let newWidget = ''
        form.value.step.widgets.push(newWidget)
        break
      default:
        break
    }
  }
  
  function handleSnapshot(type: string) {
    if (type === 'start') {

    } else {

    }
  }

  watch(
    () => props.step,
    (newStep) => {
      form.value.step = newStep
    },
    { deep: true, immediate: true }
  )
  
  watch(
    () => form.value.step,
    (newValue) => {
      emit('update:step', newValue)
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

  .content-split {
    display: flex;
    justify-content: space-between;
  }
  
  .form-item-wrap {
    display: flex;
    flex-direction: column;
    align-items: flex-start;
    .form-item-content {
      margin-top: 10px;
      .content-header {
        margin-bottom: 10px;
        display: flex;
        width: 500px;
      }
    }
  }
  </style>
  