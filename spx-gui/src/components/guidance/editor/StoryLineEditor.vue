<template>
  <div class="story-line-editor">
    <div class="opt">
      <div>
        <UIButton type="primary" @click="handleOpt">
          {{ $t({ zh: '最小化', en: 'minimize' }) }}
        </UIButton>
      </div>
      <div>
        <UIButton type="primary" :loading="isLoading" @click="handleSubmit">
          {{ $t({ zh: '保存', en: 'Save' }) }}
        </UIButton>
      </div>
    </div>
    <div class="story-line-editor-content">
      <UICard class="base-info base">
        <div class="base-info-header">
          <span>{{ $t({ zh: '故事线基本信息', en: 'Story line basic info' }) }}</span>
        </div>
        <UIDivider />
        <UIForm :form="form">
          <div class="base-info-content">
            <div class="content-top">
              <div class="title">
                <UIFormItem label="标题">
                  <UITextInput v-model:value="form.value.titleZh" placeholder="请输入故事线标题" />
                </UIFormItem>
                <UIFormItem label="Title">
                  <UITextInput
                    v-model:value="form.value.titleEn"
                    placeholder="Please enter the title of the story line"
                  />
                </UIFormItem>
              </div>
              <div class="tag">
                <UIFormItem :label="$t({ zh: '难度', en: 'Difficulty' })">
                  <UIRadioGroup v-model:value="form.value.tag">
                    <UIRadio value="easy" :label="$t({ zh: '简单', en: 'easy' })" />
                    <UIRadio value="medium" :label="$t({ zh: '一般', en: 'medium' })" />
                    <UIRadio value="hard" :label="$t({ zh: '困难', en: 'hard' })" />
                  </UIRadioGroup>
                </UIFormItem>
              </div>
            </div>
            <div class="content-center">
              <UIFormItem label="故事线简介">
                <UITextInput v-model:value="form.value.descriptionZh" type="textarea" placeholder="请输入故事线简介" />
              </UIFormItem>
              <UIFormItem label="Description">
                <UITextInput
                  v-model:value="form.value.descriptionEn"
                  type="textarea"
                  placeholder="Please enter the description of the story line"
                />
              </UIFormItem>
            </div>
          </div>
        </UIForm>
      </UICard>
      <UICard class="base-info">
        <div class="base-info-header">
          <span>{{ $t({ zh: '故事线背景图', en: 'Background image of story line' }) }}</span>
          <UIButton type="primary" @click="uploadImg">
            {{ $t({ zh: '上传背景', en: 'Upload image' }) }}
          </UIButton>
        </div>
        <UIDivider />
        <div class="img-content">
          <div class="img-preview">
            <UIImg
              class="thumbnail"
              style="height: 100%; width: 100%"
              :src="form.value.backgroundImage || './icons/no-img.svg'"
              :loading="bgLoading"
              size="contain"
            />
          </div>
        </div>
      </UICard>
      <UICard class="base-info">
        <div class="base-info-header">
          <span>{{ $t({ zh: '关卡列表', en: 'Level list' }) }}</span>
          <UIButton type="primary">
            {{ $t({ zh: '添加关卡', en: 'Add level' }) }}
          </UIButton>
        </div>
        <UIDivider />
        <div class="level-list">
          <div v-for="(level, index) in form.value.levels" :key="level.title.en" class="level-item">
            <div class="level-top">
              <div class="level-top-left">
                <div class="num">{{ index + 1 }}</div>
                <div class="text">{{ $t(level.title) }}</div>
                <div class="status">未完成</div>
              </div>
              <div class="level-top-right">
                <div @click="emit('levelChange', index)"><img src="../icons/edit-level.svg" alt="" /></div>
                <div><img src="../icons/delete.svg" alt="" /></div>
              </div>
            </div>
            <div class="level-center">
              {{ $t(level.description) }}
            </div>
            <div class="level-bottom"></div>
          </div>
        </div>
      </UICard>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { type MaybeSavedStoryLine } from '@/apis/guidance'
import {
  UIForm,
  UIFormItem,
  UITextInput,
  UIButton,
  UIRadio,
  UICard,
  useForm,
  UIRadioGroup,
  UIImg,
  UIDivider,
  useMessage
} from '@/components/ui'
import { useI18n } from '@/utils/i18n'
import { selectImg } from '@/utils/file'
import { fromNativeFile } from '@/models/common/file'
import { useNetwork } from '@/utils/network'
import { saveFile, universalUrlToWebUrl } from '@/models/common/cloud'

