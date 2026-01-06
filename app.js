// LoopMaker - ループ波形エディタ
class LoopMaker {
    constructor() {
        this.audioContext = null;
        this.audioBuffer = null;
        this.audioProcessor = null;
        this.audioPlayer = null;
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
        this.muteTrack1Btn = document.getElementById('mute-track1');
        this.muteTrack2Btn = document.getElementById('mute-track2');
        
        const canvas1 = document.getElementById('waveform-track1');
        const canvas2 = document.getElementById('waveform-track2');
        const ruler1 = document.getElementById('ruler-track1');
        const ruler2 = document.getElementById('ruler-track2');
        this.levelMeter1 = document.getElementById('level-meter-track1');
        this.levelMeter2 = document.getElementById('level-meter-track2');
        
        this.waveformRenderer = new WaveformRenderer(canvas1, canvas2, ruler1, ruler2);
        
        // ミュート状態
        this.track1Muted = false;
        this.track2Muted = false;
    }

    setupEventListeners() {
        this.fileInput.addEventListener('change', (e) => this.handleFileUpload(e));
        this.saveBtn.addEventListener('click', () => this.saveFile());
        this.playBtn.addEventListener('click', () => this.playPreview());
        this.stopBtn.addEventListener('click', () => this.stopPreview());
        this.loopPositionSlider.addEventListener('input', (e) => this.updateLoopPosition(e));
        this.muteTrack1Btn.addEventListener('click', () => this.toggleMuteTrack1());
        this.muteTrack2Btn.addEventListener('click', () => this.toggleMuteTrack2());
        
        // キーボードショートカット
        document.addEventListener('keydown', (e) => {
            // 入力欄にフォーカスがある場合は無視
            if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') {
                return;
            }
            
            if (e.code === 'Space' || e.key === ' ') {
                e.preventDefault();
                this.togglePlayback();
            } else if (e.key === 'm' || e.key === 'M') {
                e.preventDefault();
                // フォーカスされているトラックをミュート（デフォルトはトラック1）
                this.toggleMuteTrack1();
            }
        });
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
            this.audioPlayer = new AudioPlayer(this.audioContext);
            
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
        const currentTime = this.audioPlayer ? this.audioPlayer.getCurrentPlaybackTime() : null;
        this.waveformRenderer.render(this.audioBuffer, this.loopPosition, this.crossfadeDuration, currentTime);
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

    updateLoopPosition(event) {
        this.loopPosition = parseFloat(event.target.value) / 100;
        this.updateLoopPositionValue();
        this.drawWaveforms();
    }

    updateLoopPositionValue() {
        this.loopPositionValue.textContent = Math.round(this.loopPosition * 100) + '%';
    }

    togglePlayback() {
        if (!this.audioBuffer || !this.audioPlayer) return;
        
        if (this.audioPlayer.isPlaying) {
            this.stopPreview();
        } else {
            this.playPreview();
        }
    }

    async playPreview() {
        if (!this.audioBuffer || !this.audioPlayer) return;

        try {
            this.playBtn.disabled = true;
            this.stopBtn.disabled = false;

            this.audioPlayer.playPreview(this.audioBuffer, this.loopPosition, this.crossfadeDuration);
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
        if (this.audioPlayer) {
            this.audioPlayer.stopPreview();
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

    toggleMuteTrack1() {
        this.track1Muted = !this.track1Muted;
        if (this.audioPlayer) {
            this.audioPlayer.setTrack1Mute(this.track1Muted);
        }
        this.updateMuteButton(this.muteTrack1Btn, this.track1Muted);
    }

    toggleMuteTrack2() {
        this.track2Muted = !this.track2Muted;
        if (this.audioPlayer) {
            this.audioPlayer.setTrack2Mute(this.track2Muted);
        }
        this.updateMuteButton(this.muteTrack2Btn, this.track2Muted);
    }

    updateMuteButton(button, muted) {
        if (muted) {
            button.classList.add('muted');
            button.innerHTML = '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M11 5L6 9H2v6h4l5 4V5z"></path><line x1="23" y1="9" x2="17" y2="15"></line><line x1="17" y1="9" x2="23" y2="15"></line></svg>';
        } else {
            button.classList.remove('muted');
            button.innerHTML = '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M11 5L6 9H2v6h4l5 4V5z"></path><path d="M19.07 4.93a10 10 0 0 1 0 14.14M15.54 8.46a5 5 0 0 1 0 7.07"></path></svg>';
        }
    }
}

// アプリケーション初期化
document.addEventListener('DOMContentLoaded', () => {
    new LoopMaker();
});

