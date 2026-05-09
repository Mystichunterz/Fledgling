import Phaser from 'phaser';
import type { FillerItem, NpcId, StateFlag } from './dialogueTypes';
import type { NpcSceneKey } from './npcRoster';
import { Depths } from '../engine/depths';
import { GameRegistry, giveItem } from '../state/GameRegistry';
import { isFlagSet, setFlag } from '../state/dialogueFlags';

interface PickupDef {
  filler: FillerItem;
  scene: NpcSceneKey;
  x: number;
  y: number;
  // The NPC whose fetch_done flag also hides the tile (so once handed in,
  // it doesn't re-spawn).
  ownedBy: NpcId;
}

// Per agents/story-dialogue-trees.md §11 Q2 — tile-walk auto-pickup.
// Forest = south-west of village; Well = around Naro at (240, 380).
const PICKUP_DEFS: PickupDef[] = [
  // Forest — fruit (Naro wants) + rope (Toka wants, "Senu's stash")
  { filler: 'fruit',  scene: 'village', x: 100, y: 600, ownedBy: 'naro' },
  { filler: 'rope',   scene: 'village', x: 220, y: 540, ownedBy: 'toka' },
  // Well — water (Lemu wants) + basket (Senu wants, "Naro's weave")
  { filler: 'water',  scene: 'village', x: 300, y: 380, ownedBy: 'lemu' },
  { filler: 'basket', scene: 'village', x: 240, y: 440, ownedBy: 'senu' },
];

const PICKUP_RADIUS = 24;
const PICKUP_RADIUS_SQ = PICKUP_RADIUS * PICKUP_RADIUS;

const FILLER_COLOR: Record<FillerItem, number> = {
  fruit:  0xd84a3a,
  water:  0x4a92d8,
  rope:   0xa07a4a,
  basket: 0xc69a5a,
};

const isConsumed = (def: PickupDef): boolean => {
  const heldFlag = `holding_${def.filler}` as const satisfies StateFlag;
  const doneFlag = `fetch_done_${def.ownedBy}` as const satisfies StateFlag;
  return isFlagSet(heldFlag) || isFlagSet(doneFlag);
};

interface TileHandles {
  def: PickupDef;
  marker: Phaser.GameObjects.Rectangle;
  signPost: Phaser.GameObjects.Rectangle;
  label: Phaser.GameObjects.Text;
  consumed: boolean;
}

const buildTile = (scene: Phaser.Scene, def: PickupDef): TileHandles => {
  const depth = Depths.ACTORS + Math.round(def.y);

  const marker = scene.add.rectangle(def.x, def.y, 12, 12, FILLER_COLOR[def.filler])
    .setOrigin(0.5, 0.5)
    .setStrokeStyle(1, 0x1a1208)
    .setDepth(depth);

  const signPost = scene.add.rectangle(def.x, def.y - 14, 40, 14, 0x8a6a3a)
    .setOrigin(0.5, 1)
    .setStrokeStyle(1, 0x4a3018)
    .setDepth(depth);

  const label = scene.add.text(def.x, def.y - 21, def.filler, {
    fontFamily: 'monospace',
    fontSize: '8px',
    color: '#f2e8c8',
    resolution: 2,
  }).setOrigin(0.5, 0.5).setDepth(depth + 1);

  return { def, marker, signPost, label, consumed: false };
};

const hideTile = (tile: TileHandles) => {
  tile.consumed = true;
  tile.marker.setVisible(false);
  tile.signPost.setVisible(false);
  tile.label.setVisible(false);
};

export const spawnPickupTiles = (scene: Phaser.Scene, sceneKey: NpcSceneKey): void => {
  const tiles: TileHandles[] = [];
  for (const def of PICKUP_DEFS) {
    if (def.scene !== sceneKey) continue;
    const tile = buildTile(scene, def);
    if (isConsumed(def)) hideTile(tile);
    tiles.push(tile);
  }

  if (tiles.length === 0) return;

  const onUpdate = () => {
    for (const tile of tiles) {
      if (tile.consumed) continue;
      const dx = tile.def.x - GameRegistry.playerX;
      const dy = tile.def.y - GameRegistry.playerY;
      if (dx * dx + dy * dy > PICKUP_RADIUS_SQ) continue;
      const heldFlag = `holding_${tile.def.filler}` as const satisfies StateFlag;
      setFlag(heldFlag, true);
      giveItem(tile.def.filler);
      hideTile(tile);
      window.dispatchEvent(new CustomEvent('fledgling:pickup', {
        detail: { filler: tile.def.filler },
      }));
    }
  };

  scene.events.on(Phaser.Scenes.Events.UPDATE, onUpdate);

  const cleanup = () => {
    scene.events.off(Phaser.Scenes.Events.UPDATE, onUpdate);
    for (const tile of tiles) {
      tile.marker.destroy();
      tile.signPost.destroy();
      tile.label.destroy();
    }
  };
  scene.events.once(Phaser.Scenes.Events.SHUTDOWN, cleanup);
  scene.events.once(Phaser.Scenes.Events.DESTROY, cleanup);
};
