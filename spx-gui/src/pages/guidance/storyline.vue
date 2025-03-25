<template>
  <CenteredWrapper size="medium">
    <main class="storyline-page">
      <header class="storyline-header">
        <h2>{{ $t(storyLine?.title ?? { zh: '', en: '' }) }}</h2>
      </header>
      <div class="map-wrapper" :style="{ backgroundImage: `url(${storyLine?.backgroundImage})` }">
        <div
          v-for="(level, index) in storyLine?.levels"
          :key="index"
          class="level"
          :class="{ locked: !userStore.isSignedIn() || index > (storyLineStudy?.lastFinishedLevelIndex ?? 0) }"
          :style="{ left: `${level.placement.x}%`, top: `${level.placement.y}%` }"
          @click="handleLevelClick(index)"
        >
          <img :src="level.cover" alt="" />
          <div class="level-index">
            {{
              $t({
                en: `Level ${index + 1}`,
                zh: `第 ${index + 1} 关`
              })
            }}
          </div>
          <div class="level-title">
            {{ $t(level.title ?? { zh: '', en: '' }) }}
          </div>
          <div
            v-if="!userStore.isSignedIn() || index > (storyLineStudy?.lastFinishedLevelIndex ?? 0)"
            class="level-mask"
          >
            {{ $t({ zh: '未解锁', en: 'Locked' }) }}
          </div>
        </div>
      </div>
      <div class="card-groups">
        <div class="card card-group-item">
          <h3>{{ $t({ zh: '当前进度', en: 'Progress' }) }}</h3>
          <div class="content progress-content">
            <div class="progress-container">
              <div class="progress-bar">
                <div
                  class="progress-fill"
                  :style="{
                    width:
                      storyLine && storyLineStudy
                        ? `${(storyLineStudy.lastFinishedLevelIndex / storyLine.levels.length) * 100}%`
                        : '0%'
                  }"
                ></div>
              </div>
              <span class="progress-percentage">
                {{
                  storyLine && storyLineStudy
                    ? `${Math.round((storyLineStudy.lastFinishedLevelIndex / storyLine.levels.length) * 100)}%`
                    : '0%'
                }}
              </span>
            </div>
            <div class="progress-text">
              {{ $t({ zh: '已完成关卡', en: 'Levels Completed' }) }}
              {{ storyLineStudy?.lastFinishedLevelIndex ?? 0 }}/{{ storyLine?.levels.length ?? 0 }}
            </div>
          </div>
        </div>
        <div class="card card-group-item">
          <h3>{{ $t({ zh: '当前关卡', en: 'Current Level' }) }}</h3>
          <div v-if="userStore.isSignedIn()" class="content current-level-content">
            <div class="level-cover">
              <img :src="storyLine?.levels[storyLineStudy?.lastFinishedLevelIndex ?? 0].cover" alt="" />
            </div>
            <div class="level-description">
              <h4>{{ $t(currentLevelTitle) }}</h4>
              <p>
                {{
                  $t(storyLine?.levels[storyLineStudy?.lastFinishedLevelIndex ?? 0].description ?? { zh: '', en: '' })
                }}
              </p>
            </div>
          </div>
          <div v-else class="content log-tip">登陆以查看当前关卡</div>
        </div>
        <div class="card card-group-item">
          <h3>{{ $t({ zh: '成就系统', en: 'Achievements' }) }}</h3>
          <div v-if="userStore.isSignedIn()" class="content">
            <div
              v-for="(level, index) in storyLine?.levels"
              v-show="index <= ((storyLineStudy?.lastFinishedLevelIndex ?? 0) - 1) && level.achievement"
              :key="index"
              class="achievement"
            >
              <img :src="level.achievement.icon" :alt="$t(level.achievement.title)" />
              <span>{{ $t(level.achievement.title) }}</span>
            </div>
          </div>
          <div v-else class="content log-tip">登陆以查看成就</div>
        </div>
      </div>
      <div class="card description-card">
        <h3>{{ $t({ zh: '故事背景', en: 'Story Background' }) }}</h3>
        <p>{{ $t(storyLine?.description ?? { zh: '', en: '' }) }}</p>
      </div>
    </main>
  </CenteredWrapper>
</template>
<script setup lang="ts">
import { useQuery } from '@/utils/query'
import CenteredWrapper from '@/components/community/CenteredWrapper.vue'
import { getStoryLine, getStoryLineStudy, createStoryLineStudy } from '@/apis/guidance'
import { useUserStore } from '@/stores/user'
import { computed } from 'vue'
import { Project } from '@/models/project'
import { Visibility } from '@/apis/project'
import { untilNotNull } from '@/utils/utils'
import defaultProjectFileUrl from '@/components/project/default-project.gbp?url'
import { useRouter } from 'vue-router'
import { getProjectEditorWithGuidanceRoute } from '@/router'

const props = defineProps<{
  storyLineId: string
}>()

const router = useRouter()
const userStore = useUserStore()

const signedInUser = computed(() => userStore.getSignedInUser())

function generateStudyProjectName(storyLineName: string) {
  return 'auto_generated_study_project_for_' + storyLineName
}

// 获取故事线信息
const { data: storyLine } = useQuery(
  async () => {
    const storyLine = await getStoryLine(props.storyLineId)
    // 解析levels字段
    if (storyLine && typeof storyLine.levels === 'string') {
      storyLine.levels = JSON.parse(storyLine.levels)
    }
    return storyLine
  },
  {
    en: 'Failed to load storyline',
    zh: '加载故事线失败'
  }
)

