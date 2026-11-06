import { shallowRef } from 'vue'

/** Reactive API filter shared by the Course program and editor UI. */
export class APIWhitelist {
  private apisRef = shallowRef<string[] | null>(null)

  get apis() {
    return this.apisRef.value
  }

  set(apis: string[]) {
    this.apisRef.value = apis
  }
}
