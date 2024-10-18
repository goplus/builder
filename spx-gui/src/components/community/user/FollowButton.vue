<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { useUserStore } from '@/stores'
import { follow, isFollowing, unfollow } from '@/apis/user'
import { UIButton } from '@/components/ui'
import { useMessageHandle } from '@/utils/exception'

const props = defineProps<{
  /** Name of user to follow */
  name: string
}>()

const followable = computed(() => props.name !== useUserStore().userInfo()?.name)
const following = ref<boolean | null>(null)

watch(
  () => props.name,
  async (name) => {
    if (!followable.value) return
    const result = await isFollowing(name)
    if (props.name === name) following.value = result
  },
  { immediate: true }
)

const handleClick = useMessageHandle(
  async () => {
    await (following.value ? unfollow(props.name) : follow(props.name))
    following.value = !following.value
  },
  { en: 'Failed to operate', zh: '操作失败' }
)
</script>

<template>
  <UIButton
    v-if="followable && following != null"
    class="follow-button"
    :type="following ? 'boring' : 'primary'"
    :loading="handleClick.isLoading.value"
    @click="handleClick.fn"
  >
    {{ $t(following ? { en: 'Unfollow', zh: '取消关注' } : { en: 'Follow', zh: '关注' }) }}
  </UIButton>
</template>

<style lang="scss" scoped></style>
