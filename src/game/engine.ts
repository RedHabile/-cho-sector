import {
  ARENA_HEIGHT,
  ARENA_WIDTH,
  BOT_CALLSIGNS,
  OPERATORS,
  SCORE_CONFIG,
  TOTAL_COMBATANTS,
} from "./constants";
import { generateArenaMap, isPointClearOfObstacles } from "./map";
import { ArenaRenderer, TouchStickVisual } from "./renderer";
import { DEFAULT_SKIN_BY_CLASS, getSkinById, getSkinsForClass } from "./skins";
import { soundEngine } from "./sound";
import {
  ArenaMap,
  BulletEntity,
  DamageIndicator,
  FloatingText,
  FloorDecal,
  GameMode,
  GamePhase,
  HudSnapshot,
  KillFeedItem,
  LootKind,
  MatchResult,
  MultiplayerEvent,
  MultiplayerPeerState,
  OperatorClassId,
  OperatorEntity,
  Particle,
  SonarRipple,
} from "./types";
import {
  computeAmbientCirclePolygon,
  computeFlashlightConePolygon,
  hasLineOfSight,
  isPointVisibleToOperator,
  isTargetInFireCone,
  lerpAngle,
  normalizeAngle,
  Point2D,
} from "./visibility";

const MAX_PARTICLES = 240;
const MAX_DECALS = 140;
const MAX_RIPPLES = 52;
const STORM_DURATION_SEC = 105;
const AMBIENT_VISION_RADIUS = 118;

export interface MatchLaunchOptions {
  callsign: string;
  classId: OperatorClassId;
  skinId?: string;
  mode: GameMode;
  roomCode?: string;
  playerId?: string;
  seed?: number;
  initialPeers?: MultiplayerPeerState[];
}

export interface EngineCallbacks {
  onHudUpdate: (hud: HudSnapshot) => void;
  onMatchEnd: (result: MatchResult) => void;
  onPauseRequest: () => void;
  onTouchModeChange: (isTouch: boolean) => void;
}

export class EchoSectorEngine {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private renderer = new ArenaRenderer();
  private callbacks: EngineCallbacks;

  private rafId: number | null = null;
  private lastFrameTime = 0;
  private phase: GamePhase = "menu";
  private isDemoMode = true;
  private mode: GameMode = "solo";

  private map: ArenaMap;
  private operators: OperatorEntity[] = [];
  private localPlayer: OperatorEntity | null = null;
  private bullets: BulletEntity[] = [];
  private particles: Particle[] = [];
  private decals: FloorDecal[] = [];
  private ripples: SonarRipple[] = [];
  private floatingTexts: FloatingText[] = [];
  private damageIndicators: DamageIndicator[] = [];
  private killFeed: KillFeedItem[] = [];

  // Camera & Screen Shake
  private cameraX = ARENA_WIDTH / 2;
  private cameraY = ARENA_HEIGHT / 2;
  private zoom = 1;
  private targetZoom = 1;
  private shakeTrauma = 0;
  private hurtVignette = 0;
  private hitmarkerAlpha = 0;
  private hitmarkerKill = false;

  // Visibility cache
  private flashlightPoly: Point2D[] = [];
  private ambientPoly: Point2D[] = [];
  private visibleOperatorIds = new Set<string>();

  // Storm state
  private stormX = ARENA_WIDTH / 2;
  private stormY = ARENA_HEIGHT / 2;
  private stormStartRadius = 1520;
  private stormMinRadius = 120;
  private stormRadius = 1520;
  private matchElapsedSec = 0;
  private lastStormTickAt = 0;

  // Score & Telemetry
  private score = 0;
  private bonusScore = 0;
  private damageDealt = 0;
  private shotsFired = 0;
  private shotsHit = 0;
  private lootCollected = 0;
  private barrelsDetonated = 0;
  private abilitiesUsed = 0;
  private stealthKills = 0;
  private streak = 0;
  private firstBloodAwarded = false;
  private eliminatedBy: string | null = null;
  private matchEnded = false;
  private lastHudPush = 0;
  private fpsAvg = 60;

  // Input state
  private keys = new Set<string>();
  private mouseScreenX = 0;
  private mouseScreenY = 0;
  private mouseDown = false;
  private manualFireButton = false;
  private isTouchMode = false;
  private leftTouchId: number | null = null;
  private rightTouchId: number | null = null;
  private leftStick: TouchStickVisual = {
    active: false,
    originX: 0,
    originY: 0,
    currentX: 0,
    currentY: 0,
    radius: 56,
  };
  private rightStick: TouchStickVisual = {
    active: false,
    originX: 0,
    originY: 0,
    currentX: 0,
    currentY: 0,
    radius: 56,
  };

  // Multiplayer networking
  private roomCode: string | null = null;
  private localPlayerId = `op_${Math.random().toString(36).slice(2, 10)}`;
  private eventSource: EventSource | null = null;
  private lastSyncSentAt = 0;
  private demoFocusId: string | null = null;

  // Bound event listeners for clean teardown
  private onKeyDownBound: (e: KeyboardEvent) => void;
  private onKeyUpBound: (e: KeyboardEvent) => void;
  private onMouseMoveBound: (e: MouseEvent) => void;
  private onMouseDownBound: (e: MouseEvent) => void;
  private onMouseUpBound: () => void;
  private onTouchStartBound: (e: TouchEvent) => void;
  private onTouchMoveBound: (e: TouchEvent) => void;
  private onTouchEndBound: (e: TouchEvent) => void;
  private onResizeBound: () => void;
  private onBlurBound: () => void;

  constructor(canvas: HTMLCanvasElement, callbacks: EngineCallbacks) {
    this.canvas = canvas;
    const context = canvas.getContext("2d", { alpha: false });
    if (!context) {
      throw new Error("Could not initialize 2D canvas context");
    }
    this.ctx = context;
    this.callbacks = callbacks;
    this.map = generateArenaMap(90421);

    this.onKeyDownBound = this.handleKeyDown.bind(this);
    this.onKeyUpBound = this.handleKeyUp.bind(this);
    this.onMouseMoveBound = this.handleMouseMove.bind(this);
    this.onMouseDownBound = this.handleMouseDown.bind(this);
    this.onMouseUpBound = this.handleMouseUp.bind(this);
    this.onTouchStartBound = this.handleTouchStart.bind(this);
    this.onTouchMoveBound = this.handleTouchMove.bind(this);
    this.onTouchEndBound = this.handleTouchEnd.bind(this);
    this.onResizeBound = this.resizeCanvas.bind(this);
    this.onBlurBound = this.handleBlur.bind(this);

    this.bindEvents();
    this.resizeCanvas();
    this.startAttractDemo();
    this.startLoop();
  }

  public getPlayerId(): string {
    return this.localPlayerId;
  }

  private bindEvents() {
    window.addEventListener("keydown", this.onKeyDownBound);
    window.addEventListener("keyup", this.onKeyUpBound);
    window.addEventListener("resize", this.onResizeBound);
    window.addEventListener("blur", this.onBlurBound);
    this.canvas.addEventListener("mousemove", this.onMouseMoveBound);
    this.canvas.addEventListener("mousedown", this.onMouseDownBound);
    window.addEventListener("mouseup", this.onMouseUpBound);
    this.canvas.addEventListener("touchstart", this.onTouchStartBound, { passive: false });
    this.canvas.addEventListener("touchmove", this.onTouchMoveBound, { passive: false });
    this.canvas.addEventListener("touchend", this.onTouchEndBound, { passive: false });
    this.canvas.addEventListener("touchcancel", this.onTouchEndBound, { passive: false });
  }

  public destroy() {
    if (this.rafId !== null) {
      cancelAnimationFrame(this.rafId);
      this.rafId = null;
    }
    this.disconnectMultiplayer();
    window.removeEventListener("keydown", this.onKeyDownBound);
    window.removeEventListener("keyup", this.onKeyUpBound);
    window.removeEventListener("resize", this.onResizeBound);
    window.removeEventListener("blur", this.onBlurBound);
    this.canvas.removeEventListener("mousemove", this.onMouseMoveBound);
    this.canvas.removeEventListener("mousedown", this.onMouseDownBound);
    window.removeEventListener("mouseup", this.onMouseUpBound);
    this.canvas.removeEventListener("touchstart", this.onTouchStartBound);
    this.canvas.removeEventListener("touchmove", this.onTouchMoveBound);
    this.canvas.removeEventListener("touchend", this.onTouchEndBound);
    this.canvas.removeEventListener("touchcancel", this.onTouchEndBound);
  }

  private resizeCanvas() {
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const w = window.innerWidth;
    const h = window.innerHeight;
    this.canvas.width = Math.floor(w * dpr);
    this.canvas.height = Math.floor(h * dpr);
    this.canvas.style.width = `${w}px`;
    this.canvas.style.height = `${h}px`;
    this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    // Responsive zoom so mobile screens see generous tactical space too
    this.targetZoom = w < 640 ? 0.78 : w < 1024 ? 0.92 : 1.04;
    if (this.mouseScreenX === 0 && this.mouseScreenY === 0) {
      this.mouseScreenX = w * 0.65;
      this.mouseScreenY = h * 0.5;
    }
  }

  private handleBlur() {
    this.keys.clear();
    this.mouseDown = false;
    this.manualFireButton = false;
  }

  private handleKeyDown(e: KeyboardEvent) {
    // Allow normal typing in input fields
    const tag = (e.target as HTMLElement | null)?.tagName;
    if (tag === "INPUT" || tag === "TEXTAREA") return;

    const code = e.code;
    if (
      code === "ArrowUp" ||
      code === "ArrowDown" ||
      code === "ArrowLeft" ||
      code === "ArrowRight" ||
      code === "Space"
    ) {
      e.preventDefault();
    }

    soundEngine.unlock();

    if (code === "Escape" || code === "KeyP") {
      if (this.phase === "playing" || this.phase === "paused") {
        this.callbacks.onPauseRequest();
      }
      return;
    }

    if (code === "KeyM") {
      soundEngine.toggleMute();
      return;
    }

    if (this.phase !== "playing") return;

    this.keys.add(code);

    if (code === "Space" || code === "KeyE") {
      this.triggerAbility();
    } else if (code === "KeyR") {
      this.triggerReload();
    }
  }

  private handleKeyUp(e: KeyboardEvent) {
    this.keys.delete(e.code);
  }

  private handleMouseMove(e: MouseEvent) {
    const rect = this.canvas.getBoundingClientRect();
    this.mouseScreenX = e.clientX - rect.left;
    this.mouseScreenY = e.clientY - rect.top;
    if (this.isTouchMode) {
      this.isTouchMode = false;
      this.callbacks.onTouchModeChange(false);
    }
  }

  private handleMouseDown(e: MouseEvent) {
    if (e.button !== 0) return;
    soundEngine.unlock();
    this.mouseDown = true;
  }

  private handleMouseUp() {
    this.mouseDown = false;
  }

  private handleTouchStart(e: TouchEvent) {
    if (this.phase !== "playing") return;
    e.preventDefault();
    soundEngine.unlock();
    if (!this.isTouchMode) {
      this.isTouchMode = true;
      this.callbacks.onTouchModeChange(true);
    }

    const halfW = window.innerWidth / 2;
    for (let i = 0; i < e.changedTouches.length; i++) {
      const t = e.changedTouches[i];
      if (t.clientX < halfW && this.leftTouchId === null) {
        this.leftTouchId = t.identifier;
        this.leftStick.active = true;
        this.leftStick.originX = t.clientX;
        this.leftStick.originY = t.clientY;
        this.leftStick.currentX = t.clientX;
        this.leftStick.currentY = t.clientY;
      } else if (t.clientX >= halfW && this.rightTouchId === null) {
        this.rightTouchId = t.identifier;
        this.rightStick.active = true;
        this.rightStick.originX = t.clientX;
        this.rightStick.originY = t.clientY;
        this.rightStick.currentX = t.clientX;
        this.rightStick.currentY = t.clientY;
      }
    }
  }

