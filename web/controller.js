// Standard Gamepad API mapping. No brand detection / vendor-ID assumptions.
export function steeringAxis(value, deadzone = 0.12) {
  value = Number.isFinite(value) ? Math.max(-1, Math.min(1, value)) : 0;
  const a = Math.abs(value);
  return a <= deadzone
    ? 0
    : Math.sign(value) * Math.pow((a - deadzone) / (1 - deadzone), 1.3);
}
export class Controller {
  constructor() {
    this.previous = new Set();
    this.index = null;
    this.name = "Keyboard / touch";
    this.connected = false;
    this.lost = false;
  }
  poll(pads = navigator.getGamepads?.() || []) {
    const list = Array.from(pads).filter(
      (p) => p && p.connected !== false && p.mapping === "standard",
    );
    const pad = list.find((p) => p.index === this.index) || list[0];
    this.lost = this.connected && !pad;
    this.connected = !!pad;
    if (!pad) {
      this.previous.clear();
      this.index = null;
      this.name = "Keyboard / touch";
      return { steer: 0, throttle: 0, brake: 0, pressed: new Set() };
    }
    this.index = pad.index;
    this.name = pad.id || "Standard controller";
    const held = new Set();
    pad.buttons.forEach((b, i) => {
      if (b?.pressed || b?.value > 0.5) held.add(i);
    });
    const pressed = new Set([...held].filter((i) => !this.previous.has(i)));
    this.previous = held;
    const value = (i) =>
      Math.max(0, Math.min(1, Number(pad.buttons[i]?.value) || 0));
    return {
      steer: held.has(14) ? 1 : held.has(15) ? -1 : -steeringAxis(pad.axes[0]),
      throttle: value(7),
      brake: value(6),
      pressed,
    };
  }
}
