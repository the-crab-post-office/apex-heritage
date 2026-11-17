import { Group } from "three";

// Y steering at the hub, then X rotation about the steered axle. Combining
// both on an XYZ Euler object applies spin before steering and tips the axle
// once per revolution (the reported wobble).
export function wheelRig(layout, side, front) {
  const mesh = new Group(),
    spin = new Group();
  mesh.name = front ? "front-steering-hub" : "rear-hub";
  spin.name = "axle-spin";
  const radius =
    (front ? layout.front_radius : layout.rear_radius) ?? layout.radius;
  mesh.position.set(
    side * layout.half,
    radius,
    front ? layout.front : layout.rear,
  );
  mesh.add(spin);
  return { mesh, spin, front, radius, phase: 0 };
}

export function steeringAngle(
  wheel,
  layout,
  lock,
  steering,
  speed,
  classic = false,
) {
  if (!wheel.front) return 0;
  const wheelbase = layout.front - layout.rear;
  const angle =
    (steering * lock) / (1 + Math.abs(speed) * (classic ? 0.045 : 0.038));
  if (Math.abs(angle) < 0.00001) return 0;
  const radius = wheelbase / Math.tan(angle);
  return Math.atan(wheelbase / (radius - wheel.mesh.position.x));
}

export function advanceWheel(wheel, speed, dt, steering = 0) {
  wheel.phase = (wheel.phase + (speed * dt) / wheel.radius) % (Math.PI * 2);
  wheel.mesh.rotation.set(0, steering, 0);
  wheel.spin.rotation.set(wheel.phase, 0, 0);
}
