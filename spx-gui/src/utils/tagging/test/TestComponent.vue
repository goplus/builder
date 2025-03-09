<script setup lang="ts">
import TagRoot from '../TagRoot.vue'
import TagNode from '../TagNode.vue'
</script>

<template>
  <TagRoot>
    <TagNode name="info-box">
      <div class="info-box">
        <TagNode name="info-header">
          <div class="info-header">
            <TagNode name="info-title">
              <div class="info-title">Title</div>
            </TagNode>
            <TagNode name="info-close">
              <div class="info-close">Close</div>
            </TagNode>
          </div>
        </TagNode>
        <TagNode name="info-content">
          <div class="info-content">
            <TagNode name="author-info">
              <p class="author">
                <TagNode name="first-name">
                  <span class="first-name"> First Name </span>
                </TagNode>
                <TagNode name="last-name">
                  <span class="last-name"> Last Name </span>
                </TagNode>
              </p>
            </TagNode>
            <TagNode name="info-text">
              <p class="info-text">
                Random text, those are some mark
                <TagNode name="mark-a">
                  <mark>mark-a</mark>
                </TagNode>
                <TagNode name="mark-b">
                  <mark>mark-b</mark>
                </TagNode>
                <TagNode name="mark-c">
                  <mark>mark-c</mark>
                </TagNode>
              </p>
            </TagNode>
          </div>
        </TagNode>
        <TagNode name="info-footer">
          <div class="info-footer">
            <TagNode name="info-ok">
              <button class="info-ok">OK</button>
            </TagNode>
          </div>
        </TagNode>
      </div>
    </TagNode>
  </TagRoot>
</template>

<style scoped></style>
