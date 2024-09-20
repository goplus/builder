<script setup lang="ts">
import UICard from '@/components/ui/UICard.vue'
import UICardHeader from '@/components/ui/UICardHeader.vue'
import { useEditorCtx } from '../EditorContextProvider.vue'
import { type RuntimeLog } from '@/models/runtime'

const editorCtx = useEditorCtx()

const handleClick = (log: RuntimeLog) => {
  if (log.position.abledToJump == false) {
    return
  }
  if (log.position.fileUri == 'main') {
    editorCtx.project.select({
      type: 'stage'
    })
  } else {
    editorCtx.project.select({
      type: 'sprite',
      name: log.position.fileUri
    })
  }
  //TODO: jump to column, line
}
</script>

<template>
  <div class="debug-panels">
    <UICard class="main">
      <UICardHeader>
        <div class="header">
          {{ $t({ en: 'Console', zh: '日志信息' }) }}
        </div>
      </UICardHeader>
      <div class="console">
        <div
          v-for="(log, index) in editorCtx.debugLogList"
          :key="index"
          class="message"
          @click="handleClick(log)"
        >
          <span v-if="log.position.abledToJump">
            <span class="fileUri">{{
              $t({ en: 'file:', zh: '文件:' }) + log.position.fileUri
            }}</span>
            <span class="line">{{ $t({ en: 'line:', zh: '行:' }) + log.position.line }}</span>
            <span class="column">{{ $t({ en: 'column:', zh: '列:' }) + log.position.column }}</span>
            <br />
          </span>
          <span class="msg">{{ $t({ en: 'message:', zh: '信息:' }) + log.message }}</span>
        </div>
      </div>
    </UICard>
  </div>
</template>

<style scoped lang="scss">
.debug-panels {
  flex: 1;
  display: flex;
  flex-direction: column;
  position: relative;
  overflow: hidden;
}

.main {
  flex: 1 1 0;
  min-width: 0;
  display: flex;
  flex-direction: column;

  .header {
    flex: 1;
    color: var(--ui-color-title);
  }
}

.hidden-runner {
  width: 0;
  height: 0;
  overflow: hidden;
}

.close {
  transform: scale(1.2);
}

.console {
  padding: 8px;
  overflow: auto;
}

.message {
  padding: 6px;
  border-radius: 8px;
  transition: 0.3s;
  margin-bottom: 8px;
  &:hover {
    background-color: var(--ui-color-grey-300);
  }
}

.fileUri {
  margin: 0 2px;
}

.line {
  margin: 0 2px;
}

.column {
  margin: 0 2px;
}

.msg {
  margin: 0 2px;
}
</style>
