interface IframeWindow extends Window {
  startRecording?: () => void;
  stopRecording?: () => Promise<Blob>; // stopRecording 直接返回 Blob
  getScreenshot?: () => Blob | Promise<Blob>; // 更新为正确的函数名
  pauseGame?: () => void;
  resumeGame?: () => void;
  dispatchKeyToEvent?: (type: string, code: string) => void;
}

defineExpose({
  async pauseGame(): Promise<void> {
    // 暴露暂停方法
  },
  async resumeGame(): Promise<void> {
    // 暴露恢复方法
  },
  async takeScreenshot(): Promise<Blob> {
    // 暴露截屏方法
    return screenshot;
  },
  async startRecording(): Promise<void> {
    // 暴露开始录屏方法
  },
  async stopRecording(): Promise<Blob> {
    // 暴露停止录屏方法
    return recordedVideo;
  },
  async dispatchKeyToEvent(type: string, code: string): Promise<void> {
    // 暴露虚拟键盘绑定方法
  },
});
