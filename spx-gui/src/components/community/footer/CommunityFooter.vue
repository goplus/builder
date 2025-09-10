<script setup lang="ts">
import { showLicense } from '@/utils/env'
import { UILink } from '@/components/ui'
</script>

<template>
  <footer v-if="showLicense" class="community-footer">
    <span class="part">{{ $t({ en: '© 2025 Qiniu Cloud.', zh: '© 2025 七牛云' }) }}</span>
    <UILink
      class="part"
      type="boring"
      target="_blank"
      href="https://www.beian.gov.cn/portal/registerSystemInfo?recordcode=31011502000961"
      ><img class="icon" src="./license-icon.png" />沪公网安备 31011502000961 号</UILink
    >
    <UILink class="part" type="boring" target="_blank" href="https://beian.miit.gov.cn/"
      >浙 ICP 备 2025161674 号-3</UILink
    >
  </footer>
</template>

<style lang="scss" scoped>
.community-footer {
  flex: 0 0 auto;
  width: 100%;
  height: 50px;
  display: flex;
  flex-direction: row;
  gap: 24px;
  justify-content: center;
  align-items: center;
  color: var(--ui-color-grey-700);
  font-size: 12px;
}
.part {
  display: flex;
  align-items: center;
  justify-content: center;
  text-decoration: none;
}
.icon {
  margin-right: 4px;
  width: 16px;
  height: 16px;
}
</style>
