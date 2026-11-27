import { ARENA_HEIGHT, ARENA_WIDTH } from "./constants";
import {
  ArenaMap,
  BarrelEntity,
  FloorZone,
  LootEntity,
  LootKind,
  MapObstacle,
  ObstacleKind,
  Segment,
} from "./types";

function mulberry32(seed: number) {
  let a = seed >>> 0;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function rectsOverlap(
  ax: number,
  ay: number,
  aw: number,
  ah: number,
  bx: number,
  by: number,
  bw: number,
  bh: number,
  pad = 0
) {
  return (
    ax - pad < bx + bw &&
    ax + aw + pad > bx &&
    ay - pad < by + bh &&
    ay + ah + pad > by
  );
}

export function isPointClearOfObstacles(
  x: number,
  y: number,
  radius: number,
  obstacles: MapObstacle[]
): boolean {
  for (let i = 0; i < obstacles.length; i++) {
    const o = obstacles[i];
    const nearestX = Math.max(o.x, Math.min(x, o.x + o.w));
    const nearestY = Math.max(o.y, Math.min(y, o.y + o.h));
    const dx = x - nearestX;
    const dy = y - nearestY;
    if (dx * dx + dy * dy < radius * radius) {
      return false;
    }
  }
  return true;
}

export function generateArenaMap(seed = 90421): ArenaMap {
  const rand = mulberry32(seed);
  const W = ARENA_WIDTH;
  const H = ARENA_HEIGHT;
  const wallT = 44;

  const obstacles: MapObstacle[] = [];
  let obsIdx = 0;

  const addObs = (
    x: number,
    y: number,
    w: number,
    h: number,
    kind: ObstacleKind,
    label?: string
  ) => {
    const blocksVision = kind !== "sandbag" && kind !== "glass_wall";
    const blocksBullets = true;
    const height =
      kind === "wall"
        ? 22
        : kind.startsWith("container")
          ? 20
          : kind === "pillar"
            ? 24
            : kind === "server_rack"
              ? 18
              : kind === "crate"
                ? 14
                : kind === "glass_wall"
                  ? 18
                  : 8;
    obstacles.push({
      id: `obs_${obsIdx++}`,
      x,
      y,
      w,
      h,
      kind,
      blocksVision,
      blocksBullets,
      height,
      label,
    });
  };

  // Perimeter bunker walls
  addObs(0, 0, W, wallT, "wall");
  addObs(0, H - wallT, W, wallT, "wall");
  addObs(0, wallT, wallT, H - wallT * 2, "wall");
  addObs(W - wallT, wallT, wallT, H - wallT * 2, "wall");

  const zones: FloorZone[] = [
    {
      name: "SERVER VAULT",
      code: "SEC-NW",
      x: 70,
      y: 70,
      w: 760,
      h: 740,
      floorColor: "#141d29",
      accentColor: "#38bdf8",
    },
    {
      name: "ARMORY BAY",
      code: "SEC-NE",
      x: 1370,
      y: 70,
      w: 760,
      h: 740,
      floorColor: "#181d26",
      accentColor: "#f59e0b",
    },
    {
      name: "HELIPAD CENTRAL",
      code: "LZ-01",
      x: 800,
      y: 800,
      w: 600,
      h: 600,
      floorColor: "#1a222f",
      accentColor: "#eab308",
    },
    {
      name: "CARGO DOCK",
      code: "SEC-SW",
      x: 70,
      y: 1390,
      w: 760,
      h: 740,
      floorColor: "#161c24",
      accentColor: "#f43f5e",
    },
    {
      name: "REACTOR MEDBAY",
      code: "SEC-SE",
      x: 1370,
      y: 1390,
      w: 760,
      h: 740,
      floorColor: "#132026",
      accentColor: "#10b981",
    },
  ];

  // --- NW: SERVER VAULT (rooms + server racks + tactical hallways) ---
  addObs(140, 140, 220, 26, "wall");
  addObs(470, 140, 320, 26, "wall");
  addObs(790, 140, 26, 260, "wall");
  addObs(790, 520, 26, 240, "wall");
  addObs(140, 740, 240, 26, "wall");
  addObs(510, 740, 280, 26, "wall");

  // Server racks inside NW vault
  addObs(240, 260, 120, 38, "server_rack", "SRV-01");
  addObs(240, 390, 120, 38, "server_rack", "SRV-02");
  addObs(240, 520, 120, 38, "server_rack", "SRV-03");
  addObs(510, 290, 40, 140, "server_rack", "SRV-04");
  addObs(630, 440, 40, 140, "server_rack", "SRV-05");
  addObs(440, 580, 72, 54, "crate");

  // --- NE: ARMORY BAY (fortified chambers + heavy pillars) ---
  addObs(1390, 140, 26, 250, "wall");
  addObs(1390, 510, 26, 250, "wall");
  addObs(1416, 140, 270, 26, "wall");
  addObs(1800, 140, 260, 26, "wall");
  addObs(1416, 740, 290, 26, "wall");
  addObs(1830, 740, 230, 26, "wall");

  // Armory interior pillars and crates
  addObs(1540, 280, 58, 58, "pillar");
  addObs(1840, 280, 58, 58, "pillar");
  addObs(1540, 520, 58, 58, "pillar");
  addObs(1840, 520, 58, 58, "pillar");
  addObs(1685, 385, 86, 62, "crate", "AMMO");
  addObs(1960, 390, 46, 110, "crate");
  addObs(1680, 220, 96, 24, "sandbag");

  // --- SW: CARGO DOCK (corrugated shipping containers) ---
  addObs(170, 1450, 210, 74, "container_red", "C-14");
  addObs(500, 1440, 76, 210, "container_blue", "C-22");
  addObs(190, 1690, 76, 220, "container_olive", "C-08");
  addObs(370, 1790, 220, 74, "container_red", "C-31");
  addObs(680, 1650, 76, 210, "container_olive", "C-19");
  addObs(340, 1615, 62, 62, "crate");
  addObs(590, 1940, 130, 26, "sandbag");

  // --- SE: REACTOR & MEDBAY (bulkheads + core chamber + sandbags) ---
  addObs(1390, 1410, 26, 230, "wall");
  addObs(1390, 1770, 26, 270, "wall");
  addObs(1416, 1410, 250, 26, "wall");
  addObs(1790, 1410, 270, 26, "wall");
  addObs(1416, 2014, 290, 26, "wall");
  addObs(1820, 2014, 240, 26, "wall");

  // Reactor center blocks & tactical cover
  addObs(1660, 1650, 116, 116, "pillar", "CORE");
  addObs(1510, 1550, 72, 48, "crate");
  addObs(1865, 1545, 92, 46, "server_rack", "MED-01");
  addObs(1520, 1850, 108, 24, "sandbag");
  addObs(1840, 1835, 76, 76, "crate");

  // --- CENTRAL HELIPAD COURTYARD (tactical corner bunkers + low cover) ---
  // Four corner L-shaped guard walls around Helipad with wide flanks
  addObs(810, 810, 140, 26, "wall");
  addObs(810, 836, 26, 114, "wall");

  addObs(1250, 810, 140, 26, "wall");
  addObs(1364, 836, 26, 114, "wall");

  addObs(810, 1364, 140, 26, "wall");
  addObs(810, 1250, 26, 114, "wall");

  addObs(1250, 1364, 140, 26, "wall");
  addObs(1364, 1250, 26, 114, "wall");

  // Tactical sandbags & supply crates inside Helipad
  addObs(960, 960, 62, 62, "crate");
  addObs(1178, 1178, 62, 62, "crate");
  addObs(1175, 955, 72, 24, "sandbag");
  addObs(955, 1220, 72, 24, "sandbag");

  // --- INTER-SECTOR CORRIDORS (N, S, E, W tactical bridges & checkpoints) ---
  // North Corridor
  addObs(1010, 220, 180, 68, "container_blue", "N-01");
  addObs(960, 470, 56, 56, "pillar");
  addObs(1184, 470, 56, 56, "pillar");
  addObs(1060, 610, 84, 24, "sandbag");

  // South Corridor
  addObs(1010, 1910, 180, 68, "container_olive", "S-04");
  addObs(960, 1660, 56, 56, "pillar");
  addObs(1184, 1660, 56, 56, "pillar");
  addObs(1060, 1545, 84, 24, "sandbag");

  // West Corridor
  addObs(230, 1010, 68, 180, "container_red", "W-02");
  addObs(470, 960, 56, 56, "pillar");
  addObs(470, 1184, 56, 56, "pillar");
  addObs(625, 1060, 24, 84, "sandbag");

  // East Corridor
  addObs(1902, 1010, 68, 180, "container_blue", "E-07");
  addObs(1674, 960, 56, 56, "pillar");
  addObs(1674, 1184, 56, 56, "pillar");
  addObs(1552, 1060, 24, 84, "sandbag");

  // Seeded minor crates for subtle match-to-match variety
  for (let i = 0; i < 8; i++) {
    for (let tries = 0; tries < 20; tries++) {
      const cw = 48 + Math.floor(rand() * 24);
      const ch = 48 + Math.floor(rand() * 24);
      const cx = 160 + Math.floor(rand() * (W - 320 - cw));
      const cy = 160 + Math.floor(rand() * (H - 320 - ch));
      // Keep helipad bullseye clear
      const distCenter = Math.hypot(cx + cw / 2 - W / 2, cy + ch / 2 - H / 2);
      if (distCenter < 140) continue;
      let clear = true;
      for (const o of obstacles) {
        if (rectsOverlap(cx, cy, cw, ch, o.x, o.y, o.w, o.h, 66)) {
          clear = false;
          break;
        }
      }
      if (clear) {
        addObs(cx, cy, cw, ch, "crate");
        break;
      }
    }
  }

  // Build vision blocking segments
  const visionSegments: Segment[] = [];
  for (const o of obstacles) {
    if (!o.blocksVision) continue;
    const x1 = o.x;
    const y1 = o.y;
    const x2 = o.x + o.w;
    const y2 = o.y + o.h;
    visionSegments.push(
      { x1, y1, x2, y2: y1 },
      { x1: x2, y1, x2, y2 },
      { x1: x2, y1: y2, x2: x1, y2 },
      { x1, y1: y2, x2: x1, y2: y1 }
    );
  }

  // Strategic spawn points spread smoothly around the compound (well separated)
  const candidateSpawns = [
    { x: 185, y: 210 },
    { x: 640, y: 220 },
    { x: 1100, y: 140 },
    { x: 1620, y: 220 },
    { x: 2010, y: 260 },
    { x: 2020, y: 1100 },
    { x: 1990, y: 1940 },
    { x: 1560, y: 1940 },
    { x: 1100, y: 2045 },
    { x: 620, y: 2030 },
    { x: 160, y: 1970 },
    { x: 150, y: 1100 },
    { x: 620, y: 650 },
    { x: 1580, y: 650 },
    { x: 620, y: 1550 },
    { x: 1580, y: 1550 },
  ];

  const spawnPoints = candidateSpawns.filter((p) =>
    isPointClearOfObstacles(p.x, p.y, 34, obstacles)
  );

  // Shuffle spawns deterministically
  for (let i = spawnPoints.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [spawnPoints[i], spawnPoints[j]] = [spawnPoints[j], spawnPoints[i]];
  }

  // Explosive red fuel barrels placed near tactical lanes
  const barrelSpots = [
    { x: 870, y: 1100 },
    { x: 1330, y: 1100 },
    { x: 1100, y: 870 },
    { x: 1100, y: 1330 },
    { x: 425, y: 420 },
    { x: 730, y: 460 },
    { x: 1470, y: 460 },
    { x: 1720, y: 600 },
    { x: 430, y: 1550 },
    { x: 720, y: 1910 },
    { x: 1470, y: 1700 },
    { x: 1790, y: 1720 },
    { x: 1100, y: 380 },
    { x: 1100, y: 1810 },
    { x: 375, y: 1100 },
    { x: 1815, y: 1100 },
  ];

  const barrels: BarrelEntity[] = [];
  barrelSpots.forEach((pt, idx) => {
    if (isPointClearOfObstacles(pt.x, pt.y, 26, obstacles)) {
      barrels.push({
        id: `barrel_${idx}`,
        x: pt.x,
        y: pt.y,
        radius: 17,
        hp: 45,
        maxHp: 45,
        alive: true,
        hitFlash: 0,
      });
    }
  });

  // Tactical loot pickups
  const loot: LootEntity[] = [];
  const guaranteedLoot: { x: number; y: number; kind: LootKind }[] = [
    // Center Helipad high-value drops
    { x: 1100, y: 1100, kind: "optics" },
    { x: 1030, y: 1100, kind: "armor" },
    { x: 1170, y: 1100, kind: "medkit" },
    // Sector key pickups
    { x: 375, y: 225, kind: "armor" },
    { x: 680, y: 660, kind: "optics" },
    { x: 1720, y: 310, kind: "armor" },
    { x: 1720, y: 500, kind: "ammo" },
    { x: 310, y: 1580, kind: "armor" },
    { x: 520, y: 1720, kind: "medkit" },
    { x: 1720, y: 1530, kind: "medkit" },
    { x: 1620, y: 1760, kind: "optics" },
  ];

  guaranteedLoot.forEach((item, idx) => {
    if (isPointClearOfObstacles(item.x, item.y, 22, obstacles)) {
      loot.push({
        id: `loot_g_${idx}`,
        x: item.x,
        y: item.y,
        kind: item.kind,
        collected: false,
        bobPhase: rand() * Math.PI * 2,
        value: item.kind === "medkit" ? 45 : item.kind === "armor" ? 50 : 1,
      });
    }
  });

  const lootPool: LootKind[] = ["armor", "medkit", "ammo", "armor", "ammo", "optics"];
  for (let i = 0; i < 24; i++) {
    for (let tries = 0; tries < 20; tries++) {
      const lx = 120 + rand() * (W - 240);
      const ly = 120 + rand() * (H - 240);
      if (!isPointClearOfObstacles(lx, ly, 26, obstacles)) continue;
      let tooClose = false;
      for (const existing of loot) {
        if (Math.hypot(existing.x - lx, existing.y - ly) < 130) {
          tooClose = true;
          break;
        }
      }
      if (!tooClose) {
        const kind = lootPool[Math.floor(rand() * lootPool.length)];
        loot.push({
          id: `loot_r_${i}`,
          x: lx,
          y: ly,
          kind,
          collected: false,
          bobPhase: rand() * Math.PI * 2,
          value: kind === "medkit" ? 42 : kind === "armor" ? 48 : 1,
        });
        break;
      }
    }
  }

  // Deterministic storm focal point slightly offset around center
  const stormTarget = {
    x: W / 2 + (rand() - 0.5) * 420,
    y: H / 2 + (rand() - 0.5) * 420,
  };

  return {
    width: W,
    height: H,
    seed,
    obstacles,
    visionSegments,
    zones,
    spawnPoints,
    barrels,
    loot,
    stormTarget,
  };
}