async function getDefaultProjectFile() {
  const resp = await fetch(defaultProjectFileUrl)
  const blob = await resp.blob()
  return new window.File([blob], 'default-project.gbp', { type: blob.type })
}

// 获取用户学习进度
const { data: storyLineStudy } = useQuery(
  async () => {
    if (!userStore.isSignedIn()) {
      return { storyLineId: props.storyLineId, lastFinishedLevelIndex: 0 }
    }
    const study = await getStoryLineStudy(props.storyLineId)
    if (!study) {
      // 如果是第一次进入，创建学习记录 并 创建Project A
      const initialStudy = await createStoryLineStudy(props.storyLineId)

      const owner = await untilNotNull(signedInUser)
      const storyLineInfo = await untilNotNull(storyLine)

      const defaultProjectFile = await getDefaultProjectFile()
      const project = new Project(owner.name, generateStudyProjectName(storyLineInfo.name))
      await project.loadGbpFile(defaultProjectFile)
      project.setVisibility(Visibility.Private)
      project.setHidden(1)
      await project.saveToCloud()

      return initialStudy
    }

    return study
  },
  {
    en: 'Failed to load study progress',
    zh: '加载学习进度失败'
  }
)

// 当前关卡标题
const currentLevelTitle = computed(() => {
  const currentIndex = storyLineStudy.value?.lastFinishedLevelIndex ?? -1
  const levelTitle = storyLine.value?.levels[currentIndex]?.title ?? { zh: '', en: '' }

  return {
    zh: `第 ${currentIndex + 1} 关：${levelTitle.zh}`,
    en: `Level ${currentIndex + 1}: ${levelTitle.en}`
  }
})

function handleLevelClick(levelIndex: number) {
  if (!userStore.isSignedIn() || !storyLine.value || levelIndex > (storyLineStudy.value?.lastFinishedLevelIndex ?? -1))
    return
  router.push(
    getProjectEditorWithGuidanceRoute(generateStudyProjectName(storyLine.value.name), storyLine.value.id, levelIndex)
  )
}
</script>
<style scoped lang="scss">
.storyline-page {
  height: 1000px;
  .storyline-header {
    text-align: center;
    h2 {
      font-size: 32px;
      color: #f9a134;
    }
  }
  .map-wrapper {
    position: relative;
    width: 100%;
    aspect-ratio: 16/9;
    background-color: #f0f0f0;
    margin-top: 10px;
    overflow-y: auto;
    background-size: cover;
    background-repeat: no-repeat;
    border-radius: 6px;
    box-shadow: 0 4px 16px rgba(0, 0, 0, 0.15);
    -ms-overflow-style: none;
    scrollbar-width: none;
    &::-webkit-scrollbar {
      display: none;
      width: 0;
      height: 0;
    }
    .level {
      position: absolute;
      width: 100px;
      text-align: center;
      &.locked {
        cursor: default;
      }

      &:not(.locked):hover {
        cursor: pointer;
        transform: translateY(-5px);
        transition: all 0.3s ease;
      }
      img {
        width: 50px;
        height: 50px;
        border-radius: 50%;
      }
      .level-index {
        font-size: 14px;
      }
      .level-title {
        font-size: 12px;
      }
      .level-mask {
        position: absolute;
        top: 0;
        left: 50%;
        transform: translateX(-50%);
        width: 50px;
        height: 50px;
        border-radius: 50%;
        background-color: rgba(0, 0, 0, 0.5);
        color: white;
        text-align: center;
        line-height: 50px;
      }
    }
  }
  .card {
    background: white;
    border-radius: 6px;
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
    transition: all 0.3s ease;
    cursor: pointer;
    padding: 16px;

    &:hover {
      box-shadow: 0 4px 16px rgba(0, 0, 0, 0.15);
      transform: translateY(-2px);
    }
  }
  .card-groups {
    margin-top: 20px;
    display: flex;
    flex-direction: row;
    gap: 15px;
    .card-group-item {
      flex: 1;
      min-height: 80px;
      max-height: 160px;
      display: flex;
      flex-direction: column;
      .content {
        flex: 1;
        overflow: auto;
      }
      .progress-content {
        display: flex;
        flex-direction: column;
        gap: 5px;
        justify-content: center;
        .progress-container {
          display: flex;
          align-items: center;
          gap: 10px;
          .progress-bar {
            flex: 1;
            height: 8px;
            background-color: #e5e7eb;
            border-radius: 4px;
            overflow: hidden;

            .progress-fill {
              height: 100%;
              background-color: #ff6b6b;
              transition: width 0.3s ease;
            }
          }

          .progress-percentage {
            min-width: 30px;
            font-size: 12px;
          }
        }

        .progress-text {
          font-size: 12px;
        }
      }
      .current-level-content {
        display: flex;
        .level-cover {
          width: 30px;
          height: 100%;
          display: flex;
          flex-direction: column;
          justify-content: center;
          img {
            width: 30px;
            height: 30px;
            border-radius: 50%;
          }
        }
        .level-description {
          flex: 1;
          padding-left: 10px;
          h4 {
            font-size: 13px;
          }
          p {
            font-size: 12px;
          }
        }
      }
      .achievement {
        display: flex;
        margin-top: 5px;
        img {
          width: 20px;
          height: 20px;
          border-radius: 50%;
        }
        span {
          padding-left: 5px;
          font-size: 12px;
        }
      }
      .log-tip {
        font-size: 15px;
        text-align: center;
        line-height: 60px;
      }
    }
  }
  .description-card {
    min-height: 80px;
    margin-top: 20px;
    p {
      font-size: 12px;
    }
  }
}
</style>
