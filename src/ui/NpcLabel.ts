import Phaser from 'phaser';

interface Followable { x: number; y: number; }

// Phaser's DOMElement uses a container positioned at the canvas parent's
// top-left, but #game is flex-centered with min-height:100vh so the canvas
// is offset within its parent — DOMElements end up shifted by that gap.
// We sidestep that by appending labels to <body> and updating their CSS
// each frame from the canvas's own getBoundingClientRect().
export const attachLabel = (
  scene: Phaser.Scene,
  sprite: Followable,
  text: string,
  offsetY = -22,
) => {
  const el = document.createElement('div');
  el.textContent = text;
  el.style.cssText = `
    position: fixed; left: 0; top: 0;
    font-family: ui-monospace, "Cascadia Code", "Courier New", monospace;
    font-size: 11px; color: #f2e6c9;
    text-shadow: 0 1px 0 #000, 1px 0 0 #000, -1px 0 0 #000, 0 -1px 0 #000;
    white-space: nowrap; pointer-events: none; user-select: none;
    z-index: 500;
    will-change: transform;
  `;
  document.body.appendChild(el);

  const update = () => {
    const cam = scene.cameras.main;
    const canvas = scene.scale.canvas;
    const rect = canvas.getBoundingClientRect();
    const sx = rect.width / scene.scale.width;
    const sy = rect.height / scene.scale.height;
    const cssX = rect.left + (sprite.x - cam.scrollX) * sx;
    const cssY = rect.top + (sprite.y + offsetY - cam.scrollY) * sy;
    el.style.transform = `translate(${cssX}px, ${cssY}px) translateX(-50%)`;
  };

  update();
  scene.events.on(Phaser.Scenes.Events.POST_UPDATE, update);

  const cleanup = () => {
    scene.events.off(Phaser.Scenes.Events.POST_UPDATE, update);
    el.remove();
  };
  scene.events.once(Phaser.Scenes.Events.SHUTDOWN, cleanup);
  scene.events.once(Phaser.Scenes.Events.DESTROY, cleanup);

  return { el, cleanup };
};
