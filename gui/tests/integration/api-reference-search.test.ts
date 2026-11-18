import { writeFileSync } from 'node:fs'
import { request } from 'node:http'
import { describe, expect, it } from 'vitest'
import { DocumentBase } from '@/components/xgo-code-editor/document-base'
import { getTextDocumentId } from '@/components/xgo-code-editor/common'
import { stringifyDefinitionId } from '@/components/xgo-code-editor/definition-id'
import { apiReferenceSimilarityThreshold } from '@/components/editor/spx-code-editor/api-reference/search'
import {
  getAPIReferenceSearchText,
  rankAPIReferenceResults
} from '@/components/xgo-code-editor/ui/api-reference/search'
import * as definitions from '@/components/editor/spx-code-editor/document-base'
import { SpxAPIReferenceProvider } from '@/components/editor/spx-code-editor/api-reference'

const endpoint = process.env.API_REFERENCE_SEARCH_URL
const cases: Array<[string, string]> = [
  ['播放动画', 'Sprite.animate'],
  ['play animation', 'Sprite.animate'],
  ['循环播放动画', 'Sprite.animate'],
  ['loop an animation', 'Sprite.animate'],
  ['播放动画后继续', 'Sprite.animateAndWait'],
  ['wait until animation ends', 'Sprite.animateAndWait'],
  ['停止动画', 'Sprite.stopAnimation'],
  ['stop animation', 'Sprite.stopAnimation'],
  ['播放声音', 'Sprite.play'],
  ['play sound', 'Sprite.play'],
  ['调大音量', 'Sprite.changeVolume'],
  ['increase volume', 'Sprite.changeVolume'],
  ['设置音量', 'Sprite.setVolume'],
  ['set volume', 'Sprite.setVolume'],
  ['遍历数组', 'for_iterate'],
  ['loop through an array', 'for_iterate'],
  ['重复十次', 'repeat'],
  ['repeat ten times', 'repeat'],
  ['一直执行', 'forever'],
  ['repeat forever', 'forever'],
  ['等待一秒', 'Game.wait'],
  ['wait a second', 'Game.wait'],
  ['移动到另一个角色', 'Sprite.stepTo'],
  ['move to another sprite', 'Sprite.stepTo'],
  ['修改横坐标', 'Sprite.setXpos'],
  ['set horizontal position', 'Sprite.setXpos'],
  ['角色说话', 'Sprite.say'],
  ['make the sprite speak', 'Sprite.say'],
  ['隐藏角色', 'Sprite.hide'],
  ['hide sprite', 'Sprite.hide'],
  ['当游戏开始', 'Sprite.onStart'],
  ['when game starts', 'Sprite.onStart'],
  ['按下键盘时', 'Sprite.onKey'],
  ['when a key is pressed', 'Sprite.onKey'],
  ['复制角色', 'Sprite.clone'],
  ['clone sprite', 'Sprite.clone'],
  ['随机数', 'rand'],
  ['random number', 'rand'],
  ['切换造型', 'Sprite.setCostume'],
  ['change costume', 'Sprite.setCostume'],
  ['明天北京天气怎么样', ''],
  ['how to bake a chocolate cake', ''],
  ['量子纠缠的原理', ''],
  ['办理护照', '']
]

describe.skipIf(endpoint == null)('API Reference real-service relevance', () => {
  it('reports multilingual rankings and cold/warm timings on the actual provider corpus', async () => {
    const provider = new SpxAPIReferenceProvider(new DocumentBase(Object.values(definitions)))
    const items = await provider.provideAPIReference({
      textDocument: { id: getTextDocumentId('Sprite.spx') },
      signal: new AbortController().signal
    } as any)
    const candidates = items.map((item) => ({
      id: stringifyDefinitionId(item.definition),
      text: getAPIReferenceSearchText(item)
    }))
    const rows = []
    for (const [query, expected] of cases) {
      const start = performance.now()
      const results = await new Promise<Array<{ id: string; score: number }>>((resolve, reject) => {
        const req = request(
          endpoint!,
          { method: 'POST', headers: { 'Content-Type': 'application/json' } },
          (response) => {
            let body = ''
            response.on('data', (chunk) => {
              body += chunk
            })
            response.on('end', () => {
              if (response.statusCode !== 200) return reject(new Error(`${response.statusCode}: ${body}`))
              resolve(JSON.parse(body).results)
            })
          }
        )
        req.on('error', reject)
        req.end(JSON.stringify({ query, candidates }))
      })
      expect(results).toHaveLength(candidates.length)
      const ranked = results.toSorted((a, b) => b.score - a.score)
      const threshold = Math.max(apiReferenceSimilarityThreshold, ...results.map(({ score }) => score - 0.1))
      const selected = rankAPIReferenceResults(items, query, results, threshold)
      if (expected === '') expect(selected).toEqual([])
      else expect(selected.some((item) => item.definition.name === expected)).toBe(true)
      const rank = ranked.findIndex(({ id }) => id.includes(`?${encodeURIComponent(expected)}`)) + 1
      const row = { query, expected, rank, ms: Math.round(performance.now() - start), scores: ranked }
      rows.push(row)
      process.stdout.write(JSON.stringify({ ...row, scores: ranked.slice(0, 5) }) + '\n')
    }
    if (process.env.API_REFERENCE_SEARCH_REPORT != null)
      writeFileSync(process.env.API_REFERENCE_SEARCH_REPORT, JSON.stringify(rows, null, 2))
  }, 180000)
})
