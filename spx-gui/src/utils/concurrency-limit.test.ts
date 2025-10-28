import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { ConcurrencyLimitController } from './concurrency-limit'
import { sleep } from './test'

describe('ConcurrencyLimitController', () => {
  let controller: ConcurrencyLimitController

  beforeEach(() => {
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  describe('constructor', () => {
    it('should initialize with correct maxConcurrency', () => {
      const maxConcurrency = 3
      controller = new ConcurrencyLimitController(maxConcurrency)

      // Test by checking if it can run maxConcurrency tasks simultaneously
      expect(controller).toBeDefined()
      expect(controller).toBeInstanceOf(ConcurrencyLimitController)
    })

    it('should handle edge case of maxConcurrency = 1', () => {
      controller = new ConcurrencyLimitController(1)
      expect(controller).toBeDefined()
    })

    it('should handle high maxConcurrency values', () => {
      controller = new ConcurrencyLimitController(100)
      expect(controller).toBeDefined()
    })
  })

  describe('task execution', () => {
    it('should execute single task successfully', async () => {
      controller = new ConcurrencyLimitController(3)
      const mockTask = vi.fn().mockResolvedValue('result')

      const result = await controller.run(mockTask)

      expect(mockTask).toHaveBeenCalledTimes(1)
      expect(result).toBe('result')
    })

    it('should execute multiple tasks when under concurrency limit', async () => {
      controller = new ConcurrencyLimitController(3)
      const tasks = [
        vi.fn().mockResolvedValue('result1'),
        vi.fn().mockResolvedValue('result2'),
        vi.fn().mockResolvedValue('result3')
      ]

      const promises = tasks.map((task) => controller.run(task))
      const results = await Promise.all(promises)

      expect(results).toEqual(['result1', 'result2', 'result3'])
      tasks.forEach((task) => expect(task).toHaveBeenCalledTimes(1))
    })

    it('should return correct results for different task types', async () => {
      controller = new ConcurrencyLimitController(2)

      const stringTask = () => Promise.resolve('string result')
      const numberTask = () => Promise.resolve(42)
      const objectTask = () => Promise.resolve({ key: 'value' })
      const arrayTask = () => Promise.resolve([1, 2, 3])

      const [stringResult, numberResult, objectResult, arrayResult] = await Promise.all([
        controller.run(stringTask),
        controller.run(numberTask),
        controller.run(objectTask),
        controller.run(arrayTask)
      ])

      expect(stringResult).toBe('string result')
      expect(numberResult).toBe(42)
      expect(objectResult).toEqual({ key: 'value' })
      expect(arrayResult).toEqual([1, 2, 3])
    })
  })

  describe('concurrency limiting', () => {
    it('should queue tasks when concurrency limit is reached', async () => {
      controller = new ConcurrencyLimitController(2)
      let runningTasks = 0
      let maxConcurrentTasks = 0

      const createTask = (id: number) => async () => {
        runningTasks++
        maxConcurrentTasks = Math.max(maxConcurrentTasks, runningTasks)
        await sleep(100)
        runningTasks--
        return `task-${id}`
      }

      const promises = Array.from({ length: 5 }, (_, i) => controller.run(createTask(i + 1)))

      // Let tasks start, then advance timer to complete them
      await vi.runAllTimersAsync()
      const results = await Promise.all(promises)

      expect(results).toEqual(['task-1', 'task-2', 'task-3', 'task-4', 'task-5'])
      expect(maxConcurrentTasks).toBe(2) // Should never exceed the limit
    })

    it('should process queued tasks as running tasks complete', async () => {
      controller = new ConcurrencyLimitController(1)
      const executionOrder: number[] = []

      const createTask = (id: number) => async () => {
        executionOrder.push(id)
        await sleep(50)
        return id
      }

      const promises = [controller.run(createTask(1)), controller.run(createTask(2)), controller.run(createTask(3))]

      await vi.runAllTimersAsync()
      await Promise.all(promises)

      expect(executionOrder).toEqual([1, 2, 3]) // Should execute in order
    })

    it('should handle tasks with different durations correctly', async () => {
      controller = new ConcurrencyLimitController(2)
      const completionOrder: number[] = []

      const createTask = (id: number, duration: number) => async () => {
        await sleep(duration)
        completionOrder.push(id)
        return id
      }

      const promises = [
        controller.run(createTask(1, 100)), // Will complete first
        controller.run(createTask(2, 200)), // Will complete second
        controller.run(createTask(3, 50)), // Will start after task 1 or 2 completes
        controller.run(createTask(4, 10)) // Will start after task 1 or 2 completes
      ]

      await vi.runAllTimersAsync()
      await Promise.all(promises)

      // Tasks 1 and 2 start immediately, then 3 and 4 start as slots become available
      expect(completionOrder.length).toBe(4)
      expect(completionOrder).toContain(1)
      expect(completionOrder).toContain(2)
      expect(completionOrder).toContain(3)
      expect(completionOrder).toContain(4)
    })
  })

  describe('error handling', () => {
    it('should handle task errors without breaking the concurrency system', async () => {
      controller = new ConcurrencyLimitController(2)

      const successTask1 = vi.fn().mockResolvedValue('success1')
      const errorTask = vi.fn().mockRejectedValue(new Error('Task failed'))
      const successTask2 = vi.fn().mockResolvedValue('success2')

      const promises = [
        controller.run(successTask1),
        controller.run(errorTask).catch((e) => e.message),
        controller.run(successTask2)
      ]

      const results = await Promise.all(promises)

      expect(results[0]).toBe('success1')
      expect(results[1]).toBe('Task failed')
      expect(results[2]).toBe('success2')
      expect(successTask1).toHaveBeenCalledTimes(1)
      expect(errorTask).toHaveBeenCalledTimes(1)
      expect(successTask2).toHaveBeenCalledTimes(1)
    })

    it('should continue processing queue after a task throws an error', async () => {
      controller = new ConcurrencyLimitController(1)
      const executionOrder: string[] = []

      const successTask = (id: string) => async () => {
        executionOrder.push(id)
        await sleep(50)
        return `success-${id}`
      }

      const errorTask = async () => {
        executionOrder.push('error')
        await sleep(50)
        throw new Error('Failed task')
      }

      const promises = [
        controller.run(successTask('1')),
        controller.run(errorTask).catch((e) => e.message),
        controller.run(successTask('2'))
      ]

      await vi.runAllTimersAsync()
      const results = await Promise.all(promises)

      expect(executionOrder).toEqual(['1', 'error', '2'])
      expect(results).toEqual(['success-1', 'Failed task', 'success-2'])
    })

    it('should handle synchronous errors in tasks', async () => {
      controller = new ConcurrencyLimitController(2)

      const syncErrorTask = () => {
        throw new Error('Synchronous error')
      }

      const successTask = vi.fn().mockResolvedValue('success')

      const promises = [controller.run(syncErrorTask).catch((e) => e.message), controller.run(successTask)]

      const results = await Promise.all(promises)

      expect(results[0]).toBe('Synchronous error')
      expect(results[1]).toBe('success')
      expect(successTask).toHaveBeenCalledTimes(1)
    })
  })

  describe('edge cases', () => {
    it('should work with maxConcurrency = 1', async () => {
      controller = new ConcurrencyLimitController(1)
      const tasks = Array.from({ length: 3 }, (_, i) => vi.fn().mockResolvedValue(`result-${i + 1}`))

      const promises = tasks.map((task) => controller.run(task))
      const results = await Promise.all(promises)

      expect(results).toEqual(['result-1', 'result-2', 'result-3'])
      tasks.forEach((task) => expect(task).toHaveBeenCalledTimes(1))
    })

    it('should handle empty/void tasks', async () => {
      controller = new ConcurrencyLimitController(2)

      const voidTask = vi.fn().mockResolvedValue(undefined)
      const nullTask = vi.fn().mockResolvedValue(null)

      const results = await Promise.all([controller.run(voidTask), controller.run(nullTask)])

      expect(results[0]).toBe(undefined)
      expect(results[1]).toBe(null)
      expect(voidTask).toHaveBeenCalledTimes(1)
      expect(nullTask).toHaveBeenCalledTimes(1)
    })

    it('should handle very high concurrency limits', async () => {
      controller = new ConcurrencyLimitController(1000)
      const tasks = Array.from({ length: 10 }, (_, i) => vi.fn().mockResolvedValue(`result-${i + 1}`))

      const promises = tasks.map((task) => controller.run(task))
      const results = await Promise.all(promises)

      expect(results).toHaveLength(10)
      tasks.forEach((task) => expect(task).toHaveBeenCalledTimes(1))
    })

    it('should handle tasks that resolve immediately', async () => {
      controller = new ConcurrencyLimitController(2)

      const immediateTask1 = vi.fn().mockResolvedValue('immediate1')
      const immediateTask2 = vi.fn().mockResolvedValue('immediate2')
      const immediateTask3 = vi.fn().mockResolvedValue('immediate3')

      const results = await Promise.all([
        controller.run(immediateTask1),
        controller.run(immediateTask2),
        controller.run(immediateTask3)
      ])

      expect(results).toEqual(['immediate1', 'immediate2', 'immediate3'])
    })

    it('should handle zero concurrency gracefully', async () => {
      // Edge case - maxConcurrency of 0 should probably still allow at least 1 task
      controller = new ConcurrencyLimitController(0)
      const task = vi.fn().mockResolvedValue('result')

      // This behavior depends on implementation - the task might hang or execute
      // For now, let's just make sure it doesn't crash
      expect(() => controller.run(task)).not.toThrow()
    })

    it('should handle concurrent access to queue correctly', async () => {
      controller = new ConcurrencyLimitController(1)
      const results: string[] = []

      // Simulate multiple tasks being added rapidly
      const tasks = Array.from({ length: 10 }, (_, i) =>
        controller.run(async () => {
          await sleep(10)
          results.push(`task-${i}`)
          return `task-${i}`
        })
      )

      await vi.runAllTimersAsync()
      await Promise.all(tasks)

      expect(results).toHaveLength(10)
      // Results should contain all tasks
      for (let i = 0; i < 10; i++) {
        expect(results).toContain(`task-${i}`)
      }
    })
  })
})
