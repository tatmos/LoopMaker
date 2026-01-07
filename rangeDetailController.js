// 範囲詳細設定コントローラクラス
class RangeDetailController {
    constructor(container, startCanvas, endCanvas, startRuler, endRuler, originalWaveformViewer) {
        this.container = container;
        this.startCanvas = startCanvas;
        this.startCtx = startCanvas.getContext('2d');
        this.endCanvas = endCanvas;
        this.endCtx = endCanvas.getContext('2d');
        this.startRuler = startRuler;
        this.endRuler = endRuler;
        this.originalWaveformViewer = originalWaveformViewer;
        this.audioBuffer = null;
        this.startTime = 0;
        this.endTime = 0;
        this.zoomRange = 0.1; // 拡大範囲（秒）±0.1秒
        this.isDraggingStart = false;
        this.isDraggingEnd = false;
        
        this.setupEventListeners();
        this.updateCanvasSize();
    }

    setupEventListeners() {
        // 詳細設定ボタン
        const detailBtn = document.getElementById('range-detail-btn');
        const closeBtn = document.getElementById('range-detail-close');
        const startMinus01 = document.getElementById('range-detail-start-minus-01');
        const startPlus01 = document.getElementById('range-detail-start-plus-01');
        const startMinus001 = document.getElementById('range-detail-start-minus-001');
        const startPlus001 = document.getElementById('range-detail-start-plus-001');
        const endMinus01 = document.getElementById('range-detail-end-minus-01');
        const endPlus01 = document.getElementById('range-detail-end-plus-01');
        const endMinus001 = document.getElementById('range-detail-end-minus-001');
        const endPlus001 = document.getElementById('range-detail-end-plus-001');
        
        if (detailBtn) {
            detailBtn.addEventListener('click', () => this.show());
        }
        
        if (closeBtn) {
            closeBtn.addEventListener('click', () => this.hide());
        }

        // 開始位置ボタン
        if (startMinus01) {
            startMinus01.addEventListener('click', () => this.nudge('start', -0.1));
        }
        if (startPlus01) {
            startPlus01.addEventListener('click', () => this.nudge('start', 0.1));
        }
        if (startMinus001) {
            startMinus001.addEventListener('click', () => this.nudge('start', -0.01));
        }
        if (startPlus001) {
            startPlus001.addEventListener('click', () => this.nudge('start', 0.01));
        }

        // 終了位置ボタン
        if (endMinus01) {
            endMinus01.addEventListener('click', () => this.nudge('end', -0.1));
        }
        if (endPlus01) {
            endPlus01.addEventListener('click', () => this.nudge('end', 0.1));
        }
        if (endMinus001) {
            endMinus001.addEventListener('click', () => this.nudge('end', -0.01));
        }
        if (endPlus001) {
            endPlus001.addEventListener('click', () => this.nudge('end', 0.01));
        }

        // 開始位置キャンバスのイベント
        this.startCanvas.addEventListener('mousedown', (e) => this.handleMouseDown(e, 'start'));
        this.startCanvas.addEventListener('mousemove', (e) => this.handleMouseMove(e, 'start'));
        this.startCanvas.addEventListener('mouseup', (e) => this.handleMouseUp(e, 'start'));
        this.startCanvas.addEventListener('mouseleave', (e) => this.handleMouseUp(e, 'start'));

        // 終了位置キャンバスのイベント
        this.endCanvas.addEventListener('mousedown', (e) => this.handleMouseDown(e, 'end'));
        this.endCanvas.addEventListener('mousemove', (e) => this.handleMouseMove(e, 'end'));
        this.endCanvas.addEventListener('mouseup', (e) => this.handleMouseUp(e, 'end'));
        this.endCanvas.addEventListener('mouseleave', (e) => this.handleMouseUp(e, 'end'));

        // タッチ操作対応
        this.startCanvas.addEventListener('touchstart', (e) => {
            if (!this.audioBuffer) return;
            const touch = e.touches[0];
            if (!touch) return;
            const wasDragging = this.isDraggingStart;
            this.handleMouseDown(touch, 'start');
            if (this.isDraggingStart && !wasDragging) {
                e.preventDefault();
            }
        }, { passive: false });

        this.startCanvas.addEventListener('touchmove', (e) => {
            if (!this.audioBuffer) return;
            const touch = e.touches[0];
            if (!touch) return;
            if (this.isDraggingStart) {
                e.preventDefault();
            }
            this.handleMouseMove(touch, 'start');
        }, { passive: false });

        this.startCanvas.addEventListener('touchend', (e) => {
            const touch = e.changedTouches[0] || e.touches[0];
            if (touch) {
                this.handleMouseUp(touch, 'start');
            } else {
                this.handleMouseUp(e, 'start');
            }
        });

        this.startCanvas.addEventListener('touchcancel', (e) => {
            this.handleMouseUp(e, 'start');
        });

        this.endCanvas.addEventListener('touchstart', (e) => {
            if (!this.audioBuffer) return;
            const touch = e.touches[0];
            if (!touch) return;
            const wasDragging = this.isDraggingEnd;
            this.handleMouseDown(touch, 'end');
            if (this.isDraggingEnd && !wasDragging) {
                e.preventDefault();
            }
        }, { passive: false });

        this.endCanvas.addEventListener('touchmove', (e) => {
            if (!this.audioBuffer) return;
            const touch = e.touches[0];
            if (!touch) return;
            if (this.isDraggingEnd) {
                e.preventDefault();
            }
            this.handleMouseMove(touch, 'end');
        }, { passive: false });

        this.endCanvas.addEventListener('touchend', (e) => {
            const touch = e.changedTouches[0] || e.touches[0];
            if (touch) {
                this.handleMouseUp(touch, 'end');
            } else {
                this.handleMouseUp(e, 'end');
            }
        });

        this.endCanvas.addEventListener('touchcancel', (e) => {
            this.handleMouseUp(e, 'end');
        });

        window.addEventListener('resize', () => {
            this.updateCanvasSize();
            this.render();
        });
    }

