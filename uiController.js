// 上部UI処理クラス
class UIController {
    constructor(loopMaker) {
        this.loopMaker = loopMaker;
        this.initializeElements();
        this.setupEventListeners();
    }

    initializeElements() {
        this.fileInput = document.getElementById('file-input');
        this.saveBtn = document.getElementById('save-btn');
        this.playBtn = document.getElementById('play-btn');
        this.stopBtn = document.getElementById('stop-btn');
        this.status = document.getElementById('status');
        this.muteTrack1Btn = document.getElementById('mute-track1');
        this.muteTrack2Btn = document.getElementById('mute-track2');
        this.dropZone = document.getElementById('original-drop-zone');
        this.dropOverlay = document.getElementById('drop-overlay');
        
        // ミュート状態
        this.track1Muted = false;
        this.track2Muted = false;
    }

    setupEventListeners() {
        this.fileInput.addEventListener('change', (e) => this.handleFileUpload(e));
        this.saveBtn.addEventListener('click', () => this.saveFile());
        this.playBtn.addEventListener('click', () => this.playPreview());
        this.stopBtn.addEventListener('click', () => this.stopPreview());
        this.muteTrack1Btn.addEventListener('click', () => this.toggleMuteTrack1());
        this.muteTrack2Btn.addEventListener('click', () => this.toggleMuteTrack2());

        if (this.dropZone) {
            ['dragenter', 'dragover'].forEach(evt => {
                this.dropZone.addEventListener(evt, (e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    this.dropZone.classList.add('dragover');
                });
            });

            ['dragleave', 'drop'].forEach(evt => {
                this.dropZone.addEventListener(evt, (e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    this.dropZone.classList.remove('dragover');
                });
            });

            this.dropZone.addEventListener('drop', (e) => {
                const files = e.dataTransfer?.files;
                if (files && files.length > 0) {
                    // 同じファイルを再度読み込めるようにリセット
                    this.fileInput.value = '';
                    this.loadFile(files[0]);
                }
            });
        }
        
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

        await this.loadFile(file);
    }

    async loadFile(file) {
        if (!file) return;

        this.showStatus('ファイルを読み込み中...', 'info');

        try {
            const arrayBuffer = await file.arrayBuffer();
            this.loopMaker.audioContext = new (window.AudioContext || window.webkitAudioContext)();
            this.loopMaker.originalBuffer = await this.loopMaker.audioContext.decodeAudioData(arrayBuffer);
            this.loopMaker.audioProcessor = new AudioProcessor(this.loopMaker.audioContext);
            this.loopMaker.audioPlayer = new AudioPlayer(this.loopMaker.audioContext);
            
            // 元波形を表示
            if (this.loopMaker.originalWaveformViewer) {
                this.loopMaker.originalWaveformViewer.setAudioBuffer(this.loopMaker.originalBuffer);
                this.loopMaker.useRangeStart = 0;
                this.loopMaker.useRangeEnd = this.loopMaker.originalBuffer.duration;
                this.loopMaker.originalWaveformViewer.setRange(this.loopMaker.useRangeStart, this.loopMaker.useRangeEnd);
                if (this.dropOverlay) {
                    this.dropOverlay.classList.add('hidden');
                }
            }
            
            // 初期オーバーラップ率を0に設定
            if (this.loopMaker.overlapRateController) {
                this.loopMaker.overlapRateController.setValue(0);
            }
            
            // バッファを生成
            this.loopMaker.updateBuffers();
            
            this.loopMaker.drawWaveforms();
            this.enableControls();
            this.showStatus('ファイルの読み込みが完了しました', 'success');
        } catch (error) {
            this.showStatus('エラー: ' + error.message, 'error');
            console.error(error);
        }
    }

    togglePlayback() {
        if (!this.loopMaker.originalBuffer || !this.loopMaker.audioPlayer) return;
        
        if (this.loopMaker.audioPlayer.isPlaying) {
            this.stopPreview();
        } else {
            this.playPreview();
        }
    }

    async playPreview() {
        if (!this.loopMaker.originalBuffer || !this.loopMaker.audioPlayer || !this.loopMaker.track1Buffer || !this.loopMaker.track2Buffer) return;

        try {
            this.playBtn.disabled = true;
            this.stopBtn.disabled = false;

            // トラック1と2の加工後のバッファを再生
            this.loopMaker.audioPlayer.playPreviewWithBuffers(this.loopMaker.track1Buffer, this.loopMaker.track2Buffer);
            this.loopMaker.startPlaybackAnimation();
            this.showStatus('再生中...', 'info');
        } catch (error) {
            this.showStatus('再生エラー: ' + error.message, 'error');
            console.error(error);
            this.playBtn.disabled = false;
            this.stopBtn.disabled = true;
        }
    }

    stopPreview() {
        if (this.loopMaker.audioPlayer) {
            this.loopMaker.audioPlayer.stopPreview();
        }
        this.loopMaker.stopPlaybackAnimation();
        this.playBtn.disabled = false;
        this.stopBtn.disabled = true;
        this.showStatus('停止しました', 'info');
    }

    async saveFile() {
        if (!this.loopMaker.mixedBuffer || !this.loopMaker.audioProcessor) return;

        try {
            this.showStatus('ファイルを生成中...', 'info');
            // ミックスしたバッファを保存
            this.loopMaker.audioProcessor.saveMixedBuffer(this.loopMaker.mixedBuffer);
            this.showStatus('ファイルを保存しました', 'success');
        } catch (error) {
            this.showStatus('保存エラー: ' + error.message, 'error');
            console.error(error);
        }
    }

    enableControls() {
        this.saveBtn.disabled = false;
        this.playBtn.disabled = false;
        if (this.loopMaker.overlapRateController) {
            this.loopMaker.overlapRateController.enable();
        }
    }

    showStatus(message, type = 'info') {
        this.status.textContent = message;
        this.status.className = 'status ' + type;
    }

    toggleMuteTrack1() {
        this.track1Muted = !this.track1Muted;
        if (this.loopMaker.audioPlayer) {
            this.loopMaker.audioPlayer.setTrack1Mute(this.track1Muted);
        }
        this.updateMuteButton(this.muteTrack1Btn, this.track1Muted);
    }

    toggleMuteTrack2() {
        this.track2Muted = !this.track2Muted;
        if (this.loopMaker.audioPlayer) {
            this.loopMaker.audioPlayer.setTrack2Mute(this.track2Muted);
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

