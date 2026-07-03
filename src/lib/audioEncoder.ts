function writeString(view: DataView, offset: number, string: string): void {
  for (let i = 0; i < string.length; i++) {
    view.setUint8(offset + i, string.charCodeAt(i));
  }
}

function floatTo16BitPCM(output: DataView, offset: number, input: Float32Array): void {
  for (let i = 0; i < input.length; i++, offset += 2) {
    const s = Math.max(-1, Math.min(1, input[i]));
    output.setInt16(offset, s < 0 ? s * 0x8000 : s * 0x7fff, true);
  }
}

function encodeWAV(samples: Float32Array, sampleRate: number): ArrayBuffer {
  const buffer = new ArrayBuffer(44 + samples.length * 2);
  const view = new DataView(buffer);

  writeString(view, 0, 'RIFF');
  view.setUint32(4, 36 + samples.length * 2, true);
  writeString(view, 8, 'WAVE');
  writeString(view, 12, 'fmt ');
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true); // PCM
  view.setUint16(22, 1, true); // mono
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * 2, true); // byte rate
  view.setUint16(32, 2, true); // block align
  view.setUint16(34, 16, true); // bits per sample
  writeString(view, 36, 'data');
  view.setUint32(40, samples.length * 2, true);
  floatTo16BitPCM(view, 44, samples);

  return buffer;
}

export async function blobToMonoWav(blob: Blob, targetSampleRate = 16000): Promise<Blob> {
  const audioContext = new AudioContext();
  const arrayBuffer = await blob.arrayBuffer();
  const decoded = await audioContext.decodeAudioData(arrayBuffer);

  // Mix to mono if stereo
  const channelCount = decoded.numberOfChannels;
  const sourceLength = decoded.length;
  const sourceRate = decoded.sampleRate;

  const mono = new Float32Array(sourceLength);
  for (let i = 0; i < sourceLength; i++) {
    let sum = 0;
    for (let ch = 0; ch < channelCount; ch++) {
      sum += decoded.getChannelData(ch)[i];
    }
    mono[i] = sum / channelCount;
  }

  // Resample to target sample rate
  const targetLength = Math.round(sourceLength * (targetSampleRate / sourceRate));
  const resampled = new Float32Array(targetLength);
  for (let i = 0; i < targetLength; i++) {
    const sourceIndex = (i * sourceRate) / targetSampleRate;
    const index = Math.floor(sourceIndex);
    const frac = sourceIndex - index;
    const a = mono[index] || 0;
    const b = mono[index + 1] || a;
    resampled[i] = a + (b - a) * frac;
  }

  await audioContext.close();

  const wavBuffer = encodeWAV(resampled, targetSampleRate);
  return new Blob([wavBuffer], { type: 'audio/wav' });
}
