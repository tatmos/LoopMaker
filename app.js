// LoopMaker - ループ波形エディタ
class LoopMaker {
    constructor() {
        this.audioContext = null;
        this.audioBuffer = null;
        this.sourceNodes = [];
        this.isPlaying = false;
        this.loopPosition = 0.75; // 初期値: 75% (3/4)
        this.crossfadeDuration = 0; // クロスフェード区間の長さ（秒）
        
        this.initializeElements();
        this.setupEventListeners();
    }

    initializeElements() {
        this.fileInput = document.getElementById('file-input');
        this.saveBtn = document.getElementById('save-btn');
        this.playBtn = document.getElementById('play-btn');
        this.stopBtn = document.getElementById('stop-btn');
        this.loopPositionSlider = document.getElementById('loop-position');
        this.loopPositionValue = document.getElementById('loop-position-value');
        this.status = document.getElementById('status');
        this.canvas1 = document.getElementById('waveform-track1');
        this.canvas2 = document.getElementById('waveform-track2');
        this.ctx1 = this.canvas1.getContext('2d');
        this.ctx2 = this.canvas2.getContext('2d');
    }

    setupEventListeners() {
        this.fileInput.addEventListener('change', (e) => this.handleFileUpload(e));
        this.saveBtn.addEventListener('click', () => this.saveFile());
        this.playBtn.addEventListener('click', () => this.playPreview());
        this.stopBtn.addEventListener('click', () => this.stopPreview());
        this.loopPositionSlider.addEventListener('input', (e) => this.updateLoopPosition(e));
    }

    async handleFileUpload(event) {
        const file = event.target.files[0];
        if (!file) return;

        this.showStatus('ファイルを読み込み中...', 'info');

        try {
            const arrayBuffer = await file.arrayBuffer();
            this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
            this.audioBuffer = await this.audioContext.decodeAudioData(arrayBuffer);
            
            // 初期ループ位置を3/4に設定
            this.loopPosition = 0.75;
            this.loopPositionSlider.value = 75;
            this.updateLoopPositionValue();
            
            // クロスフェード区間を計算（波形の5%程度）
            this.crossfadeDuration = this.audioBuffer.duration * 0.05;
            
            this.drawWaveforms();
            this.enableControls();
            this.showStatus('ファイルの読み込みが完了しました', 'success');
        } catch (error) {
            this.showStatus('エラー: ' + error.message, 'error');
            console.error(error);
        }
    }

    drawWaveforms() {
        if (!this.audioBuffer) return;

        const width = this.canvas1.width = this.canvas1.offsetWidth;
        const height = this.canvas1.height = this.canvas1.offsetHeight;
        this.canvas2.width = width;
        this.canvas2.height = height;

        const loopStartTime = this.audioBuffer.duration * this.loopPosition;
        const crossfadeStartTime = loopStartTime - this.crossfadeDuration;
        const effectiveDuration = loopStartTime;

        // トラック1: フェードイン部分（クロスフェード区間）
        this.drawTrack1(crossfadeStartTime, this.crossfadeDuration, width, height);
        
        // トラック2: フェードアウト部分（ループ位置以降）
        this.drawTrack2(loopStartTime, this.audioBuffer.duration - loopStartTime, width, height);
    }

    drawTrack1(startTime, duration, width, height) {
        const ctx = this.ctx1;
        ctx.clearRect(0, 0, width, height);
        
        if (!this.audioBuffer || duration <= 0) return;

        const sampleRate = this.audioBuffer.sampleRate;
        const startSample = Math.floor(startTime * sampleRate);
        const endSample = Math.floor((startTime + duration) * sampleRate);
        const numChannels = this.audioBuffer.numberOfChannels;
        
        // ステレオの場合は2行表示
        const trackHeight = numChannels === 2 ? height / 2 : height;
        const samplesPerPixel = Math.max(1, Math.floor((endSample - startSample) / width));

        for (let channel = 0; channel < numChannels; channel++) {
            const channelData = this.audioBuffer.getChannelData(channel);
            const yOffset = channel * trackHeight;
            
            ctx.strokeStyle = channel === 0 ? '#667eea' : '#764ba2';
            ctx.lineWidth = 2;
            ctx.beginPath();

            for (let x = 0; x < width; x++) {
                const sampleIndex = startSample + x * samplesPerPixel;
                if (sampleIndex >= channelData.length) break;

                let sum = 0;
                let count = 0;
                for (let i = 0; i < samplesPerPixel && sampleIndex + i < channelData.length; i++) {
                    sum += Math.abs(channelData[sampleIndex + i]);
                    count++;
                }
                const avg = count > 0 ? sum / count : 0;

                // フェードイン適用
                const progress = x / width;
                const fadedValue = avg * progress;

                const y = yOffset + (trackHeight / 2) - (fadedValue * trackHeight / 2 * 0.9);
                if (x === 0) {
                    ctx.moveTo(x, y);
                } else {
                    ctx.lineTo(x, y);
                }
            }

            ctx.stroke();
        }
    }

