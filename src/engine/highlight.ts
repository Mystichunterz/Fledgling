import Phaser from 'phaser';
import { Depths } from './depths';
import { GameRegistry } from '../state/GameRegistry';

export interface HighlightOptions {
  radius?: number;       // px around target's centre that activates highlight
  color?: number;        // glow colour (warm gold default)
}

// Exported so click-to-talk shares the same range as the visual highlight.
export const INTERACTION_RADIUS = 48;
const DEFAULT_RADIUS = INTERACTION_RADIUS;
const DEFAULT_COLOR = 0xff8a30;

// Single tightly-fitted glow rectangle (additive blend) hugging the target.
// Tracks the target's bounding box so origin/scale doesn't matter, pulses
// while visible, gated on player distance, self-cleans on scene shutdown.
type HighlightTarget = Phaser.GameObjects.Image | Phaser.GameObjects.Rectangle;

export function attachProximityHighlight(
  scene: Phaser.Scene,
  target: HighlightTarget,
  options: HighlightOptions = {},
): Phaser.GameObjects.Container {
  const radius = options.radius ?? DEFAULT_RADIUS;
  const color = options.color ?? DEFAULT_COLOR;

  // Use the rendered (post-scale) size so the glow rectangle matches the
  // sprite's on-screen footprint. For Rectangles this equals width/height.
  const baseW = target.displayWidth;
  const baseH = target.displayHeight;

  const inner = scene.add.rectangle(0, 0, baseW + 3, baseH + 3, color, 0.5);
  inner.setBlendMode(Phaser.BlendModes.ADD);

  const glow = scene.add.container(target.x, target.y, [inner]);
  glow.setDepth(Depths.ACTORS - 1);
  glow.setAlpha(0).setVisible(false);

  scene.tweens.add({
    targets: glow,
    alpha: { from: 0.75, to: 1 },
    duration: 900,
    yoyo: true,
    repeat: -1,
    ease: 'Sine.InOut',
  });

  const radiusSq = radius * radius;

  const onUpdate = () => {
    if (!target.active || !glow.active) return;
    const bb = target.getBounds();
    glow.x = bb.centerX;
    glow.y = bb.centerY;
    glow.setDepth((target.depth ?? 0) - 0.1);

    const dx = bb.centerX - GameRegistry.playerX;
    const dy = bb.centerY - GameRegistry.playerY;
    glow.setVisible(dx * dx + dy * dy < radiusSq);
  };

  scene.events.on(Phaser.Scenes.Events.UPDATE, onUpdate);

  const cleanup = () => {
    scene.events.off(Phaser.Scenes.Events.UPDATE, onUpdate);
    if (glow.active) glow.destroy();
  };
  scene.events.once(Phaser.Scenes.Events.SHUTDOWN, cleanup);
  scene.events.once(Phaser.Scenes.Events.DESTROY, cleanup);

  return glow;
}
