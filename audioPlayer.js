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

    // トラック1と2の加工後のバッファを再生（トラック1の加工後の範囲でループ）
    playPreviewWithBuffers(track1Buffer, track2Buffer) {
        if (!track1Buffer || !track2Buffer || this.isPlaying) return false;

        try {
            // トラック1の加工後のバッファの長さをループ期間として使用
            const loopDuration = track1Buffer.duration;
            
            // トラック1: 加工後のバッファをループ再生（トラック1の加工後の範囲でループ）
            const source1 = this.audioContext.createBufferSource();
            this.gainNode1 = this.audioContext.createGain();
            this.analyser1 = this.audioContext.createAnalyser();
            this.analyser1.fftSize = 256;
            this.analyser1.smoothingTimeConstant = 0.8;
            
            source1.buffer = track1Buffer;
            source1.loop = true;
            source1.loopStart = 0;
            source1.loopEnd = loopDuration; // トラック1の加工後の範囲でループ
            
            source1.connect(this.gainNode1);
            this.gainNode1.connect(this.analyser1);
            this.analyser1.connect(this.audioContext.destination);
            
            // トラック2: 加工後のバッファをループ再生（トラック1と同じ範囲でループ）
            const source2 = this.audioContext.createBufferSource();
            this.gainNode2 = this.audioContext.createGain();
            this.analyser2 = this.audioContext.createAnalyser();
            this.analyser2.fftSize = 256;
            this.analyser2.smoothingTimeConstant = 0.8;
            
            source2.buffer = track2Buffer;
            source2.loop = true;
            source2.loopStart = 0;
            source2.loopEnd = loopDuration; // トラック1と同じ範囲でループ
            
            source2.connect(this.gainNode2);
            this.gainNode2.connect(this.analyser2);
            this.analyser2.connect(this.audioContext.destination);

            this.sourceNodes = [source1, source2, this.gainNode1, this.gainNode2, this.analyser1, this.analyser2];
            this.loopDuration = loopDuration;

            // 2トラックを同時に再生（トラック1の加工後の範囲でループ）
            const startOffset = this.audioContext.currentTime;
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

