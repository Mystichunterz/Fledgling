// Microphone capture for the player half of a Gemini Live session.
//
// Live wants 16-bit signed PCM at 16 kHz. We resample with an AudioWorklet
// and downsample inline (the browser mic almost always reports at 48 kHz).
// Worklet code is embedded as a Blob so we don't need a separate asset path.

const TARGET_SAMPLE_RATE_HZ = 16_000;
const CHUNK_FRAMES = 2_048;

const WORKLET_CODE = `
class PcmCaptureProcessor extends AudioWorkletProcessor {
  constructor(opts) {
    super();
    this._target = opts.processorOptions.targetSampleRate;
    this._chunkFrames = opts.processorOptions.chunkFrames;
    this._buf = new Float32Array(0);
  }
  process(inputs) {
    const input = inputs[0];
    if (!input || input.length === 0) return true;
    const ch = input[0];
    if (!ch) return true;
    const ratio = sampleRate / this._target;
    const outLen = Math.floor(ch.length / ratio);
    const out = new Float32Array(outLen);
    for (let i = 0; i < outLen; i++) {
      out[i] = ch[Math.floor(i * ratio)];
    }
    const merged = new Float32Array(this._buf.length + out.length);
    merged.set(this._buf, 0);
    merged.set(out, this._buf.length);
    this._buf = merged;
    while (this._buf.length >= this._chunkFrames) {
      const chunk = this._buf.subarray(0, this._chunkFrames);
      this._buf = this._buf.subarray(this._chunkFrames);
      const pcm = new Int16Array(chunk.length);
      for (let i = 0; i < chunk.length; i++) {
        const s = Math.max(-1, Math.min(1, chunk[i]));
        pcm[i] = s < 0 ? s * 0x8000 : s * 0x7fff;
      }
      this.port.postMessage(pcm.buffer, [pcm.buffer]);
    }
    return true;
  }
}
registerProcessor('pcm-capture', PcmCaptureProcessor);
`;

export interface MicrophoneCapture {
  stop: () => Promise<void>;
}

export async function startMicrophoneCapture(
  onChunk: (pcm16: ArrayBuffer) => void,
): Promise<MicrophoneCapture> {
  const stream = await navigator.mediaDevices.getUserMedia({
    audio: {
      echoCancellation: true,
      noiseSuppression: true,
      autoGainControl: true,
    },
  });

  const ctx = new AudioContext();
  const blob = new Blob([WORKLET_CODE], { type: 'application/javascript' });
  const url = URL.createObjectURL(blob);
  try {
    await ctx.audioWorklet.addModule(url);
  } finally {
    URL.revokeObjectURL(url);
  }

  const source = ctx.createMediaStreamSource(stream);
  const node = new AudioWorkletNode(ctx, 'pcm-capture', {
    numberOfInputs: 1,
    numberOfOutputs: 0,
    processorOptions: {
      targetSampleRate: TARGET_SAMPLE_RATE_HZ,
      chunkFrames: CHUNK_FRAMES,
    },
  });
  node.port.onmessage = (ev) => onChunk(ev.data as ArrayBuffer);
  source.connect(node);

  return {
    stop: async () => {
      node.port.onmessage = null;
      try {
        node.disconnect();
      } catch {
        /* node may already be disconnected */
      }
      try {
        source.disconnect();
      } catch {
        /* source may already be disconnected */
      }
      stream.getTracks().forEach((t) => t.stop());
      if (ctx.state !== 'closed') await ctx.close();
    },
  };
}

export const MIC_SAMPLE_RATE_HZ = TARGET_SAMPLE_RATE_HZ;
