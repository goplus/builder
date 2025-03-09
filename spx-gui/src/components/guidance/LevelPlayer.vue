<template>
  <!-- 关卡介绍 -->
  <div v-if="levelIntroVisible" class="intro">
    <div class="intro-title">
      <div>{{ $t(props.level.title) }}</div>
    </div>
    <div class="intro-desc">
      <div>{{ $t({zh:'关卡介绍', en: 'Level intro'}) }}</div>
      <div>{{ $t(props.level.description) }}</div>
    </div>
    <div class="intro-node">
      <div v-for="item in props.level.nodeTasks" :key="item.name.en">
        <div class="ripple-container">
          <div class="ripple"></div>
        </div>
        <div>{{ $t(item.name) }}</div>
      </div>
    </div>
    <div class="intro-opt">
      <div class="intro-btn" @click="handleToClick('storyline')">
        <span>{{ $t({zh: '返回选关', en: 'Back'}) }}</span>
      </div>
      <div class="intro-btn" @click="handleStartLevel">
        <span>{{ $t({zh: '开始挑战', en: 'Start'}) }}</span>
      </div>
    </div>
  </div>
  <div 
    v-else 
    class="level-player" 
    :style="{
    transform: `translate(${getPos().x}px, ${getPos().y}px)`,
  }">
    <!-- 可拖拽的卡片组（悬浮卡片+悬浮按钮） -->
    <div class="card-group" >
      <!-- navbar 状态栏 -->
      <div v-show="videoPlayerVisible" class="player-container">
        <div class="navbar">
          <div class="navbar-left" @click="handleToClick('storyline')">
            <img src="./icons/path.svg" alt="">
          </div>
          <div class="navbar-center">
            <span>{{ $t({zh: '进度', en: 'Progress'}) }}: {{ currentNodeTaskIndex || 0 }} / {{ props.level.nodeTasks.length }}</span>
          </div>
          <div class="navbar-right"></div>
        </div>
        <VideoPlayer 
          ref="videoPlayerRef" 
          class="video-player"
          :video-url="props.level.video"
          :segments="videoPlayerSegments"
          @segment-end="(segment: Segment) => handleSegmentEnd(segment as ExtendSegment)">
          <template #cover>
            <div v-if="coverType === CoverType.LEVEL_END" class="cover cover-bg">
              <div class="achievement">
                <div class="achievement-img">
                  <img :src="props.level.achievement.icon" alt="">
                </div>
                <div class="achievement-desc">{{ $t({zh: '太棒了！恭喜你完成本关卡挑战！', en: 'Marvelous! Congratulations on completing this level challenge!'}) }}</div>
                <div class="achievement-desc">{{ $t({zh: '解锁成就', en:'Unlock achievements'}) }}:<span>{{ $t(props.level.achievement.title) }}</span>!</div>
              </div>
              <div class="opt">
                <div class="opt-wrap" @click="handleToClick('storyline')"><img src="./icons/arrow.svg" alt="">{{ $t({zh: '返回故事线', en: 'Back'}) }}</div>
                <div>{{ $t({zh:'重新挑战', en: 'Replay'}) }}</div>
                <div class="opt-wrap" @click="handleToClick('nextLevel')">{{ $t({zh: '进入下一关', en: 'Next level'}) }}<img src="./icons/arrow.svg" alt=""></div>
              </div>
            </div>
            <div v-if="coverType === CoverType.LEVEL_START" class="cover">
              <img :src="props.level.cover" />
            </div>
            <div v-if="coverType === CoverType.NODE_TASK_START" class="cover cover-bg">
              <div class="cover-title">
                <span>{{ $t({zh: '现在，请你开始本节点任务！', en: 'Now, please start the task of this part'}) }}</span>
              </div>
              <div class="cover-desc">
                <div v-for="(item, index) in currentNodeTask?.steps" :key="item.title.en">
                  Step{{ index + 1 }}: {{ $t(item.title) }}
                </div>
              </div>
              <div class="cover-btn" @click="handleStartNodeTask">
                <span>{{ $t({zh: '现在开始', en: 'Get start'}) }}</span>
              </div>
            </div>
            <div v-if="coverType === CoverType.NODE_TASK_PENDING" class="cover cover-bg">
              <div class="cover-desc">
                <div v-for="(item, index) in currentNodeTask?.steps" :key="item.title.en">
                  Step{{ index + 1 }}: {{ $t(item.title) }}
                </div>
              </div>
            </div>
            <div v-if="coverType === CoverType.NODE_TASK_END" class="cover">
              <!-- 此时播放视频 不展示cover -->
            </div>
          </template>
        </VideoPlayer>
      </div>
      
      <!-- 悬浮按钮 -->
      <div ref="floatingBtnRef" class="floating-btn">
        <img src="./icons/play.svg" alt="">
      </div>
    </div>

    <!-- 当有当前节点任务时，渲染 NodeTaskPlayer 组件 -->
    <NodeTaskPlayer
      v-if="currentNodeTask"
      :node-task="currentNodeTask"
      @node-task-completed="handleNodeTaskCompleted"
    />
  </div>
