"use client";

import { useEffect, useState } from "react";
import {
  Check,
  Clock,
  Coins,
  Diamond,
  Gift,
  RefreshCw,
  ShieldCheck,
  Sparkles,
  Target,
} from "lucide-react";
import {
  canClaimDailyLogin,
  DAILY_LOGIN_REWARDS,
  getTimeUntilDailyReset,
} from "@/game/progression";
import { PlayerProfile } from "@/game/types";

interface QuestsViewProps {
  profile: PlayerProfile;
  onClaimQuest: (questId: string) => void;
  onRerollQuest: (questId: string) => void;
  onClaimMilestone: () => void;
  onClaimDailyLogin: () => void;
  onDeployClick: () => void;
}

const DIFF_META = {
  facile: {
    label: "RECON",
    color: "#38bdf8",
    bg: "rgba(14, 116, 144, 0.35)",
  },
  tactique: {
    label: "TACTIQUE",
    color: "#c084fc",
    bg: "rgba(107, 33, 168, 0.35)",
  },
  elite: {
    label: "ÉLITE",
    color: "#fbbf24",
    bg: "rgba(146, 64, 14, 0.42)",
  },
};

export function QuestsView({
  profile,
  onClaimQuest,
  onRerollQuest,
  onClaimMilestone,
  onClaimDailyLogin,
  onDeployClick,
}: QuestsViewProps) {
  const [countdown, setCountdown] = useState("--H --M");

  useEffect(() => {
    setCountdown(getTimeUntilDailyReset());
    const iv = setInterval(() => setCountdown(getTimeUntilDailyReset()), 30000);
    return () => clearInterval(iv);
  }, []);

  const completedCount = profile.quests.filter(
    (q) => q.claimed || q.progress >= q.target
  ).length;
  const milestoneReady = !profile.dailyMilestoneClaimed && completedCount >= 3;
  const loginClaimable = canClaimDailyLogin(profile);
  const activeDay = loginClaimable
    ? (profile.loginStreak % 7) + 1
    : Math.max(1, profile.loginStreak);

  return (
    <div className="h-full overflow-y-auto tac-scroll px-3 sm:px-6 pb-6 pt-2">
      <div className="mx-auto max-w-6xl space-y-5">
        {/* TOP ROW: Daily Login Supply Streak + 3/5 Milestone Contract Bonus */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
          {/* 7-Day Tactical Login Supplies */}
          <div className="lg:col-span-7 tac-panel tac-cut p-4 sm:p-5">
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-800/90 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="flex h-8 w-8 items-center justify-center bg-amber-500/15 border border-amber-400/40 text-amber-300 tac-cut-sm">
                  <Gift className="h-4 w-4" />
                </div>
                <div>
                  <h2 className="font-display text-base font-bold uppercase tracking-wider text-white">
                    RAVITAILLEMENT QUOTIDIEN
                  </h2>
                  <p className="font-mono text-[10px] uppercase tracking-wider text-slate-400">
                    SÉRIE ACTIVE : JOUR {activeDay}/7
                  </p>
                </div>
              </div>

              {loginClaimable ? (
                <button
                  type="button"
                  onClick={onClaimDailyLogin}
                  className="relative overflow-hidden animate-sheen tac-cut-sm bg-amber-400 px-4 py-2 font-display text-xs font-extrabold uppercase tracking-wider text-slate-950 hover:bg-amber-300 active:scale-95 transition"
                >
                  RÉCLAMER JOUR {activeDay}
                </button>
              ) : (
                <span className="inline-flex items-center gap-1.5 border border-emerald-500/35 bg-emerald-500/10 px-3 py-1 font-mono text-[10px] font-bold uppercase text-emerald-300">
                  <Check className="h-3.5 w-3.5" />
                  RÉCLAMÉ AUJOURD&apos;HUI
                </span>
              )}
            </div>

            <div className="mt-3 grid grid-cols-7 gap-1.5 sm:gap-2">
              {DAILY_LOGIN_REWARDS.map((item) => {
                const isClaimed =
                  item.day < activeDay || (item.day === activeDay && !loginClaimable);
                const isCurrent = item.day === activeDay && loginClaimable;
                return (
                  <div
                    key={item.day}
                    className={`flex flex-col items-center justify-between border px-1 py-2 text-center transition ${
                      isCurrent
                        ? "border-amber-400 bg-amber-500/15 shadow-[0_0_16px_rgba(251,191,36,0.2)]"
                        : isClaimed
                          ? "border-emerald-500/35 bg-emerald-950/30 opacity-75"
                          : "border-slate-800 bg-slate-950/70"
                    }`}
                  >
                    <span className="font-mono text-[9px] font-bold uppercase text-slate-400">
                      J{item.day}
                    </span>
                    <div className="my-1.5">
                      {isClaimed ? (
                        <Check className="h-4 w-4 text-emerald-400" />
                      ) : item.day === 7 ? (
                        <Sparkles className="h-4 w-4 text-amber-300" />
                      ) : (
                        <Coins className="h-4 w-4 text-amber-400" />
                      )}
                    </div>
                    <div className="font-mono text-[9px] sm:text-[10px] font-extrabold text-white leading-tight">
                      {item.credits}
                    </div>
                    <div className="font-mono text-[8px] font-bold text-cyan-300">
                      +{item.crystals} ◆
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* 3/5 Daily Milestone Bonus Vault */}
          <div className="lg:col-span-5 tac-panel tac-cut p-4 sm:p-5 flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <ShieldCheck className="h-4 w-4 text-cyan-300" />
                  <h2 className="font-display text-base font-bold uppercase tracking-wider text-white">
                    PRIME DE SECTEUR (3 CONTRATS)
                  </h2>
                </div>
                <span className="inline-flex items-center gap-1 font-mono text-[10px] text-slate-400">
                  <Clock className="h-3 w-3 text-amber-400" />
                  {countdown}
                </span>
              </div>

              <div className="mt-3 flex items-center gap-3">
                <div className="flex-1 h-2.5 bg-slate-900 border border-slate-700/80 overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-cyan-400 to-amber-400 transition-all duration-300"
                    style={{ width: `${Math.min(100, (completedCount / 3) * 100)}%` }}
                  />
                </div>
                <span className="font-mono text-xs font-extrabold text-white">
                  {Math.min(3, completedCount)}/3
                </span>
              </div>

              <div className="mt-3 flex flex-wrap items-center gap-2 font-mono text-xs">
                <span className="inline-flex items-center gap-1 bg-amber-500/15 border border-amber-400/35 px-2.5 py-1 font-bold text-amber-300">
                  <Coins className="h-3.5 w-3.5" /> +500 CR
                </span>
                <span className="inline-flex items-center gap-1 bg-cyan-500/15 border border-cyan-400/35 px-2.5 py-1 font-bold text-cyan-300">
                  <Diamond className="h-3.5 w-3.5" /> +40 CRISTAUX
                </span>
                <span className="inline-flex items-center gap-1 bg-slate-800/80 border border-slate-700 px-2.5 py-1 font-bold text-slate-200">
                  +300 XP
                </span>
              </div>
            </div>

            <div className="mt-4">
              {profile.dailyMilestoneClaimed ? (
                <div className="w-full border border-emerald-500/35 bg-emerald-500/10 py-2.5 text-center font-mono text-xs font-bold uppercase tracking-wider text-emerald-300">
                  PRIME QUOTIDIENNE RÉCUPÉRÉE
                </div>
              ) : milestoneReady ? (
                <button
                  type="button"
                  onClick={onClaimMilestone}
                  className="relative w-full overflow-hidden animate-sheen tac-cut-sm bg-gradient-to-r from-amber-400 to-yellow-300 py-2.5 font-display text-sm font-black uppercase tracking-widest text-slate-950 hover:brightness-110 transition"
                >
                  RÉCLAMER LA PRIME ÉLITE
                </button>
              ) : (
                <button
                  type="button"
                  onClick={onDeployClick}
                  className="w-full border border-slate-700 bg-slate-900/90 py-2 font-mono text-[11px] font-bold uppercase tracking-wider text-slate-300 hover:border-amber-400/60 hover:text-amber-200 transition"
                >
                  COMPLÉTER {Math.max(0, 3 - completedCount)} CONTRAT(S) EN PARTIE →
                </button>
              )}
            </div>
          </div>
        </div>

        {/* DAILY CONTRACTS LIST */}
        <div className="space-y-2.5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Target className="h-4 w-4 text-amber-400" />
              <h3 className="font-display text-sm font-bold uppercase tracking-[0.18em] text-slate-200">
                CONTRATS JOURNALIERS ({completedCount}/{profile.quests.length})
              </h3>
            </div>
            <span className="font-mono text-[10px] uppercase tracking-wider text-slate-500">
              1 REMPLACEMENT GRATUIT PAR CONTRAT
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {profile.quests.map((q) => {
              const diff = DIFF_META[q.difficulty];
              const pct = Math.min(100, Math.round((q.progress / q.target) * 100));
              const isReady = !q.claimed && q.progress >= q.target;

              return (
                <div
                  key={q.id}
                  className={`tac-panel tac-cut-sm p-4 transition relative overflow-hidden ${
                    isReady
                      ? "border-amber-400/75 shadow-[0_0_24px_rgba(251,191,36,0.16)]"
                      : q.claimed
                        ? "opacity-60"
                        : ""
                  }`}
                >
                  {/* Left tactical accent bar */}
                  <div
                    className="absolute left-0 top-0 bottom-0 w-1"
                    style={{ backgroundColor: q.claimed ? "#10b981" : diff.color }}
                  />

                  <div className="pl-2 flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span
                          className="px-1.5 py-0.5 font-mono text-[9px] font-extrabold uppercase tracking-wider"
                          style={{ color: diff.color, backgroundColor: diff.bg }}
                        >
                          {diff.label}
                        </span>
                        <h4 className="truncate font-display text-base font-bold uppercase tracking-wide text-white">
                          {q.title}
                        </h4>
                      </div>
                      <p className="mt-1 text-xs text-slate-400">{q.description}</p>
                    </div>

                    {!q.claimed && !isReady && !q.rerolled && (
                      <button
                        type="button"
                        onClick={() => onRerollQuest(q.id)}
                        title="Remplacer ce contrat"
                        className="shrink-0 inline-flex items-center gap-1 border border-slate-700 bg-slate-900/90 px-2 py-1 font-mono text-[10px] font-bold text-slate-400 hover:border-slate-500 hover:text-white transition"
                      >
                        <RefreshCw className="h-3 w-3" />
                        SWAP
                      </button>
                    )}
                  </div>

                  {/* Progress Bar */}
                  <div className="pl-2 mt-3">
                    <div className="flex items-center justify-between font-mono text-[11px] font-bold mb-1">
                      <span className="text-slate-400">PROGRESSION</span>
                      <span className={isReady ? "text-amber-300" : "text-slate-200"}>
                        {q.progress} / {q.target}
                      </span>
                    </div>
                    <div className="h-2 w-full bg-slate-900 border border-slate-800 overflow-hidden">
                      <div
                        className="h-full transition-all duration-300"
                        style={{
                          width: `${pct}%`,
                          backgroundColor: q.claimed
                            ? "#10b981"
                            : isReady
                              ? "#fbbf24"
                              : diff.color,
                        }}
                      />
                    </div>
                  </div>

                  {/* Rewards + Action */}
                  <div className="pl-2 mt-3.5 flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2 font-mono text-[11px]">
                      <span className="inline-flex items-center gap-1 font-bold text-amber-300">
                        <Coins className="h-3.5 w-3.5" />+{q.rewardCredits}
                      </span>
                      <span className="inline-flex items-center gap-1 font-bold text-cyan-300">
                        <Diamond className="h-3 w-3" />+{q.rewardCrystals}
                      </span>
                      <span className="font-semibold text-slate-400">
                        +{q.rewardXp} XP
                      </span>
                    </div>

                    {q.claimed ? (
                      <span className="inline-flex items-center gap-1 font-mono text-[11px] font-bold uppercase text-emerald-400">
                        <Check className="h-3.5 w-3.5" /> VALIDÉ
                      </span>
                    ) : isReady ? (
                      <button
                        type="button"
                        onClick={() => onClaimQuest(q.id)}
                        className="relative overflow-hidden animate-sheen tac-cut-sm bg-amber-400 px-4 py-1.5 font-display text-xs font-black uppercase tracking-wider text-slate-950 hover:bg-amber-300 active:scale-95 transition"
                      >
                        RÉCLAMER
                      </button>
                    ) : (
                      <span className="font-mono text-[10px] uppercase tracking-wider text-slate-500">
                        EN COURS
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
