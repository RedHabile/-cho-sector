"use client";

import { Trophy, Globe, HardDrive, Skull, Award, Trash2 } from "lucide-react";
import { OPERATORS } from "@/game/constants";
import { HighScoreEntry } from "@/game/types";

interface HighScoreBoardProps {
  activeTab: "local" | "global";
  onTabChange: (tab: "local" | "global") => void;
  localScores: HighScoreEntry[];
  globalScores: HighScoreEntry[];
  loadingGlobal?: boolean;
  highlightScore?: number | null;
  onClearLocal?: () => void;
  compact?: boolean;
}

export function HighScoreBoard({
  activeTab,
  onTabChange,
  localScores,
  globalScores,
  loadingGlobal = false,
  highlightScore = null,
  onClearLocal,
  compact = false,
}: HighScoreBoardProps) {
  const rows = activeTab === "local" ? localScores : globalScores;
  const maxRows = compact ? 6 : 10;

  return (
    <div className="flex flex-col tac-panel tac-cut overflow-hidden">
      <div className="flex items-center justify-between border-b border-slate-800/90 px-4 py-3 bg-slate-950/60">
        <div className="flex items-center gap-2">
          <Trophy className="h-4 w-4 text-amber-400" />
          <span className="font-display text-sm font-black uppercase tracking-[0.16em] text-slate-100">
            CLASSEMENT TACTIQUE
          </span>
        </div>

        <div className="flex items-center gap-1 bg-slate-950 p-0.5 border border-slate-800">
          <button
            type="button"
            onClick={() => onTabChange("local")}
            className={`flex items-center gap-1.5 px-2.5 py-1 font-mono text-[10px] font-bold uppercase tracking-wider transition ${
              activeTab === "local"
                ? "bg-sky-500/20 text-sky-300 border border-sky-400/50"
                : "text-slate-400 hover:text-slate-200 border border-transparent"
            }`}
          >
            <HardDrive className="h-3 w-3" />
            LOCAL
          </button>
          <button
            type="button"
            onClick={() => onTabChange("global")}
            className={`flex items-center gap-1.5 px-2.5 py-1 font-mono text-[10px] font-bold uppercase tracking-wider transition ${
              activeTab === "global"
                ? "bg-amber-500/20 text-amber-300 border border-amber-400/50"
                : "text-slate-400 hover:text-slate-200 border border-transparent"
            }`}
          >
            <Globe className="h-3 w-3" />
            MONDIAL
          </button>
        </div>
      </div>

      <div className="px-3 py-2">
        {activeTab === "global" && loadingGlobal && rows.length === 0 ? (
          <div className="py-10 text-center font-mono text-xs text-slate-400">
            SYNCHRONISATION DU CLASSEMENT...
          </div>
        ) : rows.length === 0 ? (
          <div className="py-10 text-center">
            <Award className="mx-auto h-7 w-7 text-slate-600 mb-2" />
            <p className="font-mono text-xs uppercase tracking-wider text-slate-400">
              Aucun record local enregistré
            </p>
            <p className="mt-1 text-xs text-slate-500">
              Déployez-vous dans le Secteur 09 pour inscrire votre premier score.
            </p>
          </div>
        ) : (
          <div className="divide-y divide-slate-800/70">
            {rows.slice(0, maxRows).map((row, idx) => {
              const spec = OPERATORS[row.operatorClass] ?? OPERATORS.vanguard;
              const isHighlighted =
                highlightScore !== null && row.score === highlightScore && idx === 0;
              const rankStyle =
                idx === 0
                  ? "text-amber-300 bg-amber-500/20 border-amber-400/60"
                  : idx === 1
                    ? "text-slate-100 bg-slate-400/20 border-slate-400/45"
                    : idx === 2
                      ? "text-orange-300 bg-orange-500/20 border-orange-400/45"
                      : "text-slate-400 bg-slate-900 border-slate-800";

              return (
                <div
                  key={String(row.id)}
                  className={`flex items-center justify-between gap-2 py-2.5 px-2 transition ${
                    isHighlighted ? "bg-amber-500/10" : "hover:bg-slate-900/45"
                  }`}
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <span
                      className={`inline-flex h-6 w-6 shrink-0 items-center justify-center border font-mono text-[11px] font-black ${rankStyle}`}
                    >
                      {idx + 1}
                    </span>

                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5">
                        <span
                          className="h-2 w-2 shrink-0"
                          style={{ backgroundColor: spec.accentColor }}
                        />
                        <span className="truncate font-mono text-xs font-bold text-slate-100">
                          {row.callsign}
                        </span>
                        <span className="hidden sm:inline-block border border-slate-800 bg-slate-900 px-1.5 py-0.5 font-mono text-[9px] font-bold uppercase text-slate-400">
                          {row.mode === "multiplayer" ? "MULTI" : "SOLO"}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 font-mono text-[10px] text-slate-400">
                        <span style={{ color: spec.accentColor }}>{spec.name}</span>
                        <span>•</span>
                        <span>
                          #{row.placement}/{row.totalPlayers}
                        </span>
                        <span>•</span>
                        <span className="inline-flex items-center gap-0.5">
                          <Skull className="h-2.5 w-2.5 text-rose-400" />
                          {row.kills}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="text-right shrink-0">
                    <div className="font-mono text-sm font-black tracking-tight text-amber-200">
                      {row.score.toLocaleString()}
                    </div>
                    <div className="font-mono text-[9px] uppercase tracking-wider text-slate-500">
                      PTS
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {activeTab === "local" && localScores.length > 0 && onClearLocal && (
        <div className="flex items-center justify-between border-t border-slate-800/80 px-4 py-2 bg-slate-950/60">
          <span className="font-mono text-[10px] text-slate-500">
            MÉMOIRE LOCALE ({localScores.length} PARTIES)
          </span>
          <button
            type="button"
            onClick={onClearLocal}
            className="inline-flex items-center gap-1 font-mono text-[10px] text-slate-500 hover:text-rose-400 transition"
          >
            <Trash2 className="h-3 w-3" />
            EFFACER
          </button>
        </div>
      )}
    </div>
  );
}
