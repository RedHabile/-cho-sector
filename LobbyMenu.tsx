"use client";

import { useState } from "react";
import {
  Check,
  ChevronRight,
  Coins,
  Crosshair,
  Crown,
  Diamond,
  Edit3,
  Gift,
  HelpCircle,
  Keyboard,
  Palette,
  Play,
  Radio,
  ShoppingBag,
  Skull,
  Smartphone,
  Sparkles,
  Target,
  Trophy,
  Users,
  Volume2,
  VolumeX,
  X,
} from "lucide-react";
import { OPERATORS, OPERATOR_LIST } from "@/game/constants";
import {
  canClaimDailyLogin,
  computeRankInfo,
  countClaimableQuests,
  CrateOpenResult,
  CrateTier,
} from "@/game/progression";
import { getDailyFeaturedSkin, getSkinById, RARITY_META } from "@/game/skins";
import { soundEngine } from "@/game/sound";
import {
  GameMode,
  HighScoreEntry,
  OperatorClassId,
  OperatorSkin,
  PlayerProfile,
  RoomSummary,
} from "@/game/types";
import { HighScoreBoard } from "./HighScoreBoard";
import { OperatorPreviewCanvas } from "./OperatorPreviewCanvas";
import { OperatorsView } from "./OperatorsView";
import { QuestsView } from "./QuestsView";
import { ShopView } from "./ShopView";

export type LobbyTab = "qg" | "operators" | "shop" | "quests" | "leaderboard";

interface LobbyMenuProps {
  selectedClass: OperatorClassId;
  onSelectClass: (cls: OperatorClassId) => void;
  callsign: string;
  onCallsignChange: (name: string) => void;
  profile: PlayerProfile;
  mode: GameMode;
  onModeChange: (mode: GameMode) => void;
  roomInput: string;
  onRoomInputChange: (val: string) => void;
  activeRooms: RoomSummary[];
  onRefreshRooms: () => void;
  joiningRoom: boolean;
  mpError: string | null;
  onDeploySolo: () => void;
  onDeployMultiplayer: (opts: { roomCode?: string; quickJoin?: boolean }) => void;
  onBuySkin: (
    skin: OperatorSkin,
    currency: "credits" | "crystals",
    overridePrice?: number
  ) => void;
  onEquipSkin: (skin: OperatorSkin) => void;
  onOpenCrate: (
    tier: CrateTier,
    currency: "credits" | "crystals"
  ) => CrateOpenResult | null;
  onClaimQuest: (questId: string) => void;
  onRerollQuest: (questId: string) => void;
  onClaimMilestone: () => void;
  onClaimDailyLogin: () => void;
  localScores: HighScoreEntry[];
  globalScores: HighScoreEntry[];
  scoreTab: "local" | "global";
  onScoreTabChange: (tab: "local" | "global") => void;
  loadingGlobal: boolean;
  onClearLocalScores: () => void;
  muted: boolean;
  onToggleMute: () => void;
  toastMessage: string | null;
  initialTab?: LobbyTab;
}