</template>

<script setup lang="ts" generic="T extends { nodeTaskIndex: number }">
import type { Level, NodeTask } from '@/apis/guidance';
import { ref, computed, provide, type InjectionKey, inject, nextTick } from 'vue';
import VideoPlayer, { type Segment } from '../common/VideoPlayer.vue';
import NodeTaskPlayer from './NodeTaskPlayer.vue';
import { useDrag } from '@/utils/dom';

const props = defineProps<{ level: Level }>();

const videoPlayerRef = ref<InstanceType<typeof VideoPlayer> | null>(null);
const currentNodeTask = ref<NodeTask | null>(null);
const currentNodeTaskIndex = ref<number | null>(null);
const videoPlayerSegments = computed(() => {
  return props.level.nodeTasks.map((nodeTask, index) => {
    return {
      endTime: nodeTask.triggerTime,
      extension: { nodeTaskIndex: index },
    } as ExtendSegment;
  });
});

// 视频组件封面类型
enum CoverType {
  LEVEL_START, // 视频开始封面
  NODE_TASK_START, // 节点任务开始封面
  NODE_TASK_PENDING, // 节点任务进行中封面
  NODE_TASK_END, // 节点任务结束封面，此时播放视频，不展示cover
  LEVEL_END, // 关卡完成封面
}

const coverType = ref<CoverType>(CoverType.LEVEL_START)
/**
 * 视频段播放完成
 * @param segment 回传的片段参数
 */
type ExtendSegment = Segment & {
  extension: T;
}
function handleSegmentEnd(segment: ExtendSegment): void {
  coverType.value = CoverType.NODE_TASK_START;

  videoPlayerRef.value?.showCover();
  videoPlayerRef.value?.pause();

  currentNodeTaskIndex.value = segment.extension.nodeTaskIndex;

  currentNodeTask.value = props.level.nodeTasks[currentNodeTaskIndex.value];
}

/**
 * 节点任务开始
 */
function handleStartNodeTask(): void {
  coverType.value = CoverType.NODE_TASK_PENDING;
  videoPlayerVisible.value = false;
}

/**
 * 节点任务完成
 */
async function handleNodeTaskCompleted(): Promise<void> {
  coverType.value = CoverType.NODE_TASK_END;
  videoPlayerVisible.value = true;
  if (currentNodeTaskIndex.value === props.level.nodeTasks.length - 1) {
    // 更新 关卡完结cover
    coverType.value = CoverType.LEVEL_END;
    videoPlayerRef.value?.showCover();
    // await updateStoryLineStudy({

    // });
  } else {
    videoPlayerRef.value?.hideCover();
    videoPlayerRef.value?.play();
  }
  currentNodeTaskIndex.value = null;
  currentNodeTask.value = null;
}

/**
 * 悬浮按钮逻辑
 */
const videoPlayerVisible = ref<boolean>(true);
function handleFloatingBtnClick(): void {
  videoPlayerVisible.value = !videoPlayerVisible.value;
}

/**
 * 关卡介绍
 */
const levelIntroVisible = ref<boolean>(true);
function handleStartLevel(): void {
  levelIntroVisible.value = false;
  videoPlayerVisible.value = true;
  coverType.value = CoverType.LEVEL_START;
  nextTick(() => {
    videoPlayerRef.value?.showCover();
  });
}


/**
 * 跳转
 * @param target 目标路由
 */
function handleToClick(target: string): void {
  switch (target) {
    case 'storyline':
      console.log('handleToClick storyline');
      break;
    case 'nextLevel':
      console.log('handleToClick nextLevel');
      break;
  }
}

/**
 * 位置
 */
const levelPlayerPos = ref<Pos>({
  x: 0,
  y: 0
})
function getPos(): Pos {
  return levelPlayerPos.value;
}
function setPos(pos: Pos): void {
  levelPlayerPos.value = pos;
}
const levelPlayerCtx = {
  getPos,
  setPos
}
provide(levelPlayerCtxKey, levelPlayerCtx)

/**
 * 拖拽
 */
const floatingBtnRef = ref<HTMLElement | null>(null);
useDrag(floatingBtnRef, getPos, setPos, {
  onClick: handleFloatingBtnClick,
})
</script>
<script lang="ts">
export type Pos = {
  x: number;
  y: number;
};
export type LevelPlayerCtx = {
  getPos(): Pos
  setPos(pos: Pos): void
}
const levelPlayerCtxKey: InjectionKey<LevelPlayerCtx> = Symbol('level-player-ctx')
export function useLevelPlayerCtx() {
  const ctx = inject(levelPlayerCtxKey)
  if (ctx == null) throw new Error('useLevelPlayerCtx should be called inside of LevelPlayer')
  return ctx
}
</script>
<style lang="scss" scoped>
.level-player {
  height: 300px;
  width: 500px;
  position: absolute;
}
.card-group {
  position: relative;
  .player-container {
    box-shadow: 0px 4px 10px 0px rgba(0, 0, 0, 0.3);
    border-radius: 10px;
    overflow: hidden;
  }
}

