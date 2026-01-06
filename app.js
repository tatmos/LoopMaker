// LoopMaker - ループ波形エディタ
class LoopMaker {
    constructor() {
        this.audioContext = null;
        this.originalBuffer = null; // 元波形のバッファ
        this.track1Buffer = null; // トラック1の加工後のバッファ
        this.track2Buffer = null; // トラック2の加工後のバッファ
        this.mixedBuffer = null; // トラック1と2をミックスしたバッファ
        this.audioProcessor = null;
        this.audioPlayer = null;
        this.waveformRenderer = null;
        this.overlapRate = 0; // オーバーラップ率（0-50%）
        this.animationFrameId = null;
        
        this.initializeElements();
        this.uiController = new UIController(this);
        this.overlapRateController = new OverlapRateController(this);
    }

    initializeElements() {
        const canvas1 = document.getElementById('waveform-track1');
        const canvas2 = document.getElementById('waveform-track2');
        const ruler1 = document.getElementById('ruler-track1');
        const ruler2 = document.getElementById('ruler-track2');
        this.levelMeter1 = document.getElementById('level-meter-track1');
        this.levelMeter2 = document.getElementById('level-meter-track2');
        
        this.waveformRenderer = new WaveformRenderer(canvas1, canvas2, ruler1, ruler2);
    }

    updateBuffers() {
        if (!this.originalBuffer || !this.audioProcessor) return;
        
        // トラック1の加工後のバッファを生成
        this.track1Buffer = this.audioProcessor.track1Processor.createSaveBuffer(
            this.originalBuffer, 
            this.overlapRate
        );
        
        // トラック2の加工後のバッファを生成（トラック1と同じサイズにする）
        this.track2Buffer = this.audioProcessor.track2Processor.createSaveBuffer(
            this.originalBuffer, 
            this.overlapRate,
            this.track1Buffer.duration
        );
        
        // トラック1と2をミックスしたバッファを生成
        this.mixedBuffer = this.audioProcessor.mixBuffers(this.track1Buffer, this.track2Buffer);
    }

    drawWaveforms() {
        if (!this.track1Buffer || !this.track2Buffer || !this.waveformRenderer) return;
        const currentTime = this.audioPlayer ? this.audioPlayer.getCurrentPlaybackTime() : null;
        this.waveformRenderer.render(this.track1Buffer, this.track2Buffer, currentTime);
    }

    startPlaybackAnimation() {
        const animate = () => {
            if (this.audioPlayer && this.audioPlayer.isPlaying) {
                this.drawWaveforms();
                this.updateLevelMeters();
                this.animationFrameId = requestAnimationFrame(animate);
            } else {
                this.animationFrameId = null;
                this.resetLevelMeters();
            }
        };
        if (this.animationFrameId === null) {
            this.animationFrameId = requestAnimationFrame(animate);
        }
    }

    updateLevelMeters() {
        if (!this.audioPlayer) return;

        const level1 = this.audioPlayer.getLevel(1);
        const level2 = this.audioPlayer.getLevel(2);

        if (this.levelMeter1) {
            const bar1 = this.levelMeter1.querySelector('.level-bar');
            if (bar1) {
                bar1.style.height = (level1 * 100) + '%';
            }
        }

        if (this.levelMeter2) {
            const bar2 = this.levelMeter2.querySelector('.level-bar');
            if (bar2) {
                bar2.style.height = (level2 * 100) + '%';
            }
        }
    }

    resetLevelMeters() {
        if (this.levelMeter1) {
            const bar1 = this.levelMeter1.querySelector('.level-bar');
            if (bar1) {
                bar1.style.height = '0%';
            }
        }

        if (this.levelMeter2) {
            const bar2 = this.levelMeter2.querySelector('.level-bar');
            if (bar2) {
                bar2.style.height = '0%';
            }
        }
    }

    stopPlaybackAnimation() {
        if (this.animationFrameId !== null) {
            cancelAnimationFrame(this.animationFrameId);
            this.animationFrameId = null;
        }
        // 再生位置ラインを消すために再描画
        this.drawWaveforms();
    }

}

// アプリケーション初期化
document.addEventListener('DOMContentLoaded', () => {
    new LoopMaker();
});

