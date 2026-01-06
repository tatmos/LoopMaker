// 音声処理・生成クラス（ファイル保存専用）
class AudioProcessor {
    constructor(audioContext) {
        this.audioContext = audioContext;
        this.track1Processor = new Track1Processor(audioContext);
        this.track2Processor = new Track2Processor(audioContext);
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


    saveFile(audioBuffer, loopPosition, crossfadeDuration) {
        // トラック1を生成
        const track1Buffer = this.track1Processor.createSaveBuffer(audioBuffer, loopPosition, crossfadeDuration);
        const wav1 = this.bufferToWav(track1Buffer);
        const blob1 = new Blob([wav1], { type: 'audio/wav' });
        const url1 = URL.createObjectURL(blob1);
        const a1 = document.createElement('a');
        a1.href = url1;
        a1.download = 'loopmaker_track1.wav';
        document.body.appendChild(a1);
        a1.click();
        document.body.removeChild(a1);
        URL.revokeObjectURL(url1);

        // トラック2を生成
        const track2Buffer = this.track2Processor.createSaveBuffer(audioBuffer, loopPosition, crossfadeDuration);
        const wav2 = this.bufferToWav(track2Buffer);
        const blob2 = new Blob([wav2], { type: 'audio/wav' });
        const url2 = URL.createObjectURL(blob2);
        const a2 = document.createElement('a');
        a2.href = url2;
        a2.download = 'loopmaker_track2.wav';
        document.body.appendChild(a2);
        // 少し遅延させて2つ目のダウンロードを実行
        setTimeout(() => {
            a2.click();
            document.body.removeChild(a2);
            URL.revokeObjectURL(url2);
        }, 100);
    }
}

