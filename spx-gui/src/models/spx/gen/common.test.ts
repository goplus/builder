import { beforeEach, describe, expect, it, vi } from 'vitest'
import { TaskErrorReason, TaskEventType, TaskStatus, TaskType, type TaskParams } from '@/apis/aigc'
import { Cancelled } from '@/utils/exception'
import { setupAigcMock } from './aigc-mock'
import { majorityOf, Task, TaskException } from './common'

const aigcMock = setupAigcMock()

const costumeParams = { settings: { name: 'test-costume' } as any, n: 1 } as TaskParams<TaskType.GenerateCostume>

describe('Task', () => {
  beforeEach(() => {
    aigcMock.reset()
  })

  it('start() should only create task (no subscription)', async () => {
    const task = new Task(TaskType.GenerateCostume)
    await task.start(costumeParams)

    expect(task.data).not.toBeNull()
    expect(aigcMock.tasks.size).toBe(1)
  })

  it('untilCompleted() should resolve when completed event received', async () => {
    const task = new Task(TaskType.GenerateCostume)
    await task.start(costumeParams)

    const result = await task.untilCompleted()
    expect(result).toBeTruthy()
    expect(task.data?.status).toBe(TaskStatus.Completed)
  })

  it('untilCompleted() should throw TaskException when failed event received', async () => {
    aigcMock.registerTaskHandler(TaskType.GenerateCostume, async function* () {
      yield {
        type: TaskEventType.Failed,
        data: {
          error: {
            reason: TaskErrorReason.Timeout,
            message: 'timeout'
          }
        }
      }
    })

    const task = new Task(TaskType.GenerateCostume)
    await task.start(costumeParams)

    await expect(task.untilCompleted()).rejects.toBeInstanceOf(TaskException)

    try {
      await task.untilCompleted()
    } catch (e) {
      const te = e as TaskException
      expect(te.reason).toBe(TaskErrorReason.Timeout)
      expect(te.userMessage?.en).toBeTruthy()
    }
  })

  it('untilCompleted() should throw Cancelled when cancelled event received', async () => {
    const task = new Task(TaskType.GenerateCostume)
    await task.start(costumeParams)
    await task.tryCancel()

    await expect(task.untilCompleted()).rejects.toBeInstanceOf(Cancelled)
  })

  it('untilCompleted() should reject before subscribing if disposed', async () => {
    const task = new Task(TaskType.GenerateCostume)
    await task.start(costumeParams)
    task.dispose()

    await expect(task.untilCompleted()).rejects.toBe(task.getSignal().reason)
    expect(aigcMock.subscribeTaskEvents).not.toHaveBeenCalled()
  })

  it('untilCompleted() should reject on disposal without waiting for another event', async () => {
    const task = new Task(TaskType.GenerateCostume)
    await task.start(costumeParams)
    let resume!: () => void
    const paused = new Promise<void>((resolve) => {
      resume = resolve
    })
    vi.mocked(aigcMock.subscribeTaskEvents).mockImplementationOnce(async function* () {
      await paused
      yield { type: TaskEventType.Snapshot, data: task.data! }
    })

    const pending = task.untilCompleted()
    task.dispose()
    try {
      await expect(pending).rejects.toBe(task.getSignal().reason)
    } finally {
      resume()
    }
  })

  it('tryCancel() should not cancel when task is not started', async () => {
    const task = new Task(TaskType.GenerateCostume)
    await task.tryCancel()
    expect(aigcMock.tasks.size).toBe(0)
  })

  it('tryCancel() should cancel a running task', async () => {
    const task = new Task(TaskType.GenerateCostume)
    await task.start(costumeParams)
    const taskId = task.data!.id

    await task.tryCancel()
    const record = aigcMock.tasks.get(taskId)!
    expect(record.task.status).toBe(TaskStatus.Cancelled)

    await expect(task.untilCompleted()).rejects.toBeInstanceOf(Cancelled)
  })

  it('tryCancel() should not cancel an already terminal task', async () => {
    const task = new Task(TaskType.GenerateCostume)
    await task.start(costumeParams)
    await task.untilCompleted()

    expect(task.data?.status).toBe(TaskStatus.Completed)
    await task.tryCancel()
    expect(task.data?.status).toBe(TaskStatus.Completed)
  })

  it('untilCompleted() should resolve immediately if task already terminal', async () => {
    const task = new Task(TaskType.GenerateCostume)
    await task.start(costumeParams)
    await task.untilCompleted()
    expect(task.data?.status).toBe(TaskStatus.Completed)

    const result = await task.untilCompleted()
    expect(result).toBeTruthy()
  })
})

describe('majorityOf', () => {
  it('returns majority value when count exceeds half', () => {
    expect(majorityOf([1])).toBe(1)
    expect(majorityOf([1, 2, 2])).toBe(2)
    expect(majorityOf([1, 2, 2, 2, 3])).toBe(2)
    expect(majorityOf(['a', 'b', 'a', 'a'])).toBe('a')
  })

  it('returns null when no majority exists', () => {
    expect(majorityOf([1, 2])).toBeNull()
    expect(majorityOf([1, 1, 2, 2])).toBeNull()
    expect(majorityOf(['a', 'b', 'c'])).toBeNull()
  })

  it('returns null for empty array', () => {
    expect(majorityOf([])).toBeNull()
  })
})
