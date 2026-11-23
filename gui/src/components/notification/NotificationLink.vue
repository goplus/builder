<script lang="ts">
import { inject, type InjectionKey } from 'vue'

import { UniversalUrlScheme } from '@/utils/universal-url'
import { cloudHelpers } from '@/models/common/cloud'

const insideLinkKey: InjectionKey<boolean> = Symbol('notification-link')

/** Whether it is rendered inside a link, where it should not render another link */
export function useInsideNotificationLink() {
  return inject(insideLinkKey, false)
}

/** Resolve Kodo URLs to web URLs, and keep other URLs, such as `mailto:` and relative URLs, as they are */
export async function resolveWebUrl(url: string) {
  return url.startsWith(`${UniversalUrlScheme.Kodo}:`) ? cloudHelpers.universalUrlToWebUrl(url) : url
}
</script>

<script setup lang="ts">
import { provide } from 'vue'

import { useAsyncComputed } from '@/utils/utils'

const props = withDefaults(
  defineProps<{
    /** Missing if `MarkdownView` dropped an unsafe URL */
    href?: string | null
    title?: string | null
  }>(),
  { href: null, title: null }
)

provide(insideLinkKey, true)

const webUrl = useAsyncComputed(async () => (props.href == null ? null : resolveWebUrl(props.href)))
</script>

<template>
  <span v-if="href == null"><slot></slot></span>
  <a v-else :href="webUrl ?? undefined" :title="title ?? undefined"><slot></slot></a>
</template>