export function LobbyMenu({
  selectedClass,
  onSelectClass,
  callsign,
  onCallsignChange,
  profile,
  mode,
  onModeChange,
  roomInput,
  onRoomInputChange,
  activeRooms,
  onRefreshRooms,
  joiningRoom,
  mpError,
  onDeploySolo,
  onDeployMultiplayer,
  onBuySkin,
  onEquipSkin,
  onOpenCrate,
  onClaimQuest,
  onRerollQuest,
  onClaimMilestone,
  onClaimDailyLogin,
  localScores,
  globalScores,
  scoreTab,
  onScoreTabChange,
  loadingGlobal,
  onClearLocalScores,
  muted,
  onToggleMute,
  toastMessage,
  initialTab = "qg",
}: LobbyMenuProps) {
  const [activeTab, setActiveTab] = useState<LobbyTab>(initialTab);
  const [editingCallsign, setEditingCallsign] = useState(false);
  const [showControlsHelp, setShowControlsHelp] = useState(false);
  const [fireTrigger, setFireTrigger] = useState(0);

  const rank = computeRankInfo(profile.xp);
  const selectedSpec = OPERATORS[selectedClass];
  const equippedSkinId = profile.equippedSkins[selectedClass];
  const equippedSkin = getSkinById(equippedSkinId, selectedClass);
  const equippedRarity = RARITY_META[equippedSkin.rarity];

  const claimableCount = countClaimableQuests(profile);
  const loginReady = canClaimDailyLogin(profile);
  const featured = getDailyFeaturedSkin(profile.dailyDate);
  const canAffordCrate = profile.credits >= 350 || profile.crystals >= 50;

  const switchTab = (tab: LobbyTab) => {
    soundEngine.playUiClick(1.08);
    setActiveTab(tab);
  };

  const handlePedestalFire = () => {
    soundEngine.unlock();
    soundEngine.playWeaponFire(selectedSpec.weapon.soundType, 0.72);
    setFireTrigger((v) => v + 1);
  };

  const handlePrimaryDeploy = () => {
    soundEngine.playUiClick(0.92);
    if (mode === "multiplayer") {
      onDeployMultiplayer(
        roomInput.trim() ? { roomCode: roomInput.trim() } : { quickJoin: true }
      );
    } else {
      onDeploySolo();
    }
  };

  // Top 2 priority quests for the QG left quick-strip (claimable ones first!)
  const quickQuests = [...profile.quests]
    .sort((a, b) => {
      const aReady = !a.claimed && a.progress >= a.target ? 2 : !a.claimed ? 1 : 0;
      const bReady = !b.claimed && b.progress >= b.target ? 2 : !b.claimed ? 1 : 0;
      return bReady - aReady;
    })
    .slice(0, 2);

  const navItems: {
    id: LobbyTab;
    label: string;
    icon: typeof Play;
    badge?: number;
    dot?: boolean;
  }[] = [
    { id: "qg", label: "QG", icon: Crosshair },
    { id: "operators", label: "OPÉRATEURS", icon: Palette },
    { id: "shop", label: "BOUTIQUE", icon: ShoppingBag, dot: canAffordCrate },
    { id: "quests", label: "QUÊTES", icon: Target, badge: claimableCount },
    { id: "leaderboard", label: "RANGS", icon: Trophy },
  ];

  return (
    <div
      className={`fixed inset-0 z-20 flex flex-col tac-scanlines transition-colors duration-300 ${
        activeTab === "qg"
          ? "bg-[radial-gradient(ellipse_at_center,rgba(6,10,18,0.34)_0%,rgba(5,8,14,0.82)_72%,rgba(4,6,11,0.95)_100%)]"
          : "bg-slate-950/88 backdrop-blur-md"
      }`}
    >
      {/* ==================== TOP GAME CLIENT COMMAND BAR ==================== */}
      <header className="shrink-0 border-b border-slate-800/90 bg-slate-950/90 backdrop-blur-md">
        <div className="mx-auto flex max-w-[1440px] flex-wrap items-center justify-between gap-2 px-3 py-2 sm:px-5">
          {/* LEFT: Player Military Dog-Tag + Rank XP */}
          <div className="flex items-center gap-3">
            {/* Level Hex Badge */}
            <div
              className="flex h-10 w-10 shrink-0 flex-col items-center justify-center border bg-slate-900 tac-cut-sm"
              style={{ borderColor: rank.color }}
            >
              <span className="font-mono text-[8px] font-bold uppercase text-slate-400 leading-none">
                NIV
              </span>
              <span
                className="font-display text-base font-black leading-none"
                style={{ color: rank.color }}
              >
                {rank.level}
              </span>
            </div>

            <div className="min-w-0">
              <div className="flex items-center gap-1.5">
                {editingCallsign ? (
                  <input
                    autoFocus
                    type="text"
                    maxLength={16}
                    value={callsign}
                    onChange={(e) => onCallsignChange(e.target.value.toUpperCase())}
                    onBlur={() => setEditingCallsign(false)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" || e.key === "Escape") {
                        setEditingCallsign(false);
                      }
                    }}
                    className="w-32 border border-amber-400 bg-slate-900 px-1.5 py-0.5 font-mono text-xs font-bold uppercase text-white outline-none"
                  />
                ) : (
                  <button
                    type="button"
                    onClick={() => setEditingCallsign(true)}
                    className="group inline-flex items-center gap-1.5 font-display text-sm sm:text-base font-black uppercase tracking-wider text-white hover:text-amber-300 transition"
                    title="Modifier votre nom de code"
                  >
                    <span className="truncate max-w-[130px]">{callsign}</span>
                    <Edit3 className="h-3 w-3 text-slate-500 group-hover:text-amber-300" />
                  </button>
                )}
                <span
                  className="hidden sm:inline-block px-1.5 py-0.5 font-mono text-[9px] font-black uppercase tracking-wider bg-slate-900 border border-slate-800"
                  style={{ color: rank.color }}
                >
                  {rank.title}
                </span>
              </div>

              {/* Slim XP Progress Bar */}
              <div className="mt-1 flex items-center gap-2">
                <div className="h-1.5 w-24 sm:w-28 bg-slate-900 overflow-hidden">
                  <div
                    className="h-full transition-all duration-300"
                    style={{
                      width: `${Math.round(rank.progressRatio * 100)}%`,
                      backgroundColor: rank.color,
                    }}
                  />
                </div>
                <span className="font-mono text-[9px] text-slate-500">
                  {rank.currentXp}/{rank.xpForNext} XP
                </span>
              </div>
            </div>
          </div>

          {/* CENTER: Angular Game Client Tabs */}
          <nav className="order-3 w-full sm:order-none sm:w-auto flex items-center justify-center gap-1 overflow-x-auto pt-1 sm:pt-0">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => switchTab(item.id)}
                  className={`relative flex items-center gap-1.5 px-3 sm:px-4 py-2 font-display text-xs font-black uppercase tracking-[0.14em] transition shrink-0 ${
                    isActive
                      ? "bg-amber-400/15 text-amber-300 border-b-2 border-amber-400"
                      : "text-slate-400 hover:text-white hover:bg-slate-900/70 border-b-2 border-transparent"
                  }`}
                >
                  <Icon className="h-3.5 w-3.5" />
                  <span>{item.label}</span>
                  {item.badge && item.badge > 0 ? (
                    <span className="ml-0.5 inline-flex h-4 min-w-4 items-center justify-center bg-amber-400 px-1 font-mono text-[9px] font-black text-slate-950">
                      {item.badge}
                    </span>
                  ) : item.dot ? (
                    <span className="h-1.5 w-1.5 rounded-full bg-amber-400" />
                  ) : null}
                </button>
              );
            })}
          </nav>

          {/* RIGHT: Dual Currencies + Utility Controls */}
          <div className="flex items-center gap-1.5 sm:gap-2">
            <button
              type="button"
              onClick={() => switchTab("shop")}
              className="flex items-center gap-1.5 border border-amber-500/35 bg-amber-500/10 px-2.5 py-1.5 font-mono text-xs font-black text-amber-300 hover:bg-amber-500/20 transition"
              title="Crédits Tactiques — Ouvrir la Boutique"
            >
              <Coins className="h-3.5 w-3.5 text-amber-400" />
              <span>{profile.credits.toLocaleString()}</span>
            </button>

            <button
              type="button"
              onClick={() => switchTab("shop")}
              className="flex items-center gap-1.5 border border-cyan-500/35 bg-cyan-500/10 px-2.5 py-1.5 font-mono text-xs font-black text-cyan-300 hover:bg-cyan-500/20 transition"
              title="Cristaux Black-Ops — Ouvrir la Boutique"
            >
              <Diamond className="h-3.5 w-3.5 text-cyan-400" />
              <span>{profile.crystals.toLocaleString()}</span>
            </button>

            <button
              type="button"
              onClick={() => {
                soundEngine.playUiClick(1.1);
                setShowControlsHelp((v) => !v);
              }}
              className="flex h-8 w-8 items-center justify-center border border-slate-800 bg-slate-900/90 text-slate-300 hover:border-slate-600 hover:text-white transition"
              title="Commandes"
              aria-label="Commandes"
            >
              <HelpCircle className="h-4 w-4" />
            </button>

            <button
              type="button"
              onClick={onToggleMute}
              className="flex h-8 w-8 items-center justify-center border border-slate-800 bg-slate-900/90 text-slate-300 hover:border-slate-600 hover:text-white transition"
              title={muted ? "Activer le son" : "Couper le son"}
              aria-label="Audio"
            >
              {muted ? <VolumeX className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />}
            </button>
          </div>
        </div>
      </header>

      {/* NOTIFICATION TOAST */}
      {toastMessage && (
        <div className="pointer-events-none fixed top-16 left-1/2 z-40 -translate-x-1/2">
          <div className="tac-cut-sm border border-amber-400/75 bg-slate-950/95 px-5 py-2 font-mono text-xs font-black uppercase tracking-wider text-amber-300 shadow-[0_12px_35px_rgba(0,0,0,0.8)]">
            ★ {toastMessage}
          </div>
        </div>
      )}

      {/* ==================== MAIN CONTENT AREA ==================== */}
      <div className="relative flex-1 min-h-0 overflow-hidden">
        {/* ---------- TAB 1: QG HANGAR (TRUE GAME LOBBY) ---------- */}
        {activeTab === "qg" && (
          <div className="h-full flex flex-col justify-between p-3 sm:p-5 max-w-[1440px] mx-auto">
            {/* MIDDLE 3-ZONE HANGAR LAYOUT */}
            <div className="flex-1 min-h-0 grid grid-cols-1 lg:grid-cols-12 gap-4 items-center overflow-y-auto lg:overflow-visible tac-scroll">
              {/* LEFT WING: Brand Stamp + Daily Supply + Active Quests Mini-Tracker */}
              <div className="lg:col-span-3 flex flex-col gap-3 order-2 lg:order-1">
                {/* Compact Tactical Title Mark (Zero Marketing Blurb!) */}
                <div className="hidden lg:block border-l-2 border-amber-400 pl-3">
                  <div className="font-mono text-[10px] font-bold uppercase tracking-[0.26em] text-amber-400/90">
                    BLACKSITE 09 // SAISON 01
                  </div>
                  <h1 className="font-display text-3xl font-black uppercase leading-none tracking-tight text-white">
                    ECHO <span className="text-amber-400">SECTOR</span>
                  </h1>
                </div>

                {/* Instant Daily Gift Banner if Available */}
                {loginReady && (
                  <button
                    type="button"
                    onClick={onClaimDailyLogin}
                    className="relative overflow-hidden animate-sheen tac-cut-sm border border-amber-400/80 bg-gradient-to-r from-amber-500/25 to-yellow-500/10 p-3 text-left hover:brightness-110 transition"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2.5">
                        <Gift className="h-5 w-5 text-amber-300 shrink-0" />
                        <div>
                          <div className="font-display text-xs font-black uppercase tracking-wider text-amber-200">
                            CADEAU QUOTIDIEN PRÊT
                          </div>
                          <div className="font-mono text-[10px] text-amber-100/80">
                            CLIQUER POUR RÉCLAMER CRÉDITS + CRISTAUX
                          </div>
                        </div>
                      </div>
                      <ChevronRight className="h-4 w-4 text-amber-300 shrink-0" />
                    </div>
                  </button>
                )}

                {/* Quick Daily Contracts Strip */}
                <div className="tac-panel tac-cut-sm p-3.5 space-y-2.5">
                  <div className="flex items-center justify-between border-b border-slate-800/80 pb-2">
                    <span className="inline-flex items-center gap-1.5 font-display text-xs font-black uppercase tracking-[0.16em] text-slate-200">
                      <Target className="h-3.5 w-3.5 text-amber-400" />
                      CONTRATS DU JOUR
                    </span>
                    <button
                      type="button"
                      onClick={() => switchTab("quests")}
                      className="font-mono text-[10px] font-bold text-amber-300 hover:text-amber-200"
                    >
                      TOUT ({profile.quests.length}) →
                    </button>
                  </div>

                  <div className="space-y-2">
                    {quickQuests.map((q) => {
                      const ready = !q.claimed && q.progress >= q.target;
                      const pct = Math.min(100, Math.round((q.progress / q.target) * 100));
                      return (
                        <div
                          key={q.id}
                          className={`border p-2 ${
                            ready
                              ? "border-amber-400/70 bg-amber-500/10"
                              : "border-slate-800/80 bg-slate-950/65"
                          }`}
                        >
                          <div className="flex items-center justify-between gap-2">
                            <span className="truncate font-display text-xs font-bold uppercase text-white">
                              {q.title}
                            </span>
                            {ready ? (
                              <button
                                type="button"
                                onClick={() => onClaimQuest(q.id)}
                                className="shrink-0 bg-amber-400 px-2 py-0.5 font-mono text-[9px] font-black uppercase text-slate-950 hover:bg-amber-300"
                              >
                                +{q.rewardCredits} CR
                              </button>
                            ) : q.claimed ? (
                              <Check className="h-3.5 w-3.5 text-emerald-400 shrink-0" />
                            ) : (
                              <span className="font-mono text-[10px] font-bold text-slate-400">
                                {q.progress}/{q.target}
                              </span>
                            )}
                          </div>
                          <div className="mt-1.5 h-1 w-full bg-slate-900 overflow-hidden">
                            <div
                              className="h-full"
                              style={{
                                width: `${pct}%`,
                                backgroundColor: q.claimed
                                  ? "#10b981"
                                  : ready
                                    ? "#fbbf24"
                                    : "#38bdf8",
                              }}
                            />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Compact Combat Service Record */}
                <div className="hidden sm:grid grid-cols-3 gap-1.5">
                  <div className="border border-slate-800/90 bg-slate-950/75 px-2.5 py-2 text-center">
                    <div className="font-mono text-[9px] text-slate-500 uppercase">PARTIES</div>
                    <div className="font-mono text-sm font-black text-white">
                      {profile.totalMatches}
                    </div>
                  </div>
                  <div className="border border-slate-800/90 bg-slate-950/75 px-2.5 py-2 text-center">
                    <div className="font-mono text-[9px] text-slate-500 uppercase">ÉLIMS</div>
                    <div className="font-mono text-sm font-black text-rose-400">
                      {profile.totalKills}
                    </div>
                  </div>
                  <div className="border border-slate-800/90 bg-slate-950/75 px-2.5 py-2 text-center">
                    <div className="font-mono text-[9px] text-slate-500 uppercase">VICTOIRES</div>
                    <div className="font-mono text-sm font-black text-amber-300">
                      {profile.totalWins}
                    </div>
                  </div>
                </div>
              </div>

              {/* CENTER STAGE: Hero Pedestal Showcase */}
              <div className="lg:col-span-5 flex flex-col items-center justify-center order-1 lg:order-2">
                {/* Mobile title badge */}
                <div className="lg:hidden text-center mb-1">
                  <h1 className="font-display text-3xl font-black uppercase tracking-tight text-white">
                    ECHO <span className="text-amber-400">SECTOR</span>
                  </h1>
                </div>

                <div className="relative w-full max-w-[390px] aspect-square max-h-[340px] sm:max-h-[400px]">
                  <OperatorPreviewCanvas
                    classId={selectedClass}
                    skinId={equippedSkin.id}
                    variant="pedestal"
                    fireTrigger={fireTrigger}
                    interactive
                    className="h-full w-full"
                  />

                  {/* Floating Tactical Test Fire & Skin Shortcuts */}
                  <div className="absolute bottom-2 inset-x-0 flex items-center justify-center gap-2">
                    <button
                      type="button"
                      onClick={handlePedestalFire}
                      className="inline-flex items-center gap-1.5 border border-slate-700/90 bg-slate-950/85 px-3 py-1 font-mono text-[10px] font-bold uppercase tracking-wider text-slate-200 hover:border-rose-400 hover:text-rose-200 backdrop-blur-sm transition"
                    >
                      <Crosshair className="h-3 w-3 text-rose-400" />
                      TIR TEST
                    </button>
                    <button
                      type="button"
                      onClick={() => switchTab("operators")}
                      className="inline-flex items-center gap-1.5 border border-slate-700/90 bg-slate-950/85 px-3 py-1 font-mono text-[10px] font-bold uppercase tracking-wider text-slate-200 hover:border-amber-400 hover:text-amber-200 backdrop-blur-sm transition"
                    >
                      <Palette className="h-3 w-3 text-amber-400" />
                      SKINS & ARME
                    </button>
                  </div>
                </div>

                {/* Clean Floating Hero Nameplate */}
                <div className="mt-1 text-center">
                  <div className="inline-flex items-center gap-2">
                    <span
                      className="px-2 py-0.5 font-mono text-[9px] font-black uppercase tracking-widest"
                      style={{
                        color: equippedRarity.color,
                        backgroundColor: equippedRarity.badgeBg,
                      }}
                    >
                      {equippedSkin.name}
                    </span>
                    <span className="font-mono text-[10px] font-bold uppercase tracking-wider text-slate-400">
                      {selectedSpec.weapon.name}
                    </span>
                  </div>
                  <div className="font-display text-2xl sm:text-3xl font-black uppercase tracking-[0.14em] text-white">
                    {selectedSpec.name}
                  </div>
                </div>
              </div>

              {/* RIGHT WING: Featured Shop Teaser + Mode Selector + Multiplayer Room Controls */}
              <div className="lg:col-span-4 flex flex-col gap-3 order-3">
                {/* Featured Skin of the Day Compact Banner */}
                <button
                  type="button"
                  onClick={() => switchTab("shop")}
                  className="tac-panel tac-cut-sm p-3 text-left flex items-center gap-3 hover:border-amber-400/60 transition group"
                >
                  <div className="h-16 w-16 shrink-0 bg-slate-950 border border-slate-800 overflow-hidden">
                    <OperatorPreviewCanvas
                      classId={featured.skin.classId}
                      skinId={featured.skin.id}
                      variant="portrait"
                      className="h-full w-full"
                    />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1.5">
                      <span className="bg-rose-500 px-1.5 py-0.5 font-mono text-[9px] font-black text-white">
                        -{featured.discountPct}%
                      </span>
                      <span className="font-mono text-[9px] font-bold uppercase tracking-wider text-amber-300">
                        BOUTIQUE DU JOUR
                      </span>
                    </div>
                    <div className="mt-0.5 truncate font-display text-base font-black uppercase text-white group-hover:text-amber-300 transition">
                      {featured.skin.name}
                    </div>
                    <div className="font-mono text-[10px] text-slate-400">
                      {profile.ownedSkins.includes(featured.skin.id)
                        ? "DÉJÀ DANS VOTRE ARSENAL"
                        : `${featured.discountedCredits} CR • ${OPERATORS[featured.skin.classId].name}`}
                    </div>
                  </div>
                  <Sparkles className="h-4 w-4 text-amber-400 shrink-0" />
                </button>

                {/* MODE SELECTOR & MULTIPLAYER ROOM PANEL */}
                <div className="tac-panel tac-cut-sm p-3.5 space-y-3">
                  <div className="grid grid-cols-2 gap-1.5">
                    <button
                      type="button"
                      onClick={() => {
                        soundEngine.playUiClick(1.0);
                        onModeChange("solo");
                      }}
                      className={`flex flex-col items-start p-2.5 border transition ${
                        mode === "solo"
                          ? "border-sky-400 bg-sky-500/15"
                          : "border-slate-800 bg-slate-950/75 hover:border-slate-600"
                      }`}
                    >
                      <span className="font-mono text-[9px] font-bold uppercase tracking-widest text-sky-300">
                        10 OPÉRATEURS
                      </span>
                      <span className="font-display text-sm font-black uppercase text-white">
                        SOLO ROYALE
                      </span>
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        soundEngine.playUiClick(1.05);
                        onModeChange("multiplayer");
                        onRefreshRooms();
                      }}
                      className={`flex flex-col items-start p-2.5 border transition ${
                        mode === "multiplayer"
                          ? "border-amber-400 bg-amber-500/15"
                          : "border-slate-800 bg-slate-950/75 hover:border-slate-600"
                      }`}
                    >
                      <span className="inline-flex items-center gap-1 font-mono text-[9px] font-bold uppercase tracking-widest text-amber-300">
                        <Radio className="h-2.5 w-2.5 animate-pulse" />
                        PVP LIVE
                      </span>
                      <span className="font-display text-sm font-black uppercase text-white">
                        MULTIJOUEUR
                      </span>
                    </button>
                  </div>

                  {/* Slide-in Multiplayer Lobby Controls when Multi selected */}
                  {mode === "multiplayer" && (
                    <div className="space-y-2 border-t border-slate-800/80 pt-2.5">
                      <div className="flex items-center gap-1.5">
                        <input
                          type="text"
                          value={roomInput}
                          onChange={(e) =>
                            onRoomInputChange(e.target.value.toUpperCase())
                          }
                          onKeyDown={(e) => {
                            if (e.key === "Enter") {
                              e.preventDefault();
                              onDeployMultiplayer({
                                roomCode: roomInput.trim() || undefined,
                              });
                            }
                          }}
                          placeholder="CODE SALON (EX: SEC-404)"
                          maxLength={12}
                          className="flex-1 border border-slate-700 bg-slate-950 px-2.5 py-1.5 font-mono text-xs font-bold uppercase text-white outline-none focus:border-amber-400"
                        />
                        <button
                          type="button"
                          onClick={onRefreshRooms}
                          className="border border-slate-700 bg-slate-900 px-2.5 py-1.5 font-mono text-[10px] font-bold uppercase text-slate-300 hover:border-amber-400 hover:text-amber-200"
                        >
                          SYNC
                        </button>
                      </div>

                      {mpError && (
                        <p className="font-mono text-[10px] text-rose-400">{mpError}</p>
                      )}

                      {activeRooms.length > 0 ? (
                        <div className="space-y-1 max-h-24 overflow-y-auto tac-scroll">
                          {activeRooms.slice(0, 3).map((rm) => (
                            <button
                              key={rm.code}
                              type="button"
                              disabled={joiningRoom}
                              onClick={() => onDeployMultiplayer({ roomCode: rm.code })}
                              className="w-full flex items-center justify-between border border-slate-800 bg-slate-950/85 px-2.5 py-1.5 text-left hover:border-amber-400/60 transition"
                            >
                              <span className="font-mono text-[11px] font-bold text-amber-300">
                                {rm.code}{" "}
                                <span className="text-slate-500">({rm.hostCallsign})</span>
                              </span>
                              <span className="font-mono text-[10px] font-bold text-emerald-300">
                                {rm.playerCount}/{rm.maxPlayers} REJOINDRE
                              </span>
                            </button>
                          ))}
                        </div>
                      ) : (
                        <div className="font-mono text-[10px] text-slate-500">
                          Laissez vide pour créer/rejoindre un salon rapide (ouvrez un 2e onglet pour tester en PvP).
                        </div>
                      )}
                    </div>
                  )}

                  {/* MASSIVE METALLIC CHAMFERED DEPLOY BUTTON */}
                  <button
                    type="button"
                    disabled={joiningRoom}
                    onClick={handlePrimaryDeploy}
                    className="relative w-full overflow-hidden animate-sheen tac-cut-btn bg-gradient-to-r from-amber-500 via-amber-400 to-yellow-300 px-6 py-4 font-display text-xl font-black uppercase tracking-[0.18em] text-slate-950 shadow-[0_0_38px_rgba(245,158,11,0.42)] hover:brightness-110 active:scale-[0.98] disabled:opacity-50 transition"
                  >
                    <span className="relative z-10 inline-flex items-center justify-center gap-2.5">
                      <Play className="h-5 w-5 fill-slate-950" />
                      {joiningRoom
                        ? "CONNEXION..."
                        : mode === "multiplayer"
                          ? roomInput.trim()
                            ? `REJOINDRE ${roomInput.trim()}`
                            : "DÉPLOYER MULTI"
                          : "DÉPLOYER"}
                    </span>
                  </button>
                </div>
              </div>
            </div>

            {/* BOTTOM DOCK: 4 Quick Operator Portraits */}
            <div className="shrink-0 pt-3 flex flex-col sm:flex-row items-center justify-between gap-3">
              <div className="flex items-center gap-2 overflow-x-auto max-w-full pb-1 sm:pb-0">
                {OPERATOR_LIST.map((op) => {
                  const active = selectedClass === op.id;
                  const opSkin = getSkinById(profile.equippedSkins[op.id], op.id);
                  return (
                    <button
                      key={op.id}
                      type="button"
                      onClick={() => {
                        soundEngine.playUiClick(1.1);
                        onSelectClass(op.id);
                      }}
                      className={`group flex items-center gap-2.5 pr-3.5 pl-1.5 py-1.5 tac-cut-sm border transition shrink-0 ${
                        active
                          ? "bg-slate-900/95 border-amber-400 shadow-[0_0_20px_rgba(251,191,36,0.22)]"
                          : "bg-slate-950/80 border-slate-800/90 hover:border-slate-600"
                      }`}
                    >
                      <div className="h-11 w-11 bg-slate-950 border border-slate-800 overflow-hidden shrink-0">
                        <OperatorPreviewCanvas
                          classId={op.id}
                          skinId={opSkin.id}
                          variant="portrait"
                          className="h-full w-full"
                        />
                      </div>
                      <div className="text-left">
                        <div className="font-display text-xs font-black uppercase tracking-wider text-white">
                          {op.name}
                        </div>
                        <div
                          className="font-mono text-[9px] font-bold uppercase"
                          style={{ color: opSkin.vestTrim }}
                        >
                          {op.role.split(" ")[0]}
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>

              <div className="hidden xl:flex items-center gap-4 font-mono text-[10px] uppercase tracking-wider text-slate-500">
                <span className="inline-flex items-center gap-1.5">
                  <Crown className="h-3.5 w-3.5 text-amber-400/80" />
                  RECORD LOCAL :{" "}
                  <strong className="text-slate-200">
                    {(localScores[0]?.score ?? 0).toLocaleString()} PTS
                  </strong>
                </span>
                <span className="inline-flex items-center gap-1.5">
                  <Users className="h-3.5 w-3.5 text-sky-400/80" />
                  WASD + SOURIS / TACTILE 60FPS
                </span>
              </div>
            </div>
          </div>
        )}

        {/* ---------- TAB 2: OPERATORS & SKIN LOCKER ---------- */}
        {activeTab === "operators" && (
          <OperatorsView
            selectedClass={selectedClass}
            onSelectClass={onSelectClass}
            profile={profile}
            onEquipSkin={onEquipSkin}
            onBuySkin={(skin, cur) => onBuySkin(skin, cur)}
            onOpenShop={() => switchTab("shop")}
          />
        )}

        {/* ---------- TAB 3: BLACK MARKET SHOP & CRATES ---------- */}
        {activeTab === "shop" && (
          <ShopView
            profile={profile}
            onBuySkin={onBuySkin}
            onEquipSkin={onEquipSkin}
            onOpenCrate={onOpenCrate}
          />
        )}

        {/* ---------- TAB 4: DAILY QUESTS & LOGIN REWARDS ---------- */}
        {activeTab === "quests" && (
          <QuestsView
            profile={profile}
            onClaimQuest={onClaimQuest}
            onRerollQuest={onRerollQuest}
            onClaimMilestone={onClaimMilestone}
            onClaimDailyLogin={onClaimDailyLogin}
            onDeployClick={() => {
              setActiveTab("qg");
              handlePrimaryDeploy();
            }}
          />
        )}

        {/* ---------- TAB 5: LEADERBOARD ---------- */}
        {activeTab === "leaderboard" && (
          <div className="h-full overflow-y-auto tac-scroll px-3 sm:px-6 pb-6 pt-2">
            <div className="mx-auto max-w-4xl space-y-4">
              <div className="grid grid-cols-3 gap-3">
                <div className="tac-panel tac-cut-sm p-4 text-center">
                  <div className="font-mono text-[10px] uppercase tracking-widest text-slate-400">
                    OPÉRATIONS
                  </div>
                  <div className="mt-1 font-mono text-2xl font-black text-white">
                    {profile.totalMatches}
                  </div>
                </div>
                <div className="tac-panel tac-cut-sm p-4 text-center">
                  <div className="font-mono text-[10px] uppercase tracking-widest text-slate-400">
                    ÉLIMINATIONS TOTALES
                  </div>
                  <div className="mt-1 font-mono text-2xl font-black text-rose-400 inline-flex items-center gap-1.5">
                    <Skull className="h-5 w-5" />
                    {profile.totalKills}
                  </div>
                </div>
                <div className="tac-panel tac-cut-sm p-4 text-center">
                  <div className="font-mono text-[10px] uppercase tracking-widest text-slate-400">
                    VICTOIRES ROYALES
                  </div>
                  <div className="mt-1 font-mono text-2xl font-black text-amber-300 inline-flex items-center gap-1.5">
                    <Crown className="h-5 w-5" />
                    {profile.totalWins}
                  </div>
                </div>
              </div>

              <HighScoreBoard
                activeTab={scoreTab}
                onTabChange={onScoreTabChange}
                localScores={localScores}
                globalScores={globalScores}
                loadingGlobal={loadingGlobal}
                onClearLocal={onClearLocalScores}
              />
            </div>
          </div>
        )}
      </div>

      {/* CONTROLS QUICK-REFERENCE MODAL */}
      {showControlsHelp && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/85 backdrop-blur-sm p-4">
          <div className="w-full max-w-lg tac-panel tac-cut p-5 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="font-display text-lg font-black uppercase tracking-wider text-white">
                MANUEL DE COMBAT — SECTEUR 09
              </h3>
              <button
                type="button"
                onClick={() => setShowControlsHelp(false)}
                className="p-1 text-slate-400 hover:text-white"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 font-mono text-xs">
              <div className="border border-slate-800 bg-slate-950/80 p-3 space-y-1.5">
                <div className="flex items-center gap-1.5 text-sky-300 font-bold mb-2">
                  <Keyboard className="h-4 w-4" /> CLAVIER & SOURIS
                </div>
                <div className="flex justify-between text-slate-300">
                  <span>Déplacement</span>
                  <span className="text-white font-bold">WASD / Flèches</span>
                </div>
                <div className="flex justify-between text-slate-300">
                  <span>Marche Furtive</span>
                  <span className="text-white font-bold">SHIFT</span>
                </div>
                <div className="flex justify-between text-slate-300">
                  <span>Tir Auto / Manuel</span>
                  <span className="text-white font-bold">Cône + Clic G.</span>
                </div>
                <div className="flex justify-between text-slate-300">
                  <span>Capacité / Recharger</span>
                  <span className="text-white font-bold">ESPACE / R</span>
                </div>
                <div className="flex justify-between text-slate-300">
                  <span>Pause / Audio</span>
                  <span className="text-white font-bold">ÉCHAP / M</span>
                </div>
              </div>

              <div className="border border-slate-800 bg-slate-950/80 p-3 space-y-1.5">
                <div className="flex items-center gap-1.5 text-emerald-300 font-bold mb-2">
                  <Smartphone className="h-4 w-4" /> TACTILE MOBILE
                </div>
                <p className="text-[11px] text-slate-400 leading-relaxed">
                  • <strong className="text-white">Pouce gauche</strong> : déplacement (inclinaison douce = furtivité silencieuse).
                </p>
                <p className="text-[11px] text-slate-400 leading-relaxed">
                  • <strong className="text-white">Pouce droit</strong> : orientation de la lampe + tir automatique dès verrouillage.
                </p>
                <p className="text-[11px] text-slate-400 leading-relaxed">
                  • <strong className="text-white">Astuce</strong> : tirez sur les barils rouges et surveillez les tirs ennemis sur le radar !
                </p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