    updateCanvasSize() {
        const startRect = this.startCanvas.getBoundingClientRect();
        this.startCanvas.width = startRect.width;
        this.startCanvas.height = startRect.height;

        const endRect = this.endCanvas.getBoundingClientRect();
        this.endCanvas.width = endRect.width;
        this.endCanvas.height = endRect.height;
    }

    setAudioBuffer(audioBuffer) {
        this.audioBuffer = audioBuffer;
        this.render();
    }

    setRange(startTime, endTime) {
        this.startTime = startTime;
        this.endTime = endTime;
        this.render();
    }

    show() {
        if (!this.audioBuffer) return;
        this.container.classList.remove('hidden');
        this.updateCanvasSize();
        this.render();
    }

    hide() {
        this.container.classList.add('hidden');
    }

    handleMouseDown(e, type) {
        if (!this.audioBuffer) return;
        
        const canvas = type === 'start' ? this.startCanvas : this.endCanvas;
        const rect = canvas.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const width = canvas.width;
        
        const currentTime = type === 'start' ? this.startTime : this.endTime;
        const viewStart = currentTime - this.zoomRange;
        const viewEnd = currentTime + this.zoomRange;
        const timeScale = width / (viewEnd - viewStart);
        const markerX = (currentTime - viewStart) * timeScale;
        
        // マーカー付近をクリックした場合のみドラッグ開始
        const handleWidth = 20;
        if (Math.abs(x - markerX) < handleWidth) {
            if (type === 'start') {
                this.isDraggingStart = true;
            } else {
                this.isDraggingEnd = true;
            }
            canvas.style.cursor = 'ew-resize';
            this.lockScroll();
        }
    }

