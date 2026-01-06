// 音声処理・生成クラス
class AudioProcessor {
    constructor(audioContext) {
        this.audioContext = audioContext;
        this.sourceNodes = [];
        this.startTime = null;
        this.loopDuration = 0;
    }

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

    createFadeOutBuffer(audioBuffer, startTime, duration) {
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
                    const fadeOut = 1 - (i / frameCount); // 1 to 0
                    outputData[i] = inputData[inputIndex] * fadeOut;
                }
            }
        }

        return buffer;
    }

    playPreview(audioBuffer, loopPosition, crossfadeDuration) {
        if (!audioBuffer || this.isPlaying) return false;

        try {
            const loopStartTime = audioBuffer.duration * loopPosition;
            const crossfadeStartTime = loopStartTime - crossfadeDuration;
            const loopDuration = loopStartTime;

            // メインループ: 0からループ位置までをループ再生（クロスフェード適用）
            const loopBuffer = this.createLoopBuffer(audioBuffer, loopStartTime, crossfadeStartTime, crossfadeDuration);
            const mainSource = this.audioContext.createBufferSource();
            mainSource.buffer = loopBuffer;
            mainSource.loop = true;
            mainSource.loopStart = 0;
            mainSource.loopEnd = loopDuration;
            mainSource.connect(this.audioContext.destination);

            // トラック1: フェードイン部分をループ再生（クロスフェード区間）
            const source1 = this.audioContext.createBufferSource();
            const gainNode1 = this.audioContext.createGain();
            
            source1.buffer = this.createFadeInBuffer(audioBuffer, crossfadeStartTime, crossfadeDuration);
            source1.loop = true;
            source1.loopStart = 0;
            source1.loopEnd = crossfadeDuration;
            
            source1.connect(gainNode1);
            gainNode1.connect(this.audioContext.destination);
            
            // トラック2: フェードアウト部分をループ再生（ループ位置以降）
            const source2 = this.audioContext.createBufferSource();
            const gainNode2 = this.audioContext.createGain();
            
            source2.buffer = this.createFadeOutBuffer(audioBuffer, loopStartTime, audioBuffer.duration - loopStartTime);
            source2.loop = true;
            source2.loopStart = 0;
            source2.loopEnd = audioBuffer.duration - loopStartTime;
            
            source2.connect(gainNode2);
            gainNode2.connect(this.audioContext.destination);

            this.sourceNodes = [mainSource, source1, source2, gainNode1, gainNode2];
            this.loopDuration = loopDuration;

            // メインループ（0からループ位置まで）と2トラックを同時に再生
            const startOffset = this.audioContext.currentTime;
            mainSource.start(startOffset);
            source1.start(startOffset);
            source2.start(startOffset);

            this.startTime = startOffset;
            this.isPlaying = true;
            return true;
        } catch (error) {
            console.error('再生エラー:', error);
            this.isPlaying = false;
            throw error;
        }
    }

    stopPreview() {
        this.sourceNodes.forEach(node => {
            try {
                if (node.stop) {
                    node.stop();
                }
                node.disconnect();
            } catch (e) {
                // 既に停止している場合など
            }
        });
        this.sourceNodes = [];
        this.startTime = null;
        this.isPlaying = false;
    }

    getCurrentPlaybackTime() {
        if (!this.isPlaying || this.startTime === null || this.loopDuration === 0) {
            return null;
        }
        const elapsed = this.audioContext.currentTime - this.startTime;
        return elapsed % this.loopDuration;
    }

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

    bufferToWav(buffer) {
        const length = buffer.length;
        const numChannels = buffer.numberOfChannels;
        const sampleRate = buffer.sampleRate;
        const arrayBuffer = new ArrayBuffer(44 + length * numChannels * 2);
        const view = new DataView(arrayBuffer);
        const channels = [];

        for (let i = 0; i < numChannels; i++) {
            channels.push(buffer.getChannelData(i));
        }

        // WAVヘッダー
        const writeString = (offset, string) => {
            for (let i = 0; i < string.length; i++) {
                view.setUint8(offset + i, string.charCodeAt(i));
            }
        };

        writeString(0, 'RIFF');
        view.setUint32(4, 36 + length * numChannels * 2, true);
        writeString(8, 'WAVE');
        writeString(12, 'fmt ');
        view.setUint32(16, 16, true);
        view.setUint16(20, 1, true);
        view.setUint16(22, numChannels, true);
        view.setUint32(24, sampleRate, true);
        view.setUint32(28, sampleRate * numChannels * 2, true);
        view.setUint16(32, numChannels * 2, true);
        view.setUint16(34, 16, true);
        writeString(36, 'data');
        view.setUint32(40, length * numChannels * 2, true);

        // データ
        let offset = 44;
        for (let i = 0; i < length; i++) {
            for (let channel = 0; channel < numChannels; channel++) {
                let sample = Math.max(-1, Math.min(1, channels[channel][i]));
                sample = sample < 0 ? sample * 0x8000 : sample * 0x7FFF;
                view.setInt16(offset, sample, true);
                offset += 2;
            }
        }

        return arrayBuffer;
    }

    saveFile(audioBuffer, loopPosition, crossfadeDuration) {
        const newBuffer = this.createSaveBuffer(audioBuffer, loopPosition, crossfadeDuration);
        const wav = this.bufferToWav(newBuffer);
        const blob = new Blob([wav], { type: 'audio/wav' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'loopmaker_output.wav';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    }
}

