import { giveItem, removeItem } from './GameRegistry';
import type { CriticalItemId, FillerItemId } from './items';

// Maps a dialogue node ID to (a) the critical item the NPC hands over, and
// (b) the filler item taken in exchange (which leaves the player's hotbar).
// Naro's GIVE_FRUIT is the side-quest case — she takes fruit but hands no
// critical item (the player just walks away with bread, narratively).
const HANDOVERS: Record<string, { gives?: CriticalItemId; takes?: FillerItemId }> = {
  NAR_GIVE_FRUIT:     {                  takes: 'fruit'  },
  LEM_HANDOVER_OIL:   { gives: 'oil',    takes: 'water'  },
  TOK_HANDOVER_FLINT: { gives: 'flint',  takes: 'rope'   },
  SEN_HANDOVER_WOOD:  { gives: 'wood',   takes: 'basket' },
};

const onEncounter = (ev: Event) => {
  const detail = (ev as CustomEvent<{ nodeId: string }>).detail;
  const nodeId = detail?.nodeId;
  if (!nodeId) return;
  const swap = HANDOVERS[nodeId];
  if (!swap) return;
  if (swap.gives) giveItem(swap.gives);
  if (swap.takes) removeItem(swap.takes);
};

let installed = false;
export const installHandoverListener = () => {
  if (installed) return;
  installed = true;
  window.addEventListener('fledgling:encounter', onEncounter);
};
