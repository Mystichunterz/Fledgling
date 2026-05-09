// Gemini Live session — bidirectional voice for Hala's climax beat.
//
// Token mint → ai.live.connect → mic capture pipes Int16 PCM up; server
// pushes base64 PCM down which feeds StreamingAudioPlayer. The session
// closes when either side hangs up or the 30-min hard cap expires.

import { GoogleGenAI, Modality, type LiveSession } from '@google/genai';
import { mintGeminiToken } from './gemini-token';
import { StreamingAudioPlayer } from './audio-player';
import { startMicrophoneCapture, type MicrophoneCapture } from './microphone';

export interface OpenLiveOptions {
  systemInstruction: string;
  voice?: GeminiVoice;
  model?: string;
  onTranscript?: (text: string, role: 'player' | 'hala') => void;
  onError?: (err: Error) => void;
  onClose?: () => void;
}

export type GeminiVoice =
  | 'Puck'
  | 'Charon'
  | 'Kore'
  | 'Fenrir'
  | 'Aoede'
  | 'Leda';

const DEFAULT_MODEL = 'gemini-3.1-flash-live-preview';
const DEFAULT_VOICE: GeminiVoice = 'Aoede';

export interface LiveHandle {
  player: StreamingAudioPlayer;
  close: () => Promise<void>;
}

export async function openHalaLiveSession(
  opts: OpenLiveOptions,
): Promise<LiveHandle> {
  const token = await mintGeminiToken();
  const ai = new GoogleGenAI({ apiKey: token.name });

  const player = new StreamingAudioPlayer();
  await player.unlock();

  let mic: MicrophoneCapture | null = null;
  let closed = false;

  const session: LiveSession = await ai.live.connect({
    model: opts.model ?? DEFAULT_MODEL,
    config: {
      responseModalities: [Modality.AUDIO],
      systemInstruction: opts.systemInstruction,
      speechConfig: {
        voiceConfig: {
          prebuiltVoiceConfig: { voiceName: opts.voice ?? DEFAULT_VOICE },
        },
      },
    },
    callbacks: {
      onopen: () => {
        // Begin streaming the mic only once the channel is open.
        startMicrophoneCapture((pcm) => {
          if (closed) return;
          session.sendRealtimeInput({
            audio: {
              data: arrayBufferToBase64(pcm),
              mimeType: 'audio/pcm;rate=16000',
            },
          });
        })
          .then((handle) => {
            mic = handle;
            if (closed) handle.stop();
          })
          .catch((err) => opts.onError?.(asError(err)));
      },
      onmessage: (resp) => {
        const part = resp.serverContent?.modelTurn?.parts?.[0];
        if (part?.inlineData?.data) {
          player.pushBase64Pcm(part.inlineData.data);
        }
        const transcript = resp.serverContent?.outputTranscription?.text;
        if (transcript) opts.onTranscript?.(transcript, 'hala');
        const inputTranscript = resp.serverContent?.inputTranscription?.text;
        if (inputTranscript) opts.onTranscript?.(inputTranscript, 'player');
      },
      onerror: (err) => opts.onError?.(asError(err)),
      onclose: () => {
        if (!closed) {
          closed = true;
          opts.onClose?.();
        }
      },
    },
  });

  const close = async () => {
    if (closed) return;
    closed = true;
    try {
      await mic?.stop();
    } catch {
      /* mic may already be stopped */
    }
    try {
      session.close();
    } catch {
      /* session may already be closing */
    }
    player.flush();
    await player.close();
    opts.onClose?.();
  };

  return { player, close };
}

function arrayBufferToBase64(buf: ArrayBuffer): string {
  const bytes = new Uint8Array(buf);
  let binary = '';
  const CHUNK = 0x8000;
  for (let i = 0; i < bytes.length; i += CHUNK) {
    binary += String.fromCharCode.apply(
      null,
      Array.from(bytes.subarray(i, i + CHUNK)),
    );
  }
  return btoa(binary);
}

function asError(e: unknown): Error {
  return e instanceof Error ? e : new Error(String(e));
}
