import { describe, it, expect } from 'vitest';
import { encodeFrame } from '../../lang/encoder';
import { EXAMPLE_LANGUAGE } from '../../lang/example-language';
import { PEMI_LINE_FRAMES, PEMI_OPTION_FRAMES } from './pemiFrames';
import { NARO_LINE_FRAMES, NARO_OPTION_FRAMES } from './naroFrames';
import { LEMU_LINE_FRAMES, LEMU_OPTION_FRAMES } from './lemuFrames';
import { TOKA_LINE_FRAMES, TOKA_OPTION_FRAMES } from './tokaFrames';
import { SENU_LINE_FRAMES, SENU_OPTION_FRAMES } from './senuFrames';
import { HALA_LINE_FRAMES, HALA_OPTION_FRAMES } from './halaFrames';
import type { FilledFrame } from '../../lang/frames';

// Smoke-test: every authored frame for every NPC must encode against tovari
// without throwing. This catches concept-id typos and role-shape mismatches at
// CI time rather than when the player opens dialogue.

// `lines` accepts either the flat shape FilledFrame[] (single-speech-segment
// nodes) or the per-segment FilledFrame[][] shape (interleaved speech). We
// flatten both into the same encode-test stream.
const collect = (
  lines: Record<string, FilledFrame[] | FilledFrame[][]>,
  options: Record<string, FilledFrame[][]>,
): { id: string; frame: FilledFrame }[] => {
  const out: { id: string; frame: FilledFrame }[] = [];
  for (const [nodeId, raw] of Object.entries(lines)) {
    if (raw.length === 0) continue;
    const isPerSegment = Array.isArray(raw[0]);
    if (isPerSegment) {
      (raw as FilledFrame[][]).forEach((seg, si) =>
        seg.forEach((f, fi) => out.push({ id: `${nodeId}.line[${si}][${fi}]`, frame: f })),
      );
    } else {
      (raw as FilledFrame[]).forEach((f, i) =>
        out.push({ id: `${nodeId}.line[${i}]`, frame: f }),
      );
    }
  }
  for (const [nodeId, optArrays] of Object.entries(options)) {
    optArrays.forEach((arr, oi) =>
      arr.forEach((f, fi) => out.push({ id: `${nodeId}.option[${oi}].frame[${fi}]`, frame: f })),
    );
  }
  return out;
};

// Per-NPC encoder smoke tests. One it() per NPC gives a clean failure label
// (e.g. "every Hala frame encodes…") so a regression in one tree doesn't
// hide failures in the others.
const NPC_TABLES = [
  { name: 'Pemi', lines: PEMI_LINE_FRAMES, options: PEMI_OPTION_FRAMES },
  { name: 'Naro', lines: NARO_LINE_FRAMES, options: NARO_OPTION_FRAMES },
  { name: 'Lemu', lines: LEMU_LINE_FRAMES, options: LEMU_OPTION_FRAMES },
  { name: 'Toka', lines: TOKA_LINE_FRAMES, options: TOKA_OPTION_FRAMES },
  { name: 'Senu', lines: SENU_LINE_FRAMES, options: SENU_OPTION_FRAMES },
  { name: 'Hala', lines: HALA_LINE_FRAMES, options: HALA_OPTION_FRAMES },
] as const;

describe('NPC frame translations', () => {
  for (const npc of NPC_TABLES) {
    it(`every ${npc.name} frame encodes against tovari`, () => {
      const cases = collect(npc.lines, npc.options);
      expect(cases.length).toBeGreaterThan(0);
      for (const { id, frame } of cases) {
        expect(() => encodeFrame(EXAMPLE_LANGUAGE, frame), id).not.toThrow();
      }
    });
  }

  // Snapshot a few surfaces — handy for eyeballing whether translations look
  // sane after lexicon or template tweaks. Not strictly an assertion, but a
  // failing line here means the encoded form changed in a way worth noticing.
  it('renders representative surfaces', () => {
    // Accept either flat or per-segment frame shapes; flatten before encode.
    const flatten = (raw: FilledFrame[] | FilledFrame[][] | undefined): FilledFrame[] => {
      if (!raw || raw.length === 0) return [];
      return Array.isArray(raw[0]) ? (raw as FilledFrame[][]).flat() : (raw as FilledFrame[]);
    };
    const enc = (raw: FilledFrame[] | FilledFrame[][] | undefined) =>
      flatten(raw).map(f => encodeFrame(EXAMPLE_LANGUAGE, f)).join(' | ');
    const samples = {
      PEM_BEACH_INTRO: enc(PEMI_LINE_FRAMES.PEM_BEACH_INTRO),
      PEM_TELL_NARO: enc(PEMI_LINE_FRAMES.PEM_TELL_NARO),
      NAR_GREETING: enc(NARO_LINE_FRAMES.NAR_GREETING),
      NAR_NEXT_HINT: enc(NARO_LINE_FRAMES.NAR_NEXT_HINT),
    };
    // Each surface should be non-empty and contain only ASCII letters / spaces /
    // separators — defends against accidental punctuation creeping into stems.
    for (const [id, surface] of Object.entries(samples)) {
      expect(surface.length, id).toBeGreaterThan(0);
      expect(surface, id).toMatch(/^[a-zA-Z |]+$/);
    }
  });
});
