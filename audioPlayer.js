// オーディオ再生クラス
class AudioPlayer {
    constructor(audioContext) {
        this.audioContext = audioContext;
        this.sourceNodes = [];
        this.startTime = null;
        this.loopDuration = 0;
        this.gainNode1 = null;
        this.gainNode2 = null;
        this.analyser1 = null;
        this.analyser2 = null;
        this.isPlaying = false;
        this.track1Processor = new Track1Processor(audioContext);
        this.track2Processor = new Track2Processor(audioContext);
    }

    playPreview(audioBuffer, loopPosition, crossfadeDuration) {
        if (!audioBuffer || this.isPlaying) return false;

        try {
            const loopStartTime = audioBuffer.duration * loopPosition;
            const crossfadeStartTime = loopStartTime - crossfadeDuration;
            const loopDuration = loopStartTime;

            // メインループ: 0からループ位置までをループ再生（クロスフェード適用）
            const loopBuffer = this.track1Processor.createLoopBuffer(audioBuffer, loopStartTime, crossfadeStartTime, crossfadeDuration);
            const mainSource = this.audioContext.createBufferSource();
            mainSource.buffer = loopBuffer;
            mainSource.loop = true;
            mainSource.loopStart = 0;
            mainSource.loopEnd = loopDuration;
            mainSource.connect(this.audioContext.destination);

            // トラック1: フェードイン部分をループ再生（クロスフェード区間）
            const source1 = this.audioContext.createBufferSource();
            this.gainNode1 = this.audioContext.createGain();
            this.analyser1 = this.audioContext.createAnalyser();
            this.analyser1.fftSize = 256;
            this.analyser1.smoothingTimeConstant = 0.8;
            
            source1.buffer = this.track1Processor.createFadeInBuffer(audioBuffer, crossfadeStartTime, crossfadeDuration);
            source1.loop = true;
            source1.loopStart = 0;
            source1.loopEnd = crossfadeDuration;
            
            source1.connect(this.gainNode1);
            this.gainNode1.connect(this.analyser1);
            this.analyser1.connect(this.audioContext.destination);
            
            // トラック2: フェードアウト部分をループ再生（ループ位置から、フェードアウト後無音を含めてループ位置まで）
            const source2 = this.audioContext.createBufferSource();
            this.gainNode2 = this.audioContext.createGain();
            this.analyser2 = this.audioContext.createAnalyser();
            this.analyser2.fftSize = 256;
            this.analyser2.smoothingTimeConstant = 0.8;
            
            source2.buffer = this.track2Processor.createFadeOutBufferWithSilence(audioBuffer, loopStartTime, crossfadeDuration, loopDuration);
            source2.loop = true;
            source2.loopStart = 0;
            source2.loopEnd = loopDuration;
            
            source2.connect(this.gainNode2);
            this.gainNode2.connect(this.analyser2);
            this.analyser2.connect(this.audioContext.destination);

            this.sourceNodes = [mainSource, source1, source2, this.gainNode1, this.gainNode2, this.analyser1, this.analyser2];
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
        this.gainNode1 = null;
        this.gainNode2 = null;
        this.analyser1 = null;
        this.analyser2 = null;
        this.startTime = null;
        this.isPlaying = false;
    }

    getLevel(trackNumber) {
        const analyser = trackNumber === 1 ? this.analyser1 : this.analyser2;
        if (!analyser) return 0;

        const dataArray = new Uint8Array(analyser.frequencyBinCount);
        analyser.getByteFrequencyData(dataArray);
        
        // 平均音量を計算
        let sum = 0;
        for (let i = 0; i < dataArray.length; i++) {
            sum += dataArray[i];
        }
        const average = sum / dataArray.length;
        
        // 0-100の範囲に正規化
        return average / 255;
    }

    setTrack1Mute(muted) {
        if (this.gainNode1) {
            this.gainNode1.gain.value = muted ? 0 : 1;
        }
    }

    setTrack2Mute(muted) {
        if (this.gainNode2) {
            this.gainNode2.gain.value = muted ? 0 : 1;
        }
    }

    getCurrentPlaybackTime() {
        if (!this.isPlaying || this.startTime === null || this.loopDuration === 0) {
            return null;
        }
        const elapsed = this.audioContext.currentTime - this.startTime;
        return elapsed % this.loopDuration;
    }
}

