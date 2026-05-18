<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'

import { getProject, getProjectEditorRoute, listRelatedProjects } from '@/apis/project'
import CenteredWrapper from '@/components/community/CenteredWrapper.vue'
import ProjectsSection from '@/components/community/ProjectsSection.vue'
import TextView from '@/components/common/TextView.vue'
import PrototypeProjectRunner from '@/components/project/PrototypeProjectRunner.vue'
import PrototypeButton from '@/components/ui/PrototypeButton.vue'
import PrototypeCard from '@/components/ui/PrototypeCard.vue'
import { humanizeCount } from '@/utils/format'
import { getProjectPageRoute, getUserPageRoute } from '@/router'

const props = defineProps<{
  ownerInput: string
  nameInput: string
}>()

const copied = ref(false)
const project = computed(() => getProject(props.ownerInput, props.nameInput))
const relatedProjects = computed(() => listRelatedProjects(project.value))

function copyShareLink() {
  copied.value = true
  window.setTimeout(() => {
    copied.value = false
  }, 1600)
}

onMounted(() => {
  document.title = `${project.value.title} - XBuilder`
})
</script>

<template>
  <main class="bg-grey-300">
    <CenteredWrapper class="pt-6 pb-10" size="large">
      <PrototypeCard class="flex gap-10 bg-grey-100 p-5">
        <section class="min-w-0 flex-[1_1_744px]">
          <div class="aspect-[4/3] overflow-hidden rounded-md bg-grey-1000">
            <PrototypeProjectRunner :project="project" :show-controls="false" />
          </div>
          <div class="mt-3 flex justify-end gap-3">
            <PrototypeButton class="!size-8 !p-0" aria-label="Share project" @click="copyShareLink">
              <svg aria-hidden="true" viewBox="0 0 16 16" class="size-4 fill-current">
                <path d="M11.6777 1.28516C13.0155 1.2853 14.1006 2.37024 14.1006 3.70801C14.1005 5.0457 13.0154 6.13071 11.6777 6.13086C10.9963 6.1308 10.3806 5.84854 9.94043 5.39551L6.64648 7.31836C6.70963 7.53433 6.74413 7.76266 6.74414 7.99902C6.74413 8.23526 6.70956 8.46382 6.64648 8.67969L9.94238 10.5996C10.3824 10.1481 10.9975 9.86725 11.6777 9.86719C13.0154 9.86734 14.1004 10.9524 14.1006 12.29C14.1005 13.6278 13.0154 14.7127 11.6777 14.7129C10.34 14.7128 9.25494 13.6278 9.25488 12.29C9.25491 12.0529 9.28998 11.824 9.35352 11.6074L6.05762 9.68652C5.61744 10.1393 5.00258 10.4218 4.32129 10.4219C2.98354 10.4218 1.8985 9.33678 1.89844 7.99902C1.8985 6.66127 2.98354 5.57627 4.32129 5.57617C5.00229 5.5762 5.61748 5.8581 6.05762 6.31055L9.35254 4.38867C9.28946 4.17279 9.2549 3.94426 9.25488 3.70801C9.25488 2.37022 10.34 1.28527 11.6777 1.28516ZM11.6777 11.0342C11.2397 11.0343 10.8545 11.2595 10.6299 11.5996C10.6212 11.6194 10.6117 11.6391 10.6006 11.6582C10.589 11.6781 10.575 11.6968 10.5615 11.7148C10.4725 11.8871 10.4219 12.0828 10.4219 12.29C10.4219 12.9834 10.9843 13.5458 11.6777 13.5459C12.3711 13.5457 12.9335 12.9834 12.9336 12.29C12.9334 11.5967 12.371 11.0343 11.6777 11.0342ZM4.32129 6.74316C3.62788 6.74326 3.06549 7.3056 3.06543 7.99902C3.06549 8.69244 3.62788 9.25479 4.32129 9.25488C5.01473 9.25482 5.57709 8.69246 5.57715 7.99902C5.57709 7.30558 5.01473 6.74322 4.32129 6.74316ZM11.6777 2.45215C10.9843 2.45226 10.4219 3.01455 10.4219 3.70801C10.4219 3.9322 10.482 4.142 10.585 4.32422C10.588 4.32916 10.5918 4.33478 10.5947 4.33984C10.5958 4.34163 10.5966 4.34391 10.5977 4.3457C10.8163 4.71511 11.2175 4.96379 11.6777 4.96387C12.3711 4.96372 12.9335 4.40137 12.9336 3.70801C12.9336 3.01457 12.3711 2.4523 11.6777 2.45215Z" />
              </svg>
            </PrototypeButton>
          </div>
        </section>

        <aside class="flex min-w-0 flex-[1_1_456px] flex-col pr-5">
          <h1 class="m-0 break-all text-2xl/[1.4] font-normal text-title">{{ project.title }}</h1>
          <RouterLink
            v-if="project.remixedFrom"
            class="mt-2 inline-flex text-sm text-primary-600 no-underline hover:underline"
            :to="getProjectPageRoute(project.remixedFrom.owner, project.remixedFrom.name)"
          >
            Remixed from {{ project.remixedFrom.title }}
          </RouterLink>

          <div class="mt-4 flex items-center justify-between gap-4">
            <RouterLink class="flex min-w-0 items-center gap-3 text-text no-underline" :to="getUserPageRoute(project.owner.username)">
              <img class="size-10 flex-none rounded-full border border-grey-300 object-cover" :src="project.owner.avatar" alt="" />
              <span class="min-w-0">
                <span class="block truncate text-base text-title">{{ project.owner.displayName }}</span>
                <span class="block truncate text-sm text-hint-1">@{{ project.owner.username }}</span>
              </span>
            </RouterLink>

            <p class="m-0 flex flex-none items-center gap-2 text-sm text-hint-2">
              <span class="flex items-center gap-1" :title="`${project.views} views`">
                <svg aria-hidden="true" viewBox="0 0 20 20" class="size-3.5 fill-current">
                  <path d="M10 4.2c4 0 6.7 3.56 7.55 4.87.36.56.36 1.3 0 1.86C16.7 12.24 14 15.8 10 15.8s-6.7-3.56-7.55-4.87a1.72 1.72 0 0 1 0-1.86C3.3 7.76 6 4.2 10 4.2Zm0 2.7a3.1 3.1 0 1 0 0 6.2 3.1 3.1 0 0 0 0-6.2Zm0 1.4a1.7 1.7 0 1 1 0 3.4 1.7 1.7 0 0 1 0-3.4Z" />
                </svg>
                {{ humanizeCount(project.views) }}
              </span>
              <i class="h-3 w-px bg-dividing-line-1"></i>
              <span class="flex items-center gap-1" :title="`Remixed ${project.remixes} times`">
                <svg aria-hidden="true" viewBox="0 0 14 14" class="size-3.5 fill-current">
                  <path fill-rule="evenodd" clip-rule="evenodd" d="M2.7244 9.91416C1.79261 8.3861 1.71651 6.34687 2.53755 4.73026C3.38828 2.99272 4.81999 2.22259 5.3954 1.97219C5.74126 1.81156 6.10568 1.68636 6.49795 1.59414L6.88279 1.51108C7.16554 1.45306 7.44706 1.62834 7.50831 1.90806C7.57018 2.18839 7.39014 2.46444 7.10615 2.52551L6.73182 2.60613C6.42061 2.67942 6.12239 2.78202 5.83159 2.9176C5.45356 3.08128 4.20313 3.71461 3.48171 5.18892C2.93415 6.26564 2.7708 7.97752 3.63268 9.39015C4.4135 10.7509 6.01226 11.5851 7.52873 11.4447C8.96291 11.3414 10.2789 10.3869 10.7405 9.12265C11.2089 7.93355 10.8976 6.71453 10.3835 6.02806C9.76415 5.1822 8.99323 4.92203 8.69068 4.84935C8.64551 4.83591 7.58627 4.51772 6.65077 4.98615C6.24799 5.17914 5.72703 5.61338 5.44799 6.26564C5.14667 6.93928 5.22463 7.8053 5.63298 8.38061C6.04381 8.99745 6.81844 9.34679 7.4848 9.2283C8.14806 9.12387 8.59663 8.6304 8.70305 8.19678C8.82803 7.73079 8.63623 7.33686 8.4865 7.19517C8.23221 6.94416 8.01257 6.93989 8.00328 6.93928C7.89934 6.93622 7.84799 6.94416 7.81705 6.94905C7.69826 6.99241 7.52997 7.08769 7.48047 7.18785C7.47181 7.20434 7.44953 7.24953 7.49223 7.36251C7.59431 7.63063 7.45634 7.9305 7.18472 8.03127C6.91434 8.13265 6.60994 7.99646 6.50723 7.72773C6.33832 7.28312 6.43175 6.935 6.54002 6.72125C6.82277 6.16487 7.47923 5.96333 7.55348 5.94195C7.58751 5.93157 7.62339 5.92546 7.65866 5.92241C7.73105 5.91141 7.85851 5.89431 8.03113 5.90103C8.42649 5.90592 8.87691 6.11234 9.22216 6.45374C9.62989 6.83851 9.94915 7.61169 9.7227 8.45206C9.50181 9.35167 8.65294 10.0955 7.66237 10.2513C6.59694 10.4412 5.39725 9.91599 4.76369 8.96386C4.15302 8.10578 4.03608 6.85011 4.48279 5.854C4.97281 4.70705 5.90893 4.18793 6.18364 4.05601C7.5046 3.39642 8.91651 3.83187 8.97591 3.85019C9.3558 3.93997 10.4119 4.29358 11.233 5.4155C11.8641 6.25953 12.3757 7.83583 11.7255 9.48603C11.1315 11.1124 9.44056 12.3479 7.61721 12.4792C7.47428 12.4927 7.3295 12.5 7.18534 12.5C5.41581 12.5 3.6234 11.4801 2.7244 9.91416Z" stroke="currentColor" stroke-width="0.2" />
                </svg>
                {{ humanizeCount(project.remixes) }}
              </span>
            </p>
          </div>

          <div class="mt-4 flex gap-3">
            <RouterLink
              class="inline-flex h-10 flex-[1_1_0] items-center justify-center gap-2 rounded-sm border border-transparent bg-primary-500 px-3 text-sm font-medium text-white no-underline hover:bg-primary-600"
              :to="getProjectEditorRoute(project)"
            >
              <svg aria-hidden="true" viewBox="0 0 20 20" class="size-4 fill-current">
                <path d="M13.8 2.8a1.7 1.7 0 0 1 2.4 2.4L6.9 14.5l-3.3.9.9-3.3 9.3-9.3ZM3.6 16.3h12.8a.8.8 0 0 1 0 1.6H3.6a.8.8 0 0 1 0-1.6Z" />
              </svg>
              Edit
            </RouterLink>
            <PrototypeButton class="!h-10 flex-[1_1_0] !gap-2 !rounded-md !border-transparent !bg-primary-200 !px-6 !text-lg/[24px] !font-medium !text-primary-500 hover:!bg-primary-100" @click="copyShareLink">
              <svg aria-hidden="true" viewBox="0 0 16 16" class="size-5 fill-current">
                <path d="M11.6777 1.28516C13.0155 1.2853 14.1006 2.37024 14.1006 3.70801C14.1005 5.0457 13.0154 6.13071 11.6777 6.13086C10.9963 6.1308 10.3806 5.84854 9.94043 5.39551L6.64648 7.31836C6.70963 7.53433 6.74413 7.76266 6.74414 7.99902C6.74413 8.23526 6.70956 8.46382 6.64648 8.67969L9.94238 10.5996C10.3824 10.1481 10.9975 9.86725 11.6777 9.86719C13.0154 9.86734 14.1004 10.9524 14.1006 12.29C14.1005 13.6278 13.0154 14.7127 11.6777 14.7129C10.34 14.7128 9.25494 13.6278 9.25488 12.29C9.25491 12.0529 9.28998 11.824 9.35352 11.6074L6.05762 9.68652C5.61744 10.1393 5.00258 10.4218 4.32129 10.4219C2.98354 10.4218 1.8985 9.33678 1.89844 7.99902C1.8985 6.66127 2.98354 5.57627 4.32129 5.57617C5.00229 5.5762 5.61748 5.8581 6.05762 6.31055L9.35254 4.38867C9.28946 4.17279 9.2549 3.94426 9.25488 3.70801C9.25488 2.37022 10.34 1.28527 11.6777 1.28516ZM11.6777 11.0342C11.2397 11.0343 10.8545 11.2595 10.6299 11.5996C10.6212 11.6194 10.6117 11.6391 10.6006 11.6582C10.589 11.6781 10.575 11.6968 10.5615 11.7148C10.4725 11.8871 10.4219 12.0828 10.4219 12.29C10.4219 12.9834 10.9843 13.5458 11.6777 13.5459C12.3711 13.5457 12.9335 12.9834 12.9336 12.29C12.9334 11.5967 12.371 11.0343 11.6777 11.0342ZM4.32129 6.74316C3.62788 6.74326 3.06549 7.3056 3.06543 7.99902C3.06549 8.69244 3.62788 9.25479 4.32129 9.25488C5.01473 9.25482 5.57709 8.69246 5.57715 7.99902C5.57709 7.30558 5.01473 6.74322 4.32129 6.74316ZM11.6777 2.45215C10.9843 2.45226 10.4219 3.01455 10.4219 3.70801C10.4219 3.9322 10.482 4.142 10.585 4.32422C10.588 4.32916 10.5918 4.33478 10.5947 4.33984C10.5958 4.34163 10.5966 4.34391 10.5977 4.3457C10.8163 4.71511 11.2175 4.96379 11.6777 4.96387C12.3711 4.96372 12.9335 4.40137 12.9336 3.70801C12.9336 3.01457 12.3711 2.4523 11.6777 2.45215Z" />
              </svg>
              {{ copied ? 'Link copied' : 'Share' }}
            </PrototypeButton>
          </div>

          <div class="mt-6 mb-4 h-px bg-dividing-line-1"></div>

          <div class="project-collapse mb-2 min-h-0 flex-[1_1_0] overflow-y-auto">
            <details class="project-collapse-item" open>
              <summary class="project-collapse-summary">
                <h5 class="m-0 text-xl font-normal text-title">Description</h5>
                <svg class="project-collapse-icon" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                  <path fill-rule="evenodd" clip-rule="evenodd" d="M11.4474 7.82134C11.7909 7.54092 12.2988 7.56097 12.6192 7.88091L19.6192 14.8809C19.961 15.2226 19.961 15.7775 19.6192 16.1192C19.2775 16.4608 18.7226 16.4609 18.381 16.1192L12.0001 9.73834L5.61925 16.1192C5.27753 16.4608 4.72264 16.4609 4.38097 16.1192C4.03982 15.7775 4.03954 15.2225 4.38097 14.8809L11.381 7.88091L11.4474 7.82134Z" fill="currentColor" />
                </svg>
              </summary>
              <TextView class="mt-2" :text="project.description" placeholder="No description yet." />
            </details>
            <details class="project-collapse-item" open>
              <summary class="project-collapse-summary">
                <h5 class="m-0 text-xl font-normal text-title">Play instructions</h5>
                <svg class="project-collapse-icon" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                  <path fill-rule="evenodd" clip-rule="evenodd" d="M11.4474 7.82134C11.7909 7.54092 12.2988 7.56097 12.6192 7.88091L19.6192 14.8809C19.961 15.2226 19.961 15.7775 19.6192 16.1192C19.2775 16.4608 18.7226 16.4609 18.381 16.1192L12.0001 9.73834L5.61925 16.1192C5.27753 16.4608 4.72264 16.4609 4.38097 16.1192C4.03982 15.7775 4.03954 15.2225 4.38097 14.8809L11.381 7.88091L11.4474 7.82134Z" fill="currentColor" />
                </svg>
              </summary>
              <TextView class="mt-2" :text="project.instructions" placeholder="No instructions yet." />
            </details>
            <details v-if="project.releaseHistory?.length" class="project-collapse-item" open>
              <summary class="project-collapse-summary">
                <h5 class="m-0 text-xl font-normal text-title">Release history</h5>
                <svg class="project-collapse-icon" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                  <path fill-rule="evenodd" clip-rule="evenodd" d="M11.4474 7.82134C11.7909 7.54092 12.2988 7.56097 12.6192 7.88091L19.6192 14.8809C19.961 15.2226 19.961 15.7775 19.6192 16.1192C19.2775 16.4608 18.7226 16.4609 18.381 16.1192L12.0001 9.73834L5.61925 16.1192C5.27753 16.4608 4.72264 16.4609 4.38097 16.1192C4.03982 15.7775 4.03954 15.2225 4.38097 14.8809L11.381 7.88091L11.4474 7.82134Z" fill="currentColor" />
                </svg>
              </summary>
              <ol class="m-0 mt-2 list-none p-0">
                <li v-for="release in project.releaseHistory" :key="release.id" class="py-2">
                  <div class="flex items-center justify-between">
                    <span class="font-medium text-title">{{ release.version }}</span>
                    <span class="text-sm text-hint-1">{{ release.createdAt }}</span>
                  </div>
                  <p class="mt-1 text-sm leading-5 text-grey-700">{{ release.notes }}</p>
                </li>
              </ol>
            </details>
          </div>
        </aside>
      </PrototypeCard>

      <ProjectsSection class="mt-5" title="Popular remixes" :projects="relatedProjects" context="project" />
    </CenteredWrapper>
  </main>
</template>

<style scoped>
.project-collapse-item {
  display: flex;
  flex-direction: column;
}

.project-collapse-item + .project-collapse-item::before {
  content: '';
  display: block;
  height: 1px;
  margin: 16px 0;
  background: var(--color-grey-400);
}

.project-collapse-summary {
  display: flex;
  cursor: pointer;
  list-style: none;
  align-items: center;
  justify-content: space-between;
}

.project-collapse-summary::-webkit-details-marker {
  display: none;
}

.project-collapse-summary::marker {
  content: '';
  font-size: 0;
}

.project-collapse-icon {
  width: 20px;
  height: 20px;
  color: var(--color-text);
  transition: transform 0.3s;
}

.project-collapse-item:not([open]) .project-collapse-icon {
  transform: rotate(180deg);
}
</style>
