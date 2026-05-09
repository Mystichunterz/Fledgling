import Phaser from 'phaser';

type Followable = Phaser.Events.EventEmitter & { x: number; y: number; displayHeight: number };

// Phaser's DOMElement uses a container positioned at the canvas parent's
// top-left, but #game flex-centers the canvas inside a 100vh box so labels
// added via scene.add.dom drift downward by exactly that vertical gap.
// We sidestep that by appending labels to <body> and updating their CSS
// each frame from the canvas's own getBoundingClientRect().
//
// Project world→canvas via cam.worldView + camera viewport offset (cam.x/y).
// worldView already factors in zoom + scroll + bounds-clamp, so it stays
// correct regardless of CAMERA_ZOOM or camera bounds. Tick on PRE_RENDER so
// the worldView we read is the post-bounds-clamp value the renderer uses.
export const attachLabel = (
  scene: Phaser.Scene,
  sprite: Followable,
  text: string,
  gap = 6,
) => {
  const el = document.createElement('div');
  el.textContent = text;
  el.style.cssText = `
    position: fixed; left: 0; top: 0;
    font-family: ui-monospace, "Cascadia Code", "Courier New", monospace;
    font-size: 24px; font-weight: 600; color: #f2e6c9;
    text-shadow: 0 1px 0 #000, 1px 0 0 #000, -1px 0 0 #000, 0 -1px 0 #000;
    white-space: nowrap; pointer-events: none; user-select: none;
    z-index: 500;
    will-change: transform;
  `;
  document.body.appendChild(el);

  const cam = scene.cameras.main;

  const update = () => {
    const canvas = scene.scale.canvas;
    const rect = canvas.getBoundingClientRect();
    const view = cam.worldView;
    if (view.width === 0 || view.height === 0) return;
    const sx = rect.width / scene.scale.width;
    const sy = rect.height / scene.scale.height;
    // Sprite origin is assumed (0.5, 1) — sprite.y is the bottom edge.
    const spriteTopWorldY = sprite.y - sprite.displayHeight;
    // World → canvas px: ((world - view.{x,y}) / view.{w,h}) * cam.{w,h},
    // offset by cam.{x,y} for non-fullscreen viewports. Then canvas → CSS
    // by the rect/scale ratio.
    const canvasX = cam.x + ((sprite.x - view.x) / view.width) * cam.width;
    const canvasY = cam.y + ((spriteTopWorldY - view.y) / view.height) * cam.height;
    const cssX = rect.left + canvasX * sx;
    const cssY = rect.top + canvasY * sy - gap;
    el.style.transform = `translate(${cssX}px, ${cssY}px) translate(-50%, -100%)`;
  };

  update();
  scene.events.on(Phaser.Scenes.Events.PRE_RENDER, update);

  const cleanup = () => {
    scene.events.off(Phaser.Scenes.Events.PRE_RENDER, update);
    el.remove();
  };
  scene.events.once(Phaser.Scenes.Events.SHUTDOWN, cleanup);
  scene.events.once(Phaser.Scenes.Events.DESTROY, cleanup);
  sprite.once(Phaser.GameObjects.Events.DESTROY, cleanup);

  return { el, cleanup };
};