    drawTrack2(startTime, duration, width, height) {
        const ctx = this.ctx2;
        ctx.clearRect(0, 0, width, height);
        
        if (!this.audioBuffer || duration <= 0) return;

        const sampleRate = this.audioBuffer.sampleRate;
        const startSample = Math.floor(startTime * sampleRate);
        const endSample = Math.floor((startTime + duration) * sampleRate);
        const numChannels = this.audioBuffer.numberOfChannels;
        
        // ステレオの場合は2行表示
        const trackHeight = numChannels === 2 ? height / 2 : height;
        const samplesPerPixel = Math.max(1, Math.floor((endSample - startSample) / width));

        for (let channel = 0; channel < numChannels; channel++) {
            const channelData = this.audioBuffer.getChannelData(channel);
            const yOffset = channel * trackHeight;
            
            ctx.strokeStyle = channel === 0 ? '#667eea' : '#764ba2';
            ctx.lineWidth = 2;
            ctx.beginPath();

            for (let x = 0; x < width; x++) {
                const sampleIndex = startSample + x * samplesPerPixel;
                if (sampleIndex >= channelData.length) break;

                let sum = 0;
                let count = 0;
                for (let i = 0; i < samplesPerPixel && sampleIndex + i < channelData.length; i++) {
                    sum += Math.abs(channelData[sampleIndex + i]);
                    count++;
                }
                const avg = count > 0 ? sum / count : 0;

                // フェードアウト適用
                const progress = x / width;
                const fadedValue = avg * (1 - progress);

                const y = yOffset + (trackHeight / 2) - (fadedValue * trackHeight / 2 * 0.9);
                if (x === 0) {
                    ctx.moveTo(x, y);
                } else {
                    ctx.lineTo(x, y);
                }
            }

            ctx.stroke();
        }
    }

    updateLoopPosition(event) {
        this.loopPosition = parseFloat(event.target.value) / 100;
        this.updateLoopPositionValue();
        this.drawWaveforms();
    }

    updateLoopPositionValue() {
        this.loopPositionValue.textContent = Math.round(this.loopPosition * 100) + '%';
    }

    async playPreview() {
        if (!this.audioBuffer || this.isPlaying) return;

        try {
            this.isPlaying = true;
            this.playBtn.disabled = true;
            this.stopBtn.disabled = false;

            const loopStartTime = this.audioBuffer.duration * this.loopPosition;
            const crossfadeStartTime = loopStartTime - this.crossfadeDuration;
            const loopDuration = loopStartTime;

            // メインループ: 0からループ位置までをループ再生（クロスフェード適用）
            const loopBuffer = this.createLoopBuffer(loopStartTime, crossfadeStartTime);
            const mainSource = this.audioContext.createBufferSource();
            mainSource.buffer = loopBuffer;
            mainSource.loop = true;
            mainSource.loopStart = 0;
            mainSource.loopEnd = loopDuration;
            mainSource.connect(this.audioContext.destination);

            // トラック1: フェードイン部分をループ再生（クロスフェード区間）
            const source1 = this.audioContext.createBufferSource();
            const gainNode1 = this.audioContext.createGain();
            
            source1.buffer = this.createFadeInBuffer(crossfadeStartTime, this.crossfadeDuration);
            source1.loop = true;
            source1.loopStart = 0;
            source1.loopEnd = this.crossfadeDuration;
            
            source1.connect(gainNode1);
            gainNode1.connect(this.audioContext.destination);
            
            // トラック2: フェードアウト部分をループ再生（ループ位置以降）
            const source2 = this.audioContext.createBufferSource();
            const gainNode2 = this.audioContext.createGain();
            
            source2.buffer = this.createFadeOutBuffer(loopStartTime, this.audioBuffer.duration - loopStartTime);
            source2.loop = true;
            source2.loopStart = 0;
            source2.loopEnd = this.audioBuffer.duration - loopStartTime;
            
            source2.connect(gainNode2);
            gainNode2.connect(this.audioContext.destination);

            this.sourceNodes = [mainSource, source1, source2, gainNode1, gainNode2];

            // メインループ（0からループ位置まで）と2トラックを同時に再生
            mainSource.start(0);
            source1.start(0);
            source2.start(0);

            this.showStatus('再生中...', 'info');
        } catch (error) {
            this.showStatus('再生エラー: ' + error.message, 'error');
            console.error(error);
            this.isPlaying = false;
            this.playBtn.disabled = false;
            this.stopBtn.disabled = true;
        }
    }

