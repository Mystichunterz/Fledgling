// Splices FilledFrame[] records into a DialogueTree at module load.
//
// Authoring keeps the line strings and option text in dialogueTrees.ts;
// frame translations live in sibling per-NPC files. This indirection lets
// us migrate trees one NPC at a time without touching the prose source —
// and keeps the encoder-facing data in one place per NPC.

import type { DialogueTree } from '../dialogueTypes';
import type { FilledFrame } from '../../lang/frames';

export interface FrameAttachments {
  // Frames for the first speech segment of `nodes[id].line`. Empty array means
  // "this line has no framable propositions" (renderer falls back to english).
  lines: Record<string, FilledFrame[]>;
  // Per-option frames. options[nodeId][i] applies to the i-th option in
  // declaration order. Length must match the node's options array (gestures
  // and unframable utterances use []).
  options: Record<string, FilledFrame[][]>;
}

export function attachFrames(tree: DialogueTree, attachments: FrameAttachments): DialogueTree {
  for (const [nodeId, frames] of Object.entries(attachments.lines)) {
    const node = tree.nodes[nodeId];
    if (!node) {
      // eslint-disable-next-line no-console
      console.warn(`[attachFrames] unknown node ${nodeId} for ${tree.npcId} line frames`);
      continue;
    }
    if (frames.length === 0) continue;
    const seg = node.line.find(s => s.kind === 'speech');
    if (!seg) {
      // eslint-disable-next-line no-console
      console.warn(`[attachFrames] node ${nodeId} has no speech segment to attach frames to`);
      continue;
    }
    if (seg.kind === 'speech') seg.frames = frames;
  }

  for (const [nodeId, optFrames] of Object.entries(attachments.options)) {
    const node = tree.nodes[nodeId];
    if (!node) {
      // eslint-disable-next-line no-console
      console.warn(`[attachFrames] unknown node ${nodeId} for ${tree.npcId} option frames`);
      continue;
    }
    if (optFrames.length !== node.options.length) {
      // eslint-disable-next-line no-console
      console.warn(
        `[attachFrames] option-frame count mismatch for ${nodeId}: ` +
        `expected ${node.options.length}, got ${optFrames.length}`,
      );
      continue;
    }
    optFrames.forEach((frames, i) => {
      if (frames.length > 0) node.options[i]!.frames = frames;
    });
  }

  return tree;
}
