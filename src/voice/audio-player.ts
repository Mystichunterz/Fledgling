// Streaming audio playback for Gemini Live responses.
//
// Live sends 16-bit signed PCM at 24 kHz, mono, in base64 chunks. The browser
// can't decode that with `decodeAudioData` (which expects an encoded format),
// so we hand-convert each chunk to a Float32 AudioBuffer and queue it on the
// AudioContext at chunk-aligned start times. This gives gapless playback even
// when chunk arrival jitters.

const SAMPLE_RATE_HZ = 24_000;

export class StreamingAudioPlayer {
  private ctx: AudioContext | null = null;
  private nextStartTime = 0;
  private gainNode: GainNode | null = null;
  private muted = false;
  private volume = 1;

  ensureContext(): AudioContext {
    if (this.ctx && this.ctx.state !== 'closed') return this.ctx;
    const Ctor =
      window.AudioContext ?? (window as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!Ctor) throw new Error('AudioContext is not supported in this browser');
    const ctx = new Ctor({ sampleRate: SAMPLE_RATE_HZ });
    const gain = ctx.createGain();
    gain.gain.value = this.muted ? 0 : this.volume;
    gain.connect(ctx.destination);
    this.ctx = ctx;
    this.gainNode = gain;
    this.nextStartTime = ctx.currentTime;
    return ctx;
  }

  /**
   * Browsers gate AudioContext.start until a user gesture. Call this from a
   * click/tap handler to unlock playback before the first chunk arrives.
   */
  async unlock(): Promise<void> {
    const ctx = this.ensureContext();
    if (ctx.state === 'suspended') {
      await ctx.resume();
    }
  }

  pushBase64Pcm(base64: string): void {
    const ctx = this.ensureContext();
    const buf = decodeBase64Pcm16(base64, ctx);
    const src = ctx.createBufferSource();
    src.buffer = buf;
    src.connect(this.gainNode ?? ctx.destination);
    const startAt = Math.max(this.nextStartTime, ctx.currentTime);
    src.start(startAt);
    this.nextStartTime = startAt + buf.duration;
  }

  setVolume(v: number): void {
    this.volume = Math.max(0, Math.min(1, v));
    if (this.gainNode && !this.muted) this.gainNode.gain.value = this.volume;
  }

  setMuted(muted: boolean): void {
    this.muted = muted;
    if (this.gainNode) this.gainNode.gain.value = muted ? 0 : this.volume;
  }

  /** Drop any queued audio that hasn't started yet. Stops the current chunk. */
  flush(): void {
    if (!this.ctx) return;
    this.nextStartTime = this.ctx.currentTime;
  }

  async close(): Promise<void> {
    if (this.ctx && this.ctx.state !== 'closed') {
      await this.ctx.close();
    }
    this.ctx = null;
    this.gainNode = null;
    this.nextStartTime = 0;
  }
}

function decodeBase64Pcm16(base64: string, ctx: AudioContext): AudioBuffer {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  const view = new DataView(bytes.buffer);
  const sampleCount = bytes.byteLength / 2;
  const buf = ctx.createBuffer(1, sampleCount, SAMPLE_RATE_HZ);
  const channel = buf.getChannelData(0);
  for (let i = 0; i < sampleCount; i++) {
    channel[i] = view.getInt16(i * 2, true) / 0x8000;
  }
  return buf;
}