    createLoopBuffer(loopStartTime, crossfadeStartTime) {
        const sampleRate = this.audioBuffer.sampleRate;
        const frameCount = Math.floor(loopStartTime * sampleRate);
        const numChannels = this.audioBuffer.numberOfChannels;
        const buffer = this.audioContext.createBuffer(numChannels, frameCount, sampleRate);
        const crossfadeStartSample = Math.floor(crossfadeStartTime * sampleRate);
        const crossfadeFrameCount = Math.floor(this.crossfadeDuration * sampleRate);

        for (let channel = 0; channel < numChannels; channel++) {
            const inputData = this.audioBuffer.getChannelData(channel);
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

    createFadeInBuffer(startTime, duration) {
        const sampleRate = this.audioBuffer.sampleRate;
        const frameCount = Math.floor(duration * sampleRate);
        const numChannels = this.audioBuffer.numberOfChannels;
        const buffer = this.audioContext.createBuffer(numChannels, frameCount, sampleRate);

        for (let channel = 0; channel < numChannels; channel++) {
            const inputData = this.audioBuffer.getChannelData(channel);
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

    createFadeOutBuffer(startTime, duration) {
        const sampleRate = this.audioBuffer.sampleRate;
        const frameCount = Math.floor(duration * sampleRate);
        const numChannels = this.audioBuffer.numberOfChannels;
        const buffer = this.audioContext.createBuffer(numChannels, frameCount, sampleRate);

        for (let channel = 0; channel < numChannels; channel++) {
            const inputData = this.audioBuffer.getChannelData(channel);
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
        this.isPlaying = false;
        this.playBtn.disabled = false;
        this.stopBtn.disabled = true;
        this.showStatus('停止しました', 'info');
    }

    async saveFile() {
        if (!this.audioBuffer) return;

        try {
            this.showStatus('ファイルを生成中...', 'info');

            const loopStartTime = this.audioBuffer.duration * this.loopPosition;
            const crossfadeStartTime = loopStartTime - this.crossfadeDuration;
            const effectiveDuration = loopStartTime;

            // 新しいバッファを作成（ループ位置までの長さ）
            const sampleRate = this.audioBuffer.sampleRate;
            const frameCount = Math.floor(effectiveDuration * sampleRate);
            const numChannels = this.audioBuffer.numberOfChannels;
            const newBuffer = this.audioContext.createBuffer(numChannels, frameCount, sampleRate);

            // クロスフェード区間の開始位置
            const crossfadeStartSample = Math.floor(crossfadeStartTime * sampleRate);
            const crossfadeFrameCount = Math.floor(this.crossfadeDuration * sampleRate);

            for (let channel = 0; channel < numChannels; channel++) {
                const inputData = this.audioBuffer.getChannelData(channel);
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

            // WAVファイルとしてエクスポート
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

            this.showStatus('ファイルを保存しました', 'success');
        } catch (error) {
            this.showStatus('保存エラー: ' + error.message, 'error');
            console.error(error);
        }
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

    enableControls() {
        this.saveBtn.disabled = false;
        this.playBtn.disabled = false;
        this.loopPositionSlider.disabled = false;
    }

    showStatus(message, type = 'info') {
        this.status.textContent = message;
        this.status.className = 'status ' + type;
    }
}

// アプリケーション初期化
document.addEventListener('DOMContentLoaded', () => {
    new LoopMaker();
});

