<script setup lang="ts">
const codeLines = [
  'onStart => {',
  '  say "Hello XBuilder"',
  '  repeat 10, => {',
  '    step 8',
  '    turn 15',
  '  }',
  '}'
]

const diagnostics = [
  {
    line: 2,
    message: 'Prototype hint: try changing the message text.'
  },
  {
    line: 4,
    message: 'Prototype hint: motion commands update the sprite preview.'
  }
]
</script>

<template>
  <section class="font-mono overflow-hidden rounded-md border border-slate-200 bg-slate-950 text-slate-100 shadow-sm">
    <header class="flex items-center justify-between border-b border-slate-800 px-3 py-2">
      <div class="flex gap-2 text-xs">
        <span class="rounded bg-cyan-500/20 px-2 py-1 text-cyan-200">Code</span>
        <span class="rounded px-2 py-1 text-slate-400">API Reference</span>
      </div>
      <span class="text-xs text-slate-500">Local XGo editor widget</span>
    </header>
    <div class="grid grid-cols-[minmax(0,1fr)_260px]">
      <ol class="m-0 list-none p-0">
        <li v-for="(line, index) in codeLines" :key="`${index}-${line}`" class="grid grid-cols-[48px_minmax(0,1fr)]">
          <span class="select-none bg-slate-900 px-3 py-1 text-right text-xs text-slate-500">{{ index + 1 }}</span>
          <code class="px-3 py-1 text-sm text-slate-100">{{ line }}</code>
        </li>
      </ol>
      <aside class="border-l border-slate-800 bg-slate-900 p-3">
        <h2 class="m-0 text-xs font-semibold uppercase tracking-wide text-slate-500">Diagnostics</h2>
        <ul class="m-0 mt-3 list-none space-y-2 p-0">
          <li v-for="diagnostic in diagnostics" :key="diagnostic.message" class="rounded bg-slate-800 p-2 text-xs leading-5 text-slate-300">
            <span class="text-cyan-300">Line {{ diagnostic.line }}</span>
            <span class="block">{{ diagnostic.message }}</span>
          </li>
        </ul>
      </aside>
    </div>
  </section>
</template>
