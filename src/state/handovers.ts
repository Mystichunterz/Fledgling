import { giveItem } from './GameRegistry';
import { ITEMS, type ItemId } from './items';

const ITEM_BY_SUFFIX = new Map<string, ItemId>(
  ITEMS.map(id => [id.toUpperCase(), id]),
);

const onEncounter = (ev: Event) => {
  const detail = (ev as CustomEvent<{ nodeId: string }>).detail;
  const nodeId = detail?.nodeId;
  if (!nodeId) return;
  const match = /_HANDOVER_([A-Z]+)$/.exec(nodeId);
  if (!match || !match[1]) return;
  const item = ITEM_BY_SUFFIX.get(match[1]);
  if (item) giveItem(item);
};

let installed = false;
export const installHandoverListener = () => {
  if (installed) return;
  installed = true;
  window.addEventListener('fledgling:encounter', onEncounter);
};
