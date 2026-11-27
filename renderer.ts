import { OPERATORS } from "./constants";
import { getSkinById } from "./skins";
import {
  ArenaMap,
  BarrelEntity,
  BulletEntity,
  DamageIndicator,
  FloatingText,
  FloorDecal,
  LootEntity,
  MapObstacle,
  OperatorClassId,
  OperatorEntity,
  OperatorSkin,
  Particle,
  SonarRipple,
} from "./types";
import { Point2D } from "./visibility";

export interface OperatorFigureOptions {
  classId: OperatorClassId;
  skin: OperatorSkin;
  angle: number;
  stridePhase: number;
  recoilOffset: number;
  hitFlash: number;
  muzzleFlash: boolean;
  isShielded: boolean;
  isCloaked: boolean;
  isLocalPlayer: boolean;
  now: number;
  showSniperLaser?: boolean;
}

export function drawOperatorFigure(
  ctx: CanvasRenderingContext2D,
  opts: OperatorFigureOptions
) {
  const {
    classId,
    skin,
    angle,
    stridePhase,
    recoilOffset,
    hitFlash,
    muzzleFlash,
    isShielded,
    isCloaked,
    isLocalPlayer,
    now,
    showSniperLaser = true,
  } = opts;

  ctx.save();
  ctx.rotate(angle);

  // Legendary skin subtle ambient orbital aura
  if (skin.auraColor && !isCloaked) {
    const pulse = 0.22 + Math.sin(now * 0.005) * 0.1;
    const aura = ctx.createRadialGradient(0, 0, 8, 0, 0, 31);
    aura.addColorStop(0, `${skin.auraColor}55`);
    aura.addColorStop(1, "rgba(0,0,0,0)");
    ctx.fillStyle = aura;
    ctx.beginPath();
    ctx.arc(0, 0, 31, 0, Math.PI * 2);
    ctx.fill();

    // Orbiting tactical energy sparks
    ctx.fillStyle = skin.auraColor;
    for (let k = 0; k < 3; k++) {
      const oa = now * 0.0026 + (k * Math.PI * 2) / 3;
      const ox = Math.cos(oa) * 21;
      const oy = Math.sin(oa) * 21;
      ctx.globalAlpha = pulse + 0.55;
      ctx.beginPath();
      ctx.arc(ox, oy, 2.1, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
  }

  // Cloak shimmer outline for local Spectre player
  if (isCloaked && isLocalPlayer) {
    ctx.strokeStyle = skin.visorColor;
    ctx.lineWidth = 2;
    ctx.setLineDash([4, 4]);
    ctx.beginPath();
    ctx.arc(0, 0, 23, 0, Math.PI * 2);
    ctx.stroke();
    ctx.setLineDash([]);
  }

  // Sniper live laser beam sightline tinted to skin!
  if (classId === "ghost" && showSniperLaser) {
    ctx.save();
    const lg = ctx.createLinearGradient(22, 4, 340, 4);
    lg.addColorStop(0, `${skin.visorColor}cc`);
    lg.addColorStop(1, "rgba(244, 63, 94, 0)");
    ctx.strokeStyle = lg;
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(22, 4);
    ctx.lineTo(340, 4);
    ctx.stroke();
    ctx.restore();
  }

  // Animated tactical boots when moving
  const stride = Math.sin(stridePhase) * 6;
  ctx.fillStyle = "#0b1120";
  ctx.beginPath();
  ctx.roundRect(stride - 5, -12, 9, 5, 2);
  ctx.roundRect(-stride - 5, 7, 9, 5, 2);
  ctx.fill();

  // Shoulders & Armored Tactical Vest
  ctx.save();
  ctx.beginPath();
  ctx.roundRect(-11, -15, 22, 30, 9);
  ctx.fillStyle = hitFlash > 0 ? "#ffffff" : skin.vestColor;
  ctx.fill();

  // Pattern overlay clipped inside vest
  if (hitFlash <= 0 && skin.pattern !== "none") {
    ctx.save();
    ctx.clip();
    if (skin.pattern === "hazard") {
      ctx.strokeStyle = `${skin.vestTrim}aa`;
      ctx.lineWidth = 3.5;
      for (let d = -26; d < 28; d += 8) {
        ctx.beginPath();
        ctx.moveTo(d, -16);
        ctx.lineTo(d - 10, 16);
        ctx.stroke();
      }
    } else if (skin.pattern === "stripes") {
      ctx.fillStyle = `${skin.vestTrim}55`;
      ctx.fillRect(-12, -5, 24, 3);
      ctx.fillRect(-12, 2, 24, 3);
    } else if (skin.pattern === "camo") {
      ctx.fillStyle = "rgba(15, 23, 42, 0.35)";
      ctx.beginPath();
      ctx.ellipse(-4, -8, 6, 4, 0.4, 0, Math.PI * 2);
      ctx.ellipse(4, 7, 7, 4, -0.5, 0, Math.PI * 2);
      ctx.fill();
    } else if (skin.pattern === "gold_trim") {
      ctx.strokeStyle = skin.vestTrim;
      ctx.lineWidth = 1.6;
      ctx.strokeRect(-7, -11, 14, 22);
    } else if (skin.pattern === "plasma") {
      const pg = ctx.createLinearGradient(-11, -15, 11, 15);
      pg.addColorStop(0, `${skin.vestTrim}66`);
      pg.addColorStop(0.5, "rgba(0,0,0,0)");
      pg.addColorStop(1, `${skin.visorColor}66`);
      ctx.fillStyle = pg;
      ctx.fillRect(-11, -15, 22, 30);
    }
    ctx.restore();
  }

  ctx.strokeStyle = skin.vestTrim;
  ctx.lineWidth = 2.2;
  ctx.stroke();
  ctx.restore();

  // Shoulder pauldrons accent
  ctx.fillStyle = hitFlash > 0 ? "#ffffff" : skin.pauldronColor;
  ctx.fillRect(-5, -14.5, 7.5, 4.2);
  ctx.fillRect(-5, 10.3, 7.5, 4.2);

  // Articulated Weapon with Recoil Kickback & Skin Finish
  const rx = -recoilOffset;
  ctx.save();
  ctx.translate(rx, 5);
  // Support arm
  ctx.fillStyle = "#334155";
  ctx.beginPath();
  ctx.roundRect(2, -4, 15, 6, 2);
  ctx.fill();

  if (classId === "spectre") {
    ctx.fillStyle = skin.weaponBodyColor;
    ctx.fillRect(8, -2.5, 16, 5);
    ctx.fillStyle = skin.weaponAccentColor;
    ctx.fillRect(12, -2, 6, 2.2);
    ctx.fillStyle = "#475569";
    ctx.fillRect(24, -1.8, 9, 3.6);
  } else if (classId === "bastion") {
    ctx.fillStyle = skin.weaponBodyColor;
    ctx.fillRect(6, -4, 22, 7.5);
    ctx.fillStyle = skin.weaponAccentColor;
    ctx.fillRect(15, -3.5, 6, 6.5);
    ctx.fillStyle = "#64748b";
    ctx.fillRect(28, -2.8, 7, 5.2);
  } else if (classId === "vanguard") {
    ctx.fillStyle = skin.weaponBodyColor;
    ctx.fillRect(6, -3, 25, 6);
    ctx.fillStyle = skin.weaponAccentColor;
    ctx.fillRect(14, -2, 6, 4);
    ctx.fillStyle = "#94a3b8";
    ctx.fillRect(31, -1.6, 6, 3.2);
  } else {
    ctx.fillStyle = skin.weaponBodyColor;
    ctx.fillRect(4, -3, 30, 6);
    ctx.fillStyle = skin.weaponAccentColor;
    ctx.fillRect(14, -1.5, 14, 2.5);
    ctx.fillStyle = "#cbd5e1";
    ctx.fillRect(34, -1.5, 11, 3);
  }

  // Bright dynamic Muzzle Flash cone
  if (muzzleFlash) {
    const tipX = classId === "ghost" ? 46 : classId === "vanguard" ? 38 : 35;
    ctx.fillStyle = skin.tracerColor;
    ctx.beginPath();
    ctx.moveTo(tipX, 0);
    ctx.lineTo(tipX + 18, -7);
    ctx.lineTo(tipX + 13, 0);
    ctx.lineTo(tipX + 18, 7);
    ctx.closePath();
    ctx.fill();
  }
  ctx.restore();

  // Tactical Helmet
  ctx.fillStyle = hitFlash > 0 ? "#ffffff" : skin.helmetColor;
  ctx.strokeStyle = skin.pattern === "gold_trim" ? skin.vestTrim : "#475569";
  ctx.lineWidth = skin.pattern === "gold_trim" ? 2 : 1.6;
  ctx.beginPath();
  ctx.arc(0, 0, 10.5, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();

  // Subtle helmet top stripe for Epic/Legendary skins
  if (hitFlash <= 0 && (skin.rarity === "epic" || skin.rarity === "legendary")) {
    ctx.fillStyle = skin.vestTrim;
    ctx.fillRect(-8, -1.5, 11, 3);
  }

  // Glowing Night-Vision Goggles (NVG) lenses pointing toward aim!
  ctx.fillStyle = skin.visorColor;
  ctx.shadowColor = skin.visorColor;
  ctx.shadowBlur = 9;
  ctx.beginPath();
  ctx.roundRect(6.5, -5.5, 4.5, 4.2, 1.5);
  ctx.roundRect(6.5, 1.3, 4.5, 4.2, 1.5);
  ctx.fill();
  ctx.shadowBlur = 0;

  // Bastion Front Plasma Aegis Shield tinted to skin!
  if (isShielded) {
    ctx.save();
    ctx.strokeStyle = skin.visorColor;
    ctx.lineWidth = 5;
    ctx.shadowColor = skin.vestTrim;
    ctx.shadowBlur = 14;
    ctx.beginPath();
    ctx.arc(4, 0, 30, -0.95, 0.95);
    ctx.stroke();
    ctx.strokeStyle = "rgba(255, 255, 255, 0.85)";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(4, 0, 30, -0.9, 0.9);
    ctx.stroke();
    ctx.restore();
  }

  ctx.restore();
}

export interface TouchStickVisual {
  active: boolean;
  originX: number;
  originY: number;
  currentX: number;
  currentY: number;
  radius: number;
}

export interface RenderState {
  map: ArenaMap;
  operators: OperatorEntity[];
  localPlayer: OperatorEntity | null;
  cameraX: number;
  cameraY: number;
  zoom: number;
  shakeX: number;
  shakeY: number;
  flashlightPoly: Point2D[];
  ambientPoly: Point2D[];
  visibleOperatorIds: Set<string>;
  thermalActive: boolean;
  bullets: BulletEntity[];
  particles: Particle[];
  decals: FloorDecal[];
  ripples: SonarRipple[];
  floatingTexts: FloatingText[];
  damageIndicators: DamageIndicator[];
  stormX: number;
  stormY: number;
  stormRadius: number;
  hitmarkerAlpha: number;
  hitmarkerKill: boolean;
  mouseScreenX: number;
  mouseScreenY: number;
  isTouchMode: boolean;
  leftStick: TouchStickVisual;
  rightStick: TouchStickVisual;
  now: number;
  inStorm: boolean;
  hurtVignette: number;
  isDemoMode: boolean;
}

export class ArenaRenderer {
  private floorCanvas: HTMLCanvasElement | null = null;
  private floorSeed: number | null = null;
  private lightCanvas: HTMLCanvasElement | null = null;
  private dustMotes: { x: number; y: number; r: number; vx: number; vy: number }[] = [];

  constructor() {
    for (let i = 0; i < 90; i++) {
      this.dustMotes.push({
        x: Math.random() * 2200,
        y: Math.random() * 2200,
        r: 1 + Math.random() * 1.8,
        vx: (Math.random() - 0.5) * 14,
        vy: (Math.random() - 0.5) * 14,
      });
    }
  }

  private ensureFloorCache(map: ArenaMap) {
    if (this.floorCanvas && this.floorSeed === map.seed) return;
    if (typeof document === "undefined") return;

    const c = document.createElement("canvas");
    c.width = map.width;
    c.height = map.height;
    const ctx = c.getContext("2d");
    if (!ctx) return;

    // Base dark concrete foundation
    ctx.fillStyle = "#111722";
    ctx.fillRect(0, 0, map.width, map.height);

    // Subtle concrete tile slabs
    const tileSize = 110;
    for (let gx = 0; gx < map.width; gx += tileSize) {
      for (let gy = 0; gy < map.height; gy += tileSize) {
        const hash = Math.sin(gx * 12.9898 + gy * 78.233 + map.seed) * 43758.5453;
        const frac = hash - Math.floor(hash);
        const shade = Math.floor(17 + frac * 7);
        ctx.fillStyle = `rgb(${shade}, ${shade + 6}, ${shade + 14})`;
        ctx.fillRect(gx + 1, gy + 1, tileSize - 2, tileSize - 2);
      }
    }

    // Fine concrete expansion grid
    ctx.strokeStyle = "rgba(255,255,255,0.035)";
    ctx.lineWidth = 1;
    for (let x = 0; x <= map.width; x += tileSize) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, map.height);
      ctx.stroke();
    }
    for (let y = 0; y <= map.height; y += tileSize) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(map.width, y);
      ctx.stroke();
    }

    // Named sector zones with colored tactical floor plates & stencils
    for (const z of map.zones) {
      ctx.fillStyle = z.floorColor;
      ctx.fillRect(z.x, z.y, z.w, z.h);

      // Subtle sector border
      ctx.strokeStyle = `${z.accentColor}28`;
      ctx.lineWidth = 3;
      ctx.strokeRect(z.x + 2, z.y + 2, z.w - 4, z.h - 4);

      // Diagonal corner brackets
      ctx.strokeStyle = `${z.accentColor}66`;
      ctx.lineWidth = 3;
      const b = 26;
      const corners = [
        [z.x + 12, z.y + 12, 1, 1],
        [z.x + z.w - 12, z.y + 12, -1, 1],
        [z.x + 12, z.y + z.h - 12, 1, -1],
        [z.x + z.w - 12, z.y + z.h - 12, -1, -1],
      ];
      for (const [cx, cy, sx, sy] of corners) {
        ctx.beginPath();
        ctx.moveTo(cx + sx * b, cy);
        ctx.lineTo(cx, cy);
        ctx.lineTo(cx, cy + sy * b);
        ctx.stroke();
      }

      // Stenciled sector code on floor
      ctx.save();
      ctx.fillStyle = `${z.accentColor}22`;
      ctx.font = "900 44px monospace";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText(z.code, z.x + z.w / 2, z.y + z.h / 2 - 16);
      ctx.font = "700 18px monospace";
      ctx.fillStyle = "rgba(226, 232, 240, 0.14)";
      ctx.fillText(z.name, z.x + z.w / 2, z.y + z.h / 2 + 22);
      ctx.restore();
    }

    // Main cross-roads / asphalt lanes connecting sectors
    ctx.fillStyle = "rgba(12, 17, 26, 0.55)";
    ctx.fillRect(960, 44, 280, map.height - 88);
    ctx.fillRect(44, 960, map.width - 88, 280);

    // Dashed tactical road centerlines
    ctx.save();
    ctx.strokeStyle = "rgba(234, 179, 8, 0.22)";
    ctx.lineWidth = 3;
    ctx.setLineDash([22, 18]);
    ctx.beginPath();
    ctx.moveTo(1100, 60);
    ctx.lineTo(1100, 810);
    ctx.moveTo(1100, 1390);
    ctx.lineTo(1100, map.height - 60);
    ctx.moveTo(60, 1100);
    ctx.lineTo(810, 1100);
    ctx.moveTo(1390, 1100);
    ctx.lineTo(map.width - 60, 1100);
    ctx.stroke();
    ctx.restore();

    // Central HELIPAD detailed tarmac art
    const cx = map.width / 2;
    const cy = map.height / 2;
    ctx.save();
    ctx.fillStyle = "#18202c";
    ctx.beginPath();
    ctx.arc(cx, cy, 225, 0, Math.PI * 2);
    ctx.fill();

    // Caution outer ring
    ctx.strokeStyle = "rgba(234, 179, 8, 0.45)";
    ctx.lineWidth = 6;
    ctx.setLineDash([28, 14]);
    ctx.beginPath();
    ctx.arc(cx, cy, 204, 0, Math.PI * 2);
    ctx.stroke();
    ctx.setLineDash([]);

    ctx.strokeStyle = "rgba(234, 179, 8, 0.65)";
    ctx.lineWidth = 8;
    ctx.beginPath();
    ctx.arc(cx, cy, 134, 0, Math.PI * 2);
    ctx.stroke();

    // Giant tactical H stencil
    ctx.fillStyle = "rgba(234, 179, 8, 0.35)";
    ctx.fillRect(cx - 56, cy - 68, 22, 136);
    ctx.fillRect(cx + 34, cy - 68, 22, 136);
    ctx.fillRect(cx - 56, cy - 11, 112, 22);

    // Landing corner marker lights
    const padLights = [
      [cx - 190, cy - 190],
      [cx + 190, cy - 190],
      [cx - 190, cy + 190],
      [cx + 190, cy + 190],
    ];
    for (const [lx, ly] of padLights) {
      ctx.fillStyle = "#eab308";
      ctx.beginPath();
      ctx.arc(lx, ly, 6, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = "rgba(234, 179, 8, 0.25)";
      ctx.beginPath();
      ctx.arc(lx, ly, 16, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();

    // Industrial drainage grates & floor vents
    const grates = [
      [430, 340],
      [690, 310],
      [1680, 290],
      [1940, 620],
      [350, 1730],
      [660, 1520],
      [1610, 1500],
      [1920, 1740],
      [920, 690],
      [1280, 1510],
    ];
    for (const [gx, gy] of grates) {
      ctx.fillStyle = "#0b1018";
      ctx.fillRect(gx - 22, gy - 14, 44, 28);
      ctx.strokeStyle = "#2b374a";
      ctx.lineWidth = 2;
      ctx.strokeRect(gx - 22, gy - 14, 44, 28);
      for (let sx = gx - 16; sx <= gx + 16; sx += 8) {
        ctx.beginPath();
        ctx.moveTo(sx, gy - 12);
        ctx.lineTo(sx, gy + 12);
        ctx.stroke();
      }
    }

    // Subtle weathered concrete cracks & stains
    ctx.strokeStyle = "rgba(5, 8, 14, 0.45)";
    ctx.lineWidth = 1.5;
    for (let i = 0; i < 42; i++) {
      const rx = ((i * 577 + map.seed) % (map.width - 200)) + 100;
      const ry = ((i * 881 + map.seed) % (map.height - 200)) + 100;
      ctx.beginPath();
      ctx.moveTo(rx, ry);
      ctx.lineTo(rx + ((i % 2 === 0 ? 1 : -1) * 26), ry + 14);
      ctx.lineTo(rx + ((i % 3 === 0 ? -1 : 1) * 44), ry + 32);
      ctx.stroke();
    }

    // Subtle atmospheric overhead industrial light pools in key rooms
    const lightPools: [number, number, number, string][] = [
      [1100, 1100, 290, "rgba(234, 179, 8, 0.08)"],
      [420, 420, 260, "rgba(56, 189, 248, 0.09)"],
      [1720, 420, 260, "rgba(245, 158, 11, 0.08)"],
      [440, 1720, 260, "rgba(244, 63, 94, 0.07)"],
      [1720, 1710, 280, "rgba(16, 185, 129, 0.11)"],
    ];
    for (const [lx, ly, lr, col] of lightPools) {
      const lg = ctx.createRadialGradient(lx, ly, 12, lx, ly, lr);
      lg.addColorStop(0, col);
      lg.addColorStop(1, "rgba(0,0,0,0)");
      ctx.fillStyle = lg;
      ctx.beginPath();
      ctx.arc(lx, ly, lr, 0, Math.PI * 2);
      ctx.fill();
    }

    // Caution stripes near main doorways
    const drawHazardStrip = (x: number, y: number, w: number, h: number) => {
      ctx.save();
      ctx.beginPath();
      ctx.rect(x, y, w, h);
      ctx.clip();
      ctx.fillStyle = "rgba(234, 179, 8, 0.28)";
      ctx.fillRect(x, y, w, h);
      ctx.strokeStyle = "rgba(10, 14, 22, 0.72)";
      ctx.lineWidth = 7;
      for (let d = -h; d < w + h; d += 18) {
        ctx.beginPath();
        ctx.moveTo(x + d, y);
        ctx.lineTo(x + d - h, y + h);
        ctx.stroke();
      }
      ctx.restore();
    };
    drawHazardStrip(785, 405, 36, 110);
    drawHazardStrip(1385, 395, 36, 110);
    drawHazardStrip(380, 735, 125, 34);
    drawHazardStrip(1690, 1405, 96, 34);

    this.floorCanvas = c;
    this.floorSeed = map.seed;
  }

  private ensureLightCanvas(w: number, h: number): HTMLCanvasElement | null {
    if (typeof document === "undefined") return null;
    if (!this.lightCanvas) {
      this.lightCanvas = document.createElement("canvas");
    }
    // Render darkness overlay at crisp half-to-full scale (capped for mobile 60fps)
    const scale = w > 1100 ? 0.65 : 0.75;
    const lw = Math.max(1, Math.floor(w * scale));
    const lh = Math.max(1, Math.floor(h * scale));
    if (this.lightCanvas.width !== lw || this.lightCanvas.height !== lh) {
      this.lightCanvas.width = lw;
      this.lightCanvas.height = lh;
    }
    return this.lightCanvas;
  }

  public render(
    ctx: CanvasRenderingContext2D,
    viewportW: number,
    viewportH: number,
    state: RenderState
  ) {
    this.ensureFloorCache(state.map);

    ctx.save();
    ctx.fillStyle = "#06090f";
    ctx.fillRect(0, 0, viewportW, viewportH);

    // Camera transform
    ctx.save();
    ctx.translate(viewportW / 2 + state.shakeX, viewportH / 2 + state.shakeY);
    ctx.scale(state.zoom, state.zoom);
    ctx.translate(-state.cameraX, -state.cameraY);

    // 1. Static terrain floor (single drawImage slice for speed!)
    if (this.floorCanvas) {
      const halfW = viewportW / (2 * state.zoom) + 80;
      const halfH = viewportH / (2 * state.zoom) + 80;
      const sx = Math.max(0, Math.floor(state.cameraX - halfW));
      const sy = Math.max(0, Math.floor(state.cameraY - halfH));
      const sw = Math.min(state.map.width - sx, Math.ceil(halfW * 2));
      const sh = Math.min(state.map.height - sy, Math.ceil(halfH * 2));
      if (sw > 0 && sh > 0) {
        ctx.drawImage(this.floorCanvas, sx, sy, sw, sh, sx, sy, sw, sh);
      }
    }

    // 2. Floor decals (scorch marks, brass shells, footprints, elimination rings)
    this.drawDecals(ctx, state.decals);

    // 3. Loot pickups
    this.drawLoot(ctx, state.map.loot, state.now);

    // 4. Explosive red fuel barrels
    this.drawBarrels(ctx, state.map.barrels, state.now);

    // 5. Detailed 2.5D Obstacles (walls, shipping containers, servers, crates, sandbags)
    this.drawObstacles(ctx, state.map.obstacles, state.now, state.cameraX, state.cameraY, viewportW / state.zoom, viewportH / state.zoom);

    // 6. Visible Operators (enemies outside FOV are hidden!)
    for (const op of state.operators) {
      if (!op.alive) continue;
      if (op.isLocalPlayer || state.isDemoMode || state.visibleOperatorIds.has(op.id)) {
        this.drawOperator(ctx, op, state.now, state.localPlayer?.targetLockedId === op.id);
      }
    }

    // 7. Bullets & bright glowing tracers
    this.drawBullets(ctx, state.bullets);

    // 8. World particles (muzzle sparks, smoke, armor shards, fireballs)
    this.drawParticles(ctx, state.particles);

    // 9. Atmospheric volumetric flashlight tint + dust motes inside beam
    if (state.localPlayer && state.localPlayer.alive && state.flashlightPoly.length > 2) {
      this.drawFlashlightBeamGlow(ctx, state);
    }

    ctx.restore(); // exit world space for darkness compositing

    // 10. Dynamic Fog-of-War & Raycasted Flashlight Darkness Pass
    if (state.localPlayer && state.localPlayer.alive) {
      this.drawLightingPass(ctx, viewportW, viewportH, state);
    }

    // 11. Post-darkness tactical world overlay (Thermal Scan, Storm Wall, Floating Damage)
    ctx.save();
    ctx.translate(viewportW / 2 + state.shakeX, viewportH / 2 + state.shakeY);
    ctx.scale(state.zoom, state.zoom);
    ctx.translate(-state.cameraX, -state.cameraY);

    // Thermal Pulse revealed silhouettes (Vanguard ability!)
    if (state.thermalActive && state.localPlayer) {
      for (const op of state.operators) {
        if (!op.alive || op.isLocalPlayer) continue;
        const dist = Math.hypot(op.x - state.localPlayer.x, op.y - state.localPlayer.y);
        if (dist < 760) {
          this.drawThermalSilhouette(ctx, op, state.now);
        }
      }
    }

    // Auto-lock targeting bracket (crisp over lighting!)
    if (state.localPlayer && state.localPlayer.targetLockedId) {
      const locked = state.operators.find(
        (o) => o.id === state.localPlayer?.targetLockedId && o.alive
      );
      if (locked) {
        this.drawTargetLockBracket(ctx, locked, state.now);
      }
    }

    // Directional incoming damage arcs around local player
    if (state.localPlayer && state.localPlayer.alive && state.damageIndicators.length > 0) {
      this.drawDamageIndicators(ctx, state.localPlayer, state.damageIndicators);
    }

    // Shrinking Red Hazard Storm
    this.drawStormZone(ctx, state);

    // Floating Damage & Bonus Numbers
    this.drawFloatingTexts(ctx, state.floatingTexts);

    ctx.restore();

    // 12. Screen-space feedback (damage vignette, storm warning pulse, hitmarker, crosshair, minimap, touch sticks)
    this.drawScreenOverlays(ctx, viewportW, viewportH, state);

    if (!state.isDemoMode) {
      this.drawMinimap(ctx, viewportW, viewportH, state);
    }

    if (state.isTouchMode && !state.isDemoMode) {
      this.drawTouchSticks(ctx, state.leftStick, state.rightStick);
    } else if (!state.isDemoMode) {
      this.drawCrosshair(ctx, state);
    }

    ctx.restore();
  }

  private drawDecals(ctx: CanvasRenderingContext2D, decals: FloorDecal[]) {
    for (let i = 0; i < decals.length; i++) {
      const d = decals[i];
      ctx.save();
      ctx.globalAlpha = d.alpha;
      ctx.translate(d.x, d.y);
      ctx.rotate(d.angle);

      if (d.kind === "scorch") {
        const g = ctx.createRadialGradient(0, 0, 4, 0, 0, d.size);
        g.addColorStop(0, "rgba(8, 8, 10, 0.92)");
        g.addColorStop(0.55, "rgba(24, 16, 12, 0.65)");
        g.addColorStop(1, "rgba(0, 0, 0, 0)");
        ctx.fillStyle = g;
        ctx.beginPath();
        ctx.arc(0, 0, d.size, 0, Math.PI * 2);
        ctx.fill();
      } else if (d.kind === "shell") {
        ctx.fillStyle = "#eab308";
        ctx.fillRect(-3, -1.2, 6, 2.4);
      } else if (d.kind === "footprint") {
        ctx.fillStyle = "rgba(0, 0, 0, 0.35)";
        ctx.beginPath();
        ctx.ellipse(0, 0, 5, 2.6, 0, 0, Math.PI * 2);
        ctx.fill();
      } else if (d.kind === "elimination") {
        ctx.strokeStyle = d.color;
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(0, 0, d.size, 0, Math.PI * 2);
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(-7, -7);
        ctx.lineTo(7, 7);
        ctx.moveTo(7, -7);
        ctx.lineTo(-7, 7);
        ctx.stroke();
      }
      ctx.restore();
    }
  }

  private drawLoot(ctx: CanvasRenderingContext2D, loot: LootEntity[], now: number) {
    for (let i = 0; i < loot.length; i++) {
      const item = loot[i];
      if (item.collected) continue;

      const bob = Math.sin(now * 0.0045 + item.bobPhase) * 2.5;
      const pulse = 0.55 + Math.sin(now * 0.006 + item.bobPhase) * 0.35;
      const color =
        item.kind === "medkit"
          ? "#10b981"
          : item.kind === "armor"
            ? "#38bdf8"
            : item.kind === "optics"
              ? "#c084fc"
              : "#f59e0b";

      ctx.save();
      ctx.translate(item.x, item.y);

      // Soft ambient floor glow
      const g = ctx.createRadialGradient(0, 0, 2, 0, 0, 28);
      g.addColorStop(0, `${color}55`);
      g.addColorStop(1, "rgba(0,0,0,0)");
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.arc(0, 0, 28, 0, Math.PI * 2);
      ctx.fill();

      // Rotating holo ring
      ctx.save();
      ctx.rotate(now * 0.002 + item.bobPhase);
      ctx.strokeStyle = color;
      ctx.globalAlpha = pulse;
      ctx.lineWidth = 1.8;
      ctx.setLineDash([8, 6]);
      ctx.beginPath();
      ctx.arc(0, 0, 17, 0, Math.PI * 2);
      ctx.stroke();
      ctx.restore();

      // Crate badge body
      ctx.translate(0, bob);
      ctx.fillStyle = "#0f172a";
      ctx.strokeStyle = color;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.roundRect(-11, -11, 22, 22, 5);
      ctx.fill();
      ctx.stroke();

      // Crisp symbol inside
      ctx.fillStyle = color;
      if (item.kind === "medkit") {
        ctx.fillRect(-6, -2, 12, 4);
        ctx.fillRect(-2, -6, 4, 12);
      } else if (item.kind === "armor") {
        ctx.beginPath();
        ctx.moveTo(0, -6.5);
        ctx.lineTo(6, -3.5);
        ctx.lineTo(5, 3);
        ctx.lineTo(0, 7);
        ctx.lineTo(-5, 3);
        ctx.lineTo(-6, -3.5);
        ctx.closePath();
        ctx.fill();
      } else if (item.kind === "optics") {
        ctx.beginPath();
        ctx.arc(0, 0, 5.5, 0, Math.PI * 2);
        ctx.stroke();
        ctx.beginPath();
        ctx.arc(0, 0, 2.2, 0, Math.PI * 2);
        ctx.fill();
      } else {
        // Ammo shells
        ctx.fillRect(-5, -5, 2.5, 10);
        ctx.fillRect(-1.2, -5, 2.5, 10);
        ctx.fillRect(2.6, -5, 2.5, 10);
      }

      ctx.restore();
    }
  }

  private drawBarrels(ctx: CanvasRenderingContext2D, barrels: BarrelEntity[], now: number) {
    for (let i = 0; i < barrels.length; i++) {
      const b = barrels[i];
      if (!b.alive) continue;

      ctx.save();
      ctx.translate(b.x, b.y);

      // Ground drop shadow
      ctx.fillStyle = "rgba(0, 0, 0, 0.5)";
      ctx.beginPath();
      ctx.ellipse(4, 6, b.radius + 1, b.radius, 0, 0, Math.PI * 2);
      ctx.fill();

      // Crimson steel barrel body
      const grad = ctx.createRadialGradient(-5, -5, 2, 0, 0, b.radius);
      grad.addColorStop(0, b.hitFlash > 0 ? "#ffffff" : "#ef4444");
      grad.addColorStop(0.7, "#b91c1c");
      grad.addColorStop(1, "#7f1d1d");
      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.arc(0, 0, b.radius, 0, Math.PI * 2);
      ctx.fill();

      // Top steel rim
      ctx.strokeStyle = "#fca5a5";
      ctx.lineWidth = 1.6;
      ctx.beginPath();
      ctx.arc(0, 0, b.radius - 2.5, 0, Math.PI * 2);
      ctx.stroke();

      // Caution yellow hazard triangle
      ctx.fillStyle = "#facc15";
      ctx.beginPath();
      ctx.moveTo(0, -7);
      ctx.lineTo(6.5, 5);
      ctx.lineTo(-6.5, 5);
      ctx.closePath();
      ctx.fill();

      ctx.fillStyle = "#0f172a";
      ctx.fillRect(-1, -3, 2, 4.5);
      ctx.fillRect(-1, 2.4, 2, 1.5);

      // Damaged blinking danger pulse
      if (b.hp < b.maxHp) {
        const blink = 0.4 + Math.sin(now * 0.025) * 0.4;
        ctx.strokeStyle = `rgba(251, 146, 60, ${blink})`;
        ctx.lineWidth = 2.5;
        ctx.beginPath();
        ctx.arc(0, 0, b.radius + 5, 0, Math.PI * 2);
        ctx.stroke();
      }

      ctx.restore();
    }
  }

  private drawObstacles(
    ctx: CanvasRenderingContext2D,
    obstacles: MapObstacle[],
    now: number,
    camX: number,
    camY: number,
    viewW: number,
    viewH: number
  ) {
    const minX = camX - viewW / 2 - 120;
    const maxX = camX + viewW / 2 + 120;
    const minY = camY - viewH / 2 - 120;
    const maxY = camY + viewH / 2 + 120;

    for (let i = 0; i < obstacles.length; i++) {
      const o = obstacles[i];
      if (
        o.x + o.w < minX ||
        o.x > maxX ||
        o.y + o.h < minY ||
        o.y > maxY
      ) {
        continue;
      }

      // Ground contact shadow
      ctx.fillStyle = "rgba(0, 0, 0, 0.48)";
      ctx.fillRect(o.x + 8, o.y + 10, o.w, o.h);

      if (o.kind === "wall") {
        // Vertical 2.5D front bevel
        ctx.fillStyle = "#1e293b";
        ctx.fillRect(o.x, o.y, o.w, o.h);
        // Top armored roof cap
        ctx.fillStyle = "#2b374b";
        ctx.fillRect(o.x + 2, o.y + 2, o.w - 4, Math.max(4, o.h - 7));
        // Specular rim highlight
        ctx.strokeStyle = "rgba(148, 163, 184, 0.28)";
        ctx.lineWidth = 1.5;
        ctx.strokeRect(o.x + 1, o.y + 1, o.w - 2, o.h - 2);
      } else if (o.kind === "pillar") {
        ctx.fillStyle = "#243044";
        ctx.fillRect(o.x, o.y, o.w, o.h);
        ctx.fillStyle = "#334155";
        ctx.fillRect(o.x + 4, o.y + 4, o.w - 8, o.h - 8);
        // Yellow tactical trim corners
        ctx.strokeStyle = "rgba(234, 179, 8, 0.55)";
        ctx.lineWidth = 2;
        ctx.strokeRect(o.x + 2, o.y + 2, o.w - 4, o.h - 4);
        if (o.label) {
          ctx.fillStyle = "rgba(16, 185, 129, 0.8)";
          ctx.font = "700 13px monospace";
          ctx.textAlign = "center";
          ctx.textBaseline = "middle";
          ctx.fillText(o.label, o.x + o.w / 2, o.y + o.h / 2);
          // Reactor core glow pulse
          const glow = 0.25 + Math.sin(now * 0.005) * 0.15;
          ctx.strokeStyle = `rgba(16, 185, 129, ${glow})`;
          ctx.lineWidth = 3;
          ctx.beginPath();
          ctx.arc(o.x + o.w / 2, o.y + o.h / 2, o.w * 0.34, 0, Math.PI * 2);
          ctx.stroke();
        }
      } else if (o.kind.startsWith("container")) {
        const base =
          o.kind === "container_red"
            ? "#7f272e"
            : o.kind === "container_blue"
              ? "#1f3f63"
              : "#364b35";
        const rib =
          o.kind === "container_red"
            ? "#99343c"
            : o.kind === "container_blue"
              ? "#2c5482"
              : "#476145";
        const dark =
          o.kind === "container_red"
            ? "#571a20"
            : o.kind === "container_blue"
              ? "#132942"
              : "#243323";

        ctx.fillStyle = base;
        ctx.fillRect(o.x, o.y, o.w, o.h);

        // Corrugated steel roof ribs
        const horizontal = o.w > o.h;
        ctx.fillStyle = rib;
        if (horizontal) {
          for (let rx = o.x + 12; rx < o.x + o.w - 10; rx += 14) {
            ctx.fillRect(rx, o.y + 5, 6, o.h - 10);
          }
        } else {
          for (let ry = o.y + 12; ry < o.y + o.h - 10; ry += 14) {
            ctx.fillRect(o.x + 5, ry, o.w - 10, 6);
          }
        }

        // Reinforced steel frame + corner blocks
        ctx.strokeStyle = dark;
        ctx.lineWidth = 3;
        ctx.strokeRect(o.x + 1.5, o.y + 1.5, o.w - 3, o.h - 3);
        ctx.fillStyle = "#94a3b8";
        ctx.fillRect(o.x + 2, o.y + 2, 7, 7);
        ctx.fillRect(o.x + o.w - 9, o.y + 2, 7, 7);
        ctx.fillRect(o.x + 2, o.y + o.h - 9, 7, 7);
        ctx.fillRect(o.x + o.w - 9, o.y + o.h - 9, 7, 7);

        if (o.label) {
          ctx.fillStyle = "rgba(255,255,255,0.42)";
          ctx.font = "800 12px monospace";
          ctx.textAlign = "center";
          ctx.textBaseline = "middle";
          ctx.fillText(o.label, o.x + o.w / 2, o.y + o.h / 2);
        }
      } else if (o.kind === "server_rack") {
        ctx.fillStyle = "#0f172a";
        ctx.fillRect(o.x, o.y, o.w, o.h);
        ctx.strokeStyle = "#334155";
        ctx.lineWidth = 2;
        ctx.strokeRect(o.x + 1, o.y + 1, o.w - 2, o.h - 2);

        // Animated blinking tactical server LEDs
        const horizontal = o.w >= o.h;
        const count = horizontal ? Math.floor(o.w / 14) : Math.floor(o.h / 14);
        for (let k = 0; k < count; k++) {
          const blink = Math.sin(now * 0.008 + k * 2.1 + o.x) > 0.1;
          const ledColor =
            k % 4 === 0
              ? "#f59e0b"
              : o.label?.startsWith("MED")
                ? "#10b981"
                : "#38bdf8";
          ctx.fillStyle = blink ? ledColor : "#1e293b";
          if (horizontal) {
            ctx.fillRect(o.x + 8 + k * 14, o.y + 7, 5, 4);
            ctx.fillStyle = "#1e293b";
            ctx.fillRect(o.x + 8 + k * 14, o.y + 15, 7, o.h - 22);
          } else {
            ctx.fillRect(o.x + 7, o.y + 8 + k * 14, 4, 5);
            ctx.fillStyle = "#1e293b";
            ctx.fillRect(o.x + 15, o.y + 8 + k * 14, o.w - 22, 7);
          }
        }
      } else if (o.kind === "crate") {
        ctx.fillStyle = "#4b3e2e";
        ctx.fillRect(o.x, o.y, o.w, o.h);
        ctx.fillStyle = "#5f4f3b";
        ctx.fillRect(o.x + 4, o.y + 4, o.w - 8, o.h - 8);
        ctx.strokeStyle = "#2b231a";
        ctx.lineWidth = 2;
        ctx.strokeRect(o.x + 1, o.y + 1, o.w - 2, o.h - 2);
        // Diagonal tactical brace
        ctx.beginPath();
        ctx.moveTo(o.x + 5, o.y + 5);
        ctx.lineTo(o.x + o.w - 5, o.y + o.h - 5);
        ctx.stroke();
        // Metallic corner brackets
        ctx.fillStyle = "#94a3b8";
        ctx.fillRect(o.x + 2, o.y + 2, 5, 5);
        ctx.fillRect(o.x + o.w - 7, o.y + o.h - 7, 5, 5);
      } else if (o.kind === "sandbag") {
        // Low tactical sandbags (bullets blocked, sight clear!)
        const horizontal = o.w > o.h;
        const bags = horizontal ? Math.max(3, Math.floor(o.w / 24)) : Math.max(3, Math.floor(o.h / 24));
        for (let b = 0; b < bags; b++) {
          const bx = horizontal ? o.x + (b + 0.5) * (o.w / bags) : o.x + o.w / 2;
          const by = horizontal ? o.y + o.h / 2 : o.y + (b + 0.5) * (o.h / bags);
          const rx = horizontal ? o.w / bags / 2 + 1 : o.w / 2;
          const ry = horizontal ? o.h / 2 : o.h / bags / 2 + 1;
          ctx.fillStyle = b % 2 === 0 ? "#827359" : "#73654e";
          ctx.beginPath();
          ctx.ellipse(bx, by, rx, ry, 0, 0, Math.PI * 2);
          ctx.fill();
          ctx.strokeStyle = "#4d4333";
          ctx.lineWidth = 1.5;
          ctx.stroke();
        }
      }
    }
  }

  private drawOperator(
    ctx: CanvasRenderingContext2D,
    op: OperatorEntity,
    now: number,
    isLocked: boolean
  ) {
    const spec = OPERATORS[op.classId];
    const skin = getSkinById(op.skinId, op.classId);
    const abilityActive = now < op.abilityActiveUntil;
    const isCloaked = op.classId === "spectre" && abilityActive;
    const isShielded = op.classId === "bastion" && abilityActive;
    const isOverdrive = op.classId === "ghost" && abilityActive;

    // Cloaked enemies are almost invisible unless very close
    if (isCloaked && !op.isLocalPlayer) {
      ctx.save();
      ctx.globalAlpha = 0.14;
    } else if (isCloaked && op.isLocalPlayer) {
      ctx.save();
      ctx.globalAlpha = 0.48;
    } else {
      ctx.save();
    }

    ctx.translate(op.x, op.y);

    // Overdrive aura
    if (isOverdrive) {
      const aura = ctx.createRadialGradient(0, 0, 8, 0, 0, 34);
      aura.addColorStop(0, `${skin.visorColor}66`);
      aura.addColorStop(1, "rgba(244, 63, 94, 0)");
      ctx.fillStyle = aura;
      ctx.beginPath();
      ctx.arc(0, 0, 34, 0, Math.PI * 2);
      ctx.fill();
    }

    // Ground drop shadow
    ctx.fillStyle = "rgba(0, 0, 0, 0.55)";
    ctx.beginPath();
    ctx.ellipse(2, 5, op.radius + 1, op.radius - 1, 0, 0, Math.PI * 2);
    ctx.fill();

    // Enemy tactical sight wedge (lets you read & flank around enemy aim!)
    if (!op.isLocalPlayer && !isCloaked) {
      ctx.save();
      ctx.rotate(op.angle);
      const eRange = Math.min(240, spec.visionRange * 0.56);
      const eHalf = spec.visionHalfAngle;
      const eg = ctx.createRadialGradient(14, 0, 8, 14, 0, eRange);
      eg.addColorStop(
        0,
        op.isRemoteHuman
          ? `rgba(${skin.beamRgb}, 0.26)`
          : "rgba(244, 63, 94, 0.22)"
      );
      eg.addColorStop(1, "rgba(244, 63, 94, 0)");
      ctx.fillStyle = eg;
      ctx.beginPath();
      ctx.moveTo(14, 0);
      ctx.arc(14, 0, eRange, -eHalf, eHalf);
      ctx.closePath();
      ctx.fill();
      ctx.restore();
    }

    // Draw articulated operator sprite with equipped skin
    drawOperatorFigure(ctx, {
      classId: op.classId,
      skin,
      angle: op.angle,
      stridePhase: op.stridePhase,
      recoilOffset: op.recoilOffset,
      hitFlash: op.hitFlash,
      muzzleFlash: now < op.muzzleFlashUntil,
      isShielded,
      isCloaked,
      isLocalPlayer: op.isLocalPlayer,
      now,
    });

    // Floating overhead tactical status bar & callsign
    if (!op.isLocalPlayer || op.hp < op.maxHp || op.reloadingUntil > now) {
      const barW = 42;
      const barY = -30;

      // Reload progress strip
      if (op.reloadingUntil > now) {
        const reloadDur = spec.weapon.reloadMs;
        const pct = Math.max(0, Math.min(1, 1 - (op.reloadingUntil - now) / reloadDur));
        ctx.fillStyle = "rgba(15, 23, 42, 0.85)";
        ctx.fillRect(-barW / 2, barY - 7, barW, 4);
        ctx.fillStyle = "#fbbf24";
        ctx.fillRect(-barW / 2, barY - 7, barW * pct, 4);
      }

      if (!op.isLocalPlayer) {
        // Background frame
        ctx.fillStyle = "rgba(9, 13, 22, 0.85)";
        ctx.fillRect(-barW / 2 - 1, barY - 1, barW + 2, 10);

        // Armor bar (top thin cyan line)
        const armorRatio = Math.max(0, op.armor / op.maxArmor);
        ctx.fillStyle = "#38bdf8";
        ctx.fillRect(-barW / 2, barY, barW * armorRatio, 3);

        // HP bar
        const hpRatio = Math.max(0, op.hp / op.maxHp);
        ctx.fillStyle = isLocked ? "#f43f5e" : "#ef4444";
        ctx.fillRect(-barW / 2, barY + 4, barW * hpRatio, 4);

        // Callsign tag
        ctx.font = "700 10px monospace";
        ctx.textAlign = "center";
        ctx.fillStyle = op.isRemoteHuman ? "#38bdf8" : "rgba(226, 232, 240, 0.86)";
        const tag = op.isRemoteHuman ? `★ ${op.name}` : op.name;
        ctx.fillText(tag, 0, barY - 5);
      }
    }

    ctx.restore();
  }

  private drawBullets(ctx: CanvasRenderingContext2D, bullets: BulletEntity[]) {
    for (let i = 0; i < bullets.length; i++) {
      const b = bullets[i];
      if (!b.alive) continue;

      const tailX = b.x - b.vx * 0.022;
      const tailY = b.y - b.vy * 0.022;

      ctx.save();
      // Glowing tracer trail
      const g = ctx.createLinearGradient(tailX, tailY, b.x, b.y);
      g.addColorStop(0, "rgba(255,255,255,0)");
      g.addColorStop(0.55, b.color);
      g.addColorStop(1, "#ffffff");

      ctx.strokeStyle = g;
      ctx.lineWidth = b.width;
      ctx.lineCap = "round";
      ctx.beginPath();
      ctx.moveTo(tailX, tailY);
      ctx.lineTo(b.x, b.y);
      ctx.stroke();

      // Hot core tip
      ctx.fillStyle = "#ffffff";
      ctx.beginPath();
      ctx.arc(b.x, b.y, b.width * 0.55, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }
  }

  private drawParticles(ctx: CanvasRenderingContext2D, particles: Particle[]) {
    for (let i = 0; i < particles.length; i++) {
      const p = particles[i];
      const lifeRatio = Math.max(0, p.life / p.maxLife);
      ctx.save();
      ctx.globalAlpha = p.alpha * lifeRatio;

      if (p.kind === "ring") {
        const radius = p.size * (1.85 - lifeRatio * 0.9);
        ctx.strokeStyle = p.color;
        ctx.lineWidth = Math.max(1.5, 4 * lifeRatio);
        ctx.beginPath();
        ctx.arc(p.x, p.y, radius, 0, Math.PI * 2);
        ctx.stroke();
      } else if (p.kind === "shell") {
        ctx.translate(p.x, p.y);
        ctx.rotate(p.rotation ?? 0);
        ctx.fillStyle = p.color;
        ctx.fillRect(-3, -1.2, 6, 2.4);
      } else if (p.kind === "armor") {
        ctx.translate(p.x, p.y);
        ctx.rotate(p.rotation ?? 0);
        ctx.fillStyle = p.color;
        ctx.beginPath();
        ctx.moveTo(0, -p.size);
        ctx.lineTo(p.size * 0.8, p.size * 0.7);
        ctx.lineTo(-p.size * 0.8, p.size * 0.7);
        ctx.closePath();
        ctx.fill();
      } else if (p.kind === "flash") {
        const g = ctx.createRadialGradient(p.x, p.y, 1, p.x, p.y, p.size * (1.5 - lifeRatio * 0.5));
        g.addColorStop(0, "#ffffff");
        g.addColorStop(0.35, p.color);
        g.addColorStop(1, "rgba(0,0,0,0)");
        ctx.fillStyle = g;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size * 1.4, 0, Math.PI * 2);
        ctx.fill();
      } else {
        ctx.fillStyle = p.color;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size * (p.kind === "smoke" ? 1.8 - lifeRatio * 0.8 : lifeRatio), 0, Math.PI * 2);
        ctx.fill();
      }

      ctx.restore();
    }
  }

  private drawFlashlightBeamGlow(ctx: CanvasRenderingContext2D, state: RenderState) {
    const p = state.localPlayer;
    if (!p) return;
    const spec = OPERATORS[p.classId];
    const skin = getSkinById(p.skinId, p.classId);
    const boosted = state.now < p.visionBoostUntil;
    const range = spec.visionRange * (boosted ? 1.24 : 1);

    ctx.save();
    ctx.beginPath();
    ctx.moveTo(state.flashlightPoly[0].x, state.flashlightPoly[0].y);
    for (let i = 1; i < state.flashlightPoly.length; i++) {
      ctx.lineTo(state.flashlightPoly[i].x, state.flashlightPoly[i].y);
    }
    ctx.closePath();

    // Subtle volumetric light cone tinted by equipped skin!
    const grad = ctx.createRadialGradient(p.x, p.y, 16, p.x, p.y, range);
    if (boosted) {
      grad.addColorStop(0, "rgba(216, 180, 254, 0.24)");
      grad.addColorStop(0.6, "rgba(192, 132, 252, 0.09)");
      grad.addColorStop(1, "rgba(192, 132, 252, 0)");
    } else {
      grad.addColorStop(0, `rgba(${skin.beamRgb}, 0.22)`);
      grad.addColorStop(0.55, `rgba(${skin.beamRgb}, 0.08)`);
      grad.addColorStop(1, `rgba(${skin.beamRgb}, 0)`);
    }
    ctx.fillStyle = grad;
    ctx.fill();

    // Crisp tactical cone guide edges (Bullet Echo signature aiming feedback!)
    ctx.strokeStyle = p.targetLockedId
      ? "rgba(244, 63, 94, 0.48)"
      : `${skin.vestTrim}44`;
    ctx.lineWidth = 1.6;
    ctx.stroke();

    // Drifting atmospheric dust motes illuminated inside the flashlight cone
    ctx.clip();
    ctx.fillStyle = "rgba(224, 242, 254, 0.35)";
    for (let i = 0; i < this.dustMotes.length; i++) {
      const m = this.dustMotes[i];
      const mx = (m.x + state.now * 0.008 * m.vx + 2200) % 2200;
      const my = (m.y + state.now * 0.008 * m.vy + 2200) % 2200;
      if (Math.abs(mx - p.x) < range && Math.abs(my - p.y) < range) {
        ctx.beginPath();
        ctx.arc(mx, my, m.r, 0, Math.PI * 2);
        ctx.fill();
      }
    }
    ctx.restore();
  }

  private drawLightingPass(
    ctx: CanvasRenderingContext2D,
    viewportW: number,
    viewportH: number,
    state: RenderState
  ) {
    const lightCanvas = this.ensureLightCanvas(viewportW, viewportH);
    const p = state.localPlayer;
    if (!lightCanvas || !p) return;

    const lctx = lightCanvas.getContext("2d");
    if (!lctx) return;

    const lw = lightCanvas.width;
    const lh = lightCanvas.height;
    const sx = lw / viewportW;
    const sy = lh / viewportH;

    lctx.save();
    lctx.setTransform(1, 0, 0, 1, 0, 0);
    lctx.globalCompositeOperation = "source-over";
    lctx.clearRect(0, 0, lw, lh);

    // Nocturnal bunker fog-of-war veil (slightly lighter in menu demo so arena shines!)
    lctx.fillStyle = state.isDemoMode
      ? "rgba(4, 8, 15, 0.56)"
      : "rgba(4, 7, 14, 0.87)";
    lctx.fillRect(0, 0, lw, lh);

    // Transform into camera world space
    lctx.scale(sx, sy);
    lctx.translate(viewportW / 2 + state.shakeX, viewportH / 2 + state.shakeY);
    lctx.scale(state.zoom, state.zoom);
    lctx.translate(-state.cameraX, -state.cameraY);

    lctx.globalCompositeOperation = "destination-out";

    const spec = OPERATORS[p.classId];
    const boosted = state.now < p.visionBoostUntil;
    const range = spec.visionRange * (boosted ? 1.24 : 1);

    // 1. Cut out raycasted Flashlight Cone
    if (state.flashlightPoly.length > 2) {
      const coneGrad = lctx.createRadialGradient(p.x, p.y, 18, p.x, p.y, range);
      coneGrad.addColorStop(0, "rgba(255,255,255,1)");
      coneGrad.addColorStop(0.75, "rgba(255,255,255,0.96)");
      coneGrad.addColorStop(0.92, "rgba(255,255,255,0.55)");
      coneGrad.addColorStop(1, "rgba(255,255,255,0)");

      lctx.fillStyle = coneGrad;
      lctx.beginPath();
      lctx.moveTo(state.flashlightPoly[0].x, state.flashlightPoly[0].y);
      for (let i = 1; i < state.flashlightPoly.length; i++) {
        lctx.lineTo(state.flashlightPoly[i].x, state.flashlightPoly[i].y);
      }
      lctx.closePath();
      lctx.fill();
    }

    // 2. Cut out raycasted Ambient Awareness Circle around player
    if (state.ambientPoly.length > 2) {
      const ambGrad = lctx.createRadialGradient(p.x, p.y, 24, p.x, p.y, 128);
      ambGrad.addColorStop(0, "rgba(255,255,255,1)");
      ambGrad.addColorStop(0.65, "rgba(255,255,255,0.85)");
      ambGrad.addColorStop(1, "rgba(255,255,255,0)");

      lctx.fillStyle = ambGrad;
      lctx.beginPath();
      lctx.moveTo(state.ambientPoly[0].x, state.ambientPoly[0].y);
      for (let i = 1; i < state.ambientPoly.length; i++) {
        lctx.lineTo(state.ambientPoly[i].x, state.ambientPoly[i].y);
      }
      lctx.closePath();
      lctx.fill();
    }

    // 3. Dynamic illumination blooms for muzzle flashes & explosions
    for (const op of state.operators) {
      if (!op.alive || state.now >= op.muzzleFlashUntil) continue;
      if (op.isLocalPlayer || state.visibleOperatorIds.has(op.id)) {
        const mg = lctx.createRadialGradient(op.x, op.y, 5, op.x, op.y, 145);
        mg.addColorStop(0, "rgba(255,255,255,0.9)");
        mg.addColorStop(1, "rgba(255,255,255,0)");
        lctx.fillStyle = mg;
        lctx.beginPath();
        lctx.arc(op.x, op.y, 145, 0, Math.PI * 2);
        lctx.fill();
      }
    }

    for (let i = 0; i < state.particles.length; i++) {
      const pt = state.particles[i];
      if (pt.kind !== "flash") continue;
      const fg = lctx.createRadialGradient(pt.x, pt.y, 6, pt.x, pt.y, pt.size * 2.2);
      fg.addColorStop(0, "rgba(255,255,255,0.95)");
      fg.addColorStop(1, "rgba(255,255,255,0)");
      lctx.fillStyle = fg;
      lctx.beginPath();
      lctx.arc(pt.x, pt.y, pt.size * 2.2, 0, Math.PI * 2);
      lctx.fill();
    }

    lctx.restore();

    // Composite darkness layer onto main canvas
    ctx.drawImage(lightCanvas, 0, 0, lw, lh, 0, 0, viewportW, viewportH);
  }

  private drawThermalSilhouette(
    ctx: CanvasRenderingContext2D,
    op: OperatorEntity,
    now: number
  ) {
    const pulse = 0.65 + Math.sin(now * 0.015) * 0.3;
    ctx.save();
    ctx.translate(op.x, op.y);
    ctx.strokeStyle = `rgba(16, 185, 129, ${pulse})`;
    ctx.fillStyle = "rgba(16, 185, 129, 0.22)";
    ctx.lineWidth = 2;

    // Diamond thermal lock marker
    ctx.beginPath();
    ctx.moveTo(0, -22);
    ctx.lineTo(22, 0);
    ctx.lineTo(0, 22);
    ctx.lineTo(-22, 0);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = "#6ee7b7";
    ctx.font = "700 10px monospace";
    ctx.textAlign = "center";
    ctx.fillText(op.name, 0, -27);
    ctx.restore();
  }

  private drawTargetLockBracket(
    ctx: CanvasRenderingContext2D,
    target: OperatorEntity,
    now: number
  ) {
    const r = 24 + Math.sin(now * 0.02) * 2.5;
    ctx.save();
    ctx.translate(target.x, target.y);
    ctx.strokeStyle = "#f43f5e";
    ctx.lineWidth = 2.2;
    const corner = 7;

    // Four crisp tactical reticle corners
    const signs = [
      [-1, -1],
      [1, -1],
      [1, 1],
      [-1, 1],
    ];
    for (const [sx, sy] of signs) {
      ctx.beginPath();
      ctx.moveTo(sx * r, sy * (r - corner));
      ctx.lineTo(sx * r, sy * r);
      ctx.lineTo(sx * (r - corner), sy * r);
      ctx.stroke();
    }
    ctx.restore();
  }

  private drawDamageIndicators(
    ctx: CanvasRenderingContext2D,
    player: OperatorEntity,
    indicators: DamageIndicator[]
  ) {
    for (let i = 0; i < indicators.length; i++) {
      const ind = indicators[i];
      ctx.save();
      ctx.translate(player.x, player.y);
      ctx.rotate(ind.angle);
      ctx.strokeStyle = `rgba(244, 63, 94, ${ind.alpha})`;
      ctx.lineWidth = 4;
      ctx.lineCap = "round";
      ctx.beginPath();
      ctx.arc(0, 0, 44, -0.35, 0.35);
      ctx.stroke();
      ctx.restore();
    }
  }

  private drawStormZone(ctx: CanvasRenderingContext2D, state: RenderState) {
    const { stormX, stormY, stormRadius, map, now } = state;

    ctx.save();
    // Red translucent hazard fill outside the safe circle using even-odd rule
    ctx.beginPath();
    ctx.rect(-200, -200, map.width + 400, map.height + 400);
    ctx.arc(stormX, stormY, Math.max(10, stormRadius), 0, Math.PI * 2, true);
    ctx.fillStyle = "rgba(225, 29, 72, 0.22)";
    ctx.fill("evenodd");

    // Glowing pulsating crimson ring boundary
    const pulse = 0.72 + Math.sin(now * 0.006) * 0.22;
    ctx.strokeStyle = `rgba(244, 63, 94, ${pulse})`;
    ctx.lineWidth = 5;
    ctx.shadowColor = "#f43f5e";
    ctx.shadowBlur = 16;
    ctx.beginPath();
    ctx.arc(stormX, stormY, Math.max(10, stormRadius), 0, Math.PI * 2);
    ctx.stroke();

    // Inner dashed warning ring
    ctx.shadowBlur = 0;
    ctx.strokeStyle = "rgba(253, 164, 175, 0.5)";
    ctx.lineWidth = 1.5;
    ctx.setLineDash([16, 12]);
    ctx.beginPath();
    ctx.arc(stormX, stormY, Math.max(10, stormRadius - 8), 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();
  }

  private drawFloatingTexts(ctx: CanvasRenderingContext2D, texts: FloatingText[]) {
    for (let i = 0; i < texts.length; i++) {
      const ft = texts[i];
      const alpha = Math.max(0, Math.min(1, ft.life / (ft.maxLife * 0.6)));
      ctx.save();
      ctx.globalAlpha = alpha;
      ctx.font = `800 ${ft.size}px monospace`;
      ctx.textAlign = "center";
      ctx.fillStyle = "rgba(2, 6, 23, 0.85)";
      ctx.fillText(ft.text, ft.x + 1.5, ft.y + 1.5);
      ctx.fillStyle = ft.color;
      ctx.fillText(ft.text, ft.x, ft.y);
      ctx.restore();
    }
  }

  private drawScreenOverlays(
    ctx: CanvasRenderingContext2D,
    w: number,
    h: number,
    state: RenderState
  ) {
    // Cinematic tactical vignette
    const vig = ctx.createRadialGradient(
      w / 2,
      h / 2,
      Math.min(w, h) * 0.34,
      w / 2,
      h / 2,
      Math.max(w, h) * 0.72
    );
    vig.addColorStop(0, "rgba(0,0,0,0)");
    vig.addColorStop(1, "rgba(2, 6, 14, 0.52)");
    ctx.fillStyle = vig;
    ctx.fillRect(0, 0, w, h);

    // Damage or storm edge pulse
    const dangerAlpha = Math.max(
      state.hurtVignette * 0.45,
      state.inStorm ? 0.22 + Math.sin(state.now * 0.008) * 0.12 : 0
    );
    if (dangerAlpha > 0.01) {
      const dmgGrad = ctx.createRadialGradient(
        w / 2,
        h / 2,
        Math.min(w, h) * 0.28,
        w / 2,
        h / 2,
        Math.max(w, h) * 0.68
      );
      dmgGrad.addColorStop(0, "rgba(225, 29, 72, 0)");
      dmgGrad.addColorStop(1, `rgba(225, 29, 72, ${dangerAlpha})`);
      ctx.fillStyle = dmgGrad;
      ctx.fillRect(0, 0, w, h);
    }

    // Center / Reticle Hitmarker X
    if (state.hitmarkerAlpha > 0.02) {
      const hx = state.isTouchMode ? w / 2 : state.mouseScreenX;
      const hy = state.isTouchMode ? h / 2 : state.mouseScreenY;
      ctx.save();
      ctx.translate(hx, hy);
      ctx.strokeStyle = state.hitmarkerKill
        ? `rgba(244, 63, 94, ${state.hitmarkerAlpha})`
        : `rgba(255, 255, 255, ${state.hitmarkerAlpha})`;
      ctx.lineWidth = state.hitmarkerKill ? 3 : 2.2;
      const gap = 6;
      const len = state.hitmarkerKill ? 15 : 11;
      for (let a = 0; a < 4; a++) {
        ctx.rotate(Math.PI / 2);
        ctx.beginPath();
        ctx.moveTo(gap, gap);
        ctx.lineTo(gap + len, gap + len);
        ctx.stroke();
      }
      ctx.restore();
    }
  }

  private drawCrosshair(ctx: CanvasRenderingContext2D, state: RenderState) {
    const x = state.mouseScreenX;
    const y = state.mouseScreenY;
    const locked = Boolean(state.localPlayer?.targetLockedId);
    ctx.save();
    ctx.translate(x, y);
    ctx.strokeStyle = locked ? "#f43f5e" : "rgba(226, 232, 240, 0.85)";
    ctx.lineWidth = 1.75;

    ctx.beginPath();
    ctx.arc(0, 0, locked ? 10 : 8, 0, Math.PI * 2);
    ctx.stroke();

    const g = 4;
    const l = 13;
    ctx.beginPath();
    ctx.moveTo(-l, 0);
    ctx.lineTo(-g, 0);
    ctx.moveTo(g, 0);
    ctx.lineTo(l, 0);
    ctx.moveTo(0, -l);
    ctx.lineTo(0, -g);
    ctx.moveTo(0, g);
    ctx.lineTo(0, l);
    ctx.stroke();

    ctx.fillStyle = locked ? "#f43f5e" : "#38bdf8";
    ctx.beginPath();
    ctx.arc(0, 0, 2, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  private drawMinimap(
    ctx: CanvasRenderingContext2D,
    viewportW: number,
    viewportH: number,
    state: RenderState
  ) {
    const isCompact = viewportW < 640;
    const size = isCompact ? 104 : 138;
    const padX = isCompact ? 12 : 18;
    const padY = isCompact ? 62 : 70;
    const x0 = padX;
    const y0 = padY;
    const scale = size / state.map.width;

    ctx.save();
    // Radar bezel
    ctx.fillStyle = "rgba(7, 11, 20, 0.82)";
    ctx.strokeStyle = "rgba(56, 189, 248, 0.35)";
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.roundRect(x0, y0, size, size, 10);
    ctx.fill();
    ctx.stroke();

    ctx.save();
    ctx.beginPath();
    ctx.roundRect(x0 + 1, y0 + 1, size - 2, size - 2, 9);
    ctx.clip();

    // Subtle radar grid
    ctx.strokeStyle = "rgba(148, 163, 184, 0.08)";
    ctx.lineWidth = 1;
    for (let g = 1; g < 4; g++) {
      ctx.beginPath();
      ctx.moveTo(x0 + (size * g) / 4, y0);
      ctx.lineTo(x0 + (size * g) / 4, y0 + size);
      ctx.moveTo(x0, y0 + (size * g) / 4);
      ctx.lineTo(x0 + size, y0 + (size * g) / 4);
      ctx.stroke();
    }

    // Walls & obstacles on radar
    ctx.fillStyle = "rgba(148, 163, 184, 0.32)";
    for (const o of state.map.obstacles) {
      if (o.kind === "sandbag") continue;
      ctx.fillRect(
        x0 + o.x * scale,
        y0 + o.y * scale,
        Math.max(1.5, o.w * scale),
        Math.max(1.5, o.h * scale)
      );
    }

    // Storm circle on minimap
    ctx.strokeStyle = "rgba(244, 63, 94, 0.85)";
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.arc(
      x0 + state.stormX * scale,
      y0 + state.stormY * scale,
      Math.max(2, state.stormRadius * scale),
      0,
      Math.PI * 2
    );
    ctx.stroke();

    // Gunshot & explosion blips on radar
    for (const r of state.ripples) {
      if (r.ownerId === state.localPlayer?.id) continue;
      if (r.kind !== "gunshot" && r.kind !== "explosion") continue;
      ctx.fillStyle = r.kind === "explosion" ? "rgba(251, 146, 60, 0.9)" : "rgba(244, 63, 94, 0.85)";
      ctx.beginPath();
      ctx.arc(x0 + r.x * scale, y0 + r.y * scale, 2.5, 0, Math.PI * 2);
      ctx.fill();
    }

    // Visible / Thermal-scanned enemies on radar
    for (const op of state.operators) {
      if (!op.alive || op.isLocalPlayer) continue;
      if (state.visibleOperatorIds.has(op.id) || state.thermalActive) {
        ctx.fillStyle = op.isRemoteHuman ? "#fbbf24" : "#f43f5e";
        ctx.beginPath();
        ctx.arc(x0 + op.x * scale, y0 + op.y * scale, 3, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    // Local player chevron + flashlight wedge on radar
    if (state.localPlayer && state.localPlayer.alive) {
      const px = x0 + state.localPlayer.x * scale;
      const py = y0 + state.localPlayer.y * scale;
      const spec = OPERATORS[state.localPlayer.classId];

      ctx.fillStyle = "rgba(56, 189, 248, 0.25)";
      ctx.beginPath();
      ctx.moveTo(px, py);
      ctx.arc(
        px,
        py,
        spec.visionRange * scale,
        state.localPlayer.angle - spec.visionHalfAngle,
        state.localPlayer.angle + spec.visionHalfAngle
      );
      ctx.closePath();
      ctx.fill();

      ctx.fillStyle = "#38bdf8";
      ctx.beginPath();
      ctx.arc(px, py, 3.5, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = "#ffffff";
      ctx.lineWidth = 1;
      ctx.stroke();
    }

    ctx.restore();

    // Small radar label
    ctx.fillStyle = "rgba(148, 163, 184, 0.75)";
    ctx.font = "700 9px monospace";
    ctx.fillText("TAC-RADAR", x0 + 8, y0 + size - 6);
    ctx.restore();
    void viewportH;
  }

  private drawTouchSticks(
    ctx: CanvasRenderingContext2D,
    left: TouchStickVisual,
    right: TouchStickVisual
  ) {
    const drawStick = (s: TouchStickVisual, color: string, label: string) => {
      if (!s.active) return;
      ctx.save();
      ctx.strokeStyle = `${color}88`;
      ctx.fillStyle = "rgba(15, 23, 42, 0.36)";
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(s.originX, s.originY, s.radius, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();

      ctx.fillStyle = `${color}cc`;
      ctx.beginPath();
      ctx.arc(s.currentX, s.currentY, 22, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = "#ffffff";
      ctx.lineWidth = 1.5;
      ctx.stroke();

      ctx.fillStyle = "rgba(255,255,255,0.65)";
      ctx.font = "700 9px monospace";
      ctx.textAlign = "center";
      ctx.fillText(label, s.originX, s.originY + s.radius + 14);
      ctx.restore();
    };

    drawStick(left, "#38bdf8", "MOVE");
    drawStick(right, "#f43f5e", "AIM");
  }
}
