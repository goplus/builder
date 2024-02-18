export class AudioDataService {

  private static copyData: AudioBuffer | null = null;
  private static copyDuration: number = 0;

  static {
    console.log('AudioDataService is loaded');
  }

  public static setCopyData(data: AudioBuffer, duration: number) {
    AudioDataService.copyData = data;
    AudioDataService.copyDuration = duration;
  }

  public static getCopyData(): { data: AudioBuffer | null; duration: number } {
    return {
      data: AudioDataService.copyData,
      duration: AudioDataService.copyDuration,
    };
  }

}
