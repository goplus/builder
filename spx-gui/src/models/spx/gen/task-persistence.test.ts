import { flushPromises } from '@vue/test-utils'
import { computed, watch } from 'vue'
import { describe, expect, it } from 'vitest'
import { setupAigcMock } from './aigc-mock' // Set up API mocks before importing the generation models.
import { TaskType } from '@/apis/aigc'
import { createI18n } from '@/utils/i18n'
import { fromConfig, toConfig } from '@/models/common/file'
import { mockFile } from '@/models/common/test'
import { makeSpxProject } from '../common/test'
import { Sprite } from '../sprite'
import { AnimationGen } from './animation-gen'
import { BackdropGen } from './backdrop-gen'
import { CostumeGen } from './costume-gen'
import { SpriteGen } from './sprite-gen'
import { mockSaveFile } from './test-helpers'

const aigcMock = setupAigcMock()

describe('generation task persistence', () => {
  it.each(['animation', 'costume', 'sprite', 'backdrop'] as const)(
    'updates the saved %s task after reference upload finishes',
    async (kind) => {
      aigcMock.reset()
      let finishUpload!: (url: string) => void
      mockSaveFile().mockReturnValueOnce(
        new Promise<string>((resolve) => {
          finishUpload = resolve
        })
      )
      let finishTask!: () => void
      const taskPaused = new Promise<void>((resolve) => {
        finishTask = resolve
      })
      const taskType =
        kind === 'animation'
          ? TaskType.GenerateAnimationVideo
          : kind === 'backdrop'
            ? TaskType.GenerateBackdrop
            : TaskType.GenerateCostume
      aigcMock.registerTaskHandler(taskType, async function* (_task, _params, defaultHandler) {
        await taskPaused
        yield* defaultHandler()
      })

      const i18n = createI18n({ lang: 'en' })
      const project = makeSpxProject()
      const sprite = Sprite.create('TestSprite', '')
      const inits = { settings: { name: 'reference-test' } }
      const { gen, generate, exportConfig, taskKey } = (() => {
        if (kind === 'animation') {
          const gen = new AnimationGen(i18n, sprite, project, inits)
          return {
            gen,
            generate: () => gen.generateVideo(),
            exportConfig: () => fromConfig('index.json', gen.export()[0]),
            taskKey: 'generateVideoTaskSerialized'
          }
        }
        if (kind === 'costume') {
          const gen = new CostumeGen(i18n, sprite, project, inits)
          return {
            gen,
            generate: () => gen.generate(),
            exportConfig: () => fromConfig('index.json', gen.export()[0]),
            taskKey: 'generateTaskSerialized'
          }
        }
        if (kind === 'sprite') {
          const gen = new SpriteGen(i18n, project, inits)
          return {
            gen,
            generate: () => gen.genImages(),
            exportConfig: () => gen.export()['assets/sprite-gens/reference-test/index.json']!,
            taskKey: 'genImagesTaskSerialized'
          }
        }
        const gen = new BackdropGen(i18n, project, inits)
        return {
          gen,
          generate: () => gen.genImages(),
          exportConfig: () => gen.export()['assets/backdrop-gens/reference-test/index.json']!,
          taskKey: 'generateTaskSerialized'
        }
      })()
      const reference = mockFile('reference.png')
      reference.meta.imgSize = { width: 512, height: 512 }
      gen.setReferenceImage(reference)

      // The editor watches a computed export to decide when to save again.
      const exported = computed(exportConfig)
      let saved = exported.value
      const unwatch = watch(exported, (config) => {
        saved = config
      })
      const generating = generate()
      try {
        await flushPromises()
        expect(await toConfig(saved)).toMatchObject({ [taskKey]: { data: null } })

        finishUpload('kodo://mock-bucket/reference.png')
        await flushPromises()
        expect(aigcMock.tasks.size).toBe(1)
        const [taskId] = aigcMock.tasks.keys()
        expect(await toConfig(saved)).toMatchObject({ [taskKey]: { data: { id: taskId } } })
      } finally {
        unwatch()
        finishUpload('kodo://mock-bucket/reference.png')
        finishTask()
        await generating
        gen.dispose()
        project.dispose()
      }
    }
  )
})
