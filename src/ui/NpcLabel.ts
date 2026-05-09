import Phaser from 'phaser';

interface Followable { x: number; y: number; displayHeight: number; }

// Phaser's DOMElement uses a container positioned at the canvas parent's
// top-left, but #game flex-centers the canvas inside a 100vh box so labels
// added via scene.add.dom drift downward by exactly that vertical gap.
// We sidestep that by appending labels to <body> and updating their CSS
// each frame from the canvas's own getBoundingClientRect().
//
// World→viewport must factor in cam.zoom (CAMERA_ZOOM=2 in scenes/config.ts);
// without it, labels under-correct for camera scroll and visibly drift with
// the camera. Tick on PRE_RENDER (not POST_UPDATE) so the scroll value we
// read is the post-bounds-clamp value the renderer will actually use.
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
    const sx = rect.width / scene.scale.width;
    const sy = rect.height / scene.scale.height;
    const z = cam.zoom;
    // Sprite origin is assumed (0.5, 1) — sprite.y is the bottom edge.
    const spriteTopWorldY = sprite.y - sprite.displayHeight;
    const cssX = rect.left + (sprite.x - cam.scrollX) * z * sx;
    const cssY = rect.top + (spriteTopWorldY - cam.scrollY) * z * sy - gap;
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

  return { el, cleanup };
};
