// Public façade for the voice lane. Scenes import from here.

export {
  openHalaLiveSession,
  type LiveHandle,
  type OpenLiveOptions,
  type GeminiVoice,
} from './gemini-live';

export {
  mintGeminiToken,
  prewarmGeminiToken,
  isMintedTokenFresh,
  type MintedToken,
} from './gemini-token';

export {
  buildHalaSystemPrompt,
  buildHalaPromptFromWorld,
  type HalaPromptContext,
} from './hala-system-prompt';

export {
  speakLine,
  prewarmVoice,
  unlockElevenLabsAudio,
  setElevenLabsVolume,
  muteElevenLabs,
  type SpeakLineOptions,
  type TimedChar,
} from './elevenlabs-client';

export {
  mintElevenLabsToken,
  prewarmElevenLabsToken,
  isElevenLabsTokenFresh,
  type ElevenLabsToken,
} from './elevenlabs-token';

export { NPC_VOICES, voiceForSlug, type VoiceProfile } from './elevenlabs-voices';

export { StreamingAudioPlayer } from './audio-player';

export {
  startMicrophoneCapture,
  MIC_SAMPLE_RATE_HZ,
  type MicrophoneCapture,
} from './microphone';
