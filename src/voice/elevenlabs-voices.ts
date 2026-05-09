// Voice ID assignments for ElevenLabs TTS.
//
// Picked from the ElevenLabs voice library to fit each NPC's age/gender/role:
//   - child voices for Pemi
//   - warm middle-aged voices for Naro/Lemu (baker/farmer)
//   - low gravelly voices for Toka/Senu (guard/forest hand)
//   - older female voice for Hala (used when Live is unavailable as fallback)

import type { NpcSlug } from '../integration/convex-types';

export interface VoiceProfile {
  voiceId: string;
  modelId: string;
  stability: number;
  similarityBoost: number;
  style: number;
  speakerBoost: boolean;
}

const TURBO = 'eleven_turbo_v2_5';
const FLASH = 'eleven_flash_v2_5';

export const NPC_VOICES: Record<NpcSlug, VoiceProfile> = {
  'npc.pemi': {
    voiceId: 'jBpfuIE2acCO8z3wKNLl',
    modelId: FLASH,
    stability: 0.42,
    similarityBoost: 0.78,
    style: 0.55,
    speakerBoost: true,
  },
  'npc.naro': {
    voiceId: 'IKne3meq5aSn9XLyUdCD',
    modelId: TURBO,
    stability: 0.55,
    similarityBoost: 0.72,
    style: 0.30,
    speakerBoost: true,
  },
  'npc.lemu': {
    voiceId: 'XB0fDUnXU5powFXDhCwa',
    modelId: TURBO,
    stability: 0.50,
    similarityBoost: 0.75,
    style: 0.35,
    speakerBoost: true,
  },
  'npc.toka': {
    voiceId: 'onwK4e9ZLuTAKqWW03F9',
    modelId: TURBO,
    stability: 0.65,
    similarityBoost: 0.70,
    style: 0.20,
    speakerBoost: true,
  },
  'npc.senu': {
    voiceId: 'pqHfZKP75CvOlQylNhV4',
    modelId: TURBO,
    stability: 0.60,
    similarityBoost: 0.72,
    style: 0.25,
    speakerBoost: true,
  },
  'npc.hala': {
    voiceId: 'Xb7hH8MSUJpSbSDYk0k2',
    modelId: TURBO,
    stability: 0.70,
    similarityBoost: 0.75,
    style: 0.40,
    speakerBoost: true,
  },
};

export function voiceForSlug(slug: NpcSlug): VoiceProfile {
  return NPC_VOICES[slug];
}
