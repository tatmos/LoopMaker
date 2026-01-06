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

    render(audioBuffer, loopPosition, crossfadeDuration, currentPlaybackTime = null) {
        if (!audioBuffer) return;

        const width = this.canvas1.width = this.canvas1.offsetWidth;
        const height = this.canvas1.height = this.canvas1.offsetHeight;
        this.canvas2.width = width;
        this.canvas2.height = height;

        const loopStartTime = audioBuffer.duration * loopPosition;
        const crossfadeStartTime = loopStartTime - crossfadeDuration;
        const effectiveDuration = loopStartTime;

        // 両方のトラックで同じ時間軸（0からループ位置まで）を使用
        // トラック1: 0秒からループ位置まで（クロスフェード区間でフェードイン適用）
        this.drawTrack1(audioBuffer, 0, effectiveDuration, crossfadeStartTime, crossfadeDuration, effectiveDuration, width, height);
        
        // トラック2: フェードアウト部分（ループ位置以降）
        this.drawTrack2(audioBuffer, loopStartTime, audioBuffer.duration - loopStartTime, effectiveDuration, width, height);
        
        // 再生位置ラインを描画
        if (currentPlaybackTime !== null) {
            this.drawPlaybackPosition(currentPlaybackTime, effectiveDuration, width, height);
        }
        
        // タイムルーラーを描画
        this.drawTimeRuler(effectiveDuration, width);
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

    drawTrack1(audioBuffer, displayStartTime, displayDuration, crossfadeStartTime, crossfadeDuration, totalDuration, width, height) {
        const ctx = this.ctx1;
        ctx.clearRect(0, 0, width, height);
        
        if (!audioBuffer || totalDuration <= 0) return;

        // 背景をグレーで塗りつぶす
        ctx.fillStyle = '#e0e0e0';
        ctx.fillRect(0, 0, width, height);

        const sampleRate = audioBuffer.sampleRate;
        const numChannels = audioBuffer.numberOfChannels;
        
        // ステレオの場合は2行表示
        const trackHeight = numChannels === 2 ? height / 2 : height;
        
        // 全体の時間軸に対するスケール
        const timeScale = width / totalDuration;
        const waveformStartX = displayStartTime * timeScale;
        const waveformWidth = displayDuration * timeScale;
        const waveformEndX = waveformStartX + waveformWidth;
        const crossfadeStartX = crossfadeStartTime * timeScale;
        const crossfadeEndX = (crossfadeStartTime + crossfadeDuration) * timeScale;
        
        // 波形が存在する範囲を描画（0秒からループ位置まで）
        if (displayDuration > 0) {
            const startSample = Math.floor(displayStartTime * sampleRate);
            const endSample = Math.floor((displayStartTime + displayDuration) * sampleRate);
            const samplesPerPixel = Math.max(1, Math.floor((endSample - startSample) / waveformWidth));

            for (let channel = 0; channel < numChannels; channel++) {
                const channelData = audioBuffer.getChannelData(channel);
                const yOffset = channel * trackHeight;
                
                ctx.strokeStyle = channel === 0 ? '#667eea' : '#764ba2';
                ctx.lineWidth = 2;
                ctx.beginPath();

                let firstPoint = true;
                for (let x = 0; x < width; x++) {
                    const timeAtX = (x / timeScale);
                    const sampleIndex = Math.floor(timeAtX * sampleRate);
                    if (sampleIndex >= channelData.length || sampleIndex < 0) continue;

                    let sum = 0;
                    let count = 0;
                    const pixelStartSample = Math.floor((x / timeScale) * sampleRate);
                    for (let i = 0; i < samplesPerPixel && pixelStartSample + i < channelData.length && pixelStartSample + i >= 0; i++) {
                        sum += Math.abs(channelData[pixelStartSample + i]);
                        count++;
                    }
                    const avg = count > 0 ? sum / count : 0;

                    // クロスフェード区間でのみフェードインを適用
                    let fadedValue = avg;
                    if (x >= crossfadeStartX && x < crossfadeEndX) {
                        const fadeProgress = (x - crossfadeStartX) / (crossfadeEndX - crossfadeStartX);
                        fadedValue = avg * fadeProgress;
                    }

                    const y = yOffset + (trackHeight / 2) - (fadedValue * trackHeight / 2 * 0.9);
                    if (firstPoint) {
                        ctx.moveTo(x, y);
                        firstPoint = false;
                    } else {
                        ctx.lineTo(x, y);
                    }
                }

                ctx.stroke();
            }
        }
    }

    drawTrack2(audioBuffer, startTime, duration, totalDuration, width, height) {
        const ctx = this.ctx2;
        ctx.clearRect(0, 0, width, height);
        
        if (!audioBuffer || totalDuration <= 0) return;

        // 背景をグレーで塗りつぶす
        ctx.fillStyle = '#e0e0e0';
        ctx.fillRect(0, 0, width, height);

        const sampleRate = audioBuffer.sampleRate;
        const numChannels = audioBuffer.numberOfChannels;
        
        // ステレオの場合は2行表示
        const trackHeight = numChannels === 2 ? height / 2 : height;
        
        // 全体の時間軸に対するスケール
        const timeScale = width / totalDuration;
        const waveformStartX = startTime * timeScale;
        const waveformWidth = duration * timeScale;
        const waveformEndX = waveformStartX + waveformWidth;
        
        // 波形が存在する範囲のみ描画（ループ位置以降なので、通常は表示範囲外）
        // ただし、ループ位置が波形の終端より前の場合、表示範囲内に収まる可能性がある
        if (duration > 0 && waveformStartX < width) {
            const startSample = Math.floor(startTime * sampleRate);
            const endSample = Math.floor((startTime + duration) * sampleRate);
            const samplesPerPixel = Math.max(1, Math.floor((endSample - startSample) / waveformWidth));

            for (let channel = 0; channel < numChannels; channel++) {
                const channelData = audioBuffer.getChannelData(channel);
                const yOffset = channel * trackHeight;
                
                ctx.strokeStyle = channel === 0 ? '#667eea' : '#764ba2';
                ctx.lineWidth = 2;
                ctx.beginPath();

                let firstPoint = true;
                for (let x = Math.max(0, Math.floor(waveformStartX)); x < Math.min(width, Math.ceil(waveformEndX)); x++) {
                    const relativeX = x - waveformStartX;
                    const sampleIndex = startSample + Math.floor(relativeX * samplesPerPixel);
                    if (sampleIndex >= channelData.length || sampleIndex < 0) continue;

                    let sum = 0;
                    let count = 0;
                    for (let i = 0; i < samplesPerPixel && sampleIndex + i < channelData.length; i++) {
                        sum += Math.abs(channelData[sampleIndex + i]);
                        count++;
                    }
                    const avg = count > 0 ? sum / count : 0;

                    // フェードアウト適用（波形内での相対位置）
                    const progress = relativeX / waveformWidth;
                    const fadedValue = avg * (1 - progress);

                    const y = yOffset + (trackHeight / 2) - (fadedValue * trackHeight / 2 * 0.9);
                    if (firstPoint) {
                        ctx.moveTo(x, y);
                        firstPoint = false;
                    } else {
                        ctx.lineTo(x, y);
                    }
                }

                ctx.stroke();
            }
        }
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

