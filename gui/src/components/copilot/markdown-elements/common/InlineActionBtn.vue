<template>
  <button
    type="button"
    class="inline-block w-fit rounded-[4px] border-none bg-turquoise-main px-1.25 py-0.5 text-sm/[normal] text-grey-100 outline-none enabled:cursor-pointer enabled:hover:bg-turquoise-400 enabled:active:bg-turquoise-600 disabled:cursor-not-allowed disabled:bg-disabled-bg disabled:text-disabled-text"
  >
    <slot></slot>
  </button>
</template>
