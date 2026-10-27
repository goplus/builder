import { nextTick, shallowRef } from 'vue'
import { describe, expect, it } from 'vitest'

import { ConcurrencyLimitController } from '@/utils/concurrency-limit'
import { useLocalEdits } from './local-edits'

/** A write that settles when the test says, as the server answers it. */
function makeServer(source: { value: string[] }) {
  const pending: Array<{ edited: string[]; settle: (ok: boolean) => void }> = []
  async function write(edited: string[]) {
    const ok = await new Promise<boolean>((resolve) => pending.push({ edited, settle: resolve }))
    if (!ok) throw new Error('write failed')
    // The server's answer reaches the cache the page reads from.
    source.value = edited
    return edited
  }
  async function answer(ok = true) {
    await nextTick()
    pending.shift()!.settle(ok)
    await new Promise((resolve) => setTimeout(resolve))
  }
  return { write, answer, pending }
}

describe('useLocalEdits', () => {
  it('keeps the edits shown while their writes are pending, so an earlier answer does not undo a later edit', async () => {
    const source = shallowRef(['One', 'Two'])
    const { value, edit } = useLocalEdits(source)
    const server = makeServer(source)
    const edits: Array<Promise<void>> = []

    edits.push(edit(['A', 'Two'], server.write))
    edits.push(edit([value.value[0], 'B'], server.write))
    await server.answer()
    // The answer to A is older than B, which stays shown and is what the next edit builds on.
    expect(value.value).toEqual(['A', 'B'])
    edits.push(edit(['C', value.value[1]], server.write))
    await server.answer()
    await server.answer()
    await Promise.all(edits)

    expect(source.value).toEqual(['C', 'B'])
    expect(value.value).toEqual(['C', 'B'])
  })

  it('follows the source again once no write is pending', async () => {
    const source = shallowRef(['One'])
    const { value, edit } = useLocalEdits(source)
    const server = makeServer(source)

    const edited = edit(['A'], server.write)
    await server.answer()
    await edited
    source.value = ['Changed elsewhere']
    await nextTick()

    expect(value.value).toEqual(['Changed elsewhere'])
  })

  it('shows the source as it is when the last pending write fails', async () => {
    const source = shallowRef(['One'])
    const { value, edit } = useLocalEdits(source)
    const server = makeServer(source)

    const failed = expect(edit(['A'], server.write)).rejects.toThrow('write failed')
    await server.answer(false)

    await failed
    expect(value.value).toEqual(['One'])
  })

  it('writes values sharing a queue in the order they were edited', async () => {
    const writes = new ConcurrencyLimitController(1)
    const order = useLocalEdits(shallowRef(['One', 'Two']), writes)
    const units = useLocalEdits(shallowRef<string[]>([]), writes)
    const written: string[] = []
    let answerOrder!: () => void

    const ordered = order.edit(['Two', 'One'], async (edited) => {
      await new Promise<void>((resolve) => (answerOrder = resolve))
      written.push(`order ${edited.join(' ')}`)
    })
    const divided = units.edit(['Unit: Two One'], async (edited) => {
      written.push(`units ${edited.join(' ')}`)
    })
    await nextTick()
    expect(written).toEqual([])
    answerOrder()
    await Promise.all([ordered, divided])

    expect(written).toEqual(['order Two One', 'units Unit: Two One'])
  })

  it('tells when the edits made so far are written, failed ones included', async () => {
    const source = shallowRef(['One'])
    const { edit, settled } = useLocalEdits(source)
    const server = makeServer(source)
    let isSettled = false

    const failed = expect(edit(['A'], server.write)).rejects.toThrow('write failed')
    const written = edit(['B'], server.write)
    void settled().then(() => (isSettled = true))
    await server.answer(false)
    await failed
    expect(isSettled).toBe(false)
    await server.answer()
    await written

    await settled()
    expect(isSettled).toBe(true)
  })

  it('keeps the edits shown when the write returns nothing', async () => {
    const source = shallowRef(['One', 'Two'])
    const { value, edit } = useLocalEdits(source)

    await edit(['Two', 'One'], async () => {})

    expect(value.value).toEqual(['Two', 'One'])
  })
})
