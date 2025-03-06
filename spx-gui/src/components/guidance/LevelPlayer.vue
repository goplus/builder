<template>
  <div class="level-player" :style="{
    transform: `translate(${levelPlayerCtx.getPos().x}px, ${levelPlayerCtx.getPos().y}px)`,
  }">
    <!-- 关卡介绍 -->
    <div class="intro">
      <!-- 此处待mask -->
    </div>
    <!-- 可拖拽的卡片组（悬浮卡片+悬浮按钮） -->
    <div class="card-group">
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
          class="video-player"
          ref="videoPlayerRef" 
          :videoUrl="props.level.video"
          :segments="videoPlaterSegments"
          @segmentEnd="handleSegmentEnd">
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
                <div v-for="(item, index) in currentNodeTask?.steps">
                  Step{{ index + 1 }}: {{ $t(item.title) }}
                </div>
              </div>
              <div class="cover-btn" @click="handleStartNodeTask">
                <span>{{ $t({zh: '现在开始', en: 'Get start'}) }}</span>
              </div>
            </div>
            <div v-if="coverType === CoverType.NODE_TASK_PENDING" class="cover cover-bg">
              <div class="cover-desc">
                <div v-for="(item, index) in currentNodeTask?.steps">
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
      <div class="floating-btn" @mousedown="handleMousedown">
        <img src="./icons/play.svg" alt="">
      </div>
    </div>

    <!-- 当有当前节点任务时，渲染 NodeTaskPlayer 组件 -->
    <NodeTaskPlayer
      v-if="currentNodeTask"
      :nodeTask="currentNodeTask"
      @nodeTaskCompleted="handleNodeTaskCompleted"
    />
  </div>
</template>

<script setup lang="ts">
import type { Level, NodeTask } from '@/apis/guidance';
import { defineProps, ref, computed, onUnmounted } from 'vue';
import VideoPlayer from '../common/VideoPlayer.vue';
import NodeTaskPlayer from './NodeTaskPlayer.vue';
import { useLevelPlayerCtx, type Placement } from './LevelPlayerContextProvider.vue';

const props = defineProps<{ level: Level }>();

const videoPlayerRef = ref<InstanceType<typeof VideoPlayer> | null>(null);
const currentNodeTask = ref<NodeTask | null>(null);
const currentNodeTaskIndex = ref<number | null>(null);
const videoPlaterSegments = computed(() => {
  return props.level.nodeTasks.map((nodeTask, index) => {
    return {
      endTime: nodeTask.triggerTime,
      extension: { nodeTaskIndex: index },
    };
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
function handleSegmentEnd(segment: any): void {
  coverType.value = CoverType.NODE_TASK_START;

  videoPlayerRef.value?.showCover();
  videoPlayerRef.value?.pause();

  currentNodeTaskIndex.value = segment.extension?.nodeTaskIndex as number;

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
function handleNodeTaskCompleted(): void {
  coverType.value = CoverType.NODE_TASK_END;
  videoPlayerVisible.value = true;
  if (currentNodeTaskIndex.value === props.level.nodeTasks.length - 1) {
    // 更新 关卡完结cover
    coverType.value = CoverType.LEVEL_END;
    videoPlayerRef.value?.showCover();
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
 * 拖拽
 */
const levelPlayerCtx = useLevelPlayerCtx();
const isDragging = ref<boolean>(false);
const startPos = ref<Placement>({ x: 0, y: 0 });
// 用于根据点击时长来区分点击和拖拽
const startTime = ref<number>(0);
function handleMousedown(e: MouseEvent): void {
  const { x, y } = levelPlayerCtx.getPos();
  startTime.value = Date.now();
  isDragging.value = true;
  startPos.value = {
    x: e.clientX - x,
    y: e.clientY - y,
  };
  window.addEventListener('mousemove', handleMousemove);
  window.addEventListener('mouseup', handleMouseup);
  e.preventDefault();
}
function handleMousemove(e: MouseEvent): void {
  if (!isDragging.value) return;
  requestAnimationFrame(() => {
    let newX = e.clientX - startPos.value.x;
    let newY = e.clientY - startPos.value.y;
    levelPlayerCtx.setPos({
      x: newX,
      y: newY,
    });
  });
}
function handleMouseup(): void {
  isDragging.value = false;
  if (Date.now() - startTime.value < 200) {
    handleFloatingBtnClick();
  }
  window.removeEventListener('mousemove', handleMousemove);
  window.removeEventListener('mouseup', handleMouseup);
}

onUnmounted(() => {
  window.removeEventListener('mousemove', handleMousemove);
  window.removeEventListener('mouseup', handleMouseup);
});
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


</style>