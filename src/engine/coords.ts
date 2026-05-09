export const round = (n: number): number => Math.round(n);

export const clampToRect = (
  x: number,
  y: number,
  x0: number,
  y0: number,
  x1: number,
  y1: number,
): { x: number; y: number } => ({
  x: Math.max(x0, Math.min(x1, x)),
  y: Math.max(y0, Math.min(y1, y)),
});
