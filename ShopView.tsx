"use client";

import { useEffect, useState } from "react";
import {
  Box,
  Check,
  Clock,
  Coins,
  Diamond,
  PackageOpen,
  ShieldCheck,
  Sparkles,
  Tag,
  X,
} from "lucide-react";
import { OPERATORS, OPERATOR_LIST } from "@/game/constants";
import {
  CrateOpenResult,
  CrateTier,
  getTimeUntilDailyReset,
  SUPPLY_CRATES,
} from "@/game/progression";
import {
  getDailyFeaturedSkin,
  OPERATOR_SKINS,
  RARITY_META,
} from "@/game/skins";
import { OperatorClassId, OperatorSkin, PlayerProfile } from "@/game/types";
import { OperatorPreviewCanvas } from "./OperatorPreviewCanvas";

interface ShopViewProps {
  profile: PlayerProfile;
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
}

export function ShopView({
  profile,
  onBuySkin,
  onEquipSkin,
  onOpenCrate,
}: ShopViewProps) {
  const [classFilter, setClassFilter] = useState<OperatorClassId | "all">("all");
  const [openingTier, setOpeningTier] = useState<CrateTier | null>(null);
  const [crateReveal, setCrateReveal] = useState<CrateOpenResult | null>(null);
  const [resetTimer, setResetTimer] = useState("--H --M");

  useEffect(() => {
    setResetTimer(getTimeUntilDailyReset());
    const iv = setInterval(() => setResetTimer(getTimeUntilDailyReset()), 30000);
    return () => clearInterval(iv);
  }, []);

  const featured = getDailyFeaturedSkin(profile.dailyDate);
  const featuredOwned = profile.ownedSkins.includes(featured.skin.id);
  const featuredEquipped =
    profile.equippedSkins[featured.skin.classId] === featured.skin.id;
  const featuredRarity = RARITY_META[featured.skin.rarity];

  const catalogSkins = OPERATOR_SKINS.filter(
    (s) =>
      s.rarity !== "standard" &&
      (classFilter === "all" || s.classId === classFilter)
  );

  const handleCrateTrigger = (
    tier: CrateTier,
    currency: "credits" | "crystals"
  ) => {
    setOpeningTier(tier);
    setCrateReveal(null);
    // Short dramatic crate shake before reveal!
    setTimeout(() => {
      const result = onOpenCrate(tier, currency);
      setOpeningTier(null);
      if (result) {
        setCrateReveal(result);
      }
    }, 680);
  };

  return (
    <div className="h-full overflow-y-auto tac-scroll px-3 sm:px-6 pb-6 pt-2">
      <div className="mx-auto max-w-6xl space-y-6">
        {/* FEATURED DAILY OFFER BANNER */}
        <div
          className="tac-panel tac-cut relative overflow-hidden p-4 sm:p-5"
          style={{ borderColor: featuredRarity.borderColor }}
        >
          <div
            className="pointer-events-none absolute -right-24 -top-24 h-72 w-72 rounded-full blur-3xl opacity-25"
            style={{ backgroundColor: featuredRarity.color }}
          />

          <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-center">
            {/* Live Preview of Featured Skin */}
            <div className="md:col-span-4 relative h-44 sm:h-48 bg-slate-950/80 border border-slate-800/90 tac-cut-sm overflow-hidden">
              <OperatorPreviewCanvas
                classId={featured.skin.classId}
                skinId={featured.skin.id}
                variant="pedestal"
                interactive
                className="h-full w-full"
              />
              <div className="pointer-events-none absolute top-2 left-2 flex items-center gap-1.5">
                <span className="bg-rose-500 px-2 py-0.5 font-mono text-[10px] font-black uppercase tracking-wider text-white">
                  -{featured.discountPct}% OFFRE DU JOUR
                </span>
              </div>
            </div>

            {/* Offer Details & Buy Controls */}
            <div className="md:col-span-8 space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <span
                    className="px-2 py-0.5 font-mono text-[10px] font-black uppercase tracking-widest"
                    style={{
                      color: featuredRarity.color,
                      backgroundColor: featuredRarity.badgeBg,
                    }}
                  >
                    {featuredRarity.label}
                  </span>
                  <span className="font-mono text-[11px] font-bold uppercase text-slate-400">
                    OPÉRATEUR : {OPERATORS[featured.skin.classId].name}
                  </span>
                </div>
                <span className="inline-flex items-center gap-1 font-mono text-[10px] text-slate-400">
                  <Clock className="h-3 w-3 text-amber-400" />
                  EXPIRE DANS {resetTimer}
                </span>
              </div>

              <div>
                <h2 className="font-display text-2xl sm:text-3xl font-black uppercase tracking-wide text-white">
                  {featured.skin.name}
                </h2>
                <p className="text-xs sm:text-sm text-slate-400">
                  {featured.skin.subtitle} — Cône lumineux & traceurs assortis inclus en jeu.
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-2.5 pt-1">
                {featuredOwned ? (
                  <button
                    type="button"
                    onClick={() => onEquipSkin(featured.skin)}
                    className={`tac-cut-sm px-5 py-2.5 font-display text-xs font-black uppercase tracking-wider transition ${
                      featuredEquipped
                        ? "border border-emerald-400/50 bg-emerald-500/15 text-emerald-300"
                        : "bg-sky-400 text-slate-950 hover:bg-sky-300"
                    }`}
                  >
                    {featuredEquipped ? "✓ ÉQUIPÉ" : "ÉQUIPER CE SKIN"}
                  </button>
                ) : (
                  <>
                    <button
                      type="button"
                      disabled={profile.credits < featured.discountedCredits}
                      onClick={() =>
                        onBuySkin(
                          featured.skin,
                          "credits",
                          featured.discountedCredits
                        )
                      }
                      className="inline-flex items-center gap-2 tac-cut-sm bg-amber-400 px-5 py-2.5 font-display text-sm font-black uppercase tracking-wider text-slate-950 hover:bg-amber-300 disabled:opacity-40 disabled:cursor-not-allowed transition"
                    >
                      <Coins className="h-4 w-4" />
                      <span>{featured.discountedCredits} CR</span>
                      <span className="text-[10px] line-through opacity-60">
                        {featured.skin.priceCredits}
                      </span>
                    </button>
                    <button
                      type="button"
                      disabled={profile.crystals < featured.discountedCrystals}
                      onClick={() =>
                        onBuySkin(
                          featured.skin,
                          "crystals",
                          featured.discountedCrystals
                        )
                      }
                      className="inline-flex items-center gap-2 tac-cut-sm border border-cyan-400/70 bg-cyan-500/15 px-5 py-2.5 font-display text-sm font-black uppercase tracking-wider text-cyan-200 hover:bg-cyan-500/25 disabled:opacity-40 disabled:cursor-not-allowed transition"
                    >
                      <Diamond className="h-4 w-4" />
                      <span>{featured.discountedCrystals} ◆</span>
                      <span className="text-[10px] line-through opacity-60">
                        {featured.skin.priceCrystals}
                      </span>
                    </button>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* SUPPLY CRATES SECTION */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Box className="h-4 w-4 text-amber-400" />
              <h3 className="font-display text-sm font-bold uppercase tracking-[0.18em] text-slate-200">
                CAISSES DE RAVITAILLEMENT (ANTI-DOUBLONS)
              </h3>
            </div>
            <span className="hidden sm:inline-block font-mono text-[10px] text-slate-500 uppercase">
              SKINS NON POSSÉDÉS PRIORITAIRES
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5">
            {SUPPLY_CRATES.map((crate) => {
              const canCredits =
                crate.priceCredits > 0 && profile.credits >= crate.priceCredits;
              const canCrystals =
                crate.priceCrystals > 0 && profile.crystals >= crate.priceCrystals;

              return (
                <div
                  key={crate.id}
                  className="tac-panel tac-cut p-4 flex flex-col justify-between relative overflow-hidden group"
                >
                  <div
                    className="absolute top-0 inset-x-0 h-1"
                    style={{ backgroundColor: crate.accentColor }}
                  />
                  <div>
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <h4 className="font-display text-lg font-black uppercase tracking-wide text-white">
                          {crate.name}
                        </h4>
                        <p className="text-xs text-slate-400 mt-0.5">
                          {crate.subtitle}
                        </p>
                      </div>
                      <div
                        className="flex h-11 w-11 shrink-0 items-center justify-center border bg-slate-950/90 tac-cut-sm group-hover:scale-105 transition"
                        style={{
                          borderColor: `${crate.accentColor}77`,
                          color: crate.accentColor,
                        }}
                      >
                        <PackageOpen className="h-5 w-5" />
                      </div>
                    </div>

                    <div className="mt-3 border border-slate-800/90 bg-slate-950/75 px-2.5 py-1.5 font-mono text-[10px] text-slate-400">
                      {crate.oddsText}
                    </div>
                  </div>

                  <div className="mt-4 flex items-center gap-2">
                    {crate.priceCredits > 0 && (
                      <button
                        type="button"
                        disabled={!canCredits || openingTier !== null}
                        onClick={() => handleCrateTrigger(crate.id, "credits")}
                        className="flex-1 inline-flex items-center justify-center gap-1.5 tac-cut-sm bg-amber-400 px-3 py-2 font-display text-xs font-black uppercase tracking-wider text-slate-950 hover:bg-amber-300 disabled:opacity-35 disabled:cursor-not-allowed transition"
                      >
                        <Coins className="h-3.5 w-3.5" />
                        {crate.priceCredits} CR
                      </button>
                    )}
                    {crate.priceCrystals > 0 && (
                      <button
                        type="button"
                        disabled={!canCrystals || openingTier !== null}
                        onClick={() => handleCrateTrigger(crate.id, "crystals")}
                        className="flex-1 inline-flex items-center justify-center gap-1.5 tac-cut-sm border border-cyan-400/70 bg-cyan-500/15 px-3 py-2 font-display text-xs font-black uppercase tracking-wider text-cyan-200 hover:bg-cyan-500/25 disabled:opacity-35 disabled:cursor-not-allowed transition"
                      >
                        <Diamond className="h-3.5 w-3.5" />
                        {crate.priceCrystals} ◆
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* FULL SKIN CATALOG */}
        <div className="space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <Tag className="h-4 w-4 text-sky-400" />
              <h3 className="font-display text-sm font-bold uppercase tracking-[0.18em] text-slate-200">
                CATALOGUE SKINS OPÉRATEURS ({profile.ownedSkins.length}/{OPERATOR_SKINS.length})
              </h3>
            </div>

            {/* Operator Filter Tabs */}
            <div className="flex flex-wrap items-center gap-1">
              <button
                type="button"
                onClick={() => setClassFilter("all")}
                className={`px-3 py-1 font-mono text-[10px] font-bold uppercase tracking-wider border transition ${
                  classFilter === "all"
                    ? "border-amber-400 bg-amber-400/20 text-amber-200"
                    : "border-slate-800 bg-slate-950/75 text-slate-400 hover:text-white"
                }`}
              >
                TOUS
              </button>
              {OPERATOR_LIST.map((op) => (
                <button
                  key={op.id}
                  type="button"
                  onClick={() => setClassFilter(op.id)}
                  className={`px-3 py-1 font-mono text-[10px] font-bold uppercase tracking-wider border transition ${
                    classFilter === op.id
                      ? "border-sky-400 bg-sky-500/20 text-sky-200"
                      : "border-slate-800 bg-slate-950/75 text-slate-400 hover:text-white"
                  }`}
                >
                  {op.name}
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            {catalogSkins.map((skin) => {
              const owned = profile.ownedSkins.includes(skin.id);
              const equipped = profile.equippedSkins[skin.classId] === skin.id;
              const rarity = RARITY_META[skin.rarity];
              const opSpec = OPERATORS[skin.classId];

              return (
                <div
                  key={skin.id}
                  className="tac-panel tac-cut-sm flex flex-col justify-between overflow-hidden group"
                  style={{ borderColor: owned ? "rgba(16, 185, 129, 0.35)" : rarity.borderColor }}
                >
                  {/* Top Live Mini Preview */}
                  <div className="relative h-32 bg-slate-950/90 border-b border-slate-800/80 overflow-hidden">
                    <OperatorPreviewCanvas
                      classId={skin.classId}
                      skinId={skin.id}
                      variant="card"
                      className="h-full w-full"
                    />
                    <span
                      className="absolute top-2 left-2 px-1.5 py-0.5 font-mono text-[9px] font-black uppercase tracking-wider"
                      style={{
                        color: rarity.color,
                        backgroundColor: rarity.badgeBg,
                      }}
                    >
                      {rarity.label}
                    </span>
                    <span className="absolute top-2 right-2 bg-slate-950/85 border border-slate-800 px-1.5 py-0.5 font-mono text-[9px] font-bold uppercase text-slate-300">
                      {opSpec.name}
                    </span>
                    {owned && (
                      <span className="absolute bottom-2 right-2 inline-flex items-center gap-1 bg-emerald-500/20 border border-emerald-400/50 px-1.5 py-0.5 font-mono text-[9px] font-bold text-emerald-300">
                        <Check className="h-2.5 w-2.5" />
                        {equipped ? "ÉQUIPÉ" : "ACQUIS"}
                      </span>
                    )}
                  </div>

                  {/* Body & Purchase Buttons */}
                  <div className="p-3 flex-1 flex flex-col justify-between gap-2.5">
                    <div>
                      <h4 className="font-display text-sm font-black uppercase tracking-wide text-white truncate">
                        {skin.name}
                      </h4>
                      <p className="text-[11px] text-slate-400 line-clamp-1">
                        {skin.subtitle}
                      </p>
                    </div>

                    {owned ? (
                      <button
                        type="button"
                        onClick={() => onEquipSkin(skin)}
                        disabled={equipped}
                        className={`w-full py-1.5 font-mono text-[11px] font-bold uppercase tracking-wider border transition ${
                          equipped
                            ? "border-emerald-500/40 bg-emerald-500/10 text-emerald-300 cursor-default"
                            : "border-sky-400/60 bg-sky-500/20 text-sky-200 hover:bg-sky-500/30"
                        }`}
                      >
                        {equipped ? "SKIN ACTIF" : "ÉQUIPER"}
                      </button>
                    ) : (
                      <div className="grid grid-cols-2 gap-1.5">
                        <button
                          type="button"
                          disabled={profile.credits < skin.priceCredits}
                          onClick={() => onBuySkin(skin, "credits")}
                          className="inline-flex items-center justify-center gap-1 bg-amber-400 py-1.5 font-mono text-[11px] font-black text-slate-950 hover:bg-amber-300 disabled:opacity-35 disabled:cursor-not-allowed transition"
                        >
                          <Coins className="h-3 w-3" />
                          {skin.priceCredits}
                        </button>
                        <button
                          type="button"
                          disabled={profile.crystals < skin.priceCrystals}
                          onClick={() => onBuySkin(skin, "crystals")}
                          className="inline-flex items-center justify-center gap-1 border border-cyan-400/65 bg-cyan-500/15 py-1.5 font-mono text-[11px] font-black text-cyan-200 hover:bg-cyan-500/25 disabled:opacity-35 disabled:cursor-not-allowed transition"
                        >
                          <Diamond className="h-3 w-3" />
                          {skin.priceCrystals}
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* CRATE OPENING ANIMATION MODAL */}
      {(openingTier !== null || crateReveal !== null) && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/90 backdrop-blur-md p-4">
          {openingTier !== null ? (
            <div className="flex flex-col items-center gap-4 text-center">
              <div className="animate-crate-shake flex h-28 w-28 items-center justify-center tac-cut border-2 border-amber-400 bg-amber-500/15 shadow-[0_0_55px_rgba(251,191,36,0.45)]">
                <PackageOpen className="h-14 w-14 text-amber-300" />
              </div>
              <div className="font-display text-2xl font-black uppercase tracking-[0.2em] text-amber-300 animate-pulse">
                DÉVERROUILLAGE EN COURS...
              </div>
            </div>
          ) : crateReveal ? (
            <div className="w-full max-w-md tac-panel tac-cut p-6 text-center relative overflow-hidden">
              <button
                type="button"
                onClick={() => setCrateReveal(null)}
                className="absolute top-3 right-3 p-1.5 text-slate-400 hover:text-white"
                aria-label="Fermer"
              >
                <X className="h-5 w-5" />
              </button>

              {crateReveal.rewardType === "skin" && crateReveal.skin ? (
                <>
                  <div className="inline-flex items-center gap-1.5 px-3 py-1 font-mono text-[11px] font-black uppercase tracking-widest mb-2"
                    style={{
                      color: RARITY_META[crateReveal.skin.rarity].color,
                      backgroundColor: RARITY_META[crateReveal.skin.rarity].badgeBg,
                    }}
                  >
                    <Sparkles className="h-3.5 w-3.5" />
                    NOUVEAU SKIN {RARITY_META[crateReveal.skin.rarity].label} !
                  </div>

                  <h3 className="font-display text-3xl font-black uppercase text-white">
                    {crateReveal.skin.name}
                  </h3>
                  <p className="font-mono text-xs text-slate-400 mt-0.5">
                    OPÉRATEUR {OPERATORS[crateReveal.skin.classId].name} •{" "}
                    {crateReveal.skin.subtitle}
                  </p>

                  <div className="my-4 h-48 w-full bg-slate-950/90 border border-slate-800 tac-cut-sm overflow-hidden">
                    <OperatorPreviewCanvas
                      classId={crateReveal.skin.classId}
                      skinId={crateReveal.skin.id}
                      variant="pedestal"
                      interactive
                      className="h-full w-full"
                    />
                  </div>

                  {(crateReveal.bonusCrystals ?? 0) > 0 && (
                    <div className="mb-4 inline-flex items-center gap-1.5 border border-cyan-400/40 bg-cyan-500/15 px-3 py-1 font-mono text-xs font-bold text-cyan-200">
                      <Diamond className="h-3.5 w-3.5" />
                      BONUS +{crateReveal.bonusCrystals} CRISTAUX
                    </div>
                  )}

                  <div className="flex gap-2.5">
                    <button
                      type="button"
                      onClick={() => {
                        if (crateReveal.skin) onEquipSkin(crateReveal.skin);
                        setCrateReveal(null);
                      }}
                      className="flex-1 tac-cut-sm bg-amber-400 py-3 font-display text-sm font-black uppercase tracking-wider text-slate-950 hover:bg-amber-300 transition"
                    >
                      ÉQUIPER MAINTENANT
                    </button>
                    <button
                      type="button"
                      onClick={() => setCrateReveal(null)}
                      className="border border-slate-700 bg-slate-900 px-4 py-3 font-mono text-xs font-bold uppercase text-slate-300 hover:text-white transition"
                    >
                      OK
                    </button>
                  </div>
                </>
              ) : (
                <>
                  <div className="inline-flex items-center gap-1.5 bg-amber-500/20 border border-amber-400/50 px-3 py-1 font-mono text-xs font-black uppercase text-amber-300 mb-3">
                    <ShieldCheck className="h-4 w-4" />
                    COLLECTION COMPLÈTE — JACKPOT !
                  </div>
                  <h3 className="font-display text-2xl font-black uppercase text-white">
                    TRÉSOR BLACK-OPS
                  </h3>
                  <div className="my-5 flex items-center justify-center gap-4 font-mono text-lg font-black">
                    <span className="inline-flex items-center gap-1.5 text-amber-300">
                      <Coins className="h-5 w-5" /> +{crateReveal.bonusCredits} CR
                    </span>
                    <span className="inline-flex items-center gap-1.5 text-cyan-300">
                      <Diamond className="h-5 w-5" /> +{crateReveal.bonusCrystals} ◆
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setCrateReveal(null)}
                    className="w-full tac-cut-sm bg-amber-400 py-3 font-display text-sm font-black uppercase tracking-wider text-slate-950 hover:bg-amber-300 transition"
                  >
                    CONTINUER
                  </button>
                </>
              )}
            </div>
          ) : null}
        </div>
      )}
    </div>
  );
}
