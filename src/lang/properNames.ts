// Proper-name registry for the language layer. NPC personal names are not
// part of any conlang's vocabulary — they're referential anchors that must
// stay recognisable across every language seed (random or hand-crafted) and
// across the English gloss. The encoder + english renderer consult this
// registry to short-circuit lexicon lookup and article-prefixing.
//
// Source of truth: NPC_ROSTER. Adding an NPC automatically registers their
// name as a proper name. Concept IDs in frames use the uppercased NPC id
// (e.g. `conceptId: 'NARO'`) — that's what we match on.

import { NPC_ROSTER } from '../sim/npcRoster';

const DISPLAY_BY_CONCEPT: ReadonlyMap<string, string> = new Map(
  NPC_ROSTER.map(n => [n.id.toUpperCase(), n.displayName]),
);

export const PROPER_NAMES: ReadonlySet<string> = new Set(DISPLAY_BY_CONCEPT.keys());

export function isProperName(conceptId: string): boolean {
  return PROPER_NAMES.has(conceptId);
}

// Display form for a proper-name concept — the capitalised literal players
// see (e.g. 'NARO' → 'Naro'). Throws on unknown ids so encoder/english
// callers fail fast rather than silently fall through.
export function properNameDisplay(conceptId: string): string {
  const display = DISPLAY_BY_CONCEPT.get(conceptId);
  if (!display) throw new Error(`Not a proper name: ${conceptId}`);
  return display;
}
