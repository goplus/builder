<template>
    <div class="level-editor">
        <div class="opt">
            <div>
                <UIButton @click="handleOpt('back')" type="primary">
                    {{ $t({zh: '返回故事线', en: 'Back'}) }}
                </UIButton>
            </div>
            <div>
                <UIButton type="primary" @click="handleOpt('save')">
                    {{ $t({zh: '保存', en: 'Save'}) }}
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
                <UICard class="base-info" v-show="selectedTab === 'level'">
                    <div class="base-info-header">
                        <span>{{ $t({zh: '关卡基本信息', en: 'Level basic info'}) }}</span>
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
                                            style="height: 120px; width: 200px;" :loading="loading" size="contain"
                                        />
                                        <UIButton type="primary" icon="file" @click="handleUploadImg" style="width: 120px; margin-left: 20px;">
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
                                    <UITextInput v-model:value="form.value.descriptionEn" type="textarea" placeholder="Please enter the description of the level" />
                                </UIFormItem>
                            </div>
                        </div>
                    </UIForm>
                </UICard>
                <NodeTaskEditor v-show="selectedTab === 'nodeTask'" v-model:nodeTasks="form.value.nodeTasks" />
                <!-- <StepEditor v-show="selectedTab === 'step'" :steps="form.value.nodeTasks" /> -->
            </div>
        </div>
    </div>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { UIForm, UIFormItem, UITextInput, UICard, useForm, UIImg, UITab, UITabs, UIDivider, UIButton } from '@/components/ui';
import type { Level } from '@/apis/guidance';
import { useI18n } from '@/utils/i18n';
import { useNetwork } from '@/utils/network';
import { selectImg } from '@/utils/file';
import { fromNativeFile } from '@/models/common/file';
import { saveFile, universalUrlToWebUrl } from '@/models/common/cloud';
import { useMessage } from '@/components/ui/message';
import NodeTaskEditor from './NodeTaskEditor.vue';
// import StepEditor from './StepEditor.vue';
const props = defineProps<{
    level: Level;
}>();

const selectedTab = ref<'level' | 'nodeTask' | 'step'>('level');

const form = useForm({
    titleZh: [props.level.title.zh],
    titleEn: [props.level.title.en],
    descriptionZh: [props.level.description.zh],
    descriptionEn: [props.level.description.en],
    cover: [props.level.cover],
    video: [props.level.video],
    achievement: [props.level.achievement],
    nodeTasks: [props.level.nodeTasks],
    placement: [props.level.placement],
});

const emit = defineEmits<{
    (e: 'update:level', data: Level): void;
    (e: 'back'): void;
}>();

function handleOpt(option: string): void {
    switch (option) {
        case 'save':
            // Save the form data
            emit('update:level', {
                title: {
                    zh: form.value.titleZh,
                    en: form.value.titleEn,
                },
                description: {
                    zh: form.value.descriptionZh,
                    en: form.value.descriptionEn,
                },
                cover: form.value.cover,
                video: form.value.video,
                achievement: form.value.achievement,
                nodeTasks: form.value.nodeTasks,
                placement: form.value.placement,
            });
            console.log('Saving form data:', form.value);
            break;
        case 'back':
            // Go back to the previous page
            emit('back');
            console.log('Going back');
            break;
        default:
            break;
    }
}
const { t } = useI18n()
const loading = ref<boolean>(false)
const m = useMessage()
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
    /* margin: auto; */
    box-sizing: border-box;
    height: 500px;
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
}
</style>