export type OperatorClassId = "spectre" | "bastion" | "vanguard" | "ghost";

export type GamePhase = "menu" | "playing" | "paused" | "gameover";

export type GameMode = "solo" | "multiplayer";

export interface WeaponSpec {
  name: string;
  damage: number;
  pellets: number;
  spreadRad: number;
  fireRateMs: number;
  magSize: number;
  reloadMs: number;
  bulletSpeed: number;
  bulletRange: number;
  recoilKick: number;
  shakeAmount: number;
  muzzleColor: string;
  tracerWidth: number;
  soundType: "smg" | "shotgun" | "ar" | "sniper";
  armorPen: number;
}

export interface OperatorSpec {
  id: OperatorClassId;
  name: string;
  role: string;
  tagline: string;
  accentColor: string;
  secondaryColor: string;
  maxHp: number;
  maxArmor: number;
  moveSpeed: number;
  stealthSpeed: number;
  visionRange: number;
  visionHalfAngle: number; // radians
  hearingRange: number;
  abilityName: string;
  abilityDesc: string;
  abilityCooldownMs: number;
  abilityDurationMs: number;
  weapon: WeaponSpec;
}

export type ObstacleKind =
  | "wall"
  | "pillar"
  | "container_red"
  | "container_blue"
  | "container_olive"
  | "crate"
  | "server_rack"
  | "sandbag"
  | "glass_wall";

export interface MapObstacle {
  id: string;
  x: number;
  y: number;
  w: number;
  h: number;
  kind: ObstacleKind;
  blocksVision: boolean;
  blocksBullets: boolean;
  height: number; // visual 2.5D extrusion height
  label?: string;
}

export interface FloorZone {
  name: string;
  code: string;
  x: number;
  y: number;
  w: number;
  h: number;
  floorColor: string;
  accentColor: string;
}

export interface BarrelEntity {
  id: string;
  x: number;
  y: number;
  radius: number;
  hp: number;
  maxHp: number;
  alive: boolean;
  hitFlash: number;
}

export type LootKind = "medkit" | "armor" | "ammo" | "optics";

export interface LootEntity {
  id: string;
  x: number;
  y: number;
  kind: LootKind;
  collected: boolean;
  bobPhase: number;
  value: number;
}

export interface Segment {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
}

export interface ArenaMap {
  width: number;
  height: number;
  seed: number;
  obstacles: MapObstacle[];
  visionSegments: Segment[];
  zones: FloorZone[];
  spawnPoints: { x: number; y: number }[];
  barrels: BarrelEntity[];
  loot: LootEntity[];
  stormTarget: { x: number; y: number };
}

export type SkinRarity = "standard" | "rare" | "epic" | "legendary";

export type SkinPattern = "none" | "stripes" | "camo" | "gold_trim" | "hazard" | "plasma";

export interface OperatorSkin {
  id: string;
  classId: OperatorClassId;
  name: string;
  subtitle: string;
  rarity: SkinRarity;
  priceCredits: number;
  priceCrystals: number;
  vestColor: string;
  vestTrim: string;
  pauldronColor: string;
  helmetColor: string;
  visorColor: string;
  weaponBodyColor: string;
  weaponAccentColor: string;
  beamRgb: string; // e.g. "186, 230, 253"
  tracerColor: string;
  pattern: SkinPattern;
  auraColor?: string;
}

export type QuestKind =
  | "kills"
  | "damage"
  | "loot"
  | "barrels"
  | "abilities"
  | "top3"
  | "victory"
  | "stealth_kills"
  | "play_class"
  | "matches";

export interface DailyQuest {
  id: string;
  title: string;
  description: string;
  kind: QuestKind;
  target: number;
  progress: number;
  rewardCredits: number;
  rewardCrystals: number;
  rewardXp: number;
  claimed: boolean;
  rerolled?: boolean;
  targetClass?: OperatorClassId;
  difficulty: "facile" | "tactique" | "elite";
}

export interface PlayerProfile {
  credits: number;
  crystals: number;
  xp: number;
  ownedSkins: string[];
  equippedSkins: Record<OperatorClassId, string>;
  dailyDate: string;
  quests: DailyQuest[];
  dailyMilestoneClaimed: boolean;
  loginStreak: number;
  lastLoginClaimDate: string | null;
  totalMatches: number;
  totalKills: number;
  totalWins: number;
}

export interface MatchRewardSummary {
  creditsEarned: number;
  crystalsEarned: number;
  xpEarned: number;
  leveledUp: boolean;
  newLevel: number;
  questsProgressed: {
    id: string;
    title: string;
    delta: number;
    progress: number;
    target: number;
    completedNow: boolean;
  }[];
}

export interface OperatorEntity {
  id: string;
  name: string;
  classId: OperatorClassId;
  skinId: string;
  isLocalPlayer: boolean;
  isRemoteHuman: boolean;
  x: number;
  y: number;
  vx: number;
  vy: number;
  targetX: number; // remote interpolation
  targetY: number;
  angle: number;
  targetAngle: number;
  radius: number;
  hp: number;
  maxHp: number;
  armor: number;
  maxArmor: number;
  ammo: number;
  magSize: number;
  reloadingUntil: number;
  nextFireAt: number;
  alive: boolean;
  kills: number;
  stealth: boolean;
  stridePhase: number;
  recoilOffset: number;
  hitFlash: number;
  abilityReadyAt: number;
  abilityActiveUntil: number;
  visionBoostUntil: number;
  damageBoostUntil: number;
  noiseRadius: number;
  lastStepAt: number;
  lastFootprintSide: number;
  muzzleFlashUntil: number;
  targetLockedId: string | null;
  // AI fields
  aiState?: "patrol" | "loot" | "hunt" | "combat" | "flee_storm";
  aiWaypoint?: { x: number; y: number } | null;
  aiInvestigate?: { x: number; y: number; until: number } | null;
  aiDecisionAt?: number;
  aiStrafeDir?: number;
  aiLastSeenEnemy?: { x: number; y: number; id: string; at: number } | null;
}

