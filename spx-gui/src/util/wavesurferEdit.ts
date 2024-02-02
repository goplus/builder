interface WavesurferEditParams {
    buffer: AudioBuffer;
    maxCount?: number;
    ac?: AudioContext;
}

interface Region {
    start: number;
    end: number;
}

interface OperationResult {
    buffer: AudioBuffer;
    curIndex: number;
    maxIndex: number;
    copyData: AudioBuffer | null;
    copyLength?: number;
}


class WavesurferEdit {
    private ac: AudioContext;
    private currentBuffer: AudioBuffer;
    private currentRegion: Region | null;
    private copyData: AudioBuffer | null;
    private copyDuration: number | null;
    private operationRecord: AudioBuffer[];
    private operationIndex: number;
    private maxCount: number;
    private channels: number;
    private rate: number;

    constructor(opt: WavesurferEditParams) {
        this.currentBuffer = opt.buffer;
        this.ac = opt.ac || new (window.AudioContext || (window as any).webkitAudioContext)();
        this.maxCount = opt.maxCount || 10;
        this.rate = this.currentBuffer.sampleRate;
        this.channels = this.currentBuffer.numberOfChannels;
        this.operationRecord = [this.currentBuffer];
        this.operationIndex = 0;
        this.currentRegion = null;
        this.copyData = null;
        this.copyDuration = null;
    }

    copy(region: Region, buffer: AudioBuffer = this.currentBuffer, isCopy: boolean = true): OperationResult {
        this.currentRegion = region;
        if (!this.currentRegion) {
            return {
                buffer: this.currentBuffer,
                curIndex: this.operationIndex,
                maxIndex: this.operationRecord.length,
                copyData: this.copyData,
            };
        }

        const { start, end } = this.currentRegion;
        const startOffset = Math.round(start * this.rate);
        const endOffset = Math.round(end * this.rate);
        const frameCount = endOffset - startOffset;
        const newBuffer = this.ac.createBuffer(this.channels, frameCount, this.rate);

        for (let i = 0; i < this.channels; i++) {
            const channelData = buffer.getChannelData(i).slice(startOffset, endOffset);
            newBuffer.copyToChannel(channelData, i);
        }

        if (isCopy) {
            this.copyData = newBuffer;
            this.copyDuration = end - start;
        }

        return {
            buffer: this.currentBuffer,
            curIndex: this.operationIndex,
            maxIndex: this.operationRecord.length,
            copyData: this.copyData,
            copyLength: newBuffer.length,
        };
    }

    paste(currentTime: number, buffer: AudioBuffer = this.currentBuffer): OperationResult {
        if (!this.copyData) {
            return {
                buffer: this.currentBuffer,
                curIndex: this.operationIndex,
                maxIndex: this.operationRecord.length,
                copyData: this.copyData,
            };
        }

        const copyToStart = Math.round(currentTime * this.rate);
        const copyToEnd = copyToStart + this.copyData.length;
        const frameCount = Math.max(copyToEnd, buffer.length);
        const newBuffer = this.ac.createBuffer(this.channels, frameCount, this.rate);

        for (let i = 0; i < this.channels; i++) {
            const channelData = buffer.getChannelData(i);
            const newChannelData = newBuffer.getChannelData(i);
            newChannelData.set(channelData.subarray(0, copyToStart), 0);
            newChannelData.set(this.copyData.getChannelData(i), copyToStart);
            if (buffer.length > copyToEnd) {
                newChannelData.set(channelData.subarray(copyToEnd), copyToEnd);
            }
        }

        this.pushRecord(newBuffer);

        return {
            buffer: newBuffer,
            curIndex: this.operationIndex,
            maxIndex: this.operationRecord.length,
            copyData: this.copyData,
        };
    }

    insert(currentTime: number, buffer: AudioBuffer = this.currentBuffer): OperationResult {
        if (!this.copyData) {
            return {
                buffer: this.currentBuffer,
                curIndex: this.operationIndex,
                maxIndex: this.operationRecord.length,
                copyData: this.copyData,
            };
        }

        const insertPoint = Math.round(currentTime * this.rate);
        const frameCount = buffer.length + this.copyData.length;
        const newBuffer = this.ac.createBuffer(this.channels, frameCount, this.rate);

        for (let i = 0; i < this.channels; i++) {
            const channelData = buffer.getChannelData(i);
            const newChannelData = newBuffer.getChannelData(i);
            newChannelData.set(channelData.subarray(0, insertPoint), 0);
            newChannelData.set(this.copyData.getChannelData(i), insertPoint);
            newChannelData.set(channelData.subarray(insertPoint), insertPoint + this.copyData.length);
        }

        this.pushRecord(newBuffer);

        return {
            buffer: newBuffer,
            curIndex: this.operationIndex,
            maxIndex: this.operationRecord.length,
            copyData: this.copyData,
        };
    }


    cut(region: Region, buffer: AudioBuffer = this.currentBuffer, isCopy: boolean = true): OperationResult {
        const copyResult = this.copy(region, buffer, isCopy);
        if (!this.currentRegion) {
            return copyResult;
        }

        const cutStart = Math.round(this.currentRegion.start * this.rate);
        const cutEnd = Math.round(this.currentRegion.end * this.rate);
        const frameCount = buffer.length - (cutEnd - cutStart);
        const newBuffer = this.ac.createBuffer(this.channels, frameCount, this.rate);

        for (let i = 0; i < this.channels; i++) {
            const channelData = buffer.getChannelData(i);
            const newChannelData = newBuffer.getChannelData(i);
            newChannelData.set(channelData.subarray(0, cutStart), 0);
            newChannelData.set(channelData.subarray(cutEnd), cutStart);
        }

        this.pushRecord(newBuffer);

        return {
            buffer: newBuffer,
            curIndex: this.operationIndex,
            maxIndex: this.operationRecord.length,
            copyData: this.copyData,
        };
    }


    remove(region: Region, buffer: AudioBuffer = this.currentBuffer): OperationResult {
        return this.cut(region, buffer, false);
    }

    backout(): OperationResult | undefined {
        if (this.operationIndex === 0) return;

        this.operationIndex--;
        const newBuffer = this.operationRecord[this.operationIndex];
        this.currentBuffer = newBuffer;

        return {
            buffer: newBuffer,
            curIndex: this.operationIndex,
            maxIndex: this.operationRecord.length,
            copyData: this.copyData,
        };
    }


    renewal(): OperationResult | undefined {
        if (this.operationIndex >= this.operationRecord.length - 1) return;

        this.operationIndex++;
        const newBuffer = this.operationRecord[this.operationIndex];
        this.currentBuffer = newBuffer;

        return {
            buffer: newBuffer,
            curIndex: this.operationIndex,
            maxIndex: this.operationRecord.length,
            copyData: this.copyData,
        };
    }

    private pushRecord(newBuffer: AudioBuffer): void {
        if (this.operationIndex < this.operationRecord.length - 1) {
            this.operationRecord = this.operationRecord.slice(0, this.operationIndex + 1);
        }

        this.operationRecord.push(newBuffer);

        if (this.operationRecord.length > this.maxCount) {
            this.operationRecord.shift();
        }

        this.operationIndex = this.operationRecord.length - 1;
        this.currentBuffer = newBuffer;
    }
}

export { WavesurferEdit };
