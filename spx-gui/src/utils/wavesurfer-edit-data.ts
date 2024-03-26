export const audioDataService = {
  copyData: null as AudioBuffer | null,
  copyDuration: 0,

  setCopyData(data: AudioBuffer, duration: number) {
    this.copyData = data
    this.copyDuration = duration
  },

  getCopyData(): { data: AudioBuffer | null; duration: number } {
    return {
      data: this.copyData,
      duration: this.copyDuration
    }
  }
}
