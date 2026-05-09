import { giveItem, removeItem } from './GameRegistry';
import type { CriticalItemId, FillerItemId, SouvenirItemId } from './items';

// Maps a dialogue node ID to (a) the item the NPC hands over and (b) the
// filler item taken in exchange. Naro's case gives bread (a souvenir) for
// fruit; the three village handovers give criticals for fillers.
const HANDOVERS: Record<string, { gives?: CriticalItemId | SouvenirItemId; takes?: FillerItemId }> = {
  NAR_GIVE_FRUIT:     { gives: 'bread',  takes: 'fruit'  },
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
