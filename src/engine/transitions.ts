import Phaser from 'phaser';

export type Edge = 'north' | 'south' | 'east' | 'west';
export type Facing = 'north' | 'south' | 'east' | 'west';

export interface SpawnPoint {
  x: number;
  y: number;
  facing: Facing;
}

export interface TransitionZone {
  edge: Edge;
  targetScene: string;
  spawnAt: string;
}

export interface SceneEnterData {
  spawnAt?: string;
  // Direct spawn coordinates. When set, override the named spawn point.
  // Used by the dev teleport-to-NPC menu.
  x?: number;
  y?: number;
}

export const FADE_MS = 200;
const TRIGGER_MARGIN = 16;

let transitioning = false;

export function checkTransitions(
  scene: Phaser.Scene,
  player: { sprite: { x: number; y: number } },
  worldWidth: number,
  worldHeight: number,
  zones: ReadonlyArray<TransitionZone>,
): void {
  if (transitioning) return;
  for (const zone of zones) {
    const { x, y } = player.sprite;
    const triggered =
      (zone.edge === 'north' && y < TRIGGER_MARGIN) ||
      (zone.edge === 'south' && y > worldHeight - TRIGGER_MARGIN) ||
      (zone.edge === 'west'  && x < TRIGGER_MARGIN) ||
      (zone.edge === 'east'  && x > worldWidth - TRIGGER_MARGIN);
    if (triggered) {
      startTransition(scene, zone.targetScene, zone.spawnAt);
      return;
    }
  }
}

function startTransition(scene: Phaser.Scene, target: string, spawnAt: string) {
  transitioning = true;
  scene.cameras.main.fadeOut(FADE_MS, 0, 0, 0);
  window.dispatchEvent(new CustomEvent('fledgling:fade-out', { detail: { ms: FADE_MS } }));
  scene.cameras.main.once('camerafadeoutcomplete', () => {
    const data: SceneEnterData = { spawnAt };
    scene.scene.start(target, data);
    // Do NOT reset transitioning here. Phaser queues the scene swap, so the
    // dying scene gets one more update frame; if we unlocked here, that frame
    // would re-trigger the same edge. The lock is released by the new scene's
    // fadeInOnEnter() instead.
  });
}

export function _debugTransitionState(): { transitioning: boolean } {
  return { transitioning };
}

export function _debugResetTransition() {
  transitioning = false;
}

export function fadeInOnEnter(scene: Phaser.Scene): void {
  // Release the transition lock now that we're safely in the new scene.
  // The previous scene is fully torn down by this point.
  transitioning = false;
  scene.cameras.main.fadeIn(FADE_MS, 0, 0, 0);
  window.dispatchEvent(new CustomEvent('fledgling:fade-in', { detail: { ms: FADE_MS } }));
}

export function resolveSpawn(
  spawnPoints: Record<string, SpawnPoint>,
  spawnAt: string | undefined,
  fallback: string,
): SpawnPoint {
  return spawnPoints[spawnAt ?? fallback] ?? spawnPoints[fallback]!;
}
