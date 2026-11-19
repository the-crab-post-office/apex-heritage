export const LIGHT_INTERVAL = 0.7;
export function startSequence(remaining, duration) {
  const released = remaining <= 0;
  const elapsed = Math.max(0, duration - remaining);
  return {
    released,
    lit: released
      ? 0
      : Math.min(5, Math.floor((elapsed + 1e-7) / LIGHT_INTERVAL)),
    label: released ? "LIGHTS OUT — GO" : "WAIT FOR LIGHTS OUT",
  };
}
export function startDuration(random = Math.random()) {
  return LIGHT_INTERVAL * 5 + 1 + Math.max(0, Math.min(1, random)) * 1.5;
}