export interface BulletEntity {
  id: string;
  ownerId: string;
  ownerName: string;
  ownerClass: OperatorClassId;
  x: number;
  y: number;
  prevX: number;
  prevY: number;
  vx: number;
  vy: number;
  damage: number;
  armorPen: number;
  traveled: number;
  maxRange: number;
  color: string;
  width: number;
  alive: boolean;
}

export interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  color: string;
  alpha: number;
  life: number;
  maxLife: number;
  drag: number;
  kind: "spark" | "smoke" | "blood" | "armor" | "ring" | "shell" | "heal" | "mote" | "flash";
  rotation?: number;
  vRot?: number;
}

export interface FloorDecal {
  x: number;
  y: number;
  kind: "scorch" | "shell" | "elimination" | "footprint";
  angle: number;
  size: number;
  alpha: number;
  color: string;
}

export interface SonarRipple {
  x: number;
  y: number;
  radius: number;
  maxRadius: number;
  color: string;
  alpha: number;
  ownerId: string;
  kind: "footstep" | "gunshot" | "scan" | "explosion";
}

export interface FloatingText {
  x: number;
  y: number;
  vy: number;
  text: string;
  color: string;
  size: number;
  life: number;
  maxLife: number;
}

export interface DamageIndicator {
  angle: number;
  alpha: number;
}

export interface KillFeedItem {
  id: string;
  killerName: string;
  victimName: string;
  weaponName: string;
  isLocalInvolved: boolean;
  timestamp: number;
}

export interface HudSnapshot {
  hp: number;
  maxHp: number;
  armor: number;
  maxArmor: number;
  ammo: number;
  magSize: number;
  reloadingProgress: number; // 0 if not reloading, 0..1 while reloading
  abilityCooldownRatio: number; // 0 = ready, 0..1 cooling down
  abilityActiveRatio: number; // 0..1 while active
  abilityName: string;
  kills: number;
  aliveCount: number;
  totalCount: number;
  score: number;
  streak: number;
  stealth: boolean;
  inStorm: boolean;
  stormShrinkProgress: number;
  stormTimeRemainingSec: number;
  visionBoosted: boolean;
  targetLocked: boolean;
  survivalSeconds: number;
  killFeed: KillFeedItem[];
  humanPlayersCount: number;
  roomCode: string | null;
  fps: number;
  zoneName: string;
}

export interface MatchResult {
  victory: boolean;
  placement: number;
  totalPlayers: number;
  kills: number;
  damageDealt: number;
  shotsFired: number;
  shotsHit: number;
  lootCollected: number;
  barrelsDetonated: number;
  abilitiesUsed: number;
  stealthKills: number;
  survivalSeconds: number;
  score: number;
  scoreBreakdown: {
    eliminations: number;
    damage: number;
    survival: number;
    loot: number;
    placement: number;
    bonuses: number;
  };
  operatorClass: OperatorClassId;
  skinId: string;
  callsign: string;
  mode: GameMode;
  eliminatedBy: string | null;
  isNewLocalBest?: boolean;
}

export interface HighScoreEntry {
  id: string | number;
  callsign: string;
  operatorClass: OperatorClassId;
  score: number;
  kills: number;
  placement: number;
  totalPlayers: number;
  damageDealt: number;
  survivalSeconds: number;
  mode: GameMode;
  createdAt: string;
}

export interface MultiplayerPeerState {
  playerId: string;
  callsign: string;
  classId: OperatorClassId;
  skinId?: string;
  x: number;
  y: number;
  vx: number;
  vy: number;
  angle: number;
  hp: number;
  maxHp: number;
  armor: number;
  maxArmor: number;
  alive: boolean;
  stealth: boolean;
  kills: number;
  abilityActive: boolean;
  updatedAt: number;
}

export interface RoomSummary {
  code: string;
  playerCount: number;
  maxPlayers: number;
  seed: number;
  createdAt: number;
  hostCallsign: string;
}

export type MultiplayerEvent =
  | {
      type: "room_state";
      roomCode: string;
      seed: number;
      startedAt: number;
      peers: MultiplayerPeerState[];
    }
  | {
      type: "peer_pose";
      peer: MultiplayerPeerState;
    }
  | {
      type: "peer_fire";
      playerId: string;
      callsign: string;
      classId: OperatorClassId;
      x: number;
      y: number;
      angle: number;
      pellets: { angle: number }[];
    }
  | {
      type: "peer_hit";
      attackerId: string;
      attackerName: string;
      targetId: string;
      damage: number;
      armorPen: number;
      weaponName: string;
    }
  | {
      type: "peer_ability";
      playerId: string;
      classId: OperatorClassId;
      x: number;
      y: number;
    }
  | {
      type: "peer_kill";
      killerId: string;
      killerName: string;
      victimId: string;
      victimName: string;
      weaponName: string;
    }
  | {
      type: "peer_leave";
      playerId: string;
    };
