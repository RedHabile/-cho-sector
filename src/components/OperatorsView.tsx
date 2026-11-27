"use client";

import { useEffect, useState } from "react";
import {
  Check,
  Coins,
  Crosshair,
  Diamond,
  Lock,
  ShoppingBag,
  Zap,
} from "lucide-react";
import { OPERATORS, OPERATOR_LIST } from "@/game/constants";
import { getSkinById, getSkinsForClass, RARITY_META } from "@/game/skins";
import { soundEngine } from "@/game/sound";
import { OperatorClassId, OperatorSkin, PlayerProfile } from "@/game/types";
import { OperatorPreviewCanvas } from "./OperatorPreviewCanvas";

interface OperatorsViewProps {
  selectedClass: OperatorClassId;
  onSelectClass: (classId: OperatorClassId) => void;
  profile: PlayerProfile;
  onEquipSkin: (skin: OperatorSkin) => void;
  onBuySkin: (skin: OperatorSkin, currency: "credits" | "crystals") => void;
  onOpenShop: () => void;
}

export function OperatorsView({
  selectedClass,
  onSelectClass,
  profile,
  onEquipSkin,
  onBuySkin,
  onOpenShop,
}: OperatorsViewProps) {
  const [previewSkinId, setPreviewSkinId] = useState<string>(
    profile.equippedSkins[selectedClass]
  );
  const [fireTrigger, setFireTrigger] = useState(0);

  // Sync preview skin whenever user switches operator
  useEffect(() => {
    setPreviewSkinId(profile.equippedSkins[selectedClass]);
  }, [selectedClass, profile.equippedSkins]);

  const spec = OPERATORS[selectedClass];
  const classSkins = getSkinsForClass(selectedClass);
  const activeSkin = getSkinById(previewSkinId, selectedClass);
  const activeRarity = RARITY_META[activeSkin.rarity];
  const isOwned = profile.ownedSkins.includes(activeSkin.id);
  const isEquipped = profile.equippedSkins[selectedClass] === activeSkin.id;

  const handleTestFire = () => {
    soundEngine.unlock();
    soundEngine.playWeaponFire(spec.weapon.soundType, 0.72);
    setFireTrigger((c) => c + 1);
  };

  const statRows = [
    {
      label: "SANTÉ & ARMURE",
      value: `${spec.maxHp} + ${spec.maxArmor}`,
      pct: Math.round(((spec.maxHp + spec.maxArmor) / 290) * 100),
      color: "#38bdf8",
    },
    {
      label: "DÉGÂTS / SALVE",
      value:
        spec.weapon.pellets > 1
          ? `${spec.weapon.damage}×${spec.weapon.pellets}`
          : `${spec.weapon.damage}`,
      pct: Math.min(
        100,
        Math.round(((spec.weapon.damage * spec.weapon.pellets) / 115) * 100)
      ),
      color: "#f43f5e",
    },
    {
      label: "PORTÉE LAMPE",
      value: `${spec.visionRange}m`,
      pct: Math.round((spec.visionRange / 650) * 100),
      color: "#fbbf24",
    },
    {
      label: "MOBILITÉ",
      value: `${spec.moveSpeed}`,
      pct: Math.round((spec.moveSpeed / 250) * 100),
      color: "#10b981",
    },
  ];

  return (
    <div className="h-full overflow-y-auto tac-scroll px-3 sm:px-6 pb-6 pt-2">
      <div className="mx-auto max-w-6xl grid grid-cols-1 lg:grid-cols-12 gap-4 items-stretch">
        {/* LEFT RAIL: Operator Roster */}
        <div className="lg:col-span-3 flex lg:flex-col gap-2 overflow-x-auto lg:overflow-visible pb-1 lg:pb-0">
          {OPERATOR_LIST.map((op) => {
            const active = selectedClass === op.id;
            const eqSkinId = profile.equippedSkins[op.id];
            const eqSkin = getSkinById(eqSkinId, op.id);
            const ownedCount = getSkinsForClass(op.id).filter((s) =>
              profile.ownedSkins.includes(s.id)
            ).length;

            return (
              <button
                key={op.id}
                type="button"
                onClick={() => {
                  soundEngine.playUiClick(1.05);
                  onSelectClass(op.id);
                }}
                className={`min-w-[165px] lg:min-w-0 flex items-center gap-3 p-2.5 text-left tac-cut-sm border transition ${
                  active
                    ? "bg-slate-900/95 border-amber-400/80 shadow-[0_0_24px_rgba(251,191,36,0.16)]"
                    : "bg-slate-950/80 border-slate-800/90 hover:border-slate-600"
                }`}
              >
                <div className="h-14 w-14 shrink-0 bg-slate-950 border border-slate-800 overflow-hidden">
                  <OperatorPreviewCanvas
                    classId={op.id}
                    skinId={eqSkin.id}
                    variant="portrait"
                    className="h-full w-full"
                  />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-1.5">
                    <span
                      className="h-2 w-2 shrink-0"
                      style={{ backgroundColor: eqSkin.vestTrim }}
                    />
                    <span className="font-display text-base font-black uppercase tracking-wide text-white truncate">
                      {op.name}
                    </span>
                  </div>
                  <div className="font-mono text-[9px] font-bold uppercase tracking-wider text-slate-400 truncate">
                    {op.role}
                  </div>
                  <div className="mt-1 font-mono text-[9px] text-slate-500">
                    SKINS {ownedCount}/4
                  </div>
                </div>
              </button>
            );
          })}
        </div>

        {/* CENTER STAGE: Live Rotating Operator Pedestal */}
        <div className="lg:col-span-5 tac-panel tac-cut relative flex flex-col justify-between p-4 min-h-[340px]">
          <div className="flex items-start justify-between gap-2 z-10">
            <div>
              <div className="flex items-center gap-2">
                <span
                  className="px-2 py-0.5 font-mono text-[10px] font-black uppercase tracking-wider"
                  style={{
                    color: activeRarity.color,
                    backgroundColor: activeRarity.badgeBg,
                  }}
                >
                  {activeRarity.label}
                </span>
                <span className="font-mono text-[10px] uppercase tracking-widest text-slate-400">
                  {spec.weapon.name}
                </span>
              </div>
              <h2 className="mt-1 font-display text-3xl font-black uppercase tracking-wide text-white">
                {spec.name}
              </h2>
              <p
                className="font-mono text-xs font-bold uppercase tracking-wider"
                style={{ color: activeSkin.vestTrim }}
              >
                SKIN : {activeSkin.name}
              </p>
            </div>

            <button
              type="button"
              onClick={handleTestFire}
              className="inline-flex items-center gap-1.5 border border-rose-500/60 bg-rose-500/15 px-3 py-1.5 font-mono text-[10px] font-black uppercase tracking-wider text-rose-200 hover:bg-rose-500/25 active:scale-95 transition"
            >
              <Crosshair className="h-3.5 w-3.5" />
              TESTER L&apos;ARME
            </button>
          </div>

          <div className="relative flex-1 min-h-[220px]">
            <OperatorPreviewCanvas
              classId={selectedClass}
              skinId={activeSkin.id}
              variant="pedestal"
              fireTrigger={fireTrigger}
              interactive
              className="h-full w-full"
            />
            <div className="pointer-events-none absolute bottom-1 inset-x-0 text-center font-mono text-[9px] uppercase tracking-[0.2em] text-slate-500">
              GLISSER POUR PIVOTER L&apos;OPÉRATEUR
            </div>
          </div>

          {/* Equip or Unlock CTA for previewed skin */}
          <div className="pt-2 border-t border-slate-800/80 flex items-center justify-between gap-2">
            {isOwned ? (
              <button
                type="button"
                disabled={isEquipped}
                onClick={() => onEquipSkin(activeSkin)}
                className={`w-full tac-cut-sm py-2.5 font-display text-xs font-black uppercase tracking-widest transition ${
                  isEquipped
                    ? "border border-emerald-500/40 bg-emerald-500/15 text-emerald-300 cursor-default"
                    : "bg-sky-400 text-slate-950 hover:bg-sky-300"
                }`}
              >
                {isEquipped ? "✓ SKIN ÉQUIPÉ POUR LE COMBAT" : "ÉQUIPER CE SKIN"}
              </button>
            ) : (
              <div className="w-full flex items-center gap-2">
                <button
                  type="button"
                  disabled={profile.credits < activeSkin.priceCredits}
                  onClick={() => onBuySkin(activeSkin, "credits")}
                  className="flex-1 inline-flex items-center justify-center gap-1.5 tac-cut-sm bg-amber-400 py-2.5 font-display text-xs font-black uppercase tracking-wider text-slate-950 hover:bg-amber-300 disabled:opacity-35 disabled:cursor-not-allowed transition"
                >
                  <Coins className="h-3.5 w-3.5" />
                  DÉBLOQUER ({activeSkin.priceCredits} CR)
                </button>
                <button
                  type="button"
                  disabled={profile.crystals < activeSkin.priceCrystals}
                  onClick={() => onBuySkin(activeSkin, "crystals")}
                  className="inline-flex items-center justify-center gap-1.5 tac-cut-sm border border-cyan-400/65 bg-cyan-500/15 px-3.5 py-2.5 font-display text-xs font-black uppercase tracking-wider text-cyan-200 hover:bg-cyan-500/25 disabled:opacity-35 disabled:cursor-not-allowed transition"
                >
                  <Diamond className="h-3.5 w-3.5" />
                  {activeSkin.priceCrystals}
                </button>
              </div>
            )}
          </div>
        </div>

        {/* RIGHT COLUMN: Stats + Skin Locker */}
        <div className="lg:col-span-4 flex flex-col gap-3">
          {/* Combat Telemetry */}
          <div className="tac-panel tac-cut-sm p-4 space-y-3">
            <div className="font-mono text-[10px] font-bold uppercase tracking-[0.2em] text-slate-400">
              FICHE TECHNIQUE
            </div>

            <div className="space-y-2">
              {statRows.map((s) => (
                <div key={s.label}>
                  <div className="flex justify-between font-mono text-[10px] font-bold mb-1">
                    <span className="text-slate-400">{s.label}</span>
                    <span className="text-white">{s.value}</span>
                  </div>
                  <div className="h-1.5 bg-slate-900 overflow-hidden">
                    <div
                      className="h-full transition-all duration-300"
                      style={{ width: `${s.pct}%`, backgroundColor: s.color }}
                    />
                  </div>
                </div>
              ))}
            </div>

            <div className="border border-slate-800 bg-slate-950/80 p-2.5 flex items-start gap-2">
              <Zap
                className="h-4 w-4 shrink-0 mt-0.5"
                style={{ color: spec.accentColor }}
              />
              <div>
                <div className="font-mono text-[10px] font-black uppercase tracking-wider text-white">
                  {spec.abilityName}
                </div>
                <p className="text-[11px] text-slate-400 leading-snug">
                  {spec.abilityDesc}
                </p>
              </div>
            </div>
          </div>

          {/* 4 Skins Wardrobe for Selected Operator */}
          <div className="tac-panel tac-cut-sm p-4 flex-1 flex flex-col justify-between gap-3">
            <div className="flex items-center justify-between">
              <span className="font-mono text-[10px] font-bold uppercase tracking-[0.2em] text-slate-400">
                SKINS DE {spec.name}
              </span>
              <button
                type="button"
                onClick={onOpenShop}
                className="inline-flex items-center gap-1 font-mono text-[10px] font-bold text-amber-300 hover:text-amber-200"
              >
                <ShoppingBag className="h-3 w-3" />
                BOUTIQUE →
              </button>
            </div>

            <div className="grid grid-cols-2 gap-2">
              {classSkins.map((skin) => {
                const owned = profile.ownedSkins.includes(skin.id);
                const equipped = profile.equippedSkins[selectedClass] === skin.id;
                const previewing = previewSkinId === skin.id;
                const rarity = RARITY_META[skin.rarity];

                return (
                  <button
                    key={skin.id}
                    type="button"
                    onClick={() => {
                      soundEngine.playUiClick(1.15);
                      setPreviewSkinId(skin.id);
                      if (owned) onEquipSkin(skin);
                    }}
                    className={`relative text-left p-2 border transition ${
                      previewing
                        ? "bg-slate-900 border-amber-400"
                        : "bg-slate-950/80 border-slate-800 hover:border-slate-600"
                    }`}
                  >
                    <div className="flex items-center justify-between gap-1 mb-1">
                      <span
                        className="h-2 w-6"
                        style={{ backgroundColor: skin.vestTrim }}
                      />
                      {equipped ? (
                        <Check className="h-3.5 w-3.5 text-emerald-400" />
                      ) : !owned ? (
                        <Lock className="h-3 w-3 text-slate-500" />
                      ) : null}
                    </div>
                    <div className="font-display text-xs font-extrabold uppercase text-white truncate">
                      {skin.name}
                    </div>
                    <div
                      className="font-mono text-[9px] font-bold uppercase mt-0.5"
                      style={{ color: rarity.color }}
                    >
                      {owned ? (equipped ? "ÉQUIPÉ" : "ACQUIS") : `${skin.priceCredits} CR`}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