.navbar {
  border-top-left-radius: 10px;
  border-top-right-radius: 10px;
  display: flex;
  justify-content: space-between;
  padding: 0 10px;
  height: 40px;
  color: #fff;
  align-items: center;
  background-color: #0EC1D0;
  .navbar-left {
    display: flex;
    align-items: center;
    cursor: pointer;
    img {
      width: 30px;
      height: 30px;
    }
  }
}

.floating-btn {
  position: absolute;
  right: -40px;
  top: 2px;
  height: 35px;
  width: 35px;
  border-radius: 50%;
  background-color: #E9FDFF;
  display: flex;
  justify-content: center;
  align-items: center;
  box-shadow: 0px 4px 10px 0px rgba(0, 0, 0, 0.3);
  cursor: pointer;
  &:hover {
    background-color: #D4F9FF;
    box-shadow: 0px 4px 10px 0px rgba(0, 0, 0, 0.5);
  }
  img {
    width: 35px;
    height: 35px;
    -webkit-user-drag: none;
  }
}

.cover {
  width: 100%;
  height: 100%;
  overflow: hidden;
  img {
    width: 100%;
    height: 100%;
  }
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: space-around;
}
.cover-bg {
  background-color: rgba(0, 0, 0, 0.8);
  color: #fff;
  padding: 20px 0;
  .cover-title {
    font-size: 20px;
  }
  .cover-desc {
    font-size: 16px;
    flex: 1;
    width: 80%;
    display: flex;
    flex-direction: column;
    justify-content: center;
    align-items: center;
    div {
      margin: 10px 0;
    }
  }
  .cover-btn {
    background-color: #E9FDFF;
    border-radius: 10px;
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 3px 15px;
    font-size: 14px;
    cursor: pointer;
    &:hover {
      color: #F9A134;
    }
    color: #0EC1D0;
  }
  .achievement {
    display: flex;
    flex-direction: column;
    align-items: center;
    .achievement-img {
      img {
        width: 90px;
        height: 90px;
      }
    }
    .achievement-desc {
      font-size: 16px;
      margin: 10px 0;
      span {
        color: #F9A134;
        margin: 0 5px;
        font-size: 18px;
      }
    }
  }
  .opt {
    display: flex;
    justify-content: space-around;
    width: 100%;
    div:hover {
      color: #0EC1D0;
      cursor: pointer;
    } 
    
    .opt-wrap {
      display: flex;
      align-items: center;
      cursor: pointer;
      img {
        width: 20px;
        height: 20px;
      }
      &:first-child {
        img {
          transform: scaleX(-1);
        }
      }
    }
  }
}

.intro {
  width: 350px;
  background-color: #fff;
  border-radius: 20px;
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  padding: 20px 25px;
  box-shadow: 0px 4px 10px 0px rgba(0, 0, 0, 0.3);
  .intro-title {
    display: flex;
    flex-direction: column;
    align-items: center;
    font-size: 14px;
    font-weight: bold;
    div {
      margin: 5px 0;
    }
    div:first-child {
      font-size: 22px;
      color: #0EC1D0;
    }
  }
  .intro-desc {
    margin: 10px 0 10px 0;
    font-size: 13px;
    div:first-child {
      font-weight: bold;
      color: #000;
      font-size: 15px;
      margin-bottom: 5px;
    }
  }
  .intro-node {
    div {
      display: flex;
      align-items: center;
      color: #000;
    }
    .ripple-container {
      position: relative;
      width: 13px;
      height: 13px;
      background: #0EC1D0;
      border-radius: 50%;
      margin-right: 10px;
      display: flex;
      align-items: center;
      justify-content: center;
    }
    .ripple {
      position: absolute;
      width: 100%;
      height: 100%;
      border: 2px solid rgba(255,255,255,0.7);
      border-radius: 50%;
      animation: ripple 1.5s cubic-bezier(0.4,0,0.2,1) infinite;
    }
    @keyframes ripple {
      0% {
        transform: scale(0.5);
        opacity: 1;
      }
      100% {
        transform: scale(2.5);
        opacity: 0;
      }
    }
  }
  .intro-opt {
    display: flex;
    justify-content: space-around;
    margin-top: 20px;
    font-size: 13px;
    .intro-btn {
      background-color: #0EC1D0;
      color: #fff;
      border-radius: 10px;
      padding: 6px 17px;
      cursor: pointer;
      &:hover {
        background-color: #0EC1D0;
        color: #fff;
        box-shadow: 0px 2px 6px 0px rgba(0, 0, 0, 0.3);
      }
      &:first-child {
        background-color: #E5E7EB;
        color: #000;
      }
    }
  }
}

</style>