  private handleTouchMove(e: TouchEvent) {
    if (this.phase !== "playing") return;
    e.preventDefault();
    for (let i = 0; i < e.changedTouches.length; i++) {
      const t = e.changedTouches[i];
      if (t.identifier === this.leftTouchId) {
        this.updateStickPos(this.leftStick, t.clientX, t.clientY);
      } else if (t.identifier === this.rightTouchId) {
        this.updateStickPos(this.rightStick, t.clientX, t.clientY);
      }
    }
  }

  private handleTouchEnd(e: TouchEvent) {
    for (let i = 0; i < e.changedTouches.length; i++) {
      const t = e.changedTouches[i];
      if (t.identifier === this.leftTouchId) {
        this.leftTouchId = null;
        this.leftStick.active = false;
      } else if (t.identifier === this.rightTouchId) {
        this.rightTouchId = null;
        this.rightStick.active = false;
      }
    }
  }

  private updateStickPos(stick: TouchStickVisual, x: number, y: number) {
    const dx = x - stick.originX;
    const dy = y - stick.originY;
    const dist = Math.hypot(dx, dy);
    if (dist > stick.radius) {
      stick.currentX = stick.originX + (dx / dist) * stick.radius;
      stick.currentY = stick.originY + (dy / dist) * stick.radius;
    } else {
      stick.currentX = x;
      stick.currentY = y;
    }
  }

  public setManualFire(active: boolean) {
    soundEngine.unlock();
    this.manualFireButton = active;
  }

  public triggerReload() {
    const p = this.localPlayer;
    if (!p || !p.alive || this.phase !== "playing") return;
    const now = performance.now();
    if (p.reloadingUntil > now || p.ammo >= p.magSize) return;
    const spec = OPERATORS[p.classId];
    p.reloadingUntil = now + spec.weapon.reloadMs;
    soundEngine.playReload();
  }

  public triggerAbility() {
    const p = this.localPlayer;
    if (!p || !p.alive || this.phase !== "playing") return;
    const now = performance.now();
    if (now < p.abilityReadyAt) return;
    this.activateOperatorAbility(p, now, true);
  }

  public setPhase(phase: GamePhase) {
    this.phase = phase;
    if (phase === "menu") {
      this.disconnectMultiplayer();
      this.startAttractDemo();
    } else if (phase === "paused") {
      this.keys.clear();
      this.mouseDown = false;
      this.manualFireButton = false;
    }
  }

  public startAttractDemo() {
    this.isDemoMode = true;
    this.phase = "menu";
    this.roomCode = null;
    this.resetWorldState(90421);
    this.spawnDemoBots();
  }

  public startMatch(opts: MatchLaunchOptions) {
    soundEngine.unlock();
    this.disconnectMultiplayer();

    this.isDemoMode = false;
    this.phase = "playing";
    this.mode = opts.mode;
    this.roomCode = opts.mode === "multiplayer" ? (opts.roomCode ?? null) : null;
    if (opts.playerId) {
      this.localPlayerId = opts.playerId;
    }

    const seed = opts.seed ?? Math.floor(Math.random() * 900000) + 10000;
    this.resetWorldState(seed);

    // Spawn local human player at spawn index 0
    const spawns = this.map.spawnPoints;
    const playerSpawn = spawns[0] ?? { x: 420, y: 420 };
    const player = this.createOperator({
      id: this.localPlayerId,
      name: opts.callsign.trim().toUpperCase().slice(0, 16) || "OPERATIVE",
      classId: opts.classId,
      skinId: opts.skinId ?? DEFAULT_SKIN_BY_CLASS[opts.classId],
      x: playerSpawn.x,
      y: playerSpawn.y,
      isLocalPlayer: true,
      isRemoteHuman: false,
    });
    this.localPlayer = player;
    this.operators.push(player);

    // Spawn initial remote peers if already in room
    const remoteIds = new Set<string>([this.localPlayerId]);
    let spawnCursor = 1;
    if (opts.initialPeers && opts.mode === "multiplayer") {
      for (const peer of opts.initialPeers) {
        if (peer.playerId === this.localPlayerId || remoteIds.has(peer.playerId)) continue;
        remoteIds.add(peer.playerId);
        const sp = spawns[spawnCursor % spawns.length] ?? { x: 1700, y: 1700 };
        spawnCursor++;
        this.operators.push(
          this.createOperator({
            id: peer.playerId,
            name: peer.callsign,
            classId: peer.classId,
            skinId: peer.skinId ?? DEFAULT_SKIN_BY_CLASS[peer.classId],
            x: peer.x || sp.x,
            y: peer.y || sp.y,
            isLocalPlayer: false,
            isRemoteHuman: true,
          })
        );
      }
    }

    // Backfill remaining slots with smart tactical AI bots (place 1 close-ish for immediate first-10s excitement!)
    const classes: OperatorClassId[] = ["vanguard", "spectre", "bastion", "ghost"];
    const shuffledNames = [...BOT_CALLSIGNS].sort(() => Math.random() - 0.5);
    let botIdx = 0;

    while (this.operators.length < TOTAL_COMBATANTS) {
      let sp = spawns[spawnCursor % spawns.length] ?? {
        x: 300 + Math.random() * 1600,
        y: 300 + Math.random() * 1600,
      };
      spawnCursor++;

      // First bot spawns in an adjacent sector (~480-660px away) for exciting early audio/combat contact!
      if (botIdx === 0) {
        const nearCandidate = spawns.find((cand) => {
          const d = Math.hypot(cand.x - playerSpawn.x, cand.y - playerSpawn.y);
          return d >= 440 && d <= 720;
        });
        if (nearCandidate) sp = nearCandidate;
      }

      const botClass = classes[(botIdx + Math.floor(Math.random() * 4)) % classes.length];
      const classSkins = getSkinsForClass(botClass);
      const botSkin =
        classSkins[Math.floor(Math.random() * Math.min(3, classSkins.length))]?.id ??
        DEFAULT_SKIN_BY_CLASS[botClass];

      const bot = this.createOperator({
        id: `bot_${botIdx}_${seed}`,
        name: shuffledNames[botIdx % shuffledNames.length],
        classId: botClass,
        skinId: botSkin,
        x: sp.x,
        y: sp.y,
        isLocalPlayer: false,
        isRemoteHuman: false,
      });
      // Give first nearby bot an initial patrol vector near player's lane
      if (botIdx === 0) {
        bot.aiWaypoint = {
          x: (playerSpawn.x + sp.x) / 2,
          y: (playerSpawn.y + sp.y) / 2,
        };
      }
      this.operators.push(bot);
      botIdx++;
    }

    // Place a glowing starter optics pickup along the player's opening lane for instant gratification!
    const toCenterAngle = Math.atan2(
      ARENA_HEIGHT / 2 - player.y,
      ARENA_WIDTH / 2 - player.x
    );
    const starterDist = 135;
    const sx = player.x + Math.cos(toCenterAngle) * starterDist;
    const sy = player.y + Math.sin(toCenterAngle) * starterDist;
    if (isPointClearOfObstacles(sx, sy, 22, this.map.obstacles)) {
      this.map.loot.push({
        id: `loot_starter_${seed}`,
        x: sx,
        y: sy,
        kind: "optics",
        collected: false,
        bobPhase: 0,
        value: 1,
      });
    }

    this.spawnFloatingText(
      player.x,
      player.y - 42,
      opts.mode === "multiplayer" ? `DEPLOYED // ROOM ${this.roomCode}` : "DEPLOYED // HUNT & SURVIVE",
      "#38bdf8",
      13
    );

    // Dramatic drop-in camera zoom!
    this.cameraX = player.x;
    this.cameraY = player.y;
    this.zoom = this.targetZoom * 0.8;

    // Connect real-time multiplayer SSE stream if multiplayer room active
    if (this.mode === "multiplayer" && this.roomCode) {
      this.connectMultiplayer(this.roomCode);
    }

    this.pushHudSnapshot(performance.now());
  }

  private resetWorldState(seed: number) {
    this.map = generateArenaMap(seed);
    this.operators = [];
    this.localPlayer = null;
    this.bullets = [];
    this.particles = [];
    this.decals = [];
    this.ripples = [];
    this.floatingTexts = [];
    this.damageIndicators = [];
    this.killFeed = [];
    this.stormX = this.map.stormTarget.x;
    this.stormY = this.map.stormTarget.y;
    this.stormRadius = this.stormStartRadius;
    this.matchElapsedSec = 0;
    this.lastStormTickAt = 0;
    this.score = 0;
    this.bonusScore = 0;
    this.damageDealt = 0;
    this.shotsFired = 0;
    this.shotsHit = 0;
    this.lootCollected = 0;
    this.barrelsDetonated = 0;
    this.abilitiesUsed = 0;
    this.stealthKills = 0;
    this.streak = 0;
    this.firstBloodAwarded = false;
    this.eliminatedBy = null;
    this.matchEnded = false;
    this.shakeTrauma = 0;
    this.hurtVignette = 0;
    this.hitmarkerAlpha = 0;
    this.keys.clear();
    this.mouseDown = false;
    this.manualFireButton = false;
  }

  private spawnDemoBots() {
    const classes: OperatorClassId[] = ["vanguard", "spectre", "bastion", "ghost"];
    for (let i = 0; i < 8; i++) {
      const sp = this.map.spawnPoints[i % this.map.spawnPoints.length];
      const cls = classes[i % classes.length];
      const skins = getSkinsForClass(cls);
      const skinId = skins[i % skins.length]?.id ?? DEFAULT_SKIN_BY_CLASS[cls];
      const bot = this.createOperator({
        id: `demo_${i}`,
        name: BOT_CALLSIGNS[i],
        classId: cls,
        skinId,
        x: sp.x,
        y: sp.y,
        isLocalPlayer: false,
        isRemoteHuman: false,
      });
      // Pull demo bots toward the scenic Helipad Courtyard
      bot.aiWaypoint = {
        x: ARENA_WIDTH / 2 + (Math.random() - 0.5) * 480,
        y: ARENA_HEIGHT / 2 + (Math.random() - 0.5) * 480,
      };
      this.operators.push(bot);
    }
    this.demoFocusId = this.operators[0]?.id ?? null;
    this.localPlayer = this.operators[0] ?? null;
    if (this.localPlayer) {
      this.cameraX = this.localPlayer.x;
      this.cameraY = this.localPlayer.y;
    }
  }

