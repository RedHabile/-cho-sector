import { OperatorClassId, OperatorSkin, SkinRarity } from "./types";

export const RARITY_META: Record<
  SkinRarity,
  {
    label: string;
    color: string;
    borderColor: string;
    bgGlow: string;
    badgeBg: string;
  }
> = {
  standard: {
    label: "STANDARD",
    color: "#94a3b8",
    borderColor: "rgba(148, 163, 184, 0.35)",
    bgGlow: "rgba(148, 163, 184, 0.12)",
    badgeBg: "rgba(51, 65, 85, 0.75)",
  },
  rare: {
    label: "RARE",
    color: "#38bdf8",
    borderColor: "rgba(56, 189, 248, 0.5)",
    bgGlow: "rgba(56, 189, 248, 0.16)",
    badgeBg: "rgba(14, 116, 144, 0.45)",
  },
  epic: {
    label: "ÉPIQUE",
    color: "#c084fc",
    borderColor: "rgba(192, 132, 252, 0.55)",
    bgGlow: "rgba(192, 132, 252, 0.18)",
    badgeBg: "rgba(107, 33, 168, 0.45)",
  },
  legendary: {
    label: "LÉGENDAIRE",
    color: "#fbbf24",
    borderColor: "rgba(251, 191, 36, 0.65)",
    bgGlow: "rgba(251, 191, 36, 0.22)",
    badgeBg: "rgba(146, 64, 14, 0.55)",
  },
};