const { t } = useI18n()

const props = defineProps<{
  storyLine: MaybeSavedStoryLine
}>()

const emit = defineEmits<{
  'update:storyLine': [MaybeSavedStoryLine]
  minimize: [boolean]
  levelChange: [number]
}>()

const form = useForm({
  titleZh: [props.storyLine.title.zh, validateTitle],
  titleEn: [props.storyLine.title.en, validateTitle],
  name: [props.storyLine.title.zh],
  descriptionZh: [props.storyLine.description.zh],
  descriptionEn: [props.storyLine.description.en],
  backgroundImage: [props.storyLine.backgroundImage],
  tag: [props.storyLine.tag],
  levels: [props.storyLine.levels]
})

function validateTitle(name: string) {
  name = name.trim()
  if (!name) return t({ en: 'The title must not be blank', zh: '标题不可为空' })
  if (name.length > 100)
    return t({
      en: 'The title is too long (maximum is 100 characters)',
      zh: '标题长度超出限制（最多 100 个字符）'
    })
}

const isLoading = ref<boolean>(false)
const handleSubmit = async () => {
  if (await form.validate()) {
    emit('update:storyLine', {
      title: { zh: form.value.titleZh, en: form.value.titleEn },
      name: form.value.name,
      description: { zh: form.value.descriptionZh, en: form.value.descriptionEn },
      tag: form.value.tag,
      backgroundImage: form.value.backgroundImage,
      levels: form.value.levels
    })
  }
}

function handleOpt() {
  emit('minimize', true)
}

const bgLoading = ref<boolean>(false)
const m = useMessage()
async function uploadImg() {
  const { isOnline } = useNetwork()
  try {
    const img = await selectImg()
    const file = fromNativeFile(img)
    if (isOnline) {
      bgLoading.value = true
      const fileUrl = await m.withLoading(saveFile(file), t({ en: 'Uploading image...', zh: '正在上传图片...' }))
      const url = await universalUrlToWebUrl(fileUrl)
      form.value.backgroundImage = url
      bgLoading.value = false
    }
  } catch (error) {
    console.error('Error uploading image:', error)
  }
}
</script>

<style lang="scss" scoped>
.story-line-editor {
  display: flex;
  flex-direction: column;
  align-items: center;
  width: 100%;
  min-height: 300px;

  .story-line-editor-content {
    width: 60%;
    height: auto;
    display: flex;
    flex-direction: column;
    align-items: center;

    .base-info {
      box-sizing: border-box;
      min-height: 400px;
      width: 100%;
      padding: 20px;
      margin-top: 20px;
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
        // height: 100%;
        height: 400px;
      }
      .base-info-header {
        font-size: 20px;
        font-weight: bold;
        margin-bottom: 20px;
        padding: 0 30px;
        display: flex;
        justify-content: space-between;
        align-items: center;
      }
      .level-list {
        min-height: 300px;
        .level-item {
          width: 100%;
          height: 200px;
          box-shadow: 0 1px 2px 0 rgba(0, 0, 0, 0.2);
          border: 1px solid #e5e7eb;
          border-radius: 20px;
          margin-top: 20px;
          padding: 15px 30px;
          &:hover {
            box-shadow: 0 4px 10px 0 rgba(0, 0, 0, 0.3);
          }
          .level-top {
            display: flex;
            height: 50px;
            justify-content: space-between;
            .level-top-left {
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
            .level-top-right {
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
          .level-center {
            box-sizing: border-box;
            padding: 20px;
          }
        }
      }
    }
  }
}
.opt {
  position: absolute;
  top: 10px;
  left: 10px;
  div {
    margin: 10px;
  }
}
.img-content {
  display: flex;
  justify-content: center;
  // align-items: center;
  padding-top: 20px;
  width: 100%;
  height: 100%;
  .img-preview {
    width: 100%;
    height: 380px;
    border-radius: 20px;
    display: flex;
    justify-content: center;
    align-items: center;
    // img {
    //   width: 100%;
    //   height: 50px;
    //   margin-right: 10px;
    // }
    span {
      font-size: 16px;
      color: #666666;
    }
  }
}
</style>