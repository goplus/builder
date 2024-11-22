/**
 * @file Simple, Type-safe Event Emitter
 */

export type EventType = string

export type Handler<T = unknown> = (event: T) => void

export type Off = () => void

export default class Emitter<Events extends Record<EventType, unknown>> {
  private map = new Map<keyof Events, Handler[]>()

  on<Type extends keyof Events>(type: Type, handler: Handler<Events[Type]>): Off {
    const handlers = this.map.get(type) ?? []
    const newHandlers = [...handlers, handler]
    this.map.set(type, newHandlers as any)
    return () => this.off(type, handler)
  }

  once<Type extends keyof Events>(type: Type, handler: Handler<Events[Type]>): Off {
    const off = this.on(type, (e) => {
      off()
      handler(e)
    })
    return off
  }

  private off<Type extends keyof Events>(type: Type, handler: Handler<Events[Type]>) {
    const handlers = this.map.get(type) ?? []
    const newHandlers = handlers.filter((h) => h !== handler)
    this.map.set(type, newHandlers as any)
  }

  emit<Type extends keyof Events>(...args: Events[Type] extends void ? [Type] : [Type, Events[Type]]) {
    const [type, event] = args
    const handlers = this.map.get(type) ?? []
    handlers.forEach((handler) => {
      handler(event)
    })
  }

  dispose() {
    this.map.clear()
  }
}