export const OPERATOR_SKINS: OperatorSkin[] = [
  // ==================== VANGUARD ====================
  {
    id: "vanguard_default",
    classId: "vanguard",
    name: "OPS STANDARD",
    subtitle: "Tenue réglementaire Secteur 09",
    rarity: "standard",
    priceCredits: 0,
    priceCrystals: 0,
    vestColor: "#1e293b",
    vestTrim: "#10b981",
    pauldronColor: "#10b981",
    helmetColor: "#0f172a",
    visorColor: "#10b981",
    weaponBodyColor: "#0f172a",
    weaponAccentColor: "#10b981",
    beamRgb: "186, 230, 253",
    tracerColor: "#6ee7b7",
    pattern: "none",
  },
  {
    id: "vanguard_arctic",
    classId: "vanguard",
    name: "FANTÔME ARCTIQUE",
    subtitle: "Camouflage polaire & optique givrée",
    rarity: "rare",
    priceCredits: 450,
    priceCrystals: 30,
    vestColor: "#cbd5e1",
    vestTrim: "#38bdf8",
    pauldronColor: "#e2e8f0",
    helmetColor: "#f1f5f9",
    visorColor: "#0ea5e9",
    weaponBodyColor: "#334155",
    weaponAccentColor: "#7dd3fc",
    beamRgb: "165, 243, 252",
    tracerColor: "#38bdf8",
    pattern: "camo",
  },
  {
    id: "vanguard_cyber",
    classId: "vanguard",
    name: "CYBER RONIN",
    subtitle: "Carbone néon de Neo-Secteur",
    rarity: "epic",
    priceCredits: 950,
    priceCrystals: 65,
    vestColor: "#18122b",
    vestTrim: "#e879f9",
    pauldronColor: "#a855f7",
    helmetColor: "#0f0a1e",
    visorColor: "#f0abfc",
    weaponBodyColor: "#1e1b4b",
    weaponAccentColor: "#e879f9",
    beamRgb: "232, 121, 249",
    tracerColor: "#f0abfc",
    pattern: "plasma",
  },
  {
    id: "vanguard_sovereign",
    classId: "vanguard",
    name: "SOUVERAIN OR",
    subtitle: "Armure obsidienne & finitions or pur",
    rarity: "legendary",
    priceCredits: 1800,
    priceCrystals: 120,
    vestColor: "#111116",
    vestTrim: "#fbbf24",
    pauldronColor: "#f59e0b",
    helmetColor: "#09090d",
    visorColor: "#fde047",
    weaponBodyColor: "#1c1917",
    weaponAccentColor: "#fbbf24",
    beamRgb: "253, 224, 71",
    tracerColor: "#fde047",
    pattern: "gold_trim",
    auraColor: "#fbbf24",
  },

  // ==================== SPECTRE ====================
  {
    id: "spectre_default",
    classId: "spectre",
    name: "OMBRE BLEUE",
    subtitle: "Combinaison furtive standard",
    rarity: "standard",
    priceCredits: 0,
    priceCrystals: 0,
    vestColor: "#1e293b",
    vestTrim: "#38bdf8",
    pauldronColor: "#38bdf8",
    helmetColor: "#0f172a",
    visorColor: "#38bdf8",
    weaponBodyColor: "#0f172a",
    weaponAccentColor: "#38bdf8",
    beamRgb: "186, 230, 253",
    tracerColor: "#7dd3fc",
    pattern: "none",
  },
  {
    id: "spectre_venom",
    classId: "spectre",
    name: "VIPÈRE TOXIQUE",
    subtitle: "Infiltration chimique & silencieux acide",
    rarity: "rare",
    priceCredits: 450,
    priceCrystals: 30,
    vestColor: "#132a1c",
    vestTrim: "#84cc16",
    pauldronColor: "#65a30d",
    helmetColor: "#0c1f14",
    visorColor: "#a3e635",
    weaponBodyColor: "#14261c",
    weaponAccentColor: "#a3e635",
    beamRgb: "163, 230, 53",
    tracerColor: "#a3e635",
    pattern: "stripes",
  },
  {
    id: "spectre_oni",
    classId: "spectre",
    name: "ONI ÉCARLATE",
    subtitle: "Assassin masqué rouge sang & ivoire",
    rarity: "epic",
    priceCredits: 950,
    priceCrystals: 65,
    vestColor: "#3b0d17",
    vestTrim: "#fb7185",
    pauldronColor: "#e11d48",
    helmetColor: "#f8fafc",
    visorColor: "#f43f5e",
    weaponBodyColor: "#1f0910",
    weaponAccentColor: "#f43f5e",
    beamRgb: "251, 113, 133",
    tracerColor: "#fb7185",
    pattern: "stripes",
  },
  {
    id: "spectre_eclipse",
    classId: "spectre",
    name: "ÉCLIPSE NÉBULA",
    subtitle: "Distorsion quantique & aura stellaire",
    rarity: "legendary",
    priceCredits: 1800,
    priceCrystals: 120,
    vestColor: "#0e0b24",
    vestTrim: "#818cf8",
    pauldronColor: "#a78bfa",
    helmetColor: "#070517",
    visorColor: "#c4b5fd",
    weaponBodyColor: "#17113b",
    weaponAccentColor: "#c084fc",
    beamRgb: "196, 181, 253",
    tracerColor: "#c084fc",
    pattern: "plasma",
    auraColor: "#a78bfa",
  },

  // ==================== BASTION ====================
  {
    id: "bastion_default",
    classId: "bastion",
    name: "BRISEUR D'ACIER",
    subtitle: "Blindage lourd de brèche",
    rarity: "standard",
    priceCredits: 0,
    priceCrystals: 0,
    vestColor: "#1e293b",
    vestTrim: "#f59e0b",
    pauldronColor: "#f59e0b",
    helmetColor: "#0f172a",
    visorColor: "#f59e0b",
    weaponBodyColor: "#1e293b",
    weaponAccentColor: "#f59e0b",
    beamRgb: "254, 240, 138",
    tracerColor: "#fde047",
    pattern: "none",
  },
  {
    id: "bastion_hazard",
    classId: "bastion",
    name: "HAZMAT 09",
    subtitle: "Unité quarantaine & bandes de danger",
    rarity: "rare",
    priceCredits: 450,
    priceCrystals: 30,
    vestColor: "#292524",
    vestTrim: "#facc15",
    pauldronColor: "#eab308",
    helmetColor: "#ca8a04",
    visorColor: "#fef08a",
    weaponBodyColor: "#1c1917",
    weaponAccentColor: "#facc15",
    beamRgb: "253, 224, 71",
    tracerColor: "#facc15",
    pattern: "hazard",
  },
  {
    id: "bastion_titan",
    classId: "bastion",
    name: "TITAN CRYO",
    subtitle: "Exosquelette titane & bouclier glacier",
    rarity: "epic",
    priceCredits: 950,
    priceCrystals: 65,
    vestColor: "#162d42",
    vestTrim: "#22d3ee",
    pauldronColor: "#38bdf8",
    helmetColor: "#0c1d2e",
    visorColor: "#67e8f9",
    weaponBodyColor: "#0f2438",
    weaponAccentColor: "#22d3ee",
    beamRgb: "103, 232, 249",
    tracerColor: "#67e8f9",
    pattern: "stripes",
  },
  {
    id: "bastion_inferno",
    classId: "bastion",
    name: "JUGGERNAUT INFERNO",
    subtitle: "Forge volcanique & braises incandescentes",
    rarity: "legendary",
    priceCredits: 1800,
    priceCrystals: 120,
    vestColor: "#1f0d0a",
    vestTrim: "#fb923c",
    pauldronColor: "#ef4444",
    helmetColor: "#140705",
    visorColor: "#fde047",
    weaponBodyColor: "#2b100b",
    weaponAccentColor: "#f97316",
    beamRgb: "251, 146, 60",
    tracerColor: "#fb923c",
    pattern: "hazard",
    auraColor: "#f97316",
  },

  // ==================== GHOST ====================
  {
    id: "ghost_default",
    classId: "ghost",
    name: "TIREUR FANTÔME",
    subtitle: "Optique recon cramoisie",
    rarity: "standard",
    priceCredits: 0,
    priceCrystals: 0,
    vestColor: "#1e293b",
    vestTrim: "#f43f5e",
    pauldronColor: "#f43f5e",
    helmetColor: "#0f172a",
    visorColor: "#f43f5e",
    weaponBodyColor: "#0f172a",
    weaponAccentColor: "#f43f5e",
    beamRgb: "253, 164, 175",
    tracerColor: "#fda4af",
    pattern: "none",
  },
  {
    id: "ghost_desert",
    classId: "ghost",
    name: "SCORPION DES SABLES",
    subtitle: "Camo dunes & railgun bronze",
    rarity: "rare",
    priceCredits: 450,
    priceCrystals: 30,
    vestColor: "#453827",
    vestTrim: "#fbbf24",
    pauldronColor: "#b48a55",
    helmetColor: "#362b1d",
    visorColor: "#fcd34d",
    weaponBodyColor: "#2e2418",
    weaponAccentColor: "#f59e0b",
    beamRgb: "252, 211, 77",
    tracerColor: "#fcd34d",
    pattern: "camo",
  },
  {
    id: "ghost_valkyrie",
    classId: "ghost",
    name: "VALKYRIE CHROME",
    subtitle: "Châssis argenté & bobines plasma",
    rarity: "epic",
    priceCredits: 950,
    priceCrystals: 65,
    vestColor: "#475569",
    vestTrim: "#2dd4bf",
    pauldronColor: "#e2e8f0",
    helmetColor: "#cbd5e1",
    visorColor: "#14b8a6",
    weaponBodyColor: "#334155",
    weaponAccentColor: "#2dd4bf",
    beamRgb: "94, 234, 212",
    tracerColor: "#5eead4",
    pattern: "gold_trim",
  },
  {
    id: "ghost_reaper",
    classId: "ghost",
    name: "FAUCHEUR SPECTRAL",
    subtitle: "Obsidienne fantôme & laser émeraude",
    rarity: "legendary",
    priceCredits: 1800,
    priceCrystals: 120,
    vestColor: "#090d0c",
    vestTrim: "#34d399",
    pauldronColor: "#10b981",
    helmetColor: "#040807",
    visorColor: "#6ee7b7",
    weaponBodyColor: "#0a1412",
    weaponAccentColor: "#34d399",
    beamRgb: "110, 231, 183",
    tracerColor: "#34d399",
    pattern: "plasma",
    auraColor: "#34d399",
  },
];

