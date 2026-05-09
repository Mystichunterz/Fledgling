import type { Vec2 } from './types';

export const CHAT_RADIUS = 64;
export const EARSHOT_RADIUS = 192;

export function distance(a: Vec2, b: Vec2): number {
  return Math.hypot(a.x - b.x, a.y - b.y);
}

export function withinChatRadius(a: Vec2, b: Vec2): boolean {
  return distance(a, b) <= CHAT_RADIUS;
}

export function earshotAlpha(player: Vec2, source: Vec2): number {
  const d = distance(player, source);
  if (d >= EARSHOT_RADIUS) return 0;
  return 1 - d / EARSHOT_RADIUS;
}
