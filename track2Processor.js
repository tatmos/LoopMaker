// トラック2の加工処理クラス
class Track2Processor {
    constructor(audioContext) {
        this.audioContext = audioContext;
    }

    // 再生用: フェードアウト+無音バッファ生成
    createFadeOutBufferWithSilence(audioBuffer, loopStartTime, fadeOutDuration, totalDuration) {
        const sampleRate = audioBuffer.sampleRate;
        const frameCount = Math.floor(totalDuration * sampleRate);
        const numChannels = audioBuffer.numberOfChannels;
        const buffer = this.audioContext.createBuffer(numChannels, frameCount, sampleRate);

        const fadeOutStartSample = Math.floor(loopStartTime * sampleRate);
        const fadeOutEndSample = Math.floor((loopStartTime + fadeOutDuration) * sampleRate);

        for (let channel = 0; channel < numChannels; channel++) {
            const inputData = audioBuffer.getChannelData(channel);
            const outputData = buffer.getChannelData(channel);

            for (let i = 0; i < frameCount; i++) {
                // バッファの時間位置（0からtotalDurationまで）
                const timeInBuffer = i / sampleRate;
                
                if (timeInBuffer < fadeOutDuration) {
                    // フェードアウト区間（0からfadeOutDurationまで）
                    const inputIndex = fadeOutStartSample + Math.floor(timeInBuffer * sampleRate);
                    if (inputIndex < inputData.length && inputIndex < fadeOutEndSample) {
                        const fadeOutProgress = timeInBuffer / fadeOutDuration;
                        const fadeFactor = 1.0 - fadeOutProgress;
                        outputData[i] = inputData[inputIndex] * fadeFactor;
                    } else {
                        outputData[i] = 0;
                    }
                } else {
                    // フェードアウト後は無音（fadeOutDurationからtotalDurationまで）
                    outputData[i] = 0;
                }
            }
        }

        return buffer;
    }

    // 保存用: トラック2の保存バッファ生成
    createSaveBuffer(audioBuffer, loopPosition, crossfadeDuration) {
        const loopStartTime = audioBuffer.duration * loopPosition;
        const effectiveDuration = loopStartTime;
        const fadeOutDuration = crossfadeDuration;
        const fadeOutEndTime = loopStartTime + fadeOutDuration;

        // 新しいバッファを作成（ループ位置までの長さ、フェードアウト後は無音）
        const sampleRate = audioBuffer.sampleRate;
        const frameCount = Math.floor(effectiveDuration * sampleRate);
        const numChannels = audioBuffer.numberOfChannels;
        const newBuffer = this.audioContext.createBuffer(numChannels, frameCount, sampleRate);

        // フェードアウト区間のサンプル位置
        const fadeOutStartSample = Math.floor(loopStartTime * sampleRate);
        const fadeOutEndSample = Math.floor(fadeOutEndTime * sampleRate);
        const fadeOutFrameCount = fadeOutEndSample - fadeOutStartSample;

        for (let channel = 0; channel < numChannels; channel++) {
            const inputData = audioBuffer.getChannelData(channel);
            const outputData = newBuffer.getChannelData(channel);

            for (let i = 0; i < frameCount; i++) {
                const timeInOutput = i / sampleRate;
                
                if (timeInOutput < loopStartTime) {
                    // ループ位置より前は無音
                    outputData[i] = 0;
                } else if (timeInOutput < fadeOutEndTime) {
                    // フェードアウト区間
                    const inputIndex = Math.floor(timeInOutput * sampleRate);
                    if (inputIndex < inputData.length) {
                        const fadeOutProgress = (timeInOutput - loopStartTime) / fadeOutDuration;
                        const fadeFactor = 1.0 - fadeOutProgress;
                        outputData[i] = inputData[inputIndex] * fadeFactor;
                    } else {
                        outputData[i] = 0;
                    }
                } else {
                    // フェードアウト後は無音
                    outputData[i] = 0;
                }
            }
        }

        return newBuffer;
    }
}