  private createOperator(opts: {
    id: string;
    name: string;
    classId: OperatorClassId;
    skinId?: string;
    x: number;
    y: number;
    isLocalPlayer: boolean;
    isRemoteHuman: boolean;
  }): OperatorEntity {
    const spec = OPERATORS[opts.classId];
    // Solo player gets a small survivability and magazine boost; bots stay unchanged.
    const playerHp = Math.round(spec.maxHp * (opts.isLocalPlayer ? 1.18 : 1));
    const playerArmor = Math.round(spec.maxArmor * (opts.isLocalPlayer ? 1.22 : 1));
    const playerMagSize = Math.ceil(spec.weapon.magSize * (opts.isLocalPlayer ? 1.25 : 1));
    return {
      id: opts.id,
      name: opts.name,
      classId: opts.classId,
      skinId: opts.skinId ?? DEFAULT_SKIN_BY_CLASS[opts.classId],
      isLocalPlayer: opts.isLocalPlayer,
      isRemoteHuman: opts.isRemoteHuman,
      x: opts.x,
      y: opts.y,
      vx: 0,
      vy: 0,
      targetX: opts.x,
      targetY: opts.y,
      angle: Math.atan2(ARENA_HEIGHT / 2 - opts.y, ARENA_WIDTH / 2 - opts.x),
      targetAngle: 0,
      radius: 17,
      hp: playerHp,
      maxHp: playerHp,
      armor: playerArmor,
      maxArmor: playerArmor,
      ammo: playerMagSize,
      magSize: playerMagSize,
      reloadingUntil: 0,
      nextFireAt: 0,
      alive: true,
      kills: 0,
      stealth: false,
      stridePhase: Math.random() * Math.PI * 2,
      recoilOffset: 0,
      hitFlash: 0,
      abilityReadyAt: 0,
      abilityActiveUntil: 0,
      visionBoostUntil: 0,
      damageBoostUntil: 0,
      noiseRadius: 48,
      lastStepAt: 0,
      lastFootprintSide: 1,
      muzzleFlashUntil: 0,
      targetLockedId: null,
      aiState: "patrol",
      aiWaypoint: null,
      aiInvestigate: null,
      aiDecisionAt: 0,
      aiStrafeDir: Math.random() > 0.5 ? 1 : -1,
      aiLastSeenEnemy: null,
    };
  }

  // --- REAL-TIME MULTIPLAYER SYNC ---
  private connectMultiplayer(roomCode: string) {
    this.disconnectMultiplayer();
    if (typeof window === "undefined" || typeof EventSource === "undefined") return;

    const url = `/api/multiplayer/stream?room=${encodeURIComponent(
      roomCode
    )}&playerId=${encodeURIComponent(this.localPlayerId)}`;
    const es = new EventSource(url);
    es.onmessage = (ev) => {
      try {
        const data = JSON.parse(ev.data) as MultiplayerEvent;
        this.handleMultiplayerEvent(data);
      } catch {
        // ignore malformed packet
      }
    };
    this.eventSource = es;
  }

