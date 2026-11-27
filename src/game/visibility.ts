import { Segment } from "./types";

export interface Point2D {
  x: number;
  y: number;
}

export function normalizeAngle(a: number): number {
  let r = a;
  while (r > Math.PI) r -= Math.PI * 2;
  while (r < -Math.PI) r += Math.PI * 2;
  return r;
}

export function lerpAngle(current: number, target: number, t: number): number {
  const diff = normalizeAngle(target - current);
  return current + diff * t;
}

function raySegmentDistance(
  ox: number,
  oy: number,
  dx: number,
  dy: number,
  seg: Segment,
  maxDist: number
): number {
  const sx = seg.x2 - seg.x1;
  const sy = seg.y2 - seg.y1;
  const denom = dx * sy - dy * sx;
  if (Math.abs(denom) < 1e-8) return maxDist;

  const qpx = seg.x1 - ox;
  const qpy = seg.y1 - oy;
  const t = (qpx * sy - qpy * sx) / denom;
  if (t < 0 || t >= maxDist) return maxDist;

  const u = (qpx * dy - qpy * dx) / denom;
  if (u < -1e-5 || u > 1 + 1e-5) return maxDist;

  return t;
}

export function cullSegments(
  ox: number,
  oy: number,
  range: number,
  segments: Segment[]
): Segment[] {
  const minX = ox - range;
  const maxX = ox + range;
  const minY = oy - range;
  const maxY = oy + range;
  const out: Segment[] = [];
  for (let i = 0; i < segments.length; i++) {
    const s = segments[i];
    if (
      Math.max(s.x1, s.x2) < minX ||
      Math.min(s.x1, s.x2) > maxX ||
      Math.max(s.y1, s.y2) < minY ||
      Math.min(s.y1, s.y2) > maxY
    ) {
      continue;
    }
    out.push(s);
  }
  return out;
}

export function computeFlashlightConePolygon(
  ox: number,
  oy: number,
  aimAngle: number,
  halfAngle: number,
  maxRange: number,
  allSegments: Segment[]
): Point2D[] {
  const segs = cullSegments(ox, oy, maxRange + 8, allSegments);
  const relAngles: number[] = [];

  // Smooth base arc rays
  const steps = 26;
  for (let i = 0; i <= steps; i++) {
    relAngles.push(-halfAngle + (i / steps) * (halfAngle * 2));
  }

  // Exact corner rays for sharp shadow casting on walls/crates/pillars
  const eps = 0.0007;
  for (let i = 0; i < segs.length; i++) {
    const s = segs[i];
    const pts = [
      [s.x1, s.y1],
      [s.x2, s.y2],
    ];
    for (let p = 0; p < 2; p++) {
      const px = pts[p][0] - ox;
      const py = pts[p][1] - oy;
      if (px * px + py * py > (maxRange + 40) * (maxRange + 40)) continue;
      const ang = Math.atan2(py, px);
      const rel = normalizeAngle(ang - aimAngle);
      if (rel >= -halfAngle && rel <= halfAngle) {
        if (rel - eps >= -halfAngle) relAngles.push(rel - eps);
        relAngles.push(rel);
        if (rel + eps <= halfAngle) relAngles.push(rel + eps);
      }
    }
  }

  relAngles.sort((a, b) => a - b);

  const polygon: Point2D[] = [{ x: ox, y: oy }];
  let lastRel = -999;

  for (let i = 0; i < relAngles.length; i++) {
    const rel = relAngles[i];
    if (rel - lastRel < 0.00025) continue;
    lastRel = rel;

    const worldAngle = aimAngle + rel;
    const dx = Math.cos(worldAngle);
    const dy = Math.sin(worldAngle);
    let bestDist = maxRange;

    for (let j = 0; j < segs.length; j++) {
      const d = raySegmentDistance(ox, oy, dx, dy, segs[j], bestDist);
      if (d < bestDist) bestDist = d;
    }

    polygon.push({
      x: ox + dx * bestDist,
      y: oy + dy * bestDist,
    });
  }

  return polygon;
}

