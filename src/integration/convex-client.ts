// Singleton Convex browser client + lifecycle helpers for Phaser scenes.
//
// Phaser's scene `create()` should subscribe through this module and hand the
// returned disposers to `disposeOnShutdown(scene, ...)` so we don't leak
// websocket subscriptions across scene transitions.

import { ConvexClient } from 'convex/browser';
import type Phaser from 'phaser';

const CONVEX_URL = import.meta.env.VITE_CONVEX_URL as string | undefined;

let _client: ConvexClient | null = null;

export function getConvexClient(): ConvexClient {
  if (_client) return _client;
  if (!CONVEX_URL) {
    throw new Error(
      'VITE_CONVEX_URL is not set — run `npx convex dev` to populate .env.local',
    );
  }
  _client = new ConvexClient(CONVEX_URL);
  return _client;
}

export function hasConvexUrl(): boolean {
  return typeof CONVEX_URL === 'string' && CONVEX_URL.length > 0;
}

export type Disposer = () => void;

/**
 * Attach a list of unsubscribe callbacks to a scene's `shutdown` event so they
 * fire automatically when the scene transitions away. Safe against double-fire
 * (we wrap each disposer in a fired-flag closure).
 */
export function disposeOnShutdown(
  scene: Phaser.Scene,
  ...disposers: Disposer[]
): void {
  const wrapped = disposers.map((d) => {
    let fired = false;
    return () => {
      if (fired) return;
      fired = true;
      try {
        d();
      } catch (err) {
        console.warn('[convex] disposer threw:', err);
      }
    };
  });
  const runAll = () => wrapped.forEach((w) => w());
  scene.events.once(Phaser.Scenes.Events.SHUTDOWN, runAll);
  scene.events.once(Phaser.Scenes.Events.DESTROY, runAll);
}

/**
 * Coalesce a high-frequency stream of values into a single trailing emit per
 * animation frame. Use this to wrap subscribers that drive Phaser game objects
 * — the tick loop on the server can fire many mutations per second and we
 * don't want to thrash the scene graph.
 */
export function rafCoalesce<T>(cb: (value: T) => void): (value: T) => void {
  let pending: { value: T } | null = null;
  let scheduled = false;
  return (value: T) => {
    pending = { value };
    if (scheduled) return;
    scheduled = true;
    requestAnimationFrame(() => {
      scheduled = false;
      if (pending) {
        const next = pending.value;
        pending = null;
        cb(next);
      }
    });
  };
}

export function closeConvex(): void {
  if (_client) {
    _client.close();
    _client = null;
  }
}
