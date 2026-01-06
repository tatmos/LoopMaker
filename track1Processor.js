// トラック1の加工処理クラス
class Track1Processor {
    constructor(audioContext) {
        this.audioContext = audioContext;
    }

    // 再生用: ループバッファ生成（クロスフェード区間でフェードイン適用）
    createLoopBuffer(audioBuffer, loopStartTime, crossfadeStartTime, crossfadeDuration) {
        const sampleRate = audioBuffer.sampleRate;
        const frameCount = Math.floor(loopStartTime * sampleRate);
        const numChannels = audioBuffer.numberOfChannels;
        const buffer = this.audioContext.createBuffer(numChannels, frameCount, sampleRate);
        const crossfadeStartSample = Math.floor(crossfadeStartTime * sampleRate);
        const crossfadeFrameCount = Math.floor(crossfadeDuration * sampleRate);

        for (let channel = 0; channel < numChannels; channel++) {
            const inputData = audioBuffer.getChannelData(channel);
            const outputData = buffer.getChannelData(channel);

            for (let i = 0; i < frameCount; i++) {
                if (i < inputData.length) {
                    let value = inputData[i];

                    // クロスフェード区間でフェードインを適用
                    if (i >= crossfadeStartSample && i < crossfadeStartSample + crossfadeFrameCount) {
                        const fadeInProgress = (i - crossfadeStartSample) / crossfadeFrameCount;
                        value *= fadeInProgress;
                    }

                    outputData[i] = value;
                }
            }
        }

        return buffer;
    }

    // 再生用: フェードインバッファ生成（クロスフェード区間）
    createFadeInBuffer(audioBuffer, startTime, duration) {
        const sampleRate = audioBuffer.sampleRate;
        const frameCount = Math.floor(duration * sampleRate);
        const numChannels = audioBuffer.numberOfChannels;
        const buffer = this.audioContext.createBuffer(numChannels, frameCount, sampleRate);

        for (let channel = 0; channel < numChannels; channel++) {
            const inputData = audioBuffer.getChannelData(channel);
            const outputData = buffer.getChannelData(channel);
            const startSample = Math.floor(startTime * sampleRate);

            for (let i = 0; i < frameCount; i++) {
                const inputIndex = startSample + i;
                if (inputIndex < inputData.length) {
                    const fadeIn = i / frameCount; // 0 to 1
                    outputData[i] = inputData[inputIndex] * fadeIn;
                }
            }
        }

        return buffer;
    }

    // 保存用: トラック1の保存バッファ生成
    createSaveBuffer(audioBuffer, loopPosition, crossfadeDuration) {
        const loopStartTime = audioBuffer.duration * loopPosition;
        const crossfadeStartTime = loopStartTime - crossfadeDuration;
        const effectiveDuration = loopStartTime;

        // 新しいバッファを作成（ループ位置までの長さ）
        const sampleRate = audioBuffer.sampleRate;
        const frameCount = Math.floor(effectiveDuration * sampleRate);
        const numChannels = audioBuffer.numberOfChannels;
        const newBuffer = this.audioContext.createBuffer(numChannels, frameCount, sampleRate);

        // クロスフェード区間の開始位置
        const crossfadeStartSample = Math.floor(crossfadeStartTime * sampleRate);
        const crossfadeFrameCount = Math.floor(crossfadeDuration * sampleRate);

        for (let channel = 0; channel < numChannels; channel++) {
            const inputData = audioBuffer.getChannelData(channel);
            const outputData = newBuffer.getChannelData(channel);

            for (let i = 0; i < frameCount; i++) {
                if (i < inputData.length) {
                    let value = inputData[i];

                    // クロスフェード区間でフェードインを適用
                    if (i >= crossfadeStartSample && i < crossfadeStartSample + crossfadeFrameCount) {
                        const fadeInProgress = (i - crossfadeStartSample) / crossfadeFrameCount;
                        value *= fadeInProgress;
                    }

                    outputData[i] = value;
                }
            }
        }

        return newBuffer;
    }
}

