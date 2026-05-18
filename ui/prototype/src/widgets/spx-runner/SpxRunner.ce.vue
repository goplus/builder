<script setup lang="ts">
import { ref } from 'vue'

import { getProject } from '@/apis/project'

const project = getProject('qingqing', 'niu-run')
const running = ref(false)
</script>

<template>
  <section class="font-sans overflow-hidden rounded-md border border-slate-200 bg-white text-slate-900 shadow-sm">
    <div class="relative aspect-video bg-slate-950">
      <img class="size-full object-cover opacity-85" :src="project.thumbnail" :alt="project.title" />
      <div class="absolute inset-0 grid place-items-center">
        <button
          class="rounded-full bg-white px-5 py-2 text-sm font-semibold text-slate-950 shadow"
          type="button"
          @click="running = !running"
        >
          {{ running ? 'Stop' : 'Run' }}
        </button>
      </div>
    </div>
    <div class="flex items-center justify-between p-3">
      <div>
        <h1 class="m-0 text-base font-semibold">{{ project.title }}</h1>
        <p class="m-0 mt-1 text-xs text-slate-500">Standalone local SPX runner widget prototype</p>
      </div>
      <span class="rounded-full px-2 py-1 text-xs" :class="running ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-600'">
        {{ running ? 'Running' : 'Idle' }}
      </span>
    </div>
  </section>
</template>
