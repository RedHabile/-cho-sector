import { HighScoreEntry, MatchResult, OperatorClassId } from "@/game/types";

const LOCAL_SCORES_KEY = "echo_sector_local_scores_v1";
const PREFS_KEY = "echo_sector_prefs_v1";
const MAX_LOCAL_SCORES = 12;

export interface PlayerPrefs {
  callsign: string;
  operatorClass: OperatorClassId;
}

export function loadPlayerPrefs(): PlayerPrefs {
  if (typeof window === "undefined") {
    return { callsign: "GHOST-01", operatorClass: "vanguard" };
  }
  try {
    const raw = window.localStorage.getItem(PREFS_KEY);
    if (!raw) return { callsign: "GHOST-01", operatorClass: "vanguard" };
    const parsed = JSON.parse(raw) as Partial<PlayerPrefs>;
    const callsign =
      typeof parsed.callsign === "string" && parsed.callsign.trim()
        ? parsed.callsign.trim().toUpperCase().slice(0, 16)
        : "GHOST-01";
    const valid: OperatorClassId[] = ["spectre", "bastion", "vanguard", "ghost"];
    const operatorClass =
      parsed.operatorClass && valid.includes(parsed.operatorClass)
        ? parsed.operatorClass
        : "vanguard";
    return { callsign, operatorClass };
  } catch {
    return { callsign: "GHOST-01", operatorClass: "vanguard" };
  }
}

export function savePlayerPrefs(prefs: PlayerPrefs) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(PREFS_KEY, JSON.stringify(prefs));
  } catch {
    // ignore storage quota errors
  }
}

export function loadLocalHighScores(): HighScoreEntry[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(LOCAL_SCORES_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as HighScoreEntry[];
    if (!Array.isArray(parsed)) return [];
    return parsed
      .filter((e) => e && typeof e.score === "number")
      .sort((a, b) => b.score - a.score || b.kills - a.kills)
      .slice(0, MAX_LOCAL_SCORES);
  } catch {
    return [];
  }
}

export function saveLocalHighScore(result: MatchResult): {
  scores: HighScoreEntry[];
  isNewBest: boolean;
} {
  const existing = loadLocalHighScores();
  const prevBest = existing[0]?.score ?? 0;
  const isNewBest = result.score > prevBest;

  const entry: HighScoreEntry = {
    id: `local_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
    callsign: result.callsign,
    operatorClass: result.operatorClass,
    score: result.score,
    kills: result.kills,
    placement: result.placement,
    totalPlayers: result.totalPlayers,
    damageDealt: result.damageDealt,
    survivalSeconds: result.survivalSeconds,
    mode: result.mode,
    createdAt: new Date().toISOString(),
  };

  const next = [...existing, entry]
    .sort((a, b) => b.score - a.score || b.kills - a.kills)
    .slice(0, MAX_LOCAL_SCORES);

  if (typeof window !== "undefined") {
    try {
      window.localStorage.setItem(LOCAL_SCORES_KEY, JSON.stringify(next));
    } catch {
      // ignore storage errors
    }
  }

  return { scores: next, isNewBest };
}

export function clearLocalHighScores(): HighScoreEntry[] {
  if (typeof window !== "undefined") {
    try {
      window.localStorage.removeItem(LOCAL_SCORES_KEY);
    } catch {
      // ignore
    }
  }
  return [];
}
