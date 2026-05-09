// Dev mode toggle — controls debug HUD, grid overlay, visible trigger zones.
// Default on while we're scaffolding; gate with ?debug=0 to hide.

let cached: boolean | null = null;

export function isDev(): boolean {
  if (cached !== null) return cached;
  const params = new URLSearchParams(window.location.search);
  const flag = params.get('debug');
  cached = flag !== '0';
  return cached;
}
