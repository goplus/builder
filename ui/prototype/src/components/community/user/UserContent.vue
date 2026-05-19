<template>
  <section class="rounded-md border border-grey-300 bg-grey-100 p-5 shadow-sm">
    <header class="mb-5 flex min-h-9 items-center justify-between gap-4">
      <h2 class="m-0 text-2xl font-normal text-title">
        <slot name="title" />
      </h2>
      <div class="flex items-center gap-3 text-sm text-grey-700">
        <slot name="extra" />
      </div>
    </header>
    <slot />
  </section>
</template>
