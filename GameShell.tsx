"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  Crosshair,
  Shield,
  Skull,
  Play,
  Pause,
  RotateCcw,
  Volume2,
  VolumeX,
  Users,
  Radio,
  Zap,
  Eye,
  Copy,
  Check,
  Crown,
  Flame,
  RefreshCw,
  LogOut,
  Footprints,
  Coins,
  Diamond,
  Target,
  ShoppingBag,
} from "lucide-react";
import { OPERATORS, OPERATOR_LIST } from "@/game/constants";
import { EchoSectorEngine } from "@/game/engine";
import {
  applyMatchToProfile,
  claimDailyLoginReward,
  claimDailyMilestone,
  claimQuestReward,
  CrateOpenResult,
  CrateTier,
  createInitialProfile,
  equipSkin,
  loadPlayerProfile,
  openSupplyCrate,
  purchaseSkin,
  rerollDailyQuest,
} from "@/game/progression";
import { getSkinById } from "@/game/skins";
import { soundEngine } from "@/game/sound";
import {
  GameMode,
  GamePhase,
  HighScoreEntry,
  HudSnapshot,
  MatchResult,
  MatchRewardSummary,
  MultiplayerPeerState,
  OperatorClassId,
  OperatorSkin,
  PlayerProfile,
  RoomSummary,
} from "@/game/types";
import {
  clearLocalHighScores,
  loadLocalHighScores,
  loadPlayerPrefs,
  saveLocalHighScore,
  savePlayerPrefs,
} from "@/lib/local-scores";
import { HighScoreBoard } from "./HighScoreBoard";
import { LobbyMenu, LobbyTab } from "./LobbyMenu";

const INITIAL_HUD: HudSnapshot = {
  hp: 135,
  maxHp: 135,
  armor: 95,
  maxArmor: 95,
  ammo: 22,
  magSize: 22,
  reloadingProgress: 0,
  abilityCooldownRatio: 0,
  abilityActiveRatio: 0,
  abilityName: "THERMAL PULSE",
  kills: 0,
  aliveCount: 10,
  totalCount: 10,
  score: 0,
  streak: 0,
  stealth: false,
  inStorm: false,
  stormShrinkProgress: 0,
  stormTimeRemainingSec: 105,
  visionBoosted: false,
  targetLocked: false,
  survivalSeconds: 0,
  killFeed: [],
  humanPlayersCount: 1,
  roomCode: null,
  fps: 60,
  zoneName: "LZ-01 // HELIPAD CENTRAL",
};

interface GameShellProps {
  initialGlobalScores: HighScoreEntry[];
}