export function computeAmbientCirclePolygon(
  ox: number,
  oy: number,
  radius: number,
  allSegments: Segment[]
): Point2D[] {
  const segs = cullSegments(ox, oy, radius + 8, allSegments);
  const angles: number[] = [];

  const steps = 40;
  for (let i = 0; i < steps; i++) {
    angles.push(-Math.PI + (i / steps) * Math.PI * 2);
  }

  const eps = 0.001;
  for (let i = 0; i < segs.length; i++) {
    const s = segs[i];
    const d1 = Math.hypot(s.x1 - ox, s.y1 - oy);
    const d2 = Math.hypot(s.x2 - ox, s.y2 - oy);
    if (d1 <= radius + 16) {
      const a = Math.atan2(s.y1 - oy, s.x1 - ox);
      angles.push(normalizeAngle(a - eps), a, normalizeAngle(a + eps));
    }
    if (d2 <= radius + 16) {
      const a = Math.atan2(s.y2 - oy, s.x2 - ox);
      angles.push(normalizeAngle(a - eps), a, normalizeAngle(a + eps));
    }
  }

  angles.sort((a, b) => a - b);

  const polygon: Point2D[] = [];
  let last = -999;
  for (let i = 0; i < angles.length; i++) {
    const a = angles[i];
    if (a - last < 0.0015) continue;
    last = a;
    const dx = Math.cos(a);
    const dy = Math.sin(a);
    let bestDist = radius;
    for (let j = 0; j < segs.length; j++) {
      const d = raySegmentDistance(ox, oy, dx, dy, segs[j], bestDist);
      if (d < bestDist) bestDist = d;
    }
    polygon.push({
      x: ox + dx * bestDist,
      y: oy + dy * bestDist,
    });
  }
  return polygon;
}

export function hasLineOfSight(
  x1: number,
  y1: number,
  x2: number,
  y2: number,
  segments: Segment[]
): boolean {
  const dx = x2 - x1;
  const dy = y2 - y1;
  const dist = Math.hypot(dx, dy);
  if (dist < 1) return true;
  const ndx = dx / dist;
  const ndy = dy / dist;

  const minX = Math.min(x1, x2);
  const maxX = Math.max(x1, x2);
  const minY = Math.min(y1, y2);
  const maxY = Math.max(y1, y2);

  for (let i = 0; i < segments.length; i++) {
    const s = segments[i];
    if (
      Math.max(s.x1, s.x2) < minX ||
      Math.min(s.x1, s.x2) > maxX ||
      Math.max(s.y1, s.y2) < minY ||
      Math.min(s.y1, s.y2) > maxY
    ) {
      continue;
    }
    const hit = raySegmentDistance(x1, y1, ndx, ndy, s, dist - 2);
    if (hit < dist - 2) return false;
  }
  return true;
}

export function isPointVisibleToOperator(
  viewerX: number,
  viewerY: number,
  viewerAngle: number,
  halfAngle: number,
  visionRange: number,
  ambientRadius: number,
  tx: number,
  ty: number,
  segments: Segment[]
): boolean {
  const dx = tx - viewerX;
  const dy = ty - viewerY;
  const distSq = dx * dx + dy * dy;

  if (distSq <= ambientRadius * ambientRadius) {
    return hasLineOfSight(viewerX, viewerY, tx, ty, segments);
  }

  if (distSq > visionRange * visionRange) return false;

  const ang = Math.atan2(dy, dx);
  const diff = Math.abs(normalizeAngle(ang - viewerAngle));
  if (diff > halfAngle + 0.04) return false;

  return hasLineOfSight(viewerX, viewerY, tx, ty, segments);
}

export function isTargetInFireCone(
  viewerX: number,
  viewerY: number,
  viewerAngle: number,
  halfAngle: number,
  range: number,
  tx: number,
  ty: number,
  segments: Segment[]
): boolean {
  const dx = tx - viewerX;
  const dy = ty - viewerY;
  const distSq = dx * dx + dy * dy;
  if (distSq > range * range) return false;

  const ang = Math.atan2(dy, dx);
  const diff = Math.abs(normalizeAngle(ang - viewerAngle));
  if (diff > halfAngle) return false;

  return hasLineOfSight(viewerX, viewerY, tx, ty, segments);
}
