<script setup lang="ts">
import { computed } from 'vue'
import { getSignedInUsername } from '@/stores/user'
import { UIButton } from '@/components/ui'
import { useMessageHandle } from '@/utils/exception'
import { useEnsureSignedIn } from '@/utils/user'
import { useFollow, useIsFollowing, useUnfollow } from '@/stores/following'

const props = defineProps<{
  /** Name of user to follow */
  name: string
}>()

const followable = computed(() => {
  const signedInUsername = getSignedInUsername()
  return signedInUsername != null && props.name !== signedInUsername
})

const { data: following } = useIsFollowing(() => props.name)
const follow = useFollow()
const unfollow = useUnfollow()

const ensureSignedIn = useEnsureSignedIn()
const handleClick = useMessageHandle(async () => {
  await ensureSignedIn()
  await (following.value ? unfollow(props.name) : follow(props.name))
})
</script>

<template>
  <UIButton
    v-if="followable && following != null"
    v-radar="{ name: 'Follow button', desc: 'Click to follow or unfollow user' }"
    class="follow-button"
    :color="following ? 'boring' : 'primary'"
    :loading="handleClick.isLoading.value"
    @click="handleClick.fn"
  >
    {{ $t(following ? { en: 'Unfollow', zh: '取消关注' } : { en: 'Follow', zh: '关注' }) }}
  </UIButton>
</template>

<style lang="scss" scoped></style>
