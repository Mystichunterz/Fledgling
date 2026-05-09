// Real-time ElevenLabs TTS over websocket.
//
// We use the streaming `text-to-speech/.../stream-input` socket so each NPC
// line begins playing as soon as the first audio chunk arrives — critical
// for keeping village dialogue feeling like dialogue, not a slideshow with
// a delayed audio track. Per-line latency target: <300ms first-byte.
//
// Each call to `speakLine()` opens a fresh socket, streams the text in,
// drains the audio chunks into the shared StreamingAudioPlayer, and closes.
// The player handles gapless chunk concatenation (see audio-player.ts).

import { mintElevenLabsToken } from './elevenlabs-token';
import { voiceForSlug, type VoiceProfile } from './elevenlabs-voices';
import { StreamingAudioPlayer } from './audio-player';
import type { NpcSlug } from '../integration/convex-types';

export interface SpeakLineOptions {
  /** Optional override for the per-NPC voice profile. */
  voice?: Partial<VoiceProfile>;
  /** Abort the current line. The socket will close cleanly. */
  signal?: AbortSignal;
  /** Called with phoneme alignments as they arrive (lipsync hook). */
  onAlignment?: (alignment: TimedChar[]) => void;
}

export interface TimedChar {
  char: string;
  /** Milliseconds from the start of the line. */
  startMs: number;
  durationMs: number;
}

interface ElevenLabsAudioMessage {
  audio?: string;
  isFinal?: boolean;
  normalizedAlignment?: {
    chars: string[];
    charStartTimesMs: number[];
    charDurationsMs: number[];
  };
}

const sharedPlayer = new StreamingAudioPlayer();

/** Unlock the shared audio context — call from a click handler at boot. */
export async function unlockElevenLabsAudio(): Promise<void> {
  await sharedPlayer.unlock();
}

export function setElevenLabsVolume(v: number): void {
  sharedPlayer.setVolume(v);
}

export function muteElevenLabs(muted: boolean): void {
  sharedPlayer.setMuted(muted);
}

/**
 * Speak `text` in `slug`'s voice. Resolves when the line has finished
 * synthesising (audio playback may continue briefly after).
 */
export async function speakLine(
  slug: NpcSlug,
  text: string,
  opts: SpeakLineOptions = {},
): Promise<void> {
  if (!text.trim()) return;
  const profile = { ...voiceForSlug(slug), ...opts.voice };
  const token = await mintElevenLabsToken(profile.voiceId);
  const ws = new WebSocket(token.signedUrl);

  await new Promise<void>((resolve, reject) => {
    let opened = false;

    const onAbort = () => {
      try {
        ws.close();
      } catch {
        /* socket may already be closed */
      }
      reject(new DOMException('aborted', 'AbortError'));
    };
    opts.signal?.addEventListener('abort', onAbort, { once: true });

    ws.binaryType = 'arraybuffer';

    ws.addEventListener('open', () => {
      opened = true;
      ws.send(
        JSON.stringify({
          text: ' ',
          voice_settings: {
            stability: profile.stability,
            similarity_boost: profile.similarityBoost,
            style: profile.style,
            use_speaker_boost: profile.speakerBoost,
          },
          generation_config: {
            chunk_length_schedule: [50, 90, 120, 150, 200],
          },
          xi_api_key: undefined,
        }),
      );
      ws.send(JSON.stringify({ text, try_trigger_generation: true }));
      ws.send(JSON.stringify({ text: '' }));
    });

    ws.addEventListener('message', (ev) => {
      let msg: ElevenLabsAudioMessage;
      try {
        msg = JSON.parse(ev.data as string);
      } catch {
        return;
      }
      if (msg.audio) {
        sharedPlayer.pushBase64Pcm(msg.audio);
      }
      if (msg.normalizedAlignment && opts.onAlignment) {
        const a = msg.normalizedAlignment;
        const out: TimedChar[] = a.chars.map((char, i) => ({
          char,
          startMs: a.charStartTimesMs[i] ?? 0,
          durationMs: a.charDurationsMs[i] ?? 0,
        }));
        opts.onAlignment(out);
      }
      if (msg.isFinal) {
        ws.close(1000);
      }
    });

    ws.addEventListener('close', () => {
      opts.signal?.removeEventListener('abort', onAbort);
      if (opened) resolve();
    });

    ws.addEventListener('error', () => {
      opts.signal?.removeEventListener('abort', onAbort);
      reject(new Error('elevenlabs websocket error'));
    });
  });
}

/**
 * Pre-cache a token + open-then-close a probe socket so that the first
 * actual line in the village has nothing to negotiate. Use sparingly —
 * each probe still counts against the ElevenLabs quota.
 */
export async function prewarmVoice(slug: NpcSlug): Promise<void> {
  try {
    const token = await mintElevenLabsToken(voiceForSlug(slug).voiceId);
    const ws = new WebSocket(token.signedUrl);
    await new Promise<void>((resolve) => {
      ws.addEventListener('open', () => {
        ws.close(1000);
      });
      ws.addEventListener('close', () => resolve());
      ws.addEventListener('error', () => resolve());
    });
  } catch {
    // Pre-warm failures are intentionally swallowed.
  }
}
