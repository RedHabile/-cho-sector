import { DEFAULT_SKIN_BY_CLASS, OPERATOR_SKINS } from "./skins";
import {
  DailyQuest,
  MatchResult,
  MatchRewardSummary,
  OperatorClassId,
  OperatorSkin,
  PlayerProfile,
} from "./types";

const PROFILE_STORAGE_KEY = "echo_sector_profile_v2";

export interface RankInfo {
  level: number;
  title: string;
  currentXp: number;
  xpForNext: number;
  progressRatio: number;
  color: string;
}

export const DAILY_LOGIN_REWARDS = [
  { day: 1, credits: 250, crystals: 10, label: "250 CR + 10 ◆" },
  { day: 2, credits: 320, crystals: 15, label: "320 CR + 15 ◆" },
  { day: 3, credits: 400, crystals: 20, label: "400 CR + 20 ◆" },
  { day: 4, credits: 500, crystals: 25, label: "500 CR + 25 ◆" },
  { day: 5, credits: 650, crystals: 35, label: "650 CR + 35 ◆" },
  { day: 6, credits: 800, crystals: 45, label: "800 CR + 45 ◆" },
  { day: 7, credits: 1200, crystals: 75, label: "JACKPOT 1200 CR" },
];

export type CrateTier = "tactical" | "blackops" | "legendary";

export interface CrateSpec {
  id: CrateTier;
  name: string;
  subtitle: string;
  priceCredits: number;
  priceCrystals: number;
  accentColor: string;
  oddsText: string;
}

export const SUPPLY_CRATES: CrateSpec[] = [
  {
    id: "tactical",
    name: "CAISSE TACTIQUE",
    subtitle: "Équipement terrain & skins Rare / Épique",
    priceCredits: 350,
    priceCrystals: 0,
    accentColor: "#38bdf8",
    oddsText: "60% Rare • 28% Épique • 12% Légendaire",
  },
  {
    id: "blackops",
    name: "CAISSE BLACK-OPS",
    subtitle: "Contrebande haut niveau & fortes chances Épique",
    priceCredits: 750,
    priceCrystals: 50,
    accentColor: "#c084fc",
    oddsText: "25% Rare • 50% Épique • 25% Légendaire",
  },
  {
    id: "legendary",
    name: "COFFRE ÉLITE 09",
    subtitle: "Skin Épique ou Légendaire GARANTI",
    priceCredits: 0,
    priceCrystals: 105,
    accentColor: "#fbbf24",
    oddsText: "45% Épique • 55% Légendaire Garanti",
  },
];

export interface CrateOpenResult {
  profile: PlayerProfile;
  rewardType: "skin" | "credits_jackpot";
  skin?: OperatorSkin;
  isDuplicate?: boolean;
  bonusCredits?: number;
  bonusCrystals?: number;
}