  private disconnectMultiplayer() {
    if (this.roomCode) {
      const code = this.roomCode;
      fetch("/api/multiplayer/sync", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          roomCode: code,
          playerId: this.localPlayerId,
          event: { type: "peer_leave", playerId: this.localPlayerId },
        }),
      }).catch(() => {});
    }
    if (this.eventSource) {
      this.eventSource.close();
      this.eventSource = null;
    }
  }

  private sendMultiplayerSync(
    pose?: MultiplayerPeerState,
    event?: MultiplayerEvent
  ) {
    if (!this.roomCode || this.mode !== "multiplayer") return;
    fetch("/api/multiplayer/sync", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        roomCode: this.roomCode,
        playerId: this.localPlayerId,
        pose,
        event,
      }),
    }).catch(() => {});
  }

  private handleMultiplayerEvent(ev: MultiplayerEvent) {
    if (this.isDemoMode) return;
    const now = performance.now();

    if (ev.type === "room_state") {
      for (const peer of ev.peers) {
        this.upsertRemotePeer(peer);
      }
    } else if (ev.type === "peer_pose") {
      this.upsertRemotePeer(ev.peer);
    } else if (ev.type === "peer_fire") {
      const shooter = this.operators.find((o) => o.id === ev.playerId);
      const spec = OPERATORS[ev.classId];
      if (shooter) {
        shooter.muzzleFlashUntil = now + 75;
        shooter.recoilOffset = spec.weapon.recoilKick;
      }
      for (const pel of ev.pellets) {
        this.spawnBullet(
          ev.playerId,
          ev.callsign,
          ev.classId,
          ev.x,
          ev.y,
          pel.angle,
          spec.weapon.damage
        );
      }
      this.emitSonar(ev.x, ev.y, 460, "#f43f5e", ev.playerId, "gunshot");
      this.playSpatialWeaponSound(ev.x, ev.y, spec.weapon.soundType);
    } else if (ev.type === "peer_hit") {
      if (ev.targetId === this.localPlayerId && this.localPlayer?.alive) {
        const attacker = this.operators.find((o) => o.id === ev.attackerId);
        this.applyDamageToOperator(
          this.localPlayer,
          ev.damage,
          ev.armorPen,
          attacker ?? null,
          ev.attackerName,
          ev.weaponName,
          now
        );
      }
    } else if (ev.type === "peer_ability") {
      const peer = this.operators.find((o) => o.id === ev.playerId);
      if (peer) {
        this.activateOperatorAbility(peer, now, false);
      }
    } else if (ev.type === "peer_kill") {
      this.pushKillFeed(
        ev.killerName,
        ev.victimName,
        ev.weaponName,
        ev.killerId === this.localPlayerId || ev.victimId === this.localPlayerId
      );
      const victim = this.operators.find((o) => o.id === ev.victimId);
      if (victim && victim.alive && !victim.isLocalPlayer) {
        victim.alive = false;
        this.spawnEliminationBurst(victim.x, victim.y, OPERATORS[victim.classId].accentColor);
      }
    } else if (ev.type === "peer_leave") {
      const idx = this.operators.findIndex(
        (o) => o.id === ev.playerId && o.isRemoteHuman
      );
      if (idx !== -1) {
        this.operators[idx].alive = false;
      }
    }
  }

  private upsertRemotePeer(peer: MultiplayerPeerState) {
    if (peer.playerId === this.localPlayerId) return;
    let existing = this.operators.find((o) => o.id === peer.playerId);
    if (!existing) {
      // Replace an alive bot if we already hit TOTAL_COMBATANTS so total stays crisp
      const botToReplace = this.operators.find(
        (o) => !o.isLocalPlayer && !o.isRemoteHuman && o.alive
      );
      if (botToReplace) {
        botToReplace.alive = false;
      }
      existing = this.createOperator({
        id: peer.playerId,
        name: peer.callsign,
        classId: peer.classId,
        skinId: peer.skinId ?? DEFAULT_SKIN_BY_CLASS[peer.classId],
        x: peer.x,
        y: peer.y,
        isLocalPlayer: false,
        isRemoteHuman: true,
      });
      this.operators.push(existing);
    }

    existing.name = peer.callsign;
    existing.classId = peer.classId;
    if (peer.skinId) existing.skinId = peer.skinId;
    existing.targetX = peer.x;
    existing.targetY = peer.y;
    existing.vx = peer.vx;
    existing.vy = peer.vy;
    existing.targetAngle = peer.angle;
    existing.hp = peer.hp;
    existing.maxHp = peer.maxHp;
    existing.armor = peer.armor;
    existing.maxArmor = peer.maxArmor;
    existing.alive = peer.alive;
    existing.stealth = peer.stealth;
    existing.kills = peer.kills;
    if (peer.abilityActive) {
      existing.abilityActiveUntil = Math.max(
        existing.abilityActiveUntil,
        performance.now() + 300
      );
    }
  }

  // --- MAIN 60FPS GAME LOOP ---
  private startLoop() {
    this.lastFrameTime = performance.now();
    const tick = (now: number) => {
      const rawDt = (now - this.lastFrameTime) / 1000;
      this.lastFrameTime = now;
      const dt = Math.min(0.05, Math.max(0.001, rawDt));
      if (rawDt > 0) {
        this.fpsAvg = this.fpsAvg * 0.92 + (1 / rawDt) * 0.08;
      }

      if (this.phase === "playing" || this.isDemoMode) {
        this.update(dt, now);
      }

      this.renderFrame(now);
      this.rafId = requestAnimationFrame(tick);
    };
    this.rafId = requestAnimationFrame(tick);
  }

  private update(dt: number, now: number) {
    this.matchElapsedSec += dt;

    // Update storm shrink
    const stormProgress = Math.min(1, this.matchElapsedSec / STORM_DURATION_SEC);
    this.stormRadius =
      this.stormStartRadius -
      (this.stormStartRadius - this.stormMinRadius) * stormProgress;

    // Keep demo endless & lively!
    if (this.isDemoMode) {
      const aliveDemo = this.operators.filter((o) => o.alive);
      if (aliveDemo.length <= 2 || this.matchElapsedSec > 75) {
        this.startAttractDemo();
        return;
      }
      if (!this.localPlayer || !this.localPlayer.alive) {
        this.localPlayer = aliveDemo[0] ?? null;
        this.demoFocusId = this.localPlayer?.id ?? null;
      }
    }

    // Update local player controls
    if (!this.isDemoMode && this.localPlayer && this.localPlayer.alive) {
      this.updateLocalPlayer(this.localPlayer, dt, now);
    }

    // Update bots and remote human peers
    for (let i = 0; i < this.operators.length; i++) {
      const op = this.operators[i];
      if (!op.alive) continue;

      // Decay visual flashes & weapon recoil
      op.recoilOffset = Math.max(0, op.recoilOffset - dt * 26);
      op.hitFlash = Math.max(0, op.hitFlash - dt * 6);

      // Finish reloads
      if (op.reloadingUntil > 0 && now >= op.reloadingUntil) {
        op.ammo = op.magSize;
        op.reloadingUntil = 0;
      }

      if (op.isRemoteHuman) {
        this.updateRemotePeer(op, dt, now);
      } else if (!op.isLocalPlayer || this.isDemoMode) {
        this.updateBotAI(op, dt, now);
      }

      // Check loot pickups
      this.checkLootPickups(op, now);
    }

    // Storm tick damage every 0.85s
    if (now - this.lastStormTickAt > 850) {
      this.lastStormTickAt = now;
      for (const op of this.operators) {
        if (!op.alive || op.isRemoteHuman) continue;
        const d = Math.hypot(op.x - this.stormX, op.y - this.stormY);
        if (d > this.stormRadius) {
          this.applyDamageToOperator(op, 7, 1.0, null, "RED HAZARD", "TOXIC RING", now);
        }
      }
    }

    // Update bullets
    this.updateBullets(dt, now);

    // Update barrels hit flash
    for (const b of this.map.barrels) {
      if (b.hitFlash > 0) b.hitFlash = Math.max(0, b.hitFlash - dt * 6);
    }

    // Update particles, ripples, floating texts, damage arcs
    this.updateEffects(dt);

    // Compute raycasted visibility polygons for current viewer
    this.updateVisibility(now);

    // Smooth camera tracking + look-ahead + drop-in zoom
    this.updateCamera(dt);

    // Broadcast pose in multiplayer (~18Hz)
    if (
      !this.isDemoMode &&
      this.mode === "multiplayer" &&
      this.roomCode &&
      this.localPlayer &&
      now - this.lastSyncSentAt > 56
    ) {
      this.lastSyncSentAt = now;
      const p = this.localPlayer;
      this.sendMultiplayerSync({
        playerId: p.id,
        callsign: p.name,
        classId: p.classId,
        skinId: p.skinId,
        x: Math.round(p.x * 10) / 10,
        y: Math.round(p.y * 10) / 10,
        vx: Math.round(p.vx),
        vy: Math.round(p.vy),
        angle: Math.round(p.angle * 1000) / 1000,
        hp: Math.round(p.hp),
        maxHp: p.maxHp,
        armor: Math.round(p.armor),
        maxArmor: p.maxArmor,
        alive: p.alive,
        stealth: p.stealth,
        kills: p.kills,
        abilityActive: now < p.abilityActiveUntil,
        updatedAt: Date.now(),
      });
    }

    // Check Victory / Game Over condition
    if (!this.isDemoMode && !this.matchEnded && this.localPlayer) {
      const aliveOps = this.operators.filter((o) => o.alive);
      if (!this.localPlayer.alive) {
        this.finalizeMatch(false, aliveOps.length + 1);
      } else if (aliveOps.length <= 1) {
        this.finalizeMatch(true, 1);
      }
    }

    // Throttled HUD snapshot to React (~12Hz)
    if (!this.isDemoMode && now - this.lastHudPush > 80) {
      this.lastHudPush = now;
      this.pushHudSnapshot(now);
    }
  }

  private updateLocalPlayer(p: OperatorEntity, dt: number, now: number) {
    const spec = OPERATORS[p.classId];
    let mx = 0;
    let my = 0;
    let stealth = this.keys.has("ShiftLeft") || this.keys.has("ShiftRight");

    if (this.isTouchMode && this.leftStick.active) {
      const dx = (this.leftStick.currentX - this.leftStick.originX) / this.leftStick.radius;
      const dy = (this.leftStick.currentY - this.leftStick.originY) / this.leftStick.radius;
      const mag = Math.hypot(dx, dy);
      if (mag > 0.12) {
        mx = dx / mag;
        my = dy / mag;
        if (mag < 0.54) stealth = true;
      }
    } else {
      if (this.keys.has("KeyW") || this.keys.has("ArrowUp")) my -= 1;
      if (this.keys.has("KeyS") || this.keys.has("ArrowDown")) my += 1;
      if (this.keys.has("KeyA") || this.keys.has("ArrowLeft")) mx -= 1;
      if (this.keys.has("KeyD") || this.keys.has("ArrowRight")) mx += 1;
      const mag = Math.hypot(mx, my);
      if (mag > 0) {
        mx /= mag;
        my /= mag;
      }
    }

    p.stealth = stealth;
    const abilityActive = now < p.abilityActiveUntil;
    const speedBoost =
      abilityActive && (p.classId === "spectre" || p.classId === "ghost")
        ? 1.28
        : 1.0;
    const speed = (stealth ? spec.stealthSpeed : spec.moveSpeed) * speedBoost;
    p.vx = mx * speed;
    p.vy = my * speed;
    this.moveOperatorWithCollision(p, p.vx * dt, p.vy * dt);

    // Footstep animation, subtle dust, and acoustic sonar emission
    const speedNow = Math.hypot(p.vx, p.vy);
    if (speedNow > 18) {
      p.stridePhase += dt * (stealth ? 7.5 : 13.5);
      p.noiseRadius = stealth ? 52 : 240;
      const stepInterval = stealth ? 470 : 285;
      if (now - p.lastStepAt > stepInterval) {
        p.lastStepAt = now;
        p.lastFootprintSide *= -1;
        soundEngine.playFootstep(stealth ? 0.16 : 0.42);
        this.addDecal({
          x: p.x + Math.cos(p.angle + Math.PI / 2) * 6 * p.lastFootprintSide,
          y: p.y + Math.sin(p.angle + Math.PI / 2) * 6 * p.lastFootprintSide,
          kind: "footprint",
          angle: p.angle,
          size: 5,
          alpha: 0.32,
          color: "#000000",
        });
        if (!stealth) {
          this.emitSonar(p.x, p.y, 175, "rgba(56, 189, 248, 0.45)", p.id, "footstep");
        }
      }
    } else {
      p.noiseRadius = 40;
    }

    // Aiming (Touch right stick OR Desktop mouse world cursor)
    let rightStickManualFire = false;
    if (this.isTouchMode) {
      if (this.rightStick.active) {
        const dx = this.rightStick.currentX - this.rightStick.originX;
        const dy = this.rightStick.currentY - this.rightStick.originY;
        const dist = Math.hypot(dx, dy);
        if (dist > 10) {
          p.angle = lerpAngle(p.angle, Math.atan2(dy, dx), Math.min(1, dt * 18));
        }
        if (dist > this.rightStick.radius * 0.85) {
          rightStickManualFire = true;
        }
      } else if (speedNow > 25) {
        // Auto-turn toward movement direction if right stick isn't held
        p.angle = lerpAngle(p.angle, Math.atan2(p.vy, p.vx), Math.min(1, dt * 8));
      }
    } else {
      const vw = window.innerWidth;
      const vh = window.innerHeight;
      const worldMouseX = (this.mouseScreenX - vw / 2) / this.zoom + this.cameraX;
      const worldMouseY = (this.mouseScreenY - vh / 2) / this.zoom + this.cameraY;
      p.angle = Math.atan2(worldMouseY - p.y, worldMouseX - p.x);
    }

    // Bullet Echo signature Auto-Fire Target Lock inside cone!
    const boosted = now < p.visionBoostUntil;
    const coneRange = Math.min(
      spec.weapon.bulletRange * (boosted ? 1.15 : 1),
      spec.visionRange * (boosted ? 1.24 : 1)
    );
    let lockedEnemy: OperatorEntity | null = null;
    let bestDist = Infinity;

    for (const enemy of this.operators) {
      if (!enemy.alive || enemy.id === p.id) continue;
      // Cannot auto-lock a cloaked Spectre unless very close
      const isCloaked =
        enemy.classId === "spectre" && now < enemy.abilityActiveUntil;
      const dist = Math.hypot(enemy.x - p.x, enemy.y - p.y);
      if (isCloaked && dist > 115) continue;

      if (
        dist < bestDist &&
        isTargetInFireCone(
          p.x,
          p.y,
          p.angle,
          spec.visionHalfAngle,
          coneRange,
          enemy.x,
          enemy.y,
          this.map.visionSegments
        )
      ) {
        bestDist = dist;
        lockedEnemy = enemy;
      }
    }

    const prevLock = p.targetLockedId;
    p.targetLockedId = lockedEnemy ? lockedEnemy.id : null;
    if (lockedEnemy && prevLock !== lockedEnemy.id) {
      soundEngine.playTargetLock();
    }

    // Fire when target is locked inside cone OR player holds manual fire
    const wantsToFire =
      Boolean(lockedEnemy) ||
      this.mouseDown ||
      this.manualFireButton ||
      rightStickManualFire;

    if (wantsToFire && now >= p.nextFireAt && p.reloadingUntil === 0) {
      const aimAt = lockedEnemy
        ? Math.atan2(lockedEnemy.y - p.y, lockedEnemy.x - p.x)
        : p.angle;
      // Blend slightly toward locked enemy for buttery Bullet Echo auto-aim feel
      const fireAngle = lockedEnemy ? lerpAngle(p.angle, aimAt, 0.72) : p.angle;
      this.fireWeapon(p, fireAngle, now);
    }
  }

  private updateRemotePeer(op: OperatorEntity, dt: number, now: number) {
    // Smooth interpolation + dead-reckoning for remote human peers
    const lerpRate = Math.min(1, dt * 14);
    op.x += (op.targetX - op.x) * lerpRate;
    op.y += (op.targetY - op.y) * lerpRate;
    op.angle = lerpAngle(op.angle, op.targetAngle, Math.min(1, dt * 16));

    const spd = Math.hypot(op.vx, op.vy);
    if (spd > 20) {
      op.stridePhase += dt * (op.stealth ? 7.5 : 13.5);
      if (!op.stealth && now - op.lastStepAt > 310) {
        op.lastStepAt = now;
        this.emitSonar(op.x, op.y, 175, "rgba(251, 146, 60, 0.7)", op.id, "footstep");
        if (this.localPlayer) {
          const d = Math.hypot(op.x - this.localPlayer.x, op.y - this.localPlayer.y);
          if (d < 520) {
            soundEngine.playFootstep((1 - d / 520) * 0.35);
          }
        }
      }
    }
  }

  private updateBotAI(bot: OperatorEntity, dt: number, now: number) {
    const spec = OPERATORS[bot.classId];

    // 1. Scan for visible enemies inside bot's vision cone
    let seenEnemy: OperatorEntity | null = null;
    let bestEnemyDist = Infinity;
    for (const other of this.operators) {
      if (!other.alive || other.id === bot.id) continue;
      const dist = Math.hypot(other.x - bot.x, other.y - bot.y);
      const isCloaked =
        other.classId === "spectre" && now < other.abilityActiveUntil;
      if (isCloaked && dist > 115) continue;

      if (
        dist < bestEnemyDist &&
        isPointVisibleToOperator(
          bot.x,
          bot.y,
          bot.angle,
          spec.visionHalfAngle * 1.15,
          spec.visionRange * 0.94,
          105,
          other.x,
          other.y,
          this.map.visionSegments
        )
      ) {
        bestEnemyDist = dist;
        seenEnemy = other;
      }
    }

    if (seenEnemy) {
      bot.aiLastSeenEnemy = {
        x: seenEnemy.x,
        y: seenEnemy.y,
        id: seenEnemy.id,
        at: now,
      };
    }

    // 2. React to nearby acoustic sonar ripples (hearing!)
    if (!seenEnemy && (!bot.aiInvestigate || now > bot.aiInvestigate.until)) {
      for (let i = this.ripples.length - 1; i >= 0; i--) {
        const r = this.ripples[i];
        if (r.ownerId === bot.id) continue;
        const d = Math.hypot(r.x - bot.x, r.y - bot.y);
        if (d < spec.hearingRange * 0.85 && r.alpha > 0.35) {
          bot.aiInvestigate = { x: r.x, y: r.y, until: now + 3800 };
          break;
        }
      }
    }

    // 3. Decide tactical objective
    const distFromStorm = Math.hypot(bot.x - this.stormX, bot.y - this.stormY);
    const outsideSafe = distFromStorm > this.stormRadius - 95;

    let desiredX = bot.x;
    let desiredY = bot.y;
    let desiredAngle = bot.angle;
    let moveFactor = 0.85;

    if (outsideSafe) {
      bot.aiState = "flee_storm";
      desiredX = this.stormX;
      desiredY = this.stormY;
      desiredAngle = Math.atan2(desiredY - bot.y, desiredX - bot.x);
      moveFactor = 1.0;
    } else if (seenEnemy) {
      bot.aiState = "combat";
      const toEnemyAngle = Math.atan2(seenEnemy.y - bot.y, seenEnemy.x - bot.x);
      desiredAngle = toEnemyAngle;

      // Ideal engagement range by operator role
      const idealDist =
        bot.classId === "bastion"
          ? 160
          : bot.classId === "ghost"
            ? 430
            : 270;

      if (now > (bot.aiDecisionAt ?? 0)) {
        bot.aiDecisionAt = now + 900 + Math.random() * 900;
        bot.aiStrafeDir = Math.random() > 0.5 ? 1 : -1;
      }

      const strafeAng = toEnemyAngle + (Math.PI / 2) * (bot.aiStrafeDir ?? 1);
      const radialPush =
        bestEnemyDist > idealDist + 55
          ? 0.65
          : bestEnemyDist < idealDist - 55
            ? -0.55
            : 0;

      desiredX =
        bot.x +
        (Math.cos(toEnemyAngle) * radialPush + Math.cos(strafeAng) * 0.72) * 140;
      desiredY =
        bot.y +
        (Math.sin(toEnemyAngle) * radialPush + Math.sin(strafeAng) * 0.72) * 140;
      moveFactor = 0.88;

      // Trigger bot tactical ability smartly in combat
      if (now >= bot.abilityReadyAt && (bot.hp < bot.maxHp * 0.75 || bestEnemyDist < 280)) {
        this.activateOperatorAbility(bot, now, false);
      }

      // Fire when reasonably aimed at target
      const aimErr = Math.abs(normalizeAngle(toEnemyAngle - bot.angle));
      if (
        aimErr < 0.17 &&
        bestEnemyDist <= spec.weapon.bulletRange &&
        now >= bot.nextFireAt &&
        bot.reloadingUntil === 0
      ) {
        // Human-like slight spread so bots feel fun & beatable
        const botSpread = (Math.random() - 0.5) * 0.16;
        this.fireWeapon(bot, bot.angle + botSpread, now);
      }
    } else if (bot.aiInvestigate && now < bot.aiInvestigate.until) {
      bot.aiState = "hunt";
      desiredX = bot.aiInvestigate.x;
      desiredY = bot.aiInvestigate.y;
      desiredAngle = Math.atan2(desiredY - bot.y, desiredX - bot.x);
      moveFactor = 0.82;
      if (Math.hypot(desiredX - bot.x, desiredY - bot.y) < 42) {
        bot.aiInvestigate = null;
      }
    } else {
      // Look for nearby useful loot first
      let bestLoot = null;
      let bestLootDist = 340;
      for (const item of this.map.loot) {
        if (item.collected) continue;
        if (item.kind === "medkit" && bot.hp > bot.maxHp * 0.82) continue;
        if (item.kind === "armor" && bot.armor > bot.maxArmor * 0.82) continue;
        const d = Math.hypot(item.x - bot.x, item.y - bot.y);
        if (d < bestLootDist) {
          bestLootDist = d;
          bestLoot = item;
        }
      }

      if (bestLoot) {
        bot.aiState = "loot";
        desiredX = bestLoot.x;
        desiredY = bestLoot.y;
        desiredAngle = Math.atan2(desiredY - bot.y, desiredX - bot.x);
        moveFactor = 0.9;
      } else {
        bot.aiState = "patrol";
        if (
          !bot.aiWaypoint ||
          Math.hypot(bot.aiWaypoint.x - bot.x, bot.aiWaypoint.y - bot.y) < 55 ||
          now > (bot.aiDecisionAt ?? 0)
        ) {
          bot.aiDecisionAt = now + 3500 + Math.random() * 2500;
          // Pick a clear waypoint inside the storm circle
          const angle = Math.random() * Math.PI * 2;
          const dist = Math.random() * Math.max(180, this.stormRadius * 0.72);
          const wx = Math.max(100, Math.min(ARENA_WIDTH - 100, this.stormX + Math.cos(angle) * dist));
          const wy = Math.max(100, Math.min(ARENA_HEIGHT - 100, this.stormY + Math.sin(angle) * dist));
          if (isPointClearOfObstacles(wx, wy, 28, this.map.obstacles)) {
            bot.aiWaypoint = { x: wx, y: wy };
          }
        }
        if (bot.aiWaypoint) {
          desiredX = bot.aiWaypoint.x;
          desiredY = bot.aiWaypoint.y;
          desiredAngle = Math.atan2(desiredY - bot.y, desiredX - bot.x);
          moveFactor = 0.74;
        }
      }
    }

    // Move bot with simple obstacle avoidance whisker
    const dx = desiredX - bot.x;
    const dy = desiredY - bot.y;
    const distToGoal = Math.hypot(dx, dy);
    if (distToGoal > 10) {
      let moveAngle = Math.atan2(dy, dx);
      const probeX = bot.x + Math.cos(moveAngle) * 38;
      const probeY = bot.y + Math.sin(moveAngle) * 38;
      if (!isPointClearOfObstacles(probeX, probeY, bot.radius + 4, this.map.obstacles)) {
        // Steer around obstacle
        const leftClear = isPointClearOfObstacles(
          bot.x + Math.cos(moveAngle - 1.05) * 42,
          bot.y + Math.sin(moveAngle - 1.05) * 42,
          bot.radius + 2,
          this.map.obstacles
        );
        moveAngle += leftClear ? -1.1 : 1.1;
      }

      const abilityBoost =
        now < bot.abilityActiveUntil && (bot.classId === "spectre" || bot.classId === "ghost")
          ? 1.24
          : 1;
      const spd = spec.moveSpeed * moveFactor * abilityBoost;
      bot.vx = Math.cos(moveAngle) * spd;
      bot.vy = Math.sin(moveAngle) * spd;
      this.moveOperatorWithCollision(bot, bot.vx * dt, bot.vy * dt);

      bot.stridePhase += dt * 11;
      if (now - bot.lastStepAt > 340) {
        bot.lastStepAt = now;
        const rippleColor =
          this.localPlayer && this.localPlayer.id === bot.id
            ? "rgba(56, 189, 248, 0.4)"
            : "rgba(251, 146, 60, 0.65)";
        this.emitSonar(bot.x, bot.y, 165, rippleColor, bot.id, "footstep");
        if (this.localPlayer && !this.isDemoMode) {
          const d = Math.hypot(bot.x - this.localPlayer.x, bot.y - this.localPlayer.y);
          if (d < 470) {
            soundEngine.playFootstep((1 - d / 470) * 0.28);
          }
        }
      }
    } else {
      bot.vx = 0;
      bot.vy = 0;
    }

    bot.angle = lerpAngle(bot.angle, desiredAngle, Math.min(1, dt * 8.5));
  }

  private moveOperatorWithCollision(op: OperatorEntity, dx: number, dy: number) {
    op.x += dx;
    op.y += dy;

    // Clamp to arena interior
    op.x = Math.max(54, Math.min(this.map.width - 54, op.x));
    op.y = Math.max(54, Math.min(this.map.height - 54, op.y));

    // Circle-vs-AABB resolution for smooth corner sliding
    for (let i = 0; i < this.map.obstacles.length; i++) {
      const o = this.map.obstacles[i];
      const nearestX = Math.max(o.x, Math.min(op.x, o.x + o.w));
      const nearestY = Math.max(o.y, Math.min(op.y, o.y + o.h));
      const diffX = op.x - nearestX;
      const diffY = op.y - nearestY;
      const distSq = diffX * diffX + diffY * diffY;
      const r = op.radius;

      if (distSq < r * r) {
        const dist = Math.sqrt(distSq);
        if (dist > 0.0001) {
          const push = r - dist;
          op.x += (diffX / dist) * push;
          op.y += (diffY / dist) * push;
        } else {
          // Inside box edge fallback
          const leftPen = op.x - o.x;
          const rightPen = o.x + o.w - op.x;
          const topPen = op.y - o.y;
          const botPen = o.y + o.h - op.y;
          const minPen = Math.min(leftPen, rightPen, topPen, botPen);
          if (minPen === leftPen) op.x = o.x - r;
          else if (minPen === rightPen) op.x = o.x + o.w + r;
          else if (minPen === topPen) op.y = o.y - r;
          else op.y = o.y + o.h + r;
        }
      }
    }

    // Soft separation from explosive barrels
    for (let i = 0; i < this.map.barrels.length; i++) {
      const b = this.map.barrels[i];
      if (!b.alive) continue;
      const bdx = op.x - b.x;
      const bdy = op.y - b.y;
      const minD = op.radius + b.radius;
      const dSq = bdx * bdx + bdy * bdy;
      if (dSq < minD * minD && dSq > 0.001) {
        const d = Math.sqrt(dSq);
        const push = minD - d;
        op.x += (bdx / d) * push;
        op.y += (bdy / d) * push;
      }
    }
  }

  private fireWeapon(shooter: OperatorEntity, baseAngle: number, now: number) {
    const spec = OPERATORS[shooter.classId];
    const w = spec.weapon;
    const overdrive =
      shooter.classId === "ghost" && now < shooter.abilityActiveUntil;
    const baseInterval = overdrive ? w.fireRateMs * 0.56 : w.fireRateMs;
    // Player weapons feel more responsive; AI opponents fire less often.
    const fireInterval = baseInterval * (shooter.isLocalPlayer ? 0.72 : 1.28);

    shooter.nextFireAt = now + fireInterval;
    shooter.ammo = Math.max(0, shooter.ammo - 1);
    shooter.muzzleFlashUntil = now + 70;
    shooter.recoilOffset = w.recoilKick;

    // Auto-reload when magazine emptied
    if (shooter.ammo <= 0) {
      shooter.reloadingUntil = now + w.reloadMs;
      if (shooter.isLocalPlayer && !this.isDemoMode) {
        soundEngine.playReload();
      }
    }

    const muzzleDist = shooter.classId === "ghost" ? 36 : 28;
    const mx = shooter.x + Math.cos(baseAngle) * muzzleDist;
    const my = shooter.y + Math.sin(baseAngle) * muzzleDist;
    const dmgBoost = now < shooter.damageBoostUntil ? 1.2 : 1.0;

    const skin = getSkinById(shooter.skinId, shooter.classId);
    const pelletsPayload: { angle: number }[] = [];

    for (let p = 0; p < w.pellets; p++) {
      const spread = (Math.random() - 0.5) * w.spreadRad;
      const shotAngle = baseAngle + spread;
      pelletsPayload.push({ angle: shotAngle });
      this.spawnBullet(
        shooter.id,
        shooter.name,
        shooter.classId,
        mx,
        my,
        shotAngle,
        Math.round(w.damage * dmgBoost * (shooter.isLocalPlayer ? 1 : 0.78)),
        skin.tracerColor
      );
    }

    if (shooter.isLocalPlayer && !this.isDemoMode) {
      this.shotsFired += 1;
      this.addShake(w.shakeAmount * 0.08);
      soundEngine.playWeaponFire(w.soundType, 0.9);
      if (this.mode === "multiplayer" && this.roomCode) {
        this.sendMultiplayerSync(undefined, {
          type: "peer_fire",
          playerId: shooter.id,
          callsign: shooter.name,
          classId: shooter.classId,
          x: mx,
          y: my,
          angle: baseAngle,
          pellets: pelletsPayload,
        });
      }
    } else {
      this.playSpatialWeaponSound(shooter.x, shooter.y, w.soundType);
    }

    // Muzzle flash sparks & ejecting brass shell casing!
    for (let i = 0; i < 4; i++) {
      const a = baseAngle + (Math.random() - 0.5) * 0.7;
      const spd = 120 + Math.random() * 190;
      this.spawnParticle({
        x: mx,
        y: my,
        vx: Math.cos(a) * spd,
        vy: Math.sin(a) * spd,
        size: 2.4 + Math.random() * 2,
        color: w.muzzleColor,
        alpha: 0.95,
        life: 0.14 + Math.random() * 0.1,
        maxLife: 0.24,
        drag: 0.9,
        kind: "spark",
      });
    }

    // Eject brass shell to the right of operator
    const ejectAngle = baseAngle + Math.PI / 2 + (Math.random() - 0.5) * 0.45;
    const ejectSpd = 65 + Math.random() * 45;
    this.spawnParticle({
      x: shooter.x + Math.cos(baseAngle) * 10,
      y: shooter.y + Math.sin(baseAngle) * 10,
      vx: Math.cos(ejectAngle) * ejectSpd,
      vy: Math.sin(ejectAngle) * ejectSpd,
      size: 3,
      color: "#facc15",
      alpha: 0.9,
      life: 0.35,
      maxLife: 0.35,
      drag: 0.88,
      kind: "shell",
      rotation: Math.random() * Math.PI * 2,
      vRot: (Math.random() - 0.5) * 20,
    });
    this.addDecal({
      x: shooter.x + Math.cos(ejectAngle) * 18,
      y: shooter.y + Math.sin(ejectAngle) * 18,
      kind: "shell",
      angle: Math.random() * Math.PI * 2,
      size: 3,
      alpha: 0.45,
      color: "#facc15",
    });

    // Gunshots emit a dramatic loud crimson sonar ring!
    const soundRange = shooter.classId === "spectre" ? 260 : 520;
    this.emitSonar(
      shooter.x,
      shooter.y,
      soundRange,
      shooter.isLocalPlayer ? "rgba(56, 189, 248, 0.45)" : "rgba(244, 63, 94, 0.85)",
      shooter.id,
      "gunshot"
    );
  }

  private spawnBullet(
    ownerId: string,
    ownerName: string,
    ownerClass: OperatorClassId,
    x: number,
    y: number,
    angle: number,
    damage: number,
    tracerColor?: string
  ) {
    const w = OPERATORS[ownerClass].weapon;
    this.bullets.push({
      id: `b_${Math.random().toString(36).slice(2, 9)}`,
      ownerId,
      ownerName,
      ownerClass,
      x,
      y,
      prevX: x,
      prevY: y,
      vx: Math.cos(angle) * w.bulletSpeed,
      vy: Math.sin(angle) * w.bulletSpeed,
      damage,
      armorPen: w.armorPen,
      traveled: 0,
      maxRange: w.bulletRange,
      color: tracerColor ?? w.muzzleColor,
      width: w.tracerWidth,
      alive: true,
    });
  }

  private updateBullets(dt: number, now: number) {
    for (let i = this.bullets.length - 1; i >= 0; i--) {
      const b = this.bullets[i];
      if (!b.alive) {
        this.bullets.splice(i, 1);
        continue;
      }

      b.prevX = b.x;
      b.prevY = b.y;
      const stepX = b.vx * dt;
      const stepY = b.vy * dt;
      b.x += stepX;
      b.y += stepY;
      b.traveled += Math.hypot(stepX, stepY);

      if (
        b.traveled >= b.maxRange ||
        b.x < 40 ||
        b.x > this.map.width - 40 ||
        b.y < 40 ||
        b.y > this.map.height - 40
      ) {
        b.alive = false;
        this.bullets.splice(i, 1);
        continue;
      }

      // Check obstacle impact
      let hitWall = false;
      for (let j = 0; j < this.map.obstacles.length; j++) {
        const o = this.map.obstacles[j];
        if (!o.blocksBullets) continue;
        if (b.x >= o.x && b.x <= o.x + o.w && b.y >= o.y && b.y <= o.y + o.h) {
          hitWall = true;
          this.spawnWallSparks(b.x, b.y, Math.atan2(-b.vy, -b.vx));
          if (this.localPlayer && !this.isDemoMode) {
            const d = Math.hypot(b.x - this.localPlayer.x, b.y - this.localPlayer.y);
            if (d < 480) soundEngine.playRicochet((1 - d / 480) * 0.45);
          }
          break;
        }
      }
      if (hitWall) {
        b.alive = false;
        this.bullets.splice(i, 1);
        continue;
      }

      // Check explosive barrel hits
      let hitBarrel = false;
      for (let j = 0; j < this.map.barrels.length; j++) {
        const bar = this.map.barrels[j];
        if (!bar.alive) continue;
        const d = Math.hypot(b.x - bar.x, b.y - bar.y);
        if (d <= bar.radius + 4) {
          hitBarrel = true;
          bar.hp -= b.damage;
          bar.hitFlash = 1;
          this.spawnWallSparks(b.x, b.y, Math.atan2(-b.vy, -b.vx));
          if (bar.hp <= 0) {
            const attacker = this.operators.find((o) => o.id === b.ownerId) ?? null;
            this.detonateBarrel(bar, attacker, now);
          }
          break;
        }
      }
      if (hitBarrel) {
        b.alive = false;
        this.bullets.splice(i, 1);
        continue;
      }

      // Check operator hits
      for (let j = 0; j < this.operators.length; j++) {
        const op = this.operators[j];
        if (!op.alive || op.id === b.ownerId) continue;

        const d = Math.hypot(b.x - op.x, b.y - op.y);
        if (d <= op.radius + 4) {
          // Check Bastion's Frontal Aegis Plasma Shield!
          if (op.classId === "bastion" && now < op.abilityActiveUntil) {
            const incomingAngle = Math.atan2(b.prevY - op.y, b.prevX - op.x);
            const rel = Math.abs(normalizeAngle(incomingAngle - op.angle));
            if (rel < 1.05) {
              // Blocked by energy shield!
              this.spawnShieldDeflect(b.x, b.y);
              if (this.localPlayer && !this.isDemoMode) {
                const dist = Math.hypot(b.x - this.localPlayer.x, b.y - this.localPlayer.y);
                if (dist < 540) soundEngine.playRicochet(0.8);
              }
              if (b.ownerId === this.localPlayerId) {
                this.spawnFloatingText(op.x, op.y - 24, "BLOCKED", "#fbbf24", 11);
              }
              b.alive = false;
              break;
            }
          }

          const attacker = this.operators.find((o) => o.id === b.ownerId) ?? null;
          const weaponName = OPERATORS[b.ownerClass].weapon.name;

          if (b.ownerId === this.localPlayerId && !this.isDemoMode) {
            this.shotsHit += 1;
          }

          // If hitting a remote human player in multiplayer, relay authoritative PvP hit event
          if (
            op.isRemoteHuman &&
            b.ownerId === this.localPlayerId &&
            this.mode === "multiplayer"
          ) {
            this.sendMultiplayerSync(undefined, {
              type: "peer_hit",
              attackerId: b.ownerId,
              attackerName: b.ownerName,
              targetId: op.id,
              damage: b.damage,
              armorPen: b.armorPen,
              weaponName,
            });
          }

          this.applyDamageToOperator(
            op,
            b.damage,
            b.armorPen,
            attacker,
            b.ownerName,
            weaponName,
            now
          );

          b.alive = false;
          break;
        }
      }

      if (!b.alive) {
        this.bullets.splice(i, 1);
      }
    }
  }

  private applyDamageToOperator(
    victim: OperatorEntity,
    rawDamage: number,
    armorPen: number,
    attacker: OperatorEntity | null,
    attackerName: string,
    weaponName: string,
    now: number
  ) {
    if (!victim.alive) return;

    const prevArmor = victim.armor;
    const armorPortion = rawDamage * (1 - armorPen);
    const absorbed = Math.min(victim.armor, armorPortion);
    victim.armor = Math.max(0, victim.armor - absorbed);
    const hpDamage = Math.max(1, Math.round(rawDamage - absorbed * 0.72));
    victim.hp = Math.max(0, victim.hp - hpDamage);
    victim.hitFlash = 1;

    const armorCracked = prevArmor > 0 && victim.armor <= 0;
    const killed = victim.hp <= 0;

    // Impact particles
    for (let i = 0; i < (armorCracked ? 10 : 5); i++) {
      const a = Math.random() * Math.PI * 2;
      const spd = 70 + Math.random() * 140;
      this.spawnParticle({
        x: victim.x,
        y: victim.y,
        vx: Math.cos(a) * spd,
        vy: Math.sin(a) * spd,
        size: armorCracked ? 4.2 : 3.2,
        color: absorbed > 0 ? "#38bdf8" : "#f43f5e",
        alpha: 0.95,
        life: 0.25 + Math.random() * 0.2,
        maxLife: 0.45,
        drag: 0.9,
        kind: absorbed > 0 ? "armor" : "blood",
        rotation: Math.random() * Math.PI * 2,
        vRot: (Math.random() - 0.5) * 14,
      });
    }

    // Local player took damage feedback!
    if (victim.isLocalPlayer && !this.isDemoMode) {
      this.hurtVignette = Math.min(1, this.hurtVignette + 0.55);
      this.addShake(0.32);
      soundEngine.playPlayerHurt();
      if (attacker) {
        const ang = Math.atan2(attacker.y - victim.y, attacker.x - victim.x);
        this.damageIndicators.push({ angle: ang, alpha: 1 });
      }
      if (killed) {
        this.eliminatedBy = attackerName;
      }
    }

    // Local player dealt damage feedback!
    if (attacker && attacker.isLocalPlayer && !this.isDemoMode && !victim.isLocalPlayer) {
      this.damageDealt += hpDamage + Math.round(absorbed);
      this.hitmarkerAlpha = 1;
      this.hitmarkerKill = killed;
      soundEngine.playHitmarker(killed, armorCracked);

      const dmgColor = killed
        ? "#fbbf24"
        : armorCracked
          ? "#38bdf8"
          : absorbed > 0
            ? "#bae6fd"
            : "#fda4af";
      const label = armorCracked ? `CRACK -${hpDamage}` : `-${hpDamage}`;
      this.spawnFloatingText(
        victim.x + (Math.random() - 0.5) * 18,
        victim.y - 24,
        label,
        dmgColor,
        killed ? 15 : 12
      );
    }

    // Elimination handling
    if (killed) {
      victim.alive = false;
      const accent = OPERATORS[victim.classId].accentColor;
      this.spawnEliminationBurst(victim.x, victim.y, accent);
      this.addDecal({
        x: victim.x,
        y: victim.y,
        kind: "elimination",
        angle: 0,
        size: 16,
        alpha: 0.45,
        color: accent,
      });

      // Drop tactical reward loot where operator fell!
      const dropKind: LootKind = Math.random() > 0.45 ? "armor" : "medkit";
      this.map.loot.push({
        id: `drop_${Date.now()}_${Math.random()}`,
        x: victim.x,
        y: victim.y,
        kind: dropKind,
        collected: false,
        bobPhase: 0,
        value: 45,
      });

      if (attacker && attacker.id !== victim.id) {
        attacker.kills += 1;
        if (attacker.isLocalPlayer && !this.isDemoMode) {
          this.streak += 1;
          this.addShake(0.45);
          let extra = 0;
          let bonusLabel = `ELIMINATED +${SCORE_CONFIG.KILL_BASE}`;
          if (attacker.stealth || now < attacker.abilityActiveUntil) {
            this.stealthKills += 1;
          }
          if (!this.firstBloodAwarded) {
            this.firstBloodAwarded = true;
            extra += SCORE_CONFIG.FIRST_BLOOD_BONUS;
            bonusLabel = `FIRST BLOOD +${SCORE_CONFIG.KILL_BASE + extra}`;
          } else if (this.streak >= 2) {
            extra += SCORE_CONFIG.STREAK_BONUS;
            bonusLabel = `${this.streak}x STREAK +${SCORE_CONFIG.KILL_BASE + extra}`;
          } else if (attacker.stealth || now < attacker.abilityActiveUntil) {
            extra += SCORE_CONFIG.STEALTH_KILL_BONUS;
            bonusLabel = `TACTICAL KILL +${SCORE_CONFIG.KILL_BASE + extra}`;
          }
          this.bonusScore += extra;
          this.spawnFloatingText(victim.x, victim.y - 42, bonusLabel, "#facc15", 14);

          if (this.mode === "multiplayer" && this.roomCode) {
            this.sendMultiplayerSync(undefined, {
              type: "peer_kill",
              killerId: attacker.id,
              killerName: attacker.name,
              victimId: victim.id,
              victimName: victim.name,
              weaponName,
            });
          }
        }
      }

      this.pushKillFeed(
        attackerName,
        victim.name,
        weaponName,
        victim.isLocalPlayer || Boolean(attacker?.isLocalPlayer)
      );
    }
  }

  private detonateBarrel(
    barrel: ArenaMap["barrels"][number],
    attacker: OperatorEntity | null,
    now: number
  ) {
    if (!barrel.alive) return;
    barrel.alive = false;

    if (attacker && attacker.isLocalPlayer && !this.isDemoMode) {
      this.barrelsDetonated += 1;
    }

    const blastRadius = 175;
    if (this.localPlayer && !this.isDemoMode) {
      const dist = Math.hypot(
        barrel.x - this.localPlayer.x,
        barrel.y - this.localPlayer.y
      );
      const vol = Math.max(0.15, 1 - dist / 950);
      soundEngine.playExplosion(vol);
      if (dist < 650) {
        this.addShake((1 - dist / 650) * 0.85);
      }
    }

    // Scorch decal
    this.addDecal({
      x: barrel.x,
      y: barrel.y,
      kind: "scorch",
      angle: Math.random() * Math.PI * 2,
      size: 62,
      alpha: 0.85,
      color: "#000000",
    });

    // Dramatic explosion flash + shockwave + embers + smoke
    this.spawnParticle({
      x: barrel.x,
      y: barrel.y,
      vx: 0,
      vy: 0,
      size: 95,
      color: "#fb923c",
      alpha: 1,
      life: 0.24,
      maxLife: 0.24,
      drag: 1,
      kind: "flash",
    });
    this.spawnParticle({
      x: barrel.x,
      y: barrel.y,
      vx: 0,
      vy: 0,
      size: blastRadius * 0.65,
      color: "#fde047",
      alpha: 0.9,
      life: 0.36,
      maxLife: 0.36,
      drag: 1,
      kind: "ring",
    });
    for (let i = 0; i < 26; i++) {
      const a = Math.random() * Math.PI * 2;
      const spd = 90 + Math.random() * 290;
      this.spawnParticle({
        x: barrel.x,
        y: barrel.y,
        vx: Math.cos(a) * spd,
        vy: Math.sin(a) * spd,
        size: 3 + Math.random() * 5,
        color: i % 3 === 0 ? "#fde047" : i % 3 === 1 ? "#f97316" : "#ef4444",
        alpha: 0.95,
        life: 0.35 + Math.random() * 0.35,
        maxLife: 0.7,
        drag: 0.92,
        kind: "spark",
      });
    }
    for (let i = 0; i < 10; i++) {
      const a = Math.random() * Math.PI * 2;
      const spd = 25 + Math.random() * 75;
      this.spawnParticle({
        x: barrel.x,
        y: barrel.y,
        vx: Math.cos(a) * spd,
        vy: Math.sin(a) * spd,
        size: 16 + Math.random() * 14,
        color: "#334155",
        alpha: 0.65,
        life: 0.75 + Math.random() * 0.45,
        maxLife: 1.2,
        drag: 0.95,
        kind: "smoke",
      });
    }

    this.emitSonar(barrel.x, barrel.y, 680, "#fb923c", attacker?.id ?? "barrel", "explosion");

    // Area damage to operators
    for (const op of this.operators) {
      if (!op.alive) continue;
      const d = Math.hypot(op.x - barrel.x, op.y - barrel.y);
      if (d < blastRadius) {
        const dmg = Math.round(115 * (1 - (d / blastRadius) * 0.65));
        this.applyDamageToOperator(
          op,
          dmg,
          0.55,
          attacker,
          attacker?.name ?? "FUEL BLAST",
          "FUEL BARREL",
          now
        );
      }
    }

    // Chain-detonate adjacent barrels!
    for (const other of this.map.barrels) {
      if (!other.alive || other.id === barrel.id) continue;
      if (Math.hypot(other.x - barrel.x, other.y - barrel.y) < blastRadius * 0.9) {
        other.hp = 0;
        this.detonateBarrel(other, attacker, now);
      }
    }
  }

  private activateOperatorAbility(
    op: OperatorEntity,
    now: number,
    isLocalTrigger: boolean
  ) {
    const spec = OPERATORS[op.classId];
    op.abilityReadyAt = now + spec.abilityCooldownMs;
    op.abilityActiveUntil = now + spec.abilityDurationMs;

    if (op.classId === "ghost") {
      // Stim Overdrive: instant full reload!
      op.ammo = op.magSize;
      op.reloadingUntil = 0;
    }

    if (op.classId === "vanguard") {
      // Wide thermal sonar sweep ring
      this.emitSonar(op.x, op.y, 740, "#10b981", op.id, "scan");
    }

    // Visual activation pulse
    this.spawnParticle({
      x: op.x,
      y: op.y,
      vx: 0,
      vy: 0,
      size: 46,
      color: spec.accentColor,
      alpha: 0.9,
      life: 0.42,
      maxLife: 0.42,
      drag: 1,
      kind: "ring",
    });

    if (isLocalTrigger && !this.isDemoMode) {
      this.abilitiesUsed += 1;
      soundEngine.playAbility();
      this.addShake(0.18);
      this.spawnFloatingText(op.x, op.y - 34, spec.abilityName, spec.accentColor, 12);
      if (this.mode === "multiplayer" && this.roomCode) {
        this.sendMultiplayerSync(undefined, {
          type: "peer_ability",
          playerId: op.id,
          classId: op.classId,
          x: op.x,
          y: op.y,
        });
      }
    }
  }

  private checkLootPickups(op: OperatorEntity, now: number) {
    for (let i = 0; i < this.map.loot.length; i++) {
      const item = this.map.loot[i];
      if (item.collected) continue;
      const d = Math.hypot(op.x - item.x, op.y - item.y);
      if (d > op.radius + 18) continue;

      // Don't waste medkit/armor at 100%
      if (item.kind === "medkit" && op.hp >= op.maxHp) continue;
      if (item.kind === "armor" && op.armor >= op.maxArmor) continue;

      item.collected = true;
      let text = "";
      let color = "#38bdf8";

      if (item.kind === "medkit") {
        const heal = Math.min(op.maxHp - op.hp, item.value);
        op.hp += heal;
        text = `+${Math.round(heal)} HP`;
        color = "#10b981";
      } else if (item.kind === "armor") {
        const gain = Math.min(op.maxArmor - op.armor, item.value);
        op.armor += gain;
        text = `+${Math.round(gain)} ARMOR`;
        color = "#38bdf8";
      } else if (item.kind === "ammo") {
        op.ammo = op.magSize;
        op.reloadingUntil = 0;
        text = "INSTANT RELOAD";
        color = "#f59e0b";
      } else {
        op.visionBoostUntil = now + 15000;
        op.damageBoostUntil = now + 15000;
        text = "OPTICS +20% DMG";
        color = "#c084fc";
      }

      this.spawnParticle({
        x: op.x,
        y: op.y,
        vx: 0,
        vy: 0,
        size: 32,
        color,
        alpha: 0.85,
        life: 0.35,
        maxLife: 0.35,
        drag: 1,
        kind: "ring",
      });

      if (op.isLocalPlayer && !this.isDemoMode) {
        this.lootCollected += 1;
        soundEngine.playPickup(item.kind);
        this.spawnFloatingText(op.x, op.y - 32, text, color, 12);
      }
    }
  }

  private updateVisibility(now: number) {
    const viewer = this.localPlayer;
    if (!viewer || !viewer.alive) {
      this.flashlightPoly = [];
      this.ambientPoly = [];
      return;
    }

    const spec = OPERATORS[viewer.classId];
    const boosted = now < viewer.visionBoostUntil;
    const range = spec.visionRange * (boosted ? 1.24 : 1);

    this.flashlightPoly = computeFlashlightConePolygon(
      viewer.x,
      viewer.y,
      viewer.angle,
      spec.visionHalfAngle,
      range,
      this.map.visionSegments
    );
    this.ambientPoly = computeAmbientCirclePolygon(
      viewer.x,
      viewer.y,
      AMBIENT_VISION_RADIUS,
      this.map.visionSegments
    );

    this.visibleOperatorIds.clear();
    for (const op of this.operators) {
      if (!op.alive || op.id === viewer.id) continue;
      if (
        isPointVisibleToOperator(
          viewer.x,
          viewer.y,
          viewer.angle,
          spec.visionHalfAngle,
          range,
          AMBIENT_VISION_RADIUS,
          op.x,
          op.y,
          this.map.visionSegments
        )
      ) {
        this.visibleOperatorIds.add(op.id);
      }
    }
  }

  private updateCamera(dt: number) {
    this.zoom += (this.targetZoom - this.zoom) * Math.min(1, dt * 4.5);
    this.shakeTrauma = Math.max(0, this.shakeTrauma - dt * 2.1);
    this.hurtVignette = Math.max(0, this.hurtVignette - dt * 2.3);
    this.hitmarkerAlpha = Math.max(0, this.hitmarkerAlpha - dt * 4.2);

    const focus = this.localPlayer;
    if (!focus) return;

    // Subtle directional look-ahead down the flashlight cone!
    const lookAhead = this.isDemoMode ? 30 : 62;
    const desiredX = focus.x + Math.cos(focus.angle) * lookAhead;
    const desiredY = focus.y + Math.sin(focus.angle) * lookAhead;

    this.cameraX += (desiredX - this.cameraX) * Math.min(1, dt * 7.5);
    this.cameraY += (desiredY - this.cameraY) * Math.min(1, dt * 7.5);
  }

  private updateEffects(dt: number) {
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      p.life -= dt;
      if (p.life <= 0) {
        this.particles.splice(i, 1);
        continue;
      }
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.vx *= Math.pow(p.drag, dt * 60);
      p.vy *= Math.pow(p.drag, dt * 60);
      if (p.rotation !== undefined && p.vRot !== undefined) {
        p.rotation += p.vRot * dt;
      }
    }

    for (let i = this.ripples.length - 1; i >= 0; i--) {
      const r = this.ripples[i];
      const expandSpd =
        r.kind === "scan"
          ? 640
          : r.kind === "explosion"
            ? 460
            : r.kind === "gunshot"
              ? 360
              : 175;
      r.radius += expandSpd * dt;
      r.alpha = Math.max(0, 1 - r.radius / r.maxRadius) * 0.85;
      if (r.radius >= r.maxRadius) {
        this.ripples.splice(i, 1);
      }
    }

    for (let i = this.floatingTexts.length - 1; i >= 0; i--) {
      const ft = this.floatingTexts[i];
      ft.life -= dt;
      ft.y += ft.vy * dt;
      if (ft.life <= 0) {
        this.floatingTexts.splice(i, 1);
      }
    }

    for (let i = this.damageIndicators.length - 1; i >= 0; i--) {
      this.damageIndicators[i].alpha -= dt * 1.65;
      if (this.damageIndicators[i].alpha <= 0) {
        this.damageIndicators.splice(i, 1);
      }
    }
  }

  private renderFrame(now: number) {
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    const shakeMag = this.shakeTrauma * this.shakeTrauma * 16;
    const shakeX = (Math.random() - 0.5) * 2 * shakeMag;
    const shakeY = (Math.random() - 0.5) * 2 * shakeMag;

    const p = this.localPlayer;
    const inStorm = Boolean(
      p &&
        p.alive &&
        Math.hypot(p.x - this.stormX, p.y - this.stormY) > this.stormRadius
    );
    const thermalActive = Boolean(
      p &&
        p.alive &&
        p.classId === "vanguard" &&
        now < p.abilityActiveUntil
    );

    this.renderer.render(this.ctx, vw, vh, {
      map: this.map,
      operators: this.operators,
      localPlayer: p,
      cameraX: this.cameraX,
      cameraY: this.cameraY,
      zoom: this.zoom,
      shakeX,
      shakeY,
      flashlightPoly: this.flashlightPoly,
      ambientPoly: this.ambientPoly,
      visibleOperatorIds: this.visibleOperatorIds,
      thermalActive,
      bullets: this.bullets,
      particles: this.particles,
      decals: this.decals,
      ripples: this.ripples,
      floatingTexts: this.floatingTexts,
      damageIndicators: this.damageIndicators,
      stormX: this.stormX,
      stormY: this.stormY,
      stormRadius: this.stormRadius,
      hitmarkerAlpha: this.hitmarkerAlpha,
      hitmarkerKill: this.hitmarkerKill,
      mouseScreenX: this.mouseScreenX,
      mouseScreenY: this.mouseScreenY,
      isTouchMode: this.isTouchMode,
      leftStick: this.leftStick,
      rightStick: this.rightStick,
      now,
      inStorm,
      hurtVignette: this.hurtVignette,
      isDemoMode: this.isDemoMode,
    });
  }

  private computeLiveScore(): number {
    const p = this.localPlayer;
    const kills = p?.kills ?? 0;
    return (
      kills * SCORE_CONFIG.KILL_BASE +
      Math.floor(this.damageDealt / SCORE_CONFIG.DAMAGE_DIVISOR) +
      Math.floor(this.matchElapsedSec) * SCORE_CONFIG.SURVIVAL_PER_SEC +
      this.lootCollected * SCORE_CONFIG.LOOT_PICKUP +
      this.bonusScore
    );
  }

  private finalizeMatch(victory: boolean, placement: number) {
    this.matchEnded = true;
    this.phase = "gameover";
    soundEngine.playMatchEnd(victory);

    const p = this.localPlayer;
    const kills = p?.kills ?? 0;
    const survivalSeconds = Math.max(1, Math.round(this.matchElapsedSec));
    const elimPts = kills * SCORE_CONFIG.KILL_BASE;
    const dmgPts = Math.floor(this.damageDealt / SCORE_CONFIG.DAMAGE_DIVISOR);
    const survPts = survivalSeconds * SCORE_CONFIG.SURVIVAL_PER_SEC;
    const lootPts = this.lootCollected * SCORE_CONFIG.LOOT_PICKUP;
    const placementPts =
      placement === 1
        ? SCORE_CONFIG.PLACEMENT_FIRST
        : placement === 2
          ? SCORE_CONFIG.PLACEMENT_SECOND
          : placement === 3
            ? SCORE_CONFIG.PLACEMENT_THIRD
            : 0;
    const totalScore =
      elimPts + dmgPts + survPts + lootPts + placementPts + this.bonusScore;
    this.score = totalScore;

    const result: MatchResult = {
      victory,
      placement,
      totalPlayers: this.operators.length,
      kills,
      damageDealt: this.damageDealt,
      shotsFired: this.shotsFired,
      shotsHit: this.shotsHit,
      lootCollected: this.lootCollected,
      barrelsDetonated: this.barrelsDetonated,
      abilitiesUsed: this.abilitiesUsed,
      stealthKills: this.stealthKills,
      survivalSeconds,
      score: totalScore,
      scoreBreakdown: {
        eliminations: elimPts,
        damage: dmgPts,
        survival: survPts,
        loot: lootPts,
        placement: placementPts,
        bonuses: this.bonusScore,
      },
      operatorClass: p?.classId ?? "vanguard",
      skinId: p?.skinId ?? DEFAULT_SKIN_BY_CLASS[p?.classId ?? "vanguard"],
      callsign: p?.name ?? "OPERATIVE",
      mode: this.mode,
      eliminatedBy: victory ? null : this.eliminatedBy,
    };

    this.pushHudSnapshot(performance.now());
    this.callbacks.onMatchEnd(result);
  }

  private pushHudSnapshot(now: number) {
    const p = this.localPlayer;
    if (!p) return;
    const spec = OPERATORS[p.classId];
    const aliveOps = this.operators.filter((o) => o.alive);
    const humanCount = this.operators.filter(
      (o) => o.isLocalPlayer || (o.isRemoteHuman && o.alive)
    ).length;

    const reloadProg =
      p.reloadingUntil > now
        ? Math.max(0, Math.min(1, 1 - (p.reloadingUntil - now) / spec.weapon.reloadMs))
        : 0;
    const cdRatio =
      p.abilityReadyAt > now
        ? Math.max(0, Math.min(1, (p.abilityReadyAt - now) / spec.abilityCooldownMs))
        : 0;
    const activeRatio =
      p.abilityActiveUntil > now
        ? Math.max(0, Math.min(1, (p.abilityActiveUntil - now) / spec.abilityDurationMs))
        : 0;

    let zoneName = "COMPOUND CORRIDOR";
    for (const z of this.map.zones) {
      if (p.x >= z.x && p.x <= z.x + z.w && p.y >= z.y && p.y <= z.y + z.h) {
        zoneName = `${z.code} // ${z.name}`;
        break;
      }
    }

    this.score = this.computeLiveScore();

    this.callbacks.onHudUpdate({
      hp: Math.ceil(p.hp),
      maxHp: p.maxHp,
      armor: Math.ceil(p.armor),
      maxArmor: p.maxArmor,
      ammo: p.ammo,
      magSize: p.magSize,
      reloadingProgress: reloadProg,
      abilityCooldownRatio: cdRatio,
      abilityActiveRatio: activeRatio,
      abilityName: spec.abilityName,
      kills: p.kills,
      aliveCount: aliveOps.length,
      totalCount: this.operators.length,
      score: this.score,
      streak: this.streak,
      stealth: p.stealth,
      inStorm:
        Math.hypot(p.x - this.stormX, p.y - this.stormY) > this.stormRadius,
      stormShrinkProgress: Math.min(1, this.matchElapsedSec / STORM_DURATION_SEC),
      stormTimeRemainingSec: Math.max(
        0,
        Math.ceil(STORM_DURATION_SEC - this.matchElapsedSec)
      ),
      visionBoosted: now < p.visionBoostUntil,
      targetLocked: Boolean(p.targetLockedId),
      survivalSeconds: Math.floor(this.matchElapsedSec),
      killFeed: this.killFeed.slice(-4),
      humanPlayersCount: humanCount,
      roomCode: this.roomCode,
      fps: Math.round(this.fpsAvg),
      zoneName,
    });
  }

  // --- HELPER FX GENERATORS ---
  private addShake(trauma: number) {
    this.shakeTrauma = Math.min(1, this.shakeTrauma + trauma);
  }

  private playSpatialWeaponSound(
    x: number,
    y: number,
    soundType: "smg" | "shotgun" | "ar" | "sniper"
  ) {
    if (this.isDemoMode || !this.localPlayer) return;
    const d = Math.hypot(x - this.localPlayer.x, y - this.localPlayer.y);
    if (d < 860) {
      soundEngine.playWeaponFire(soundType, Math.max(0.08, (1 - d / 860) * 0.65));
    }
  }

  private spawnParticle(p: Particle) {
    if (this.particles.length >= MAX_PARTICLES) {
      this.particles.shift();
    }
    this.particles.push(p);
  }

  private addDecal(d: FloorDecal) {
    if (this.decals.length >= MAX_DECALS) {
      this.decals.shift();
    }
    this.decals.push(d);
  }

  private emitSonar(
    x: number,
    y: number,
    maxRadius: number,
    color: string,
    ownerId: string,
    kind: SonarRipple["kind"]
  ) {
    // Only display audible enemy ripples near viewer so screen stays readable
    if (this.localPlayer && ownerId !== this.localPlayer.id && kind === "footstep") {
      const dist = Math.hypot(x - this.localPlayer.x, y - this.localPlayer.y);
      const hear = OPERATORS[this.localPlayer.classId].hearingRange;
      if (dist > hear) return;
    }
    if (this.ripples.length >= MAX_RIPPLES) {
      this.ripples.shift();
    }
    this.ripples.push({
      x,
      y,
      radius: 8,
      maxRadius,
      color,
      alpha: 0.85,
      ownerId,
      kind,
    });
  }

  private spawnWallSparks(x: number, y: number, bounceAngle: number) {
    for (let i = 0; i < 6; i++) {
      const a = bounceAngle + (Math.random() - 0.5) * 1.4;
      const spd = 80 + Math.random() * 165;
      this.spawnParticle({
        x,
        y,
        vx: Math.cos(a) * spd,
        vy: Math.sin(a) * spd,
        size: 2.2 + Math.random() * 1.6,
        color: i % 2 === 0 ? "#fde047" : "#fb923c",
        alpha: 0.95,
        life: 0.16 + Math.random() * 0.14,
        maxLife: 0.3,
        drag: 0.88,
        kind: "spark",
      });
    }
  }

  private spawnShieldDeflect(x: number, y: number) {
    for (let i = 0; i < 8; i++) {
      const a = Math.random() * Math.PI * 2;
      const spd = 90 + Math.random() * 140;
      this.spawnParticle({
        x,
        y,
        vx: Math.cos(a) * spd,
        vy: Math.sin(a) * spd,
        size: 3,
        color: "#fbbf24",
        alpha: 1,
        life: 0.22,
        maxLife: 0.22,
        drag: 0.88,
        kind: "spark",
      });
    }
  }

  private spawnEliminationBurst(x: number, y: number, accentColor: string) {
    this.spawnParticle({
      x,
      y,
      vx: 0,
      vy: 0,
      size: 55,
      color: accentColor,
      alpha: 0.95,
      life: 0.45,
      maxLife: 0.45,
      drag: 1,
      kind: "ring",
    });
    for (let i = 0; i < 18; i++) {
      const a = Math.random() * Math.PI * 2;
      const spd = 70 + Math.random() * 210;
      this.spawnParticle({
        x,
        y,
        vx: Math.cos(a) * spd,
        vy: Math.sin(a) * spd,
        size: 3 + Math.random() * 3,
        color: i % 2 === 0 ? accentColor : "#f43f5e",
        alpha: 0.95,
        life: 0.38 + Math.random() * 0.25,
        maxLife: 0.65,
        drag: 0.91,
        kind: "spark",
      });
    }
  }

  private spawnFloatingText(
    x: number,
    y: number,
    text: string,
    color: string,
    size = 12
  ) {
    this.floatingTexts.push({
      x,
      y,
      vy: -36,
      text,
      color,
      size,
      life: 0.95,
      maxLife: 0.95,
    });
  }

  private pushKillFeed(
    killerName: string,
    victimName: string,
    weaponName: string,
    isLocalInvolved: boolean
  ) {
    this.killFeed.push({
      id: `kf_${Date.now()}_${Math.random()}`,
      killerName,
      victimName,
      weaponName,
      isLocalInvolved,
      timestamp: Date.now(),
    });
    if (this.killFeed.length > 6) {
      this.killFeed.shift();
    }
  }

  // Expose helper for debugging/telemetry if needed
  public hasLineOfSightBetween(x1: number, y1: number, x2: number, y2: number): boolean {
    return hasLineOfSight(x1, y1, x2, y2, this.map.visionSegments);
  }
}
