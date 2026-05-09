import Phaser from 'phaser';

// Pixel-art camera follow: smoothly tracks the target in float space, but
// commits an integer scrollX/scrollY to the camera each frame. Avoids the
// per-frame "decor shimmer" that Phaser's built-in lerp introduces — that
// follow leaves cam.scroll fractional, and roundPixels rounds inconsistently
// per frame on world objects, so they wobble by 1 px while the player is
// (visually) still.
//
// Tracker state lives on the camera object so multiple scenes can share
// the helper without colliding.
interface SnappedFollowState {
  __snapTargetX?: number;
  __snapTargetY?: number;
}

export interface SnappedFollowOptions {
  lerp?: number;       // 0..1 per frame; 1 = instant
}

export function snappedFollow(
  scene: Phaser.Scene,
  target: Phaser.GameObjects.GameObject & { x: number; y: number },
  options: SnappedFollowOptions = {},
): void {
  const lerp = options.lerp ?? 0.18;

  const cam = scene.cameras.main as Phaser.Cameras.Scene2D.Camera & SnappedFollowState;
  cam.stopFollow();

  // Phaser's camera uses midPoint = scrollX + cam.width * 0.5 (full
  // framebuffer width — NOT divided by zoom; see node_modules/phaser/src/
  // cameras/2d/Camera.js preRender). To centre on `target`, offset by half
  // the camera's framebuffer dimensions, not the world-effective viewport.
  // The previous magic numbers (320/180) only worked at zoom=1 and put the
  // player at the world-view's left edge as soon as zoom went above 1.
  const halfW = cam.width / 2;
  const halfH = cam.height / 2;

  cam.__snapTargetX = target.x - halfW;
  cam.__snapTargetY = target.y - halfH;
  cam.setScroll(Math.round(cam.__snapTargetX), Math.round(cam.__snapTargetY));

  const onUpdate = () => {
    if (!target.active) return;
    const desiredX = target.x - halfW;
    const desiredY = target.y - halfH;
    cam.__snapTargetX = (cam.__snapTargetX ?? desiredX) + (desiredX - (cam.__snapTargetX ?? desiredX)) * lerp;
    cam.__snapTargetY = (cam.__snapTargetY ?? desiredY) + (desiredY - (cam.__snapTargetY ?? desiredY)) * lerp;
    cam.setScroll(Math.round(cam.__snapTargetX), Math.round(cam.__snapTargetY));
  };

  scene.events.on(Phaser.Scenes.Events.UPDATE, onUpdate);

  const cleanup = () => {
    scene.events.off(Phaser.Scenes.Events.UPDATE, onUpdate);
  };
  scene.events.once(Phaser.Scenes.Events.SHUTDOWN, cleanup);
  scene.events.once(Phaser.Scenes.Events.DESTROY, cleanup);
}