export function getTodayDateKey(): string {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, "0");
  const d = String(now.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

export function getTimeUntilDailyReset(): string {
  const now = new Date();
  const tomorrow = new Date(now);
  tomorrow.setHours(24, 0, 0, 0);
  const diffMs = Math.max(0, tomorrow.getTime() - now.getTime());
  const hrs = Math.floor(diffMs / 3600000);
  const mins = Math.floor((diffMs % 3600000) / 60000);
  return `${String(hrs).padStart(2, "0")}H ${String(mins).padStart(2, "0")}M`;
}

export function computeRankInfo(totalXp: number): RankInfo {
  const titles = [
    { minLvl: 1, title: "RECRUE", color: "#94a3b8" },
    { minLvl: 3, title: "OPÉRATEUR", color: "#38bdf8" },
    { minLvl: 6, title: "SERGENT", color: "#10b981" },
    { minLvl: 10, title: "VÉTÉRAN", color: "#c084fc" },
    { minLvl: 15, title: "COMMANDANT", color: "#f59e0b" },
    { minLvl: 22, title: "FANTÔME D'ÉLITE", color: "#fbbf24" },
  ];

  let level = 1;
  let remaining = Math.max(0, totalXp);
  let needed = 280;

  while (remaining >= needed && level < 99) {
    remaining -= needed;
    level += 1;
    needed = Math.round(280 + (level - 1) * 95);
  }

  let badge = titles[0];
  for (const t of titles) {
    if (level >= t.minLvl) badge = t;
  }

  return {
    level,
    title: badge.title,
    currentXp: remaining,
    xpForNext: needed,
    progressRatio: Math.min(1, remaining / needed),
    color: badge.color,
  };
}

function seededRand(seedStr: string) {
  let h = 2166136261 >>> 0;
  for (let i = 0; i < seedStr.length; i++) {
    h ^= seedStr.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return () => {
    h += 0x6d2b79f5;
    let t = Math.imul(h ^ (h >>> 15), 1 | h);
    t ^= t + Math.imul(t ^ (t >>> 7), 61 | t);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

interface QuestTemplate {
  key: string;
  title: string;
  description: string;
  kind: DailyQuest["kind"];
  target: number;
  rewardCredits: number;
  rewardCrystals: number;
  rewardXp: number;
  difficulty: DailyQuest["difficulty"];
  targetClass?: OperatorClassId;
}

const EASY_POOL: QuestTemplate[] = [
  {
    key: "loot_4",
    title: "PILLEUR DU SECTEUR",
    description: "Ramasser 4 caisses de ravitaillement en partie",
    kind: "loot",
    target: 4,
    rewardCredits: 220,
    rewardCrystals: 8,
    rewardXp: 110,
    difficulty: "facile",
  },
  {
    key: "abilities_3",
    title: "ARSENAL TACTIQUE",
    description: "Activer votre capacité spéciale 3 fois",
    kind: "abilities",
    target: 3,
    rewardCredits: 200,
    rewardCrystals: 8,
    rewardXp: 100,
    difficulty: "facile",
  },
  {
    key: "matches_2",
    title: "PRÉSENCE TERRAIN",
    description: "Terminer 2 opérations dans le Complexe 09",
    kind: "matches",
    target: 2,
    rewardCredits: 240,
    rewardCrystals: 10,
    rewardXp: 120,
    difficulty: "facile",
  },
  {
    key: "play_spectre",
    title: "CONTRAT SPECTRE",
    description: "Jouer 1 partie avec l'opérateur SPECTRE",
    kind: "play_class",
    target: 1,
    targetClass: "spectre",
    rewardCredits: 210,
    rewardCrystals: 8,
    rewardXp: 105,
    difficulty: "facile",
  },
  {
    key: "play_bastion",
    title: "CONTRAT BASTION",
    description: "Jouer 1 partie avec l'opérateur BASTION",
    kind: "play_class",
    target: 1,
    targetClass: "bastion",
    rewardCredits: 210,
    rewardCrystals: 8,
    rewardXp: 105,
    difficulty: "facile",
  },
];

const MEDIUM_POOL: QuestTemplate[] = [
  {
    key: "kills_4",
    title: "CHASSEUR NOCTURNE",
    description: "Éliminer 4 adversaires dans l'obscurité",
    kind: "kills",
    target: 4,
    rewardCredits: 320,
    rewardCrystals: 15,
    rewardXp: 170,
    difficulty: "tactique",
  },
  {
    key: "damage_650",
    title: "PUISSANCE DE FEU",
    description: "Infliger 650 points de dégâts cumulés",
    kind: "damage",
    target: 650,
    rewardCredits: 300,
    rewardCrystals: 15,
    rewardXp: 160,
    difficulty: "tactique",
  },
  {
    key: "barrels_2",
    title: "DÉTONATION CONTRÔLÉE",
    description: "Faire exploser 2 barils de carburant rouges",
    kind: "barrels",
    target: 2,
    rewardCredits: 310,
    rewardCrystals: 18,
    rewardXp: 165,
    difficulty: "tactique",
  },
  {
    key: "stealth_2",
    title: "EMBUSCADE SILENCIEUSE",
    description: "Réussir 2 éliminations en furtivité ou sous capacité",
    kind: "stealth_kills",
    target: 2,
    rewardCredits: 340,
    rewardCrystals: 20,
    rewardXp: 185,
    difficulty: "tactique",
  },
  {
    key: "play_ghost",
    title: "CONTRAT GHOST",
    description: "Jouer 1 partie avec le sniper GHOST",
    kind: "play_class",
    target: 1,
    targetClass: "ghost",
    rewardCredits: 280,
    rewardCrystals: 15,
    rewardXp: 150,
    difficulty: "tactique",
  },
];

const ELITE_POOL: QuestTemplate[] = [
  {
    key: "top3_2",
    title: "SURVIVANT D'ÉLITE",
    description: "Terminer dans le Top 3 deux fois aujourd'hui",
    kind: "top3",
    target: 2,
    rewardCredits: 480,
    rewardCrystals: 30,
    rewardXp: 260,
    difficulty: "elite",
  },
  {
    key: "victory_1",
    title: "DOMINATION TOTALE",
    description: "Remporter 1 Victoire Royale en Secteur 09",
    kind: "victory",
    target: 1,
    rewardCredits: 550,
    rewardCrystals: 40,
    rewardXp: 320,
    difficulty: "elite",
  },
  {
    key: "kills_8",
    title: "NETTOYAGE COMPLET",
    description: "Éliminer 8 opérateurs au total",
    kind: "kills",
    target: 8,
    rewardCredits: 520,
    rewardCrystals: 35,
    rewardXp: 290,
    difficulty: "elite",
  },
];

export function generateDailyQuests(dateKey: string): DailyQuest[] {
  const rand = seededRand(`echo_quests_${dateKey}`);
  const pickUnique = (pool: QuestTemplate[], count: number): QuestTemplate[] => {
    const copy = [...pool];
    const picked: QuestTemplate[] = [];
    while (picked.length < count && copy.length > 0) {
      const idx = Math.floor(rand() * copy.length);
      picked.push(copy.splice(idx, 1)[0]);
    }
    return picked;
  };

  const chosen = [
    ...pickUnique(EASY_POOL, 2),
    ...pickUnique(MEDIUM_POOL, 2),
    ...pickUnique(ELITE_POOL, 1),
  ];

  return chosen.map((tpl, idx) => ({
    id: `${dateKey}_${tpl.key}_${idx}`,
    title: tpl.title,
    description: tpl.description,
    kind: tpl.kind,
    target: tpl.target,
    progress: 0,
    rewardCredits: tpl.rewardCredits,
    rewardCrystals: tpl.rewardCrystals,
    rewardXp: tpl.rewardXp,
    claimed: false,
    rerolled: false,
    targetClass: tpl.targetClass,
    difficulty: tpl.difficulty,
  }));
}

export function createInitialProfile(dateKey = "2026-01-01"): PlayerProfile {
  return {
    credits: 550, // Generous starter credits so players can immediately try the Shop or Crates!
    crystals: 35,
    xp: 0,
    ownedSkins: Object.values(DEFAULT_SKIN_BY_CLASS),
    equippedSkins: { ...DEFAULT_SKIN_BY_CLASS },
    dailyDate: dateKey,
    quests: generateDailyQuests(dateKey),
    dailyMilestoneClaimed: false,
    loginStreak: 0,
    lastLoginClaimDate: null,
    totalMatches: 0,
    totalKills: 0,
    totalWins: 0,
  };
}

export function loadPlayerProfile(): PlayerProfile {
  if (typeof window === "undefined") {
    return createInitialProfile();
  }
  try {
    const today = getTodayDateKey();
    const raw = window.localStorage.getItem(PROFILE_STORAGE_KEY);
    if (!raw) {
      const fresh = createInitialProfile(today);
      savePlayerProfile(fresh);
      return fresh;
    }
    const parsed = JSON.parse(raw) as Partial<PlayerProfile>;
    const base = createInitialProfile(today);

    const ownedSet = new Set<string>([
      ...Object.values(DEFAULT_SKIN_BY_CLASS),
      ...(Array.isArray(parsed.ownedSkins) ? parsed.ownedSkins : []),
    ]);

    const equipped: Record<OperatorClassId, string> = {
      vanguard: parsed.equippedSkins?.vanguard ?? DEFAULT_SKIN_BY_CLASS.vanguard,
      spectre: parsed.equippedSkins?.spectre ?? DEFAULT_SKIN_BY_CLASS.spectre,
      bastion: parsed.equippedSkins?.bastion ?? DEFAULT_SKIN_BY_CLASS.bastion,
      ghost: parsed.equippedSkins?.ghost ?? DEFAULT_SKIN_BY_CLASS.ghost,
    };

    const isNewDay = parsed.dailyDate !== today;
    const profile: PlayerProfile = {
      credits: typeof parsed.credits === "number" ? parsed.credits : base.credits,
      crystals: typeof parsed.crystals === "number" ? parsed.crystals : base.crystals,
      xp: typeof parsed.xp === "number" ? parsed.xp : 0,
      ownedSkins: Array.from(ownedSet),
      equippedSkins: equipped,
      dailyDate: today,
      quests:
        !isNewDay && Array.isArray(parsed.quests) && parsed.quests.length > 0
          ? parsed.quests
          : generateDailyQuests(today),
      dailyMilestoneClaimed: isNewDay ? false : Boolean(parsed.dailyMilestoneClaimed),
      loginStreak: typeof parsed.loginStreak === "number" ? parsed.loginStreak : 0,
      lastLoginClaimDate: parsed.lastLoginClaimDate ?? null,
      totalMatches: typeof parsed.totalMatches === "number" ? parsed.totalMatches : 0,
      totalKills: typeof parsed.totalKills === "number" ? parsed.totalKills : 0,
      totalWins: typeof parsed.totalWins === "number" ? parsed.totalWins : 0,
    };

    if (isNewDay) {
      savePlayerProfile(profile);
    }
    return profile;
  } catch {
    return createInitialProfile();
  }
}

export function savePlayerProfile(profile: PlayerProfile) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(PROFILE_STORAGE_KEY, JSON.stringify(profile));
  } catch {
    // ignore storage quota errors
  }
}

export function canClaimDailyLogin(profile: PlayerProfile): boolean {
  return profile.lastLoginClaimDate !== profile.dailyDate;
}

export function claimDailyLoginReward(profile: PlayerProfile): {
  profile: PlayerProfile;
  credits: number;
  crystals: number;
  day: number;
} {
  const today = profile.dailyDate || getTodayDateKey();
  if (profile.lastLoginClaimDate === today) {
    return { profile, credits: 0, crystals: 0, day: profile.loginStreak };
  }
  const nextDay = (profile.loginStreak % 7) + 1;
  const reward = DAILY_LOGIN_REWARDS[nextDay - 1];
  const updated: PlayerProfile = {
    ...profile,
    credits: profile.credits + reward.credits,
    crystals: profile.crystals + reward.crystals,
    loginStreak: nextDay,
    lastLoginClaimDate: today,
  };
  savePlayerProfile(updated);
  return {
    profile: updated,
    credits: reward.credits,
    crystals: reward.crystals,
    day: nextDay,
  };
}

export function applyMatchToProfile(
  profile: PlayerProfile,
  result: MatchResult
): { profile: PlayerProfile; summary: MatchRewardSummary } {
  const prevRank = computeRankInfo(profile.xp);

  // Direct match payout (instant gratification on every run!)
  const creditsEarned =
    45 +
    result.kills * 32 +
    Math.floor(result.damageDealt / 22) +
    (result.victory ? 160 : result.placement <= 3 ? 75 : 20);
  const crystalsEarned = result.victory ? 12 : result.placement <= 3 ? 5 : 1;
  const xpEarned =
    55 +
    result.kills * 28 +
    Math.floor(result.survivalSeconds * 0.8) +
    (result.victory ? 140 : result.placement <= 3 ? 65 : 0);

  const questsProgressed: MatchRewardSummary["questsProgressed"] = [];

  const updatedQuests = profile.quests.map((q) => {
    if (q.claimed || q.progress >= q.target) return q;
    let delta = 0;
    switch (q.kind) {
      case "kills":
        delta = result.kills;
        break;
      case "damage":
        delta = result.damageDealt;
        break;
      case "loot":
        delta = result.lootCollected;
        break;
      case "barrels":
        delta = result.barrelsDetonated;
        break;
      case "abilities":
        delta = result.abilitiesUsed;
        break;
      case "top3":
        delta = result.placement <= 3 ? 1 : 0;
        break;
      case "victory":
        delta = result.victory ? 1 : 0;
        break;
      case "stealth_kills":
        delta = result.stealthKills;
        break;
      case "play_class":
        delta = q.targetClass === result.operatorClass ? 1 : 0;
        break;
      case "matches":
        delta = 1;
        break;
    }

    if (delta <= 0) return q;
    const nextProgress = Math.min(q.target, q.progress + delta);
    const completedNow = q.progress < q.target && nextProgress >= q.target;
    questsProgressed.push({
      id: q.id,
      title: q.title,
      delta,
      progress: nextProgress,
      target: q.target,
      completedNow,
    });
    return { ...q, progress: nextProgress };
  });

  const nextXp = profile.xp + xpEarned;
  const nextRank = computeRankInfo(nextXp);

  const nextProfile: PlayerProfile = {
    ...profile,
    credits: profile.credits + creditsEarned,
    crystals: profile.crystals + crystalsEarned,
    xp: nextXp,
    quests: updatedQuests,
    totalMatches: profile.totalMatches + 1,
    totalKills: profile.totalKills + result.kills,
    totalWins: profile.totalWins + (result.victory ? 1 : 0),
  };

  savePlayerProfile(nextProfile);

  return {
    profile: nextProfile,
    summary: {
      creditsEarned,
      crystalsEarned,
      xpEarned,
      leveledUp: nextRank.level > prevRank.level,
      newLevel: nextRank.level,
      questsProgressed,
    },
  };
}

export function claimQuestReward(
  profile: PlayerProfile,
  questId: string
): { profile: PlayerProfile; claimedQuest: DailyQuest | null } {
  const target = profile.quests.find((q) => q.id === questId);
  if (!target || target.claimed || target.progress < target.target) {
    return { profile, claimedQuest: null };
  }

  const nextQuests = profile.quests.map((q) =>
    q.id === questId ? { ...q, claimed: true } : q
  );
  const nextProfile: PlayerProfile = {
    ...profile,
    credits: profile.credits + target.rewardCredits,
    crystals: profile.crystals + target.rewardCrystals,
    xp: profile.xp + target.rewardXp,
    quests: nextQuests,
  };
  savePlayerProfile(nextProfile);
  return { profile: nextProfile, claimedQuest: target };
}

export function rerollDailyQuest(
  profile: PlayerProfile,
  questId: string
): PlayerProfile {
  const existing = profile.quests.find((q) => q.id === questId);
  if (!existing || existing.claimed || existing.rerolled) return profile;

  const pool =
    existing.difficulty === "facile"
      ? EASY_POOL
      : existing.difficulty === "tactique"
        ? MEDIUM_POOL
        : ELITE_POOL;

  const activeTitles = new Set(profile.quests.map((q) => q.title));
  const candidates = pool.filter((t) => !activeTitles.has(t.title));
  const replacement =
    candidates[Math.floor(Math.random() * candidates.length)] ?? pool[0];

  const nextQuests = profile.quests.map((q) =>
    q.id === questId
      ? {
          id: `${profile.dailyDate}_${replacement.key}_rr_${Date.now()}`,
          title: replacement.title,
          description: replacement.description,
          kind: replacement.kind,
          target: replacement.target,
          progress: 0,
          rewardCredits: replacement.rewardCredits,
          rewardCrystals: replacement.rewardCrystals,
          rewardXp: replacement.rewardXp,
          claimed: false,
          rerolled: true,
          targetClass: replacement.targetClass,
          difficulty: replacement.difficulty,
        }
      : q
  );

  const nextProfile: PlayerProfile = { ...profile, quests: nextQuests };
  savePlayerProfile(nextProfile);
  return nextProfile;
}

export function claimDailyMilestone(profile: PlayerProfile): {
  profile: PlayerProfile;
  credits: number;
  crystals: number;
  xp: number;
} {
  const completedCount = profile.quests.filter(
    (q) => q.claimed || q.progress >= q.target
  ).length;
  if (profile.dailyMilestoneClaimed || completedCount < 3) {
    return { profile, credits: 0, crystals: 0, xp: 0 };
  }
  const credits = 500;
  const crystals = 40;
  const xp = 300;
  const nextProfile: PlayerProfile = {
    ...profile,
    credits: profile.credits + credits,
    crystals: profile.crystals + crystals,
    xp: profile.xp + xp,
    dailyMilestoneClaimed: true,
  };
  savePlayerProfile(nextProfile);
  return { profile: nextProfile, credits, crystals, xp };
}

export function equipSkin(
  profile: PlayerProfile,
  skin: OperatorSkin
): PlayerProfile {
  if (!profile.ownedSkins.includes(skin.id)) return profile;
  const nextProfile: PlayerProfile = {
    ...profile,
    equippedSkins: {
      ...profile.equippedSkins,
      [skin.classId]: skin.id,
    },
  };
  savePlayerProfile(nextProfile);
  return nextProfile;
}

export function purchaseSkin(
  profile: PlayerProfile,
  skin: OperatorSkin,
  currency: "credits" | "crystals",
  overridePrice?: number
): { ok: boolean; profile: PlayerProfile; reason?: string } {
  if (profile.ownedSkins.includes(skin.id)) {
    return { ok: false, profile, reason: "Déjà possédé" };
  }
  const cost =
    overridePrice ??
    (currency === "credits" ? skin.priceCredits : skin.priceCrystals);
  if (cost <= 0) {
    return { ok: false, profile, reason: "Devise non disponible" };
  }

  if (currency === "credits") {
    if (profile.credits < cost) {
      return { ok: false, profile, reason: "Crédits insuffisants" };
    }
    const nextProfile: PlayerProfile = {
      ...profile,
      credits: profile.credits - cost,
      ownedSkins: [...profile.ownedSkins, skin.id],
      equippedSkins: {
        ...profile.equippedSkins,
        [skin.classId]: skin.id,
      },
    };
    savePlayerProfile(nextProfile);
    return { ok: true, profile: nextProfile };
  } else {
    if (profile.crystals < cost) {
      return { ok: false, profile, reason: "Cristaux insuffisants" };
    }
    const nextProfile: PlayerProfile = {
      ...profile,
      crystals: profile.crystals - cost,
      ownedSkins: [...profile.ownedSkins, skin.id],
      equippedSkins: {
        ...profile.equippedSkins,
        [skin.classId]: skin.id,
      },
    };
    savePlayerProfile(nextProfile);
    return { ok: true, profile: nextProfile };
  }
}

export function openSupplyCrate(
  profile: PlayerProfile,
  tier: CrateTier,
  currency: "credits" | "crystals"
): CrateOpenResult | null {
  const spec = SUPPLY_CRATES.find((c) => c.id === tier);
  if (!spec) return null;
  const cost = currency === "credits" ? spec.priceCredits : spec.priceCrystals;
  if (cost <= 0) return null;
  if (currency === "credits" && profile.credits < cost) return null;
  if (currency === "crystals" && profile.crystals < cost) return null;

  let nextCredits = currency === "credits" ? profile.credits - cost : profile.credits;
  let nextCrystals = currency === "crystals" ? profile.crystals - cost : profile.crystals;

  // Roll rarity by tier odds
  const roll = Math.random();
  let rarity: "rare" | "epic" | "legendary";
  if (tier === "tactical") {
    rarity = roll < 0.6 ? "rare" : roll < 0.88 ? "epic" : "legendary";
  } else if (tier === "blackops") {
    rarity = roll < 0.25 ? "rare" : roll < 0.75 ? "epic" : "legendary";
  } else {
    rarity = roll < 0.45 ? "epic" : "legendary";
  }

  // Strongly prefer unowned skins of rolled rarity (anti-frustration duplicate protection!)
  const ownedSet = new Set(profile.ownedSkins);
  const unownedOfRarity = OPERATOR_SKINS.filter(
    (s) => s.rarity === rarity && !ownedSet.has(s.id)
  );
  const anyUnowned = OPERATOR_SKINS.filter(
    (s) => s.rarity !== "standard" && !ownedSet.has(s.id)
  );

  let chosenSkin: OperatorSkin | undefined;
  let isDuplicate = false;

  if (unownedOfRarity.length > 0) {
    chosenSkin =
      unownedOfRarity[Math.floor(Math.random() * unownedOfRarity.length)];
  } else if (anyUnowned.length > 0) {
    chosenSkin = anyUnowned[Math.floor(Math.random() * anyUnowned.length)];
  } else {
    // Player owns every skin! Award generous currency jackpot
    const jackpotCredits = tier === "legendary" ? 1100 : tier === "blackops" ? 650 : 400;
    const jackpotCrystals = tier === "legendary" ? 65 : 25;
    nextCredits += jackpotCredits;
    nextCrystals += jackpotCrystals;
    const nextProfile: PlayerProfile = {
      ...profile,
      credits: nextCredits,
      crystals: nextCrystals,
    };
    savePlayerProfile(nextProfile);
    return {
      profile: nextProfile,
      rewardType: "credits_jackpot",
      bonusCredits: jackpotCredits,
      bonusCrystals: jackpotCrystals,
    };
  }

  const nextOwned = [...profile.ownedSkins, chosenSkin.id];
  // Small bonus crystals on Epic/Legendary drops!
  const bonusCrystals =
    chosenSkin.rarity === "legendary" ? 20 : chosenSkin.rarity === "epic" ? 8 : 0;
  nextCrystals += bonusCrystals;

  const nextProfile: PlayerProfile = {
    ...profile,
    credits: nextCredits,
    crystals: nextCrystals,
    ownedSkins: nextOwned,
  };
  savePlayerProfile(nextProfile);

  return {
    profile: nextProfile,
    rewardType: "skin",
    skin: chosenSkin,
    isDuplicate,
    bonusCrystals,
  };
}

export function countClaimableQuests(profile: PlayerProfile): number {
  const questsReady = profile.quests.filter(
    (q) => !q.claimed && q.progress >= q.target
  ).length;
  const completedCount = profile.quests.filter(
    (q) => q.claimed || q.progress >= q.target
  ).length;
  const milestoneReady = !profile.dailyMilestoneClaimed && completedCount >= 3 ? 1 : 0;
  const loginReady = canClaimDailyLogin(profile) ? 1 : 0;
  return questsReady + milestoneReady + loginReady;
}