export const DEFAULT_SKIN_BY_CLASS: Record<OperatorClassId, string> = {
  vanguard: "vanguard_default",
  spectre: "spectre_default",
  bastion: "bastion_default",
  ghost: "ghost_default",
};

const SKIN_MAP = new Map<string, OperatorSkin>(
  OPERATOR_SKINS.map((skin) => [skin.id, skin])
);

export function getSkinById(
  skinId: string | undefined | null,
  fallbackClass: OperatorClassId = "vanguard"
): OperatorSkin {
  if (skinId && SKIN_MAP.has(skinId)) {
    return SKIN_MAP.get(skinId)!;
  }
  return SKIN_MAP.get(DEFAULT_SKIN_BY_CLASS[fallbackClass]) ?? OPERATOR_SKINS[0];
}

export function getSkinsForClass(classId: OperatorClassId): OperatorSkin[] {
  return OPERATOR_SKINS.filter((s) => s.classId === classId);
}

export function getDailyFeaturedSkin(dateKey: string): {
  skin: OperatorSkin;
  discountPct: number;
  discountedCredits: number;
  discountedCrystals: number;
} {
  const premiumSkins = OPERATOR_SKINS.filter(
    (s) => s.rarity === "epic" || s.rarity === "legendary"
  );
  let hash = 0;
  for (let i = 0; i < dateKey.length; i++) {
    hash = (hash * 31 + dateKey.charCodeAt(i)) >>> 0;
  }
  const skin = premiumSkins[hash % premiumSkins.length];
  const discountPct = skin.rarity === "legendary" ? 25 : 30;
  return {
    skin,
    discountPct,
    discountedCredits: Math.round((skin.priceCredits * (100 - discountPct)) / 100),
    discountedCrystals: Math.round((skin.priceCrystals * (100 - discountPct)) / 100),
  };
}
