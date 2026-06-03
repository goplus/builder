<template>
  <section class="flex flex-col rounded-md border border-grey-300 bg-grey-100 px-4 py-5 shadow-sm">
    <header class="mb-2 flex h-8 items-center justify-between gap-5">
      <h2 class="m-0 text-xl font-normal text-title">
        <slot name="title" />
      </h2>
      <div class="flex items-center gap-6 text-sm text-grey-700">
        <slot name="extra" />
      </div>
    </header>
    <slot />
  </section>
</template>
