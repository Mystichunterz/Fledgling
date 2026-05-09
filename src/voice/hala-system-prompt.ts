// System-instruction builder for Hala's climax conversation.
//
// The climax tree (`HAL_*` nodes in dialogueTrees.ts) is a fallback if the
// Live session is unavailable; with Live the player can speak freely and Hala
// answers in-character. We seed the model with the world state — items held,
// beacon status, predecessor name — so it can stay consistent with what
// happened in the rest of the run.

import type { ItemKind, WorldStateDoc } from '../integration/convex-types';

export interface HalaPromptContext {
  predecessorName: string;
  itemsCollected: ItemKind[];
  beaconLit: boolean;
  visitedHut: boolean;
  /** A small handful of recent NPC dialogue lines for atmosphere. */
  recentLines?: { speaker: string; text: string }[];
}

const PERSONA = [
  'You are Hala, the shrine-keeper at the lighthouse on the south coast of a small island village.',
  'You are quiet, observant, and slow to grief. You speak in short measured sentences.',
  'You knew the player\'s predecessor — they sat with you every dusk for nineteen years before they died.',
  'You speak to the player in the village tongue. The player is a field linguist who crash-landed two days ago and is still building their lexicon — favour short, simple sentences.',
].join(' ');

const STYLE = [
  'Stay in character as Hala. Never break the fourth wall.',
  'Keep replies under three sentences unless the player explicitly asks for more.',
  'Never restate what the player just said.',
  'You may pause briefly between sentences — write the pause as a single em-dash on its own.',
  'You never mention game mechanics, items, or flags by their internal names.',
].join(' ');

export function buildHalaSystemPrompt(ctx: HalaPromptContext): string {
  const itemsLine =
    ctx.itemsCollected.length === 0
      ? 'The player has not yet collected any of the three offerings.'
      : `The player has brought: ${ctx.itemsCollected.join(', ')}.`;
  const beaconLine = ctx.beaconLit
    ? 'The lighthouse beacon is lit — its beam is on the water now.'
    : 'The lighthouse beacon is dark.';
  const hutLine = ctx.visitedHut
    ? `The player has read ${ctx.predecessorName}'s journal in the hut.`
    : `The player has not yet visited ${ctx.predecessorName}'s hut.`;

  const recentBlock = ctx.recentLines?.length
    ? '\n\nRecent village conversation:\n' +
      ctx.recentLines
        .slice(-6)
        .map((l) => `- ${l.speaker}: ${l.text}`)
        .join('\n')
    : '';

  return [
    PERSONA,
    `The predecessor's name was ${ctx.predecessorName}.`,
    itemsLine,
    beaconLine,
    hutLine,
    STYLE,
  ].join(' ') + recentBlock;
}

export function buildHalaPromptFromWorld(
  world: WorldStateDoc | null,
  visitedHut: boolean,
  recentLines?: HalaPromptContext['recentLines'],
): string {
  return buildHalaSystemPrompt({
    predecessorName: world?.predecessorName ?? 'Maren',
    itemsCollected: world?.itemsCollected ?? [],
    beaconLit: world?.beaconLit ?? false,
    visitedHut,
    recentLines,
  });
}