export function GameShell({ initialGlobalScores }: GameShellProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const engineRef = useRef<EchoSectorEngine | null>(null);
  const profileRef = useRef<PlayerProfile>(createInitialProfile());

  const [phase, setPhase] = useState<GamePhase>("menu");
  const [lobbyInitialTab, setLobbyInitialTab] = useState<LobbyTab>("qg");
  const [selectedClass, setSelectedClass] = useState<OperatorClassId>("vanguard");
  const [callsign, setCallsign] = useState("GHOST-01");
  const [mode, setMode] = useState<GameMode>("solo");
  const [profile, setProfile] = useState<PlayerProfile>(() => createInitialProfile());
  const [hud, setHud] = useState<HudSnapshot>(INITIAL_HUD);
  const [lastResult, setLastResult] = useState<MatchResult | null>(null);
  const [lastRewards, setLastRewards] = useState<MatchRewardSummary | null>(null);
  const [muted, setMuted] = useState(false);
  const [isTouchMode, setIsTouchMode] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const toastTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Leaderboards
  const [localScores, setLocalScores] = useState<HighScoreEntry[]>([]);
  const [globalScores, setGlobalScores] = useState<HighScoreEntry[]>(
    initialGlobalScores
  );
  const [scoreTab, setScoreTab] = useState<"local" | "global">("local");
  const [loadingGlobal, setLoadingGlobal] = useState(false);

  // Multiplayer lobby controls
  const [roomInput, setRoomInput] = useState("");
  const [activeRooms, setActiveRooms] = useState<RoomSummary[]>([]);
  const [joiningRoom, setJoiningRoom] = useState(false);
  const [mpError, setMpError] = useState<string | null>(null);
  const [activeRoomCode, setActiveRoomCode] = useState<string | null>(null);
  const [copiedCode, setCopiedCode] = useState(false);

  const showToast = useCallback((msg: string) => {
    setToastMessage(msg);
    if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
    toastTimerRef.current = setTimeout(() => {
      setToastMessage(null);
    }, 2600);
  }, []);

  const syncProfile = useCallback((next: PlayerProfile) => {
    profileRef.current = next;
    setProfile(next);
  }, []);

  // Load saved preferences, progression profile & local high scores on mount
  useEffect(() => {
    const prefs = loadPlayerPrefs();
    setCallsign(prefs.callsign);
    setSelectedClass(prefs.operatorClass);
    const loadedProfile = loadPlayerProfile();
    syncProfile(loadedProfile);

    const local = loadLocalHighScores();
    setLocalScores(local);
    setScoreTab(local.length > 0 ? "local" : "global");

    if (typeof window !== "undefined" && "ontouchstart" in window) {
      setIsTouchMode(true);
    }
  }, [syncProfile]);

  const fetchGlobalScores = useCallback(async () => {
    setLoadingGlobal(true);
    try {
      const res = await fetch("/api/scores", { cache: "no-store" });
      if (res.ok) {
        const data = (await res.json()) as { scores?: HighScoreEntry[] };
        if (Array.isArray(data.scores)) {
          setGlobalScores(data.scores);
        }
      }
    } catch {
      // keep existing scores
    } finally {
      setLoadingGlobal(false);
    }
  }, []);

  const fetchActiveRooms = useCallback(async () => {
    try {
      const res = await fetch("/api/multiplayer/rooms", { cache: "no-store" });
      if (res.ok) {
        const data = (await res.json()) as { rooms?: RoomSummary[] };
        if (Array.isArray(data.rooms)) {
          setActiveRooms(data.rooms);
        }
      }
    } catch {
      // ignore transient network error
    }
  }, []);

  useEffect(() => {
    if (mode === "multiplayer" && phase === "menu") {
      void fetchActiveRooms();
      const iv = setInterval(() => void fetchActiveRooms(), 4500);
      return () => clearInterval(iv);
    }
  }, [mode, phase, fetchActiveRooms]);

  const handleMatchEnd = useCallback(
    async (result: MatchResult) => {
      const { scores: updatedLocal, isNewBest } = saveLocalHighScore(result);
      setLocalScores(updatedLocal);
      setLastResult({ ...result, isNewLocalBest: isNewBest });

      // Apply currency, XP, and daily quest progress immediately!
      const { profile: updatedProfile, summary } = applyMatchToProfile(
        profileRef.current,
        result
      );
      syncProfile(updatedProfile);
      setLastRewards(summary);

      setPhase("gameover");
      setScoreTab("local");

      // Submit to PostgreSQL global leaderboard
      try {
        await fetch("/api/scores", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            callsign: result.callsign,
            operatorClass: result.operatorClass,
            score: result.score,
            kills: result.kills,
            placement: result.placement,
            totalPlayers: result.totalPlayers,
            damageDealt: result.damageDealt,
            survivalSeconds: result.survivalSeconds,
            mode: result.mode,
          }),
        });
        await fetchGlobalScores();
      } catch {
        // local score already saved safely
      }
    },
    [fetchGlobalScores, syncProfile]
  );

  // Initialize Canvas Engine once
  useEffect(() => {
    if (!canvasRef.current) return;
    const engine = new EchoSectorEngine(canvasRef.current, {
      onHudUpdate: (snapshot) => setHud(snapshot),
      onMatchEnd: (res) => {
        void handleMatchEnd(res);
      },
      onPauseRequest: () => {
        setPhase((prev) => {
          if (prev === "playing") {
            engine.setPhase("paused");
            return "paused";
          }
          if (prev === "paused") {
            engine.setPhase("playing");
            return "playing";
          }
          return prev;
        });
      },
      onTouchModeChange: (touch) => setIsTouchMode(touch),
    });
    engineRef.current = engine;
    return () => {
      engine.destroy();
      engineRef.current = null;
    };
  }, [handleMatchEnd]);

  const persistPrefs = useCallback(
    (nextCallsign: string, nextClass: OperatorClassId) => {
      savePlayerPrefs({
        callsign: nextCallsign.trim().toUpperCase().slice(0, 16) || "GHOST-01",
        operatorClass: nextClass,
      });
    },
    []
  );

  const launchSolo = useCallback(
    (overrideClass?: OperatorClassId) => {
      const cls = overrideClass ?? selectedClass;
      const cleanName = callsign.trim().toUpperCase().slice(0, 16) || "GHOST-01";
      const skinId = profileRef.current.equippedSkins[cls];
      persistPrefs(cleanName, cls);
      setMode("solo");
      setActiveRoomCode(null);
      setLastResult(null);
      setLastRewards(null);
      setPhase("playing");
      engineRef.current?.startMatch({
        callsign: cleanName,
        classId: cls,
        skinId,
        mode: "solo",
      });
    },
    [callsign, selectedClass, persistPrefs]
  );

  const launchMultiplayer = useCallback(
    async (opts: {
      roomCode?: string;
      quickJoin?: boolean;
      overrideClass?: OperatorClassId;
    }) => {
      const engine = engineRef.current;
      if (!engine) return;
      const cls = opts.overrideClass ?? selectedClass;
      const cleanName = callsign.trim().toUpperCase().slice(0, 16) || "GHOST-01";
      const skinId = profileRef.current.equippedSkins[cls];
      persistPrefs(cleanName, cls);

      setJoiningRoom(true);
      setMpError(null);
      try {
        const res = await fetch("/api/multiplayer/rooms", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            roomCode: opts.roomCode,
            quickJoin: opts.quickJoin,
            playerId: engine.getPlayerId(),
            callsign: cleanName,
            classId: cls,
            skinId,
          }),
        });
        if (!res.ok) throw new Error("Unable to join room");
        const data = (await res.json()) as {
          ok: boolean;
          roomCode: string;
          seed: number;
          playerId: string;
          peers: MultiplayerPeerState[];
        };
        if (!data.ok) throw new Error("Room rejected");

        setMode("multiplayer");
        setActiveRoomCode(data.roomCode);
        setLastResult(null);
        setLastRewards(null);
        setPhase("playing");
        engine.startMatch({
          callsign: cleanName,
          classId: cls,
          skinId,
          mode: "multiplayer",
          roomCode: data.roomCode,
          playerId: data.playerId,
          seed: data.seed,
          initialPeers: data.peers,
        });
      } catch {
        setMpError(
          "Connexion au salon impossible. Réessayez ou déployez en Solo."
        );
      } finally {
        setJoiningRoom(false);
      }
    },
    [callsign, selectedClass, persistPrefs]
  );

  const handleInstantRestart = useCallback(() => {
    if (mode === "multiplayer" && activeRoomCode) {
      void launchMultiplayer({ roomCode: activeRoomCode });
    } else {
      launchSolo();
    }
  }, [mode, activeRoomCode, launchMultiplayer, launchSolo]);

  // Keyboard quick-start on Game Over (Enter/Space for instant restart!)
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement | null)?.tagName;
      if (tag === "INPUT" || tag === "TEXTAREA") return;
      if (phase === "gameover" && (e.code === "Enter" || e.code === "Space")) {
        e.preventDefault();
        handleInstantRestart();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [phase, handleInstantRestart]);

  // Progression handlers
  const handleBuySkin = useCallback(
    (
      skin: OperatorSkin,
      currency: "credits" | "crystals",
      overridePrice?: number
    ) => {
      const res = purchaseSkin(profileRef.current, skin, currency, overridePrice);
      if (res.ok) {
        soundEngine.playPurchase();
        syncProfile(res.profile);
        setSelectedClass(skin.classId);
        showToast(`SKIN ${skin.name} DÉBLOQUÉ & ÉQUIPÉ !`);
      } else {
        soundEngine.playUiClick(0.7);
        showToast(res.reason ?? "ACHAT IMPOSSIBLE");
      }
    },
    [syncProfile, showToast]
  );

  const handleEquipSkin = useCallback(
    (skin: OperatorSkin) => {
      const next = equipSkin(profileRef.current, skin);
      soundEngine.playUiClick(1.2);
      syncProfile(next);
      setSelectedClass(skin.classId);
      showToast(`SKIN ${skin.name} ÉQUIPÉ`);
    },
    [syncProfile, showToast]
  );

  const handleOpenCrate = useCallback(
    (
      tier: CrateTier,
      currency: "credits" | "crystals"
    ): CrateOpenResult | null => {
      const res = openSupplyCrate(profileRef.current, tier, currency);
      if (!res) {
        showToast("DEVISE INSUFFISANTE");
        return null;
      }
      syncProfile(res.profile);
      const rarity =
        res.skin?.rarity === "legendary"
          ? "legendary"
          : res.skin?.rarity === "epic"
            ? "epic"
            : "rare";
      soundEngine.playCrateOpen(rarity);
      return res;
    },
    [syncProfile, showToast]
  );

  const handleClaimQuest = useCallback(
    (questId: string) => {
      const { profile: next, claimedQuest } = claimQuestReward(
        profileRef.current,
        questId
      );
      if (claimedQuest) {
        soundEngine.playQuestClaim();
        syncProfile(next);
        showToast(
          `CONTRAT VALIDÉ : +${claimedQuest.rewardCredits} CR • +${claimedQuest.rewardCrystals} ◆`
        );
      }
    },
    [syncProfile, showToast]
  );

  const handleRerollQuest = useCallback(
    (questId: string) => {
      soundEngine.playUiClick(1.1);
      const next = rerollDailyQuest(profileRef.current, questId);
      syncProfile(next);
      showToast("NOUVEAU CONTRAT ASSIGNÉ");
    },
    [syncProfile, showToast]
  );

  const handleClaimMilestone = useCallback(() => {
    const res = claimDailyMilestone(profileRef.current);
    if (res.credits > 0) {
      soundEngine.playPurchase();
      syncProfile(res.profile);
      showToast(`PRIME ÉLITE : +${res.credits} CR • +${res.crystals} ◆`);
    }
  }, [syncProfile, showToast]);

  const handleClaimDailyLogin = useCallback(() => {
    const res = claimDailyLoginReward(profileRef.current);
    if (res.credits > 0) {
      soundEngine.playQuestClaim();
      syncProfile(res.profile);
      showToast(`JOUR ${res.day} : +${res.credits} CR • +${res.crystals} ◆`);
    }
  }, [syncProfile, showToast]);

  const togglePause = () => {
    if (phase === "playing") {
      engineRef.current?.setPhase("paused");
      setPhase("paused");
    } else if (phase === "paused") {
      engineRef.current?.setPhase("playing");
      setPhase("playing");
    }
  };

  const returnToMenu = (targetTab: LobbyTab = "qg") => {
    setLobbyInitialTab(targetTab);
    engineRef.current?.setPhase("menu");
    setPhase("menu");
    setActiveRoomCode(null);
    setLastResult(null);
    setLastRewards(null);
  };

  const handleToggleMute = () => {
    soundEngine.unlock();
    const nowMuted = soundEngine.toggleMute();
    setMuted(nowMuted);
  };

  const handleCopyRoomCode = async () => {
    if (!hud.roomCode) return;
    try {
      await navigator.clipboard.writeText(hud.roomCode);
      setCopiedCode(true);
      setTimeout(() => setCopiedCode(false), 1800);
    } catch {
      // ignore clipboard fallback
    }
  };

  const selectedSpec = OPERATORS[selectedClass];
  const equippedSkin = getSkinById(
    profile.equippedSkins[selectedClass],
    selectedClass
  );
  const accuracy =
    lastResult && lastResult.shotsFired > 0
      ? Math.min(100, Math.round((lastResult.shotsHit / lastResult.shotsFired) * 100))
      : 0;

  return (
    <div className="relative h-dvh w-screen overflow-hidden bg-[#06090f] select-none">
      {/* FULL-VIEWPORT 60FPS GAME CANVAS */}
      <canvas
        ref={canvasRef}
        className={`block h-full w-full touch-none ${
          phase === "playing" && !isTouchMode ? "cursor-none" : "cursor-default"
        }`}
      />

      {/* ==================== ACTIVE GAMEPLAY HUD ==================== */}
      {(phase === "playing" || phase === "paused") && (
        <div className="pointer-events-none fixed inset-0 z-10 flex flex-col justify-between p-3 sm:p-4">
          {/* TOP BAR */}
          <div className="flex items-start justify-between gap-2">
            {/* Top-Left Sector & Multiplayer Room Pill */}
            <div className="flex flex-col gap-1.5">
              <div className="pointer-events-auto flex items-center gap-2 border border-slate-700/70 bg-slate-950/85 px-3 py-1.5 backdrop-blur-md tac-cut-sm">
                <span
                  className="h-2 w-2 animate-pulse"
                  style={{ backgroundColor: equippedSkin.vestTrim }}
                />
                <span className="font-mono text-[11px] font-bold tracking-wider text-slate-200">
                  {hud.zoneName}
                </span>
                <span className="hidden sm:inline-block font-mono text-[10px] text-slate-500">
                  {hud.fps} FPS
                </span>
              </div>

              {hud.roomCode && (
                <button
                  type="button"
                  onClick={handleCopyRoomCode}
                  className="pointer-events-auto inline-flex items-center gap-2 self-start border border-amber-500/45 bg-slate-950/85 px-2.5 py-1 font-mono text-[11px] font-bold text-amber-300 backdrop-blur-md hover:bg-slate-900 transition"
                  title="Copier le code du salon"
                >
                  <Radio className="h-3 w-3 animate-pulse text-amber-400" />
                  <span>SALON {hud.roomCode}</span>
                  <span className="bg-amber-500/20 px-1.5 py-0.5 text-[10px] text-amber-200">
                    {hud.humanPlayersCount} LIVE
                  </span>
                  {copiedCode ? (
                    <Check className="h-3 w-3 text-emerald-400" />
                  ) : (
                    <Copy className="h-3 w-3 opacity-75" />
                  )}
                </button>
              )}
            </div>

            {/* Top-Center Core Telemetry (Alive, Kills, Score, Storm) */}
            <div className="flex flex-col items-center gap-1.5">
              <div className="flex items-center gap-3 sm:gap-5 border border-slate-700/75 bg-slate-950/85 px-4 py-2 backdrop-blur-md tac-cut-sm shadow-[0_12px_30px_rgba(0,0,0,0.5)]">
                <div className="flex items-center gap-1.5">
                  <Users className="h-3.5 w-3.5 text-sky-400" />
                  <span className="font-mono text-sm font-black text-white">
                    {hud.aliveCount}
                  </span>
                  <span className="font-mono text-[10px] text-slate-400">
                    /{hud.totalCount}
                  </span>
                </div>
                <div className="h-4 w-px bg-slate-800" />
                <div className="flex items-center gap-1.5">
                  <Skull className="h-3.5 w-3.5 text-rose-400" />
                  <span className="font-mono text-sm font-black text-white">
                    {hud.kills}
                  </span>
                </div>
                <div className="h-4 w-px bg-slate-800" />
                <div className="flex items-center gap-1.5">
                  <Flame className="h-3.5 w-3.5 text-amber-400" />
                  <span className="font-mono text-sm font-black text-amber-300">
                    {hud.score.toLocaleString()}
                  </span>
                </div>
              </div>

              {/* Storm Ring Progress Pill */}
              <div
                className={`flex items-center gap-2 border px-3 py-0.5 font-mono text-[10px] font-bold uppercase tracking-wider backdrop-blur-md transition ${
                  hud.inStorm
                    ? "border-rose-500 bg-rose-950/90 text-rose-200 animate-pulse"
                    : "border-slate-700/60 bg-slate-950/80 text-slate-300"
                }`}
              >
                <span>
                  {hud.inStorm
                    ? "ALERTE : HORS ZONE SÛRE"
                    : `ZONE ROUGE • ${hud.stormTimeRemainingSec}s`}
                </span>
                <div className="h-1.5 w-14 overflow-hidden bg-slate-800">
                  <div
                    className="h-full bg-rose-500 transition-all duration-150"
                    style={{ width: `${Math.round(hud.stormShrinkProgress * 100)}%` }}
                  />
                </div>
              </div>
            </div>

            {/* Top-Right Controls & Kill Feed */}
            <div className="flex flex-col items-end gap-2">
              <div className="pointer-events-auto flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={handleToggleMute}
                  className="flex h-9 w-9 items-center justify-center border border-slate-700/70 bg-slate-950/85 text-slate-200 backdrop-blur-md hover:border-sky-500/60 hover:text-sky-300 transition"
                  aria-label="Audio"
                >
                  {muted ? <VolumeX className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />}
                </button>
                <button
                  type="button"
                  onClick={togglePause}
                  className="flex h-9 w-9 items-center justify-center border border-slate-700/70 bg-slate-950/85 text-slate-200 backdrop-blur-md hover:border-amber-400/60 hover:text-amber-300 transition"
                  aria-label="Pause"
                >
                  <Pause className="h-4 w-4" />
                </button>
              </div>

              {/* Compact Kill Feed */}
              {hud.killFeed.length > 0 && (
                <div className="hidden sm:flex flex-col items-end gap-1 max-w-[270px]">
                  {hud.killFeed.map((item) => (
                    <div
                      key={item.id}
                      className={`border px-2.5 py-1 font-mono text-[10px] backdrop-blur-md ${
                        item.isLocalInvolved
                          ? "border-amber-400/60 bg-amber-950/80 text-amber-100"
                          : "border-slate-800/80 bg-slate-950/75 text-slate-300"
                      }`}
                    >
                      <span className="font-bold text-sky-300">{item.killerName}</span>
                      <span className="mx-1.5 text-slate-500">[{item.weaponName}]</span>
                      <span className="font-bold text-rose-400">{item.victimName}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* BOTTOM TACTICAL BAR */}
          <div className="flex items-end justify-between gap-3">
            {/* Status badges (Left) */}
            <div className="hidden md:flex flex-col gap-1.5">
              <div className="flex items-center gap-2">
                {hud.stealth && (
                  <span className="inline-flex items-center gap-1 border border-sky-400/45 bg-sky-950/80 px-2.5 py-1 font-mono text-[11px] font-bold text-sky-300 backdrop-blur-md">
                    <Footprints className="h-3.5 w-3.5" />
                    FURTIF SILENCIEUX
                  </span>
                )}
                {hud.visionBoosted && (
                  <span className="inline-flex items-center gap-1 border border-purple-400/50 bg-purple-950/80 px-2.5 py-1 font-mono text-[11px] font-bold text-purple-200 backdrop-blur-md">
                    <Eye className="h-3.5 w-3.5" />
                    OPTIQUE +20%
                  </span>
                )}
                {hud.targetLocked && (
                  <span className="inline-flex items-center gap-1 border border-rose-500/60 bg-rose-950/85 px-2.5 py-1 font-mono text-[11px] font-bold text-rose-200 backdrop-blur-md">
                    <Crosshair className="h-3.5 w-3.5" />
                    VERROUILLAGE AUTO
                  </span>
                )}
              </div>
              <div className="font-mono text-[10px] text-slate-500 bg-slate-950/65 px-2.5 py-1 border border-slate-800/70">
                WASD Bouger • SHIFT Furtif • CLIC Tir Manuel • ESPACE Capacité • R Recharger • ÉCHAP Pause
              </div>
            </div>

            {/* Center HP / Armor / Weapon / Ability Cluster */}
            <div className="mx-auto flex items-center gap-3 border border-slate-700/75 bg-slate-950/88 px-3.5 py-2.5 backdrop-blur-md tac-cut-sm shadow-[0_14px_35px_rgba(0,0,0,0.6)]">
              {/* Armor + HP Bars */}
              <div className="w-36 sm:w-48 space-y-1.5">
                <div className="flex items-center justify-between font-mono text-[10px] font-bold">
                  <span className="inline-flex items-center gap-1 text-sky-300">
                    <Shield className="h-3 w-3" />
                    ARMURE
                  </span>
                  <span className="text-sky-200">
                    {hud.armor}/{hud.maxArmor}
                  </span>
                </div>
                <div className="h-2 w-full overflow-hidden bg-slate-800">
                  <div
                    className="h-full bg-gradient-to-r from-sky-500 to-cyan-300 transition-all duration-100"
                    style={{
                      width: `${Math.max(0, Math.min(100, (hud.armor / hud.maxArmor) * 100))}%`,
                    }}
                  />
                </div>

                <div className="flex items-center justify-between font-mono text-[10px] font-bold pt-0.5">
                  <span className="text-emerald-300">SANTÉ</span>
                  <span className={hud.hp < hud.maxHp * 0.3 ? "text-rose-400" : "text-white"}>
                    {hud.hp}/{hud.maxHp}
                  </span>
                </div>
                <div className="h-2.5 w-full overflow-hidden bg-slate-800">
                  <div
                    className={`h-full transition-all duration-100 ${
                      hud.hp < hud.maxHp * 0.3
                        ? "bg-gradient-to-r from-rose-600 to-rose-400"
                        : "bg-gradient-to-r from-emerald-500 to-teal-300"
                    }`}
                    style={{
                      width: `${Math.max(0, Math.min(100, (hud.hp / hud.maxHp) * 100))}%`,
                    }}
                  />
                </div>
              </div>

              <div className="h-11 w-px bg-slate-800" />

              {/* Weapon Ammo & Reload */}
              <div className="min-w-[82px] text-center">
                <div className="font-mono text-[9px] font-bold uppercase tracking-wider text-slate-400">
                  {selectedSpec.weapon.name}
                </div>
                {hud.reloadingProgress > 0 ? (
                  <div className="mt-1">
                    <div className="font-mono text-[11px] font-bold text-amber-300">
                      RECHARGE
                    </div>
                    <div className="mt-1 h-1.5 w-full overflow-hidden bg-slate-800">
                      <div
                        className="h-full bg-amber-400"
                        style={{ width: `${Math.round(hud.reloadingProgress * 100)}%` }}
                      />
                    </div>
                  </div>
                ) : (
                  <div className="font-mono text-xl font-black leading-tight text-white">
                    {hud.ammo}
                    <span className="text-xs font-semibold text-slate-500">
                      /{hud.magSize}
                    </span>
                  </div>
                )}
              </div>

              <div className="h-11 w-px bg-slate-800" />

              {/* Tactical Ability Button */}
              <button
                type="button"
                onClick={() => engineRef.current?.triggerAbility()}
                disabled={hud.abilityCooldownRatio > 0 && hud.abilityActiveRatio === 0}
                className={`pointer-events-auto relative flex h-12 min-w-[96px] flex-col items-center justify-center overflow-hidden border px-2.5 font-mono transition tac-cut-sm ${
                  hud.abilityActiveRatio > 0
                    ? "border-amber-300 bg-amber-500/25 text-amber-100 shadow-[0_0_20px_rgba(245,158,11,0.4)]"
                    : hud.abilityCooldownRatio > 0
                      ? "border-slate-700 bg-slate-900/90 text-slate-500"
                      : "border-sky-400/70 bg-sky-500/20 text-sky-100 hover:bg-sky-500/30 active:scale-95"
                }`}
              >
                {hud.abilityCooldownRatio > 0 && hud.abilityActiveRatio === 0 && (
                  <div
                    className="absolute inset-x-0 bottom-0 bg-slate-800/80"
                    style={{ height: `${Math.round(hud.abilityCooldownRatio * 100)}%` }}
                  />
                )}
                <div className="relative z-10 flex items-center gap-1 text-[10px] font-extrabold uppercase tracking-wider">
                  <Zap className="h-3 w-3" />
                  <span>{hud.abilityActiveRatio > 0 ? "ACTIF" : "CAPACITÉ"}</span>
                </div>
                <span className="relative z-10 text-[9px] text-slate-300 truncate max-w-[92px]">
                  {hud.abilityCooldownRatio > 0 && hud.abilityActiveRatio === 0
                    ? `${Math.ceil(hud.abilityCooldownRatio * 11)}s`
                    : "[ESPACE]"}
                </span>
              </button>
            </div>

            {/* Mobile Touch Action Buttons (Right Thumb) */}
            {isTouchMode ? (
              <div className="pointer-events-auto flex flex-col gap-2">
                <button
                  type="button"
                  onTouchStart={(e) => {
                    e.stopPropagation();
                    engineRef.current?.triggerReload();
                  }}
                  onClick={() => engineRef.current?.triggerReload()}
                  className="flex h-12 w-12 items-center justify-center rounded-full border border-amber-400/50 bg-slate-950/80 text-amber-300 backdrop-blur-md active:scale-90"
                  aria-label="Recharger"
                >
                  <RefreshCw className="h-5 w-5" />
                </button>
                <button
                  type="button"
                  onTouchStart={(e) => {
                    e.stopPropagation();
                    engineRef.current?.setManualFire(true);
                  }}
                  onTouchEnd={(e) => {
                    e.stopPropagation();
                    engineRef.current?.setManualFire(false);
                  }}
                  onTouchCancel={() => engineRef.current?.setManualFire(false)}
                  className="flex h-16 w-16 items-center justify-center rounded-full border-2 border-rose-400/80 bg-rose-600/35 text-rose-100 shadow-[0_0_25px_rgba(244,63,94,0.35)] backdrop-blur-md active:scale-95"
                  aria-label="Tir Manuel"
                >
                  <Crosshair className="h-7 w-7" />
                </button>
              </div>
            ) : (
              <div className="hidden md:block w-[110px]" />
            )}
          </div>
        </div>
      )}

      {/* ==================== REDESIGNED AAA GAME LOBBY ==================== */}
      {phase === "menu" && (
        <LobbyMenu
          selectedClass={selectedClass}
          onSelectClass={(cls) => {
            setSelectedClass(cls);
            persistPrefs(callsign, cls);
          }}
          callsign={callsign}
          onCallsignChange={(name) => {
            setCallsign(name);
            persistPrefs(name, selectedClass);
          }}
          profile={profile}
          mode={mode}
          onModeChange={setMode}
          roomInput={roomInput}
          onRoomInputChange={setRoomInput}
          activeRooms={activeRooms}
          onRefreshRooms={() => void fetchActiveRooms()}
          joiningRoom={joiningRoom}
          mpError={mpError}
          onDeploySolo={() => launchSolo()}
          onDeployMultiplayer={(opts) => void launchMultiplayer(opts)}
          onBuySkin={handleBuySkin}
          onEquipSkin={handleEquipSkin}
          onOpenCrate={handleOpenCrate}
          onClaimQuest={handleClaimQuest}
          onRerollQuest={handleRerollQuest}
          onClaimMilestone={handleClaimMilestone}
          onClaimDailyLogin={handleClaimDailyLogin}
          localScores={localScores}
          globalScores={globalScores}
          scoreTab={scoreTab}
          onScoreTabChange={setScoreTab}
          loadingGlobal={loadingGlobal}
          onClearLocalScores={() => setLocalScores(clearLocalHighScores())}
          muted={muted}
          onToggleMute={handleToggleMute}
          toastMessage={toastMessage}
          initialTab={lobbyInitialTab}
        />
      )}

      {/* ==================== PAUSE OVERLAY ==================== */}
      {phase === "paused" && (
        <div className="fixed inset-0 z-30 flex items-center justify-center bg-slate-950/80 backdrop-blur-md p-4">
          <div className="w-full max-w-md tac-panel tac-cut p-6 space-y-5">
            <div className="border-b border-slate-800 pb-4 text-center">
              <div className="font-mono text-[10px] font-bold uppercase tracking-[0.26em] text-amber-400">
                OPÉRATION EN PAUSE
              </div>
              <h2 className="mt-1 font-display text-3xl font-black uppercase text-white">
                VEILLE TACTIQUE
              </h2>
              {hud.roomCode && (
                <p className="mt-1 font-mono text-xs text-sky-300">
                  SALON MULTIJOUEUR LIVE : {hud.roomCode}
                </p>
              )}
            </div>

            <div className="space-y-2.5">
              <button
                type="button"
                onClick={togglePause}
                className="w-full inline-flex items-center justify-center gap-2 tac-cut-sm bg-amber-400 px-5 py-3 font-display text-base font-black uppercase tracking-wider text-slate-950 hover:bg-amber-300 transition"
              >
                <Play className="h-4 w-4 fill-slate-950" />
                REPRENDRE LE COMBAT
              </button>

              <button
                type="button"
                onClick={handleInstantRestart}
                className="w-full inline-flex items-center justify-center gap-2 tac-cut-sm border border-sky-400/50 bg-sky-500/15 px-5 py-3 font-display text-base font-extrabold uppercase tracking-wider text-sky-200 hover:bg-sky-500/25 transition"
              >
                <RotateCcw className="h-4 w-4" />
                REDÉMARRAGE INSTANTANÉ
              </button>

              <button
                type="button"
                onClick={handleToggleMute}
                className="w-full inline-flex items-center justify-center gap-2 border border-slate-700 bg-slate-950/80 px-5 py-2.5 font-mono text-xs font-bold uppercase tracking-wider text-slate-200 hover:border-slate-500 transition"
              >
                {muted ? <VolumeX className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />}
                {muted ? "AUDIO COUPÉ — ACTIVER" : "AUDIO ACTIF — COUPER"}
              </button>

              <button
                type="button"
                onClick={() => returnToMenu("qg")}
                className="w-full inline-flex items-center justify-center gap-2 border border-slate-800 bg-slate-950/60 px-5 py-2.5 font-mono text-xs font-bold uppercase tracking-wider text-slate-400 hover:text-rose-300 hover:border-rose-500/40 transition"
              >
                <LogOut className="h-4 w-4" />
                RETOUR AU QG
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ==================== GAME OVER / VICTORY DEBRIEF ==================== */}
      {phase === "gameover" && lastResult && (
        <div className="fixed inset-0 z-30 flex items-center justify-center overflow-y-auto bg-slate-950/85 backdrop-blur-md p-3 sm:p-6">
          <div className="my-auto w-full max-w-5xl grid grid-cols-1 lg:grid-cols-12 gap-5">
            {/* Left: Match Telemetry, Currency/XP Rewards & Instant Restart */}
            <div className="lg:col-span-7 tac-panel tac-cut p-5 sm:p-6 space-y-4">
              <div className="flex items-start justify-between gap-3 border-b border-slate-800 pb-4">
                <div>
                  <div
                    className={`inline-flex items-center gap-1.5 border px-2.5 py-1 font-mono text-[10px] font-black uppercase tracking-[0.18em] ${
                      lastResult.victory
                        ? "border-amber-400/60 bg-amber-500/15 text-amber-300"
                        : "border-rose-500/60 bg-rose-500/15 text-rose-300"
                    }`}
                  >
                    {lastResult.victory ? (
                      <>
                        <Crown className="h-3.5 w-3.5" />
                        SECTEUR SÉCURISÉ • VICTOIRE ROYALE
                      </>
                    ) : (
                      <>
                        <Skull className="h-3.5 w-3.5" />
                        SIGNAL PERDU • RANG #{lastResult.placement}/{lastResult.totalPlayers}
                      </>
                    )}
                  </div>

                  <h2 className="mt-2 font-display text-3xl sm:text-4xl font-black uppercase text-white">
                    {lastResult.victory ? "MISSION ACCOMPLIE" : "OPÉRATEUR À TERRE"}
                  </h2>
                  {lastResult.eliminatedBy && (
                    <p className="mt-0.5 font-mono text-xs text-slate-400">
                      Éliminé par{" "}
                      <span className="font-bold text-rose-400">
                        {lastResult.eliminatedBy}
                      </span>
                    </p>
                  )}
                </div>

                <div className="text-right">
                  <div className="font-mono text-[10px] uppercase tracking-widest text-slate-400">
                    SCORE FINAL
                  </div>
                  <div className="font-mono text-3xl sm:text-4xl font-black text-amber-300">
                    {lastResult.score.toLocaleString()}
                  </div>
                  {lastResult.isNewLocalBest && (
                    <span className="mt-1 inline-block bg-amber-400 px-2 py-0.5 font-mono text-[9px] font-black uppercase text-slate-950">
                      NOUVEAU RECORD !
                    </span>
                  )}
                </div>
              </div>

              {/* EARNED REWARDS STRIP (Credits + Crystals + XP + Level Up!) */}
              {lastRewards && (
                <div className="border border-amber-500/35 bg-amber-500/10 p-3 flex flex-wrap items-center justify-between gap-3">
                  <div className="flex flex-wrap items-center gap-3 font-mono text-xs font-black">
                    <span className="text-[10px] uppercase tracking-wider text-slate-300">
                      GAINS :
                    </span>
                    <span className="inline-flex items-center gap-1 text-amber-300">
                      <Coins className="h-4 w-4" /> +{lastRewards.creditsEarned} CR
                    </span>
                    <span className="inline-flex items-center gap-1 text-cyan-300">
                      <Diamond className="h-3.5 w-3.5" /> +{lastRewards.crystalsEarned} ◆
                    </span>
                    <span className="text-emerald-300">
                      +{lastRewards.xpEarned} XP
                    </span>
                    {lastRewards.leveledUp && (
                      <span className="bg-emerald-400 px-2 py-0.5 text-[10px] text-slate-950">
                        NIVEAU {lastRewards.newLevel} !
                      </span>
                    )}
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => returnToMenu("quests")}
                      className="inline-flex items-center gap-1 border border-amber-400/60 bg-slate-950/80 px-2.5 py-1 font-mono text-[10px] font-bold uppercase text-amber-200 hover:bg-amber-500/20"
                    >
                      <Target className="h-3 w-3" />
                      QUÊTES
                    </button>
                    <button
                      type="button"
                      onClick={() => returnToMenu("shop")}
                      className="inline-flex items-center gap-1 border border-cyan-400/50 bg-slate-950/80 px-2.5 py-1 font-mono text-[10px] font-bold uppercase text-cyan-200 hover:bg-cyan-500/20"
                    >
                      <ShoppingBag className="h-3 w-3" />
                      BOUTIQUE
                    </button>
                  </div>
                </div>
              )}

              {/* Progressed Daily Quests Summary */}
              {lastRewards && lastRewards.questsProgressed.length > 0 && (
                <div className="border border-slate-800 bg-slate-950/75 p-3 space-y-1.5">
                  <div className="font-mono text-[10px] font-bold uppercase tracking-widest text-amber-300">
                    PROGRESSION DES CONTRATS JOURNALIERS
                  </div>
                  {lastRewards.questsProgressed.map((qp) => (
                    <div
                      key={qp.id}
                      className="flex items-center justify-between font-mono text-xs"
                    >
                      <span className="text-slate-200 truncate">{qp.title}</span>
                      <span
                        className={
                          qp.completedNow
                            ? "font-black text-amber-300"
                            : "text-sky-300"
                        }
                      >
                        {qp.completedNow
                          ? "✓ TERMINÉ (À RÉCLAMER !)"
                          : `${qp.progress}/${qp.target} (+${qp.delta})`}
                      </span>
                    </div>
                  ))}
                </div>
              )}

              {/* 4 Key Match Stats */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                <div className="border border-slate-800 bg-slate-950/80 p-3">
                  <div className="font-mono text-[10px] text-slate-400">ÉLIMS</div>
                  <div className="mt-1 font-mono text-2xl font-black text-rose-400">
                    {lastResult.kills}
                  </div>
                </div>
                <div className="border border-slate-800 bg-slate-950/80 p-3">
                  <div className="font-mono text-[10px] text-slate-400">DÉGÂTS</div>
                  <div className="mt-1 font-mono text-2xl font-black text-sky-300">
                    {lastResult.damageDealt}
                  </div>
                </div>
                <div className="border border-slate-800 bg-slate-950/80 p-3">
                  <div className="font-mono text-[10px] text-slate-400">PRÉCISION</div>
                  <div className="mt-1 font-mono text-2xl font-black text-emerald-300">
                    {accuracy}%
                  </div>
                </div>
                <div className="border border-slate-800 bg-slate-950/80 p-3">
                  <div className="font-mono text-[10px] text-slate-400">SURVIE</div>
                  <div className="mt-1 font-mono text-2xl font-black text-amber-300">
                    {lastResult.survivalSeconds}s
                  </div>
                </div>
              </div>

              {/* Quick Operator Swap before Instant Redeploy */}
              <div className="space-y-1.5">
                <div className="font-mono text-[10px] font-bold uppercase tracking-widest text-slate-400">
                  CHANGER D&apos;OPÉRATEUR
                </div>
                <div className="grid grid-cols-4 gap-2">
                  {OPERATOR_LIST.map((op) => {
                    const opSkin = getSkinById(profile.equippedSkins[op.id], op.id);
                    return (
                      <button
                        key={op.id}
                        type="button"
                        onClick={() => setSelectedClass(op.id)}
                        className={`border px-2 py-2 text-center font-mono text-[11px] font-bold transition ${
                          selectedClass === op.id
                            ? "border-amber-400 bg-amber-500/15 text-white"
                            : "border-slate-800 bg-slate-950/70 text-slate-400 hover:border-slate-600"
                        }`}
                      >
                        <span
                          className="mx-auto mb-1 block h-1.5 w-6"
                          style={{ backgroundColor: opSkin.vestTrim }}
                        />
                        {op.name}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Instant Restart & HQ Actions */}
              <div className="flex flex-col sm:flex-row gap-3 pt-1">
                <button
                  type="button"
                  onClick={handleInstantRestart}
                  className="relative flex-1 overflow-hidden animate-sheen inline-flex items-center justify-center gap-2 tac-cut-btn bg-gradient-to-r from-amber-500 via-amber-400 to-yellow-300 px-6 py-3.5 font-display text-lg font-black uppercase tracking-wider text-slate-950 shadow-[0_0_26px_rgba(245,158,11,0.35)] hover:brightness-110 active:scale-[0.99] transition"
                >
                  <RotateCcw className="h-5 w-5" />
                  REDÉPLOYER [ESPACE]
                </button>
                <button
                  type="button"
                  onClick={() => returnToMenu("qg")}
                  className="inline-flex items-center justify-center gap-2 border border-slate-700 bg-slate-950/90 px-5 py-3.5 font-mono text-xs font-bold uppercase tracking-wider text-slate-200 hover:border-slate-500 transition"
                >
                  RETOUR QG
                </button>
              </div>
            </div>

            {/* Right: Local + Global Leaderboard */}
            <div className="lg:col-span-5">
              <HighScoreBoard
                activeTab={scoreTab}
                onTabChange={setScoreTab}
                localScores={localScores}
                globalScores={globalScores}
                loadingGlobal={loadingGlobal}
                highlightScore={lastResult.score}
                compact
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
