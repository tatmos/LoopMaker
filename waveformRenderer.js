// 波形表示レンダラー
class WaveformRenderer {
    constructor(canvas1, canvas2, ruler1, ruler2) {
        this.canvas1 = canvas1;
        this.canvas2 = canvas2;
        this.ctx1 = canvas1.getContext('2d');
        this.ctx2 = canvas2.getContext('2d');
        this.ruler1 = ruler1;
        this.ruler2 = ruler2;
    }

    render(audioBuffer, overlapRate, currentPlaybackTime = null) {
        if (!audioBuffer) return;

        const width = this.canvas1.width = this.canvas1.offsetWidth;
        const height = this.canvas1.height = this.canvas1.offsetHeight;
        this.canvas2.width = width;
        this.canvas2.height = height;

        // オーバーラップ率からカットする長さを計算
        const cutDuration = audioBuffer.duration * (overlapRate / 100);
        const track1Duration = audioBuffer.duration - cutDuration;
        const track2StartTime = audioBuffer.duration - cutDuration;

        // トラック1: 0からオーバーラップ率の範囲を引いた位置まで表示（フェードイン）
        this.drawTrack1(audioBuffer, 0, track1Duration, track1Duration, width, height);
        
        // トラック2: オーバーラップ率分引いた位置から波形最後まで（フェードアウト）
        const track2Duration = audioBuffer.duration - track2StartTime;
        this.drawTrack2(audioBuffer, track2StartTime, track2Duration, track1Duration, width, height);
        
        // 再生位置ラインを描画
        if (currentPlaybackTime !== null) {
            this.drawPlaybackPosition(currentPlaybackTime, track1Duration, width, height);
        }
        
        // タイムルーラーを描画
        this.drawTimeRuler(track1Duration, width);
    }

    drawPlaybackPosition(currentTime, totalDuration, width, height) {
        if (totalDuration <= 0) return;

        const timeScale = width / totalDuration;
        const x = (currentTime % totalDuration) * timeScale;

        // トラック1に再生位置ラインを描画
        const ctx1 = this.ctx1;
        ctx1.strokeStyle = '#ff8c00'; // オレンジ色
        ctx1.lineWidth = 2;
        ctx1.beginPath();
        ctx1.moveTo(x, 0);
        ctx1.lineTo(x, height);
        ctx1.stroke();

        // トラック2に再生位置ラインを描画
        const ctx2 = this.ctx2;
        ctx2.strokeStyle = '#ff8c00'; // オレンジ色
        ctx2.lineWidth = 2;
        ctx2.beginPath();
        ctx2.moveTo(x, 0);
        ctx2.lineTo(x, height);
        ctx2.stroke();
    }

    drawTrack1(audioBuffer, waveformStartTime, waveformDuration, totalDuration, width, height) {
        const ctx = this.ctx1;
        ctx.clearRect(0, 0, width, height);
        
        if (!audioBuffer || totalDuration <= 0) return;

        const waveformEndTime = waveformStartTime + waveformDuration;
        const displayStartTime = 0;
        const displayEndTime = totalDuration;

        WaveformDrawer.drawWaveform(
            audioBuffer,
            ctx,
            waveformStartTime,
            waveformEndTime,
            displayStartTime,
            displayEndTime,
            width,
            height,
            {
                // フェードインを適用（0から1まで）
                fadeInStartTime: waveformStartTime,
                fadeInEndTime: waveformEndTime,
                drawDCOffset: true,
                backgroundColor: '#e0e0e0'
            }
        );
    }

    drawTrack2(audioBuffer, waveformStartTime, waveformDuration, totalDuration, width, height) {
        const ctx = this.ctx2;
        ctx.clearRect(0, 0, width, height);
        
        if (!audioBuffer || totalDuration <= 0) return;

        const waveformEndTime = waveformStartTime + waveformDuration;
        // 表示範囲は0からtotalDurationまで（トラック1と同じサイズ）
        const displayStartTime = 0;
        const displayEndTime = totalDuration;

        // フェードアウトは波形開始位置から波形終了位置まで
        const fadeOutStartTime = waveformStartTime;
        const fadeOutEndTime = waveformEndTime;

        WaveformDrawer.drawWaveform(
            audioBuffer,
            ctx,
            waveformStartTime,
            waveformEndTime,
            displayStartTime,
            displayEndTime,
            width,
            height,
            {
                fadeOutStartTime: fadeOutStartTime,
                fadeOutEndTime: fadeOutEndTime,
                drawDCOffset: true,
                backgroundColor: '#e0e0e0'
            }
        );
    }

    drawTimeRuler(totalDuration, width) {
        if (totalDuration <= 0) {
            this.ruler1.innerHTML = '';
            this.ruler2.innerHTML = '';
            return;
        }

        // タイムルーラーの目盛りを計算
        const ruler1 = this.ruler1;
        const ruler2 = this.ruler2;
        ruler1.innerHTML = '';
        ruler2.innerHTML = '';

        // 適切な目盛り間隔を計算（5秒、10秒、30秒など）
        let tickInterval = 1; // デフォルト1秒
        if (totalDuration > 60) {
            tickInterval = 10;
        } else if (totalDuration > 30) {
            tickInterval = 5;
        } else if (totalDuration > 10) {
            tickInterval = 2;
        }

        const timeScale = width / totalDuration;
        const numTicks = Math.floor(totalDuration / tickInterval) + 1;

        for (let i = 0; i < numTicks; i++) {
            const time = i * tickInterval;
            if (time > totalDuration) break;

            const x = time * timeScale;

            // 目盛り線
            const tick1 = document.createElement('div');
            tick1.style.position = 'absolute';
            tick1.style.left = x + 'px';
            tick1.style.top = '0';
            tick1.style.width = '1px';
            tick1.style.height = '100%';
            tick1.style.background = '#adb5bd';
            ruler1.appendChild(tick1);

            const tick2 = document.createElement('div');
            tick2.style.position = 'absolute';
            tick2.style.left = x + 'px';
            tick2.style.top = '0';
            tick2.style.width = '1px';
            tick2.style.height = '100%';
            tick2.style.background = '#adb5bd';
            ruler2.appendChild(tick2);

            // 時間ラベル
            const label1 = document.createElement('div');
            label1.style.position = 'absolute';
            label1.style.left = (x + 2) + 'px';
            label1.style.top = '2px';
            label1.style.fontSize = '11px';
            label1.style.color = '#495057';
            label1.textContent = time.toFixed(1) + 's';
            ruler1.appendChild(label1);

            const label2 = document.createElement('div');
            label2.style.position = 'absolute';
            label2.style.left = (x + 2) + 'px';
            label2.style.top = '2px';
            label2.style.fontSize = '11px';
            label2.style.color = '#495057';
            label2.textContent = time.toFixed(1) + 's';
            ruler2.appendChild(label2);
        }
    }
}

