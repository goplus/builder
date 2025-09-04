interface IframeWindow extends Window {
  startRecording?: () => void;
  stopRecording?: () => Promise<Blob>; // stopRecording 直接返回 Blob
  getScreenshot?: () => Blob | Promise<Blob>;
  pauseGame?: () => void;
  resumeGame?: () => void;
  dispatchKeyToEvent?: (type: string, code: string) => void;
}

defineExpose({
  async pauseGame() {
    // 暴露暂停方法
    return win.pauseGame()
  },
  async resumeGame() {
    // 暴露恢复方法
    return win.resumeGame()
  },
  async getScreenshot() {
    // 暴露截屏方法
    return win.getScreenshot()
  },
  async startRecording() {
    // 暴露开始录屏方法
    return win.startRecording()
  },
  async stopRecording() {
    // 暴露停止录屏方法
    return win.stopRecording()
  },
  async dispatchKeyToEvent(type: string, code: string) {
    // 暴露虚拟键盘绑定方法
    return win.dispatchKeyToEvent()
  },
});