    handleMouseMove(e, type) {
        if (!this.audioBuffer) return;
        
        const isDragging = type === 'start' ? this.isDraggingStart : this.isDraggingEnd;
        if (!isDragging) return;
        
        const canvas = type === 'start' ? this.startCanvas : this.endCanvas;
        const rect = canvas.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const width = canvas.width;
        
        const currentTime = type === 'start' ? this.startTime : this.endTime;
        const viewStart = currentTime - this.zoomRange;
        const viewEnd = currentTime + this.zoomRange;
        const timeScale = width / (viewEnd - viewStart);
        
        // 新しい時間を計算
        const newTime = viewStart + (x / timeScale);
        
        // 範囲制限
        const minTime = 0;
        const maxTime = this.audioBuffer.duration;
        const clampedTime = Math.max(minTime, Math.min(maxTime, newTime));
        
        // 開始位置と終了位置が逆転しないように制限
        if (type === 'start') {
            this.applyClampedStartTime(clampedTime);
        } else {
            this.applyClampedEndTime(clampedTime);
        }
    }

    handleMouseUp(e, type) {
        const canvas = type === 'start' ? this.startCanvas : this.endCanvas;
        if (type === 'start') {
            this.isDraggingStart = false;
        } else {
            this.isDraggingEnd = false;
        }
        canvas.style.cursor = 'crosshair';
        this.unlockScroll();
    }

    nudge(type, delta) {
        if (!this.audioBuffer) return;

        if (type === 'start') {
            const target = this.startTime + delta;
            const minTime = 0;
            const maxTime = this.endTime - 0.01; // 最小0.01秒の間隔
            const clamped = Math.max(minTime, Math.min(maxTime, target));
            this.applyClampedStartTime(clamped);
        } else {
            const target = this.endTime + delta;
            const minTime = this.startTime + 0.01; // 最小0.01秒の間隔
            const maxTime = this.audioBuffer.duration;
            const clamped = Math.max(minTime, Math.min(maxTime, target));
            this.applyClampedEndTime(clamped);
        }
    }

    applyClampedStartTime(time) {
        this.startTime = time;
        // 元のビューアーに反映
        if (this.originalWaveformViewer) {
            this.originalWaveformViewer.setRange(this.startTime, this.endTime);
            if (this.originalWaveformViewer.onRangeChange) {
                this.originalWaveformViewer.onRangeChange(this.startTime, this.endTime);
            }
        }
        this.render();
    }

    applyClampedEndTime(time) {
        this.endTime = time;
        // 元のビューアーに反映
        if (this.originalWaveformViewer) {
            this.originalWaveformViewer.setRange(this.startTime, this.endTime);
            if (this.originalWaveformViewer.onRangeChange) {
                this.originalWaveformViewer.onRangeChange(this.startTime, this.endTime);
            }
        }
        this.render();
    }

    lockScroll() {
        if (typeof document !== 'undefined') {
            document.body.style.overflow = 'hidden';
            if (document.documentElement) {
                document.documentElement.style.overflow = 'hidden';
            }
        }
    }

    unlockScroll() {
        if (typeof document !== 'undefined') {
            document.body.style.overflow = '';
            if (document.documentElement) {
                document.documentElement.style.overflow = '';
            }
        }
    }

    render() {
        if (!this.audioBuffer) return;
        
        this.renderStartView();
        this.renderEndView();
        this.drawTimeRulers();
    }

    renderStartView() {
        const canvas = this.startCanvas;
        const ctx = this.startCtx;
        const width = canvas.width;
        const height = canvas.height;
        
        // クリア
        ctx.clearRect(0, 0, width, height);
        
        // 拡大範囲を計算
        const viewStart = this.startTime - this.zoomRange;
        const viewEnd = this.startTime + this.zoomRange;
        const viewDuration = viewEnd - viewStart;
        const timeScale = width / viewDuration;
        
        // 背景
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, width, height);
        
        // 波形を描画
        WaveformDrawer.drawWaveform(
            this.audioBuffer,
            ctx,
            viewStart,
            viewEnd,
            viewStart,
            viewEnd,
            width,
            height,
            {
                drawDCOffset: true,
                backgroundColor: '#ffffff'
            }
        );
        
