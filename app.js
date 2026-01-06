// LoopMaker - ループ波形エディタ
class LoopMaker {
    constructor() {
        this.audioContext = null;
        this.audioBuffer = null;
        this.audioProcessor = null;
        this.waveformRenderer = null;
        this.loopPosition = 0.75; // 初期値: 75% (3/4)
        this.crossfadeDuration = 0; // クロスフェード区間の長さ（秒）
        this.animationFrameId = null;
        
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
        
        const canvas1 = document.getElementById('waveform-track1');
        const canvas2 = document.getElementById('waveform-track2');
        const ruler1 = document.getElementById('ruler-track1');
        const ruler2 = document.getElementById('ruler-track2');
        
        this.waveformRenderer = new WaveformRenderer(canvas1, canvas2, ruler1, ruler2);
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
            this.audioProcessor = new AudioProcessor(this.audioContext);
            
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
        if (!this.audioBuffer || !this.waveformRenderer) return;
        const currentTime = this.audioProcessor ? this.audioProcessor.getCurrentPlaybackTime() : null;
        this.waveformRenderer.render(this.audioBuffer, this.loopPosition, this.crossfadeDuration, currentTime);
    }

    startPlaybackAnimation() {
        const animate = () => {
            if (this.audioProcessor && this.audioProcessor.isPlaying) {
                this.drawWaveforms();
                this.animationFrameId = requestAnimationFrame(animate);
            } else {
                this.animationFrameId = null;
            }
        };
        if (this.animationFrameId === null) {
            this.animationFrameId = requestAnimationFrame(animate);
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

    updateLoopPosition(event) {
        this.loopPosition = parseFloat(event.target.value) / 100;
        this.updateLoopPositionValue();
        this.drawWaveforms();
    }

    updateLoopPositionValue() {
        this.loopPositionValue.textContent = Math.round(this.loopPosition * 100) + '%';
    }

    async playPreview() {
        if (!this.audioBuffer || !this.audioProcessor) return;

        try {
            this.playBtn.disabled = true;
            this.stopBtn.disabled = false;

            this.audioProcessor.playPreview(this.audioBuffer, this.loopPosition, this.crossfadeDuration);
            this.startPlaybackAnimation();
            this.showStatus('再生中...', 'info');
        } catch (error) {
            this.showStatus('再生エラー: ' + error.message, 'error');
            console.error(error);
            this.playBtn.disabled = false;
            this.stopBtn.disabled = true;
        }
    }

    stopPreview() {
        if (this.audioProcessor) {
            this.audioProcessor.stopPreview();
        }
        this.stopPlaybackAnimation();
        this.playBtn.disabled = false;
        this.stopBtn.disabled = true;
        this.showStatus('停止しました', 'info');
    }

    async saveFile() {
        if (!this.audioBuffer || !this.audioProcessor) return;

        try {
            this.showStatus('ファイルを生成中...', 'info');
            this.audioProcessor.saveFile(this.audioBuffer, this.loopPosition, this.crossfadeDuration);
            this.showStatus('ファイルを保存しました', 'success');
        } catch (error) {
            this.showStatus('保存エラー: ' + error.message, 'error');
            console.error(error);
        }
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

