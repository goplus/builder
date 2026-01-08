import { describe, expect, it, vi } from 'vitest'
import {
  TaskErrorReason,
  TaskEventType,
  TaskStatus,
  TaskType,
  type Task as TaskData,
  type TaskParams,
  type TaskResult
} from '@/apis/aigc'
import { Cancelled } from '@/utils/exception'
import { Task, TaskException } from './common'

function makeTaskData<T extends TaskType>(type: T, status: TaskStatus, id = 'task-1'): TaskData<T> {
  return {
    id,
    createdAt: new Date(0).toISOString(),
    updatedAt: new Date(0).toISOString(),
    type,
    status
  } as TaskData<T>
}

describe('Task', () => {
  it('start() should only create task (no subscription)', async () => {
    const apis = {
      createTask: vi.fn(async () => makeTaskData(TaskType.GenerateCostume, TaskStatus.Pending)),
      cancelTask: vi.fn(async () => makeTaskData(TaskType.GenerateCostume, TaskStatus.Cancelled)),
      subscribeTaskEvents: vi.fn(async function* () {
        // should not be called in this test
        yield { type: TaskEventType.Snapshot, data: makeTaskData(TaskType.GenerateCostume, TaskStatus.Processing) }
        yield { type: TaskEventType.Completed, data: { result: { imageUrls: [] } } }
      })
    }

    const task = new Task(TaskType.GenerateCostume, apis as any)
    await task.start({ settings: {} as any, n: 1 } as TaskParams<TaskType.GenerateCostume>)

    expect(apis.createTask).toHaveBeenCalledOnce()
    expect(apis.subscribeTaskEvents).not.toHaveBeenCalled()
  })

  it('untilCompleted() should resolve when completed event received', async () => {
    const result: TaskResult<TaskType.GenerateCostume> = { imageUrls: ['http://example.com/1.png'] }
    let passedSignal: AbortSignal | null = null

    const apis = {
      createTask: vi.fn(async () => makeTaskData(TaskType.GenerateCostume, TaskStatus.Pending)),
      cancelTask: vi.fn(async () => makeTaskData(TaskType.GenerateCostume, TaskStatus.Cancelled)),
      subscribeTaskEvents: vi.fn(async function* (taskId: string, signal?: AbortSignal) {
        expect(taskId).toBe('task-1')
        passedSignal = signal ?? null
        yield { type: TaskEventType.Snapshot, data: makeTaskData(TaskType.GenerateCostume, TaskStatus.Processing) }
        yield { type: TaskEventType.Completed, data: { result } }
      })
    }

    const task = new Task(TaskType.GenerateCostume, apis as any)
    await task.start({ settings: {} as any, n: 1 } as TaskParams<TaskType.GenerateCostume>)

    const completed = await task.untilCompleted()
    expect(completed).toEqual(result)
    expect(apis.subscribeTaskEvents).toHaveBeenCalledOnce()
    expect(passedSignal).not.toBeNull()
    expect(passedSignal!.aborted).toBe(true)
  })

  it('untilCompleted() should throw TaskException when failed event received', async () => {
    const apis = {
      createTask: vi.fn(async () => makeTaskData(TaskType.GenerateCostume, TaskStatus.Pending)),
      cancelTask: vi.fn(async () => makeTaskData(TaskType.GenerateCostume, TaskStatus.Cancelled)),
      subscribeTaskEvents: vi.fn(async function* () {
        yield { type: TaskEventType.Snapshot, data: makeTaskData(TaskType.GenerateCostume, TaskStatus.Processing) }
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
    }

    const task = new Task(TaskType.GenerateCostume, apis as any)
    await task.start({ settings: {} as any, n: 1 } as TaskParams<TaskType.GenerateCostume>)

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
    const apis = {
      createTask: vi.fn(async () => makeTaskData(TaskType.GenerateCostume, TaskStatus.Pending)),
      cancelTask: vi.fn(async () => makeTaskData(TaskType.GenerateCostume, TaskStatus.Cancelled)),
      subscribeTaskEvents: vi.fn(async function* () {
        yield { type: TaskEventType.Snapshot, data: makeTaskData(TaskType.GenerateCostume, TaskStatus.Processing) }
        yield { type: TaskEventType.Cancelling, data: {} }
        yield { type: TaskEventType.Cancelled, data: {} }
      })
    }

    const task = new Task(TaskType.GenerateCostume, apis as any)
    await task.start({ settings: {} as any, n: 1 } as TaskParams<TaskType.GenerateCostume>)

    await expect(task.untilCompleted()).rejects.toBeInstanceOf(Cancelled)
  })

  it('tryCancel() should call cancelTask only when task is running', async () => {
    const apis = {
      createTask: vi.fn(async () => makeTaskData(TaskType.GenerateCostume, TaskStatus.Pending)),
      cancelTask: vi.fn(async () => makeTaskData(TaskType.GenerateCostume, TaskStatus.Cancelling)),
      subscribeTaskEvents: vi.fn(async function* () {
        yield { type: TaskEventType.Snapshot, data: makeTaskData(TaskType.GenerateCostume, TaskStatus.Processing) }
        yield { type: TaskEventType.Cancelling, data: {} }
        yield { type: TaskEventType.Cancelled, data: {} }
      })
    }

    const task = new Task(TaskType.GenerateCostume, apis as any)

    await task.tryCancel()
    expect(apis.cancelTask).not.toHaveBeenCalled()

    await task.start({ settings: {} as any, n: 1 } as TaskParams<TaskType.GenerateCostume>)
    await task.tryCancel()
    expect(apis.cancelTask).toHaveBeenCalledOnce()

    await expect(task.untilCompleted()).rejects.toBeInstanceOf(Cancelled)
    await task.tryCancel()
    expect(apis.cancelTask).toHaveBeenCalledOnce()
  })

  it('untilCompleted() should not subscribe if task already terminal', async () => {
    const result: TaskResult<TaskType.GenerateCostume> = { imageUrls: ['http://example.com/1.png'] }

    const apis = {
      createTask: vi.fn(async () => ({ ...makeTaskData(TaskType.GenerateCostume, TaskStatus.Completed), result })),
      cancelTask: vi.fn(async () => makeTaskData(TaskType.GenerateCostume, TaskStatus.Cancelled)),
      subscribeTaskEvents: vi.fn(async function* () {
        yield { type: TaskEventType.Snapshot, data: makeTaskData(TaskType.GenerateCostume, TaskStatus.Processing) }
        yield { type: TaskEventType.Completed, data: { result: { imageUrls: [] } } }
      })
    }

    const task = new Task(TaskType.GenerateCostume, apis as any)
    await task.start({ settings: {} as any, n: 1 } as TaskParams<TaskType.GenerateCostume>)

    const completed = await task.untilCompleted()
    expect(completed).toEqual(result)
    expect(apis.subscribeTaskEvents).not.toHaveBeenCalled()
  })

  it('should support starting + completing multiple times (sequential)', async () => {
    const apis = {
      createTask: vi
        .fn()
        .mockImplementationOnce(async () => makeTaskData(TaskType.GenerateCostume, TaskStatus.Pending, 'task-1'))
        .mockImplementationOnce(async () => makeTaskData(TaskType.GenerateCostume, TaskStatus.Pending, 'task-2')),
      cancelTask: vi.fn(async () => makeTaskData(TaskType.GenerateCostume, TaskStatus.Cancelled)),
      subscribeTaskEvents: vi
        .fn()
        .mockImplementationOnce(async function* (taskId: string) {
          expect(taskId).toBe('task-1')
          yield {
            type: TaskEventType.Snapshot,
            data: makeTaskData(TaskType.GenerateCostume, TaskStatus.Processing, 'task-1')
          }
          yield { type: TaskEventType.Completed, data: { result: { imageUrls: ['http://example.com/1.png'] } } }
        })
        .mockImplementationOnce(async function* (taskId: string) {
          expect(taskId).toBe('task-2')
          yield {
            type: TaskEventType.Snapshot,
            data: makeTaskData(TaskType.GenerateCostume, TaskStatus.Processing, 'task-2')
          }
          yield { type: TaskEventType.Completed, data: { result: { imageUrls: ['http://example.com/2.png'] } } }
        })
    }

    const task = new Task(TaskType.GenerateCostume, apis as any)

    await task.start({ settings: {} as any, n: 1 } as TaskParams<TaskType.GenerateCostume>)
    await expect(task.untilCompleted()).resolves.toEqual({ imageUrls: ['http://example.com/1.png'] })

    await task.start({ settings: {} as any, n: 1 } as TaskParams<TaskType.GenerateCostume>)
    await expect(task.untilCompleted()).resolves.toEqual({ imageUrls: ['http://example.com/2.png'] })

    expect(apis.cancelTask).not.toHaveBeenCalled()
    expect(apis.createTask).toHaveBeenCalledTimes(2)
    expect(apis.subscribeTaskEvents).toHaveBeenCalledTimes(2)
  })

  it('should cancel previous task when restarted while pending, and track latest one', async () => {
    const apis = {
      createTask: vi
        .fn()
        .mockImplementationOnce(async () => makeTaskData(TaskType.GenerateCostume, TaskStatus.Pending, 'task-1'))
        .mockImplementationOnce(async () => makeTaskData(TaskType.GenerateCostume, TaskStatus.Pending, 'task-2')),
      cancelTask: vi.fn(async () => makeTaskData(TaskType.GenerateCostume, TaskStatus.Cancelling)),
      subscribeTaskEvents: vi.fn(async function* (taskId: string) {
        if (taskId === 'task-1') {
          yield {
            type: TaskEventType.Snapshot,
            data: makeTaskData(TaskType.GenerateCostume, TaskStatus.Processing, 'task-1')
          }
          await Promise.resolve()
          yield { type: TaskEventType.Cancelling, data: {} }
          await Promise.resolve()
          yield { type: TaskEventType.Cancelled, data: {} }
          return
        }

        if (taskId === 'task-2') {
          yield {
            type: TaskEventType.Snapshot,
            data: makeTaskData(TaskType.GenerateCostume, TaskStatus.Processing, 'task-2')
          }
          await Promise.resolve()
          yield { type: TaskEventType.Completed, data: { result: { imageUrls: ['http://example.com/2.png'] } } }
          return
        }

        throw new Error('unexpected task id: ' + taskId)
      })
    }

    const task = new Task(TaskType.GenerateCostume, apis as any)

    await task.start({ settings: {} as any, n: 1 } as TaskParams<TaskType.GenerateCostume>)
    const p1 = task.untilCompleted()

    await task.start({ settings: {} as any, n: 1 } as TaskParams<TaskType.GenerateCostume>)

    expect(apis.cancelTask).toHaveBeenCalledOnce()
    expect((apis.cancelTask as any).mock.calls[0][0]).toBe('task-1')

    await expect(task.untilCompleted()).resolves.toEqual({ imageUrls: ['http://example.com/2.png'] })
    await expect(p1).rejects.toBeInstanceOf(Cancelled)
    await expect(task.untilCompleted()).resolves.toEqual({ imageUrls: ['http://example.com/2.png'] })

    expect(apis.subscribeTaskEvents).toHaveBeenCalledTimes(2)
  })
})