        // マーカー線を描画（開始位置）
        const markerX = (this.startTime - viewStart) * timeScale;
        ctx.strokeStyle = '#667eea';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(markerX, 0);
        ctx.lineTo(markerX, height);
        ctx.stroke();
        
        // マーカーのハンドル
        ctx.fillStyle = '#667eea';
        ctx.beginPath();
        ctx.arc(markerX, height / 2, 8, 0, Math.PI * 2);
        ctx.fill();
        
        // マーカーの上に三角形
        ctx.fillStyle = '#667eea';
        ctx.beginPath();
        ctx.moveTo(markerX, 0);
        ctx.lineTo(markerX - 6, 12);
        ctx.lineTo(markerX + 6, 12);
        ctx.closePath();
        ctx.fill();
    }

    renderEndView() {
        const canvas = this.endCanvas;
        const ctx = this.endCtx;
        const width = canvas.width;
        const height = canvas.height;
        
        // クリア
        ctx.clearRect(0, 0, width, height);
        
        // 拡大範囲を計算
        const viewStart = this.endTime - this.zoomRange;
        const viewEnd = this.endTime + this.zoomRange;
        const viewDuration = viewEnd - viewStart;
        const timeScale = width / viewDuration;
        
        // 背景
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, width, height);
        
        // 波形を描画
        WaveformDrawer.drawWaveform(
            this.audioBuffer,
            ctx,
            viewStart,
            viewEnd,
            viewStart,
            viewEnd,
            width,
            height,
            {
                drawDCOffset: true,
                backgroundColor: '#ffffff'
            }
        );
        
        // マーカー線を描画（終了位置）
        const markerX = (this.endTime - viewStart) * timeScale;
        ctx.strokeStyle = '#e74c3c';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(markerX, 0);
        ctx.lineTo(markerX, height);
        ctx.stroke();
        
        // マーカーのハンドル
        ctx.fillStyle = '#e74c3c';
        ctx.beginPath();
        ctx.arc(markerX, height / 2, 8, 0, Math.PI * 2);
        ctx.fill();
        
        // マーカーの上に三角形
        ctx.fillStyle = '#e74c3c';
        ctx.beginPath();
        ctx.moveTo(markerX, 0);
        ctx.lineTo(markerX - 6, 12);
        ctx.lineTo(markerX + 6, 12);
        ctx.closePath();
        ctx.fill();
    }

    drawTimeRulers() {
        // 開始位置のルーラー
        this.drawTimeRuler(this.startRuler, this.startTime - this.zoomRange, this.startTime + this.zoomRange);
        
        // 終了位置のルーラー
        this.drawTimeRuler(this.endRuler, this.endTime - this.zoomRange, this.endTime + this.zoomRange);
    }

    drawTimeRuler(rulerElement, startTime, endTime) {
        const duration = endTime - startTime;
        const width = rulerElement.offsetWidth;
        
        // 適切な間隔を計算
        let tickInterval = 0.01; // デフォルトは0.01秒
        if (duration > 0.2) tickInterval = 0.05;
        if (duration > 0.5) tickInterval = 0.1;
        
        let html = '';
        const numTicks = Math.floor(duration / tickInterval);
        
        for (let i = 0; i <= numTicks; i++) {
            const time = startTime + (i * tickInterval);
            const x = (time - startTime) / duration * width;
            const isMajor = i % 5 === 0;
            const height = isMajor ? 20 : 10;
            const label = isMajor ? this.formatTime(time) : '';
            
            html += `<div class="ruler-tick" style="left: ${x}px; height: ${height}px;">${label}</div>`;
        }
        
        rulerElement.innerHTML = html;
    }

    formatTime(seconds) {
        if (seconds < 60) {
            return seconds.toFixed(2) + 's';
        }
        const mins = Math.floor(seconds / 60);
        const secs = (seconds % 60).toFixed(2);
        return `${mins}:${secs.padStart(5, '0')}`;
    }
}
