export class Coordinator {
  /**
   * this method will be called after UI Editor has been complete initialized
   * @param {'ui' | 'model' } source - determine which source has initialized
   */
  invokeInit(source: 'ui' | 'model') {}
  dispose() {}
}
