"use client";

import { useEffect, useRef } from "react";
import { OPERATORS } from "@/game/constants";
import { drawOperatorFigure } from "@/game/renderer";
import { getSkinById, RARITY_META } from "@/game/skins";
import { OperatorClassId } from "@/game/types";

interface OperatorPreviewCanvasProps {
  classId: OperatorClassId;
  skinId: string;
  variant?: "pedestal" | "card" | "portrait";
  fireTrigger?: number;
  interactive?: boolean;
  className?: string;
}

interface PreviewSpark {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  maxLife: number;
  color: string;
  size: number;
  isShell?: boolean;
  rot?: number;
}

export function OperatorPreviewCanvas({
  classId,
  skinId,
  variant = "pedestal",
  fireTrigger = 0,
  interactive = false,
  className = "",
}: OperatorPreviewCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const angleRef = useRef(-0.42);
  const targetAngleRef = useRef(-0.42);
  const draggingRef = useRef(false);
  const lastPointerXRef = useRef(0);
  const recoilRef = useRef(0);
  const muzzleUntilRef = useRef(0);
  const shieldUntilRef = useRef(0);
  const sparksRef = useRef<PreviewSpark[]>([]);
  const lastFireTriggerRef = useRef(fireTrigger);

  // Trigger visual recoil, muzzle flash, sparks & shell ejection when user tests weapon!
  useEffect(() => {
    if (fireTrigger > lastFireTriggerRef.current) {
      lastFireTriggerRef.current = fireTrigger;
      const spec = OPERATORS[classId];
      const skin = getSkinById(skinId, classId);
      const now = performance.now();
      recoilRef.current = spec.weapon.recoilKick * 1.15;
      muzzleUntilRef.current = now + 95;
      if (classId === "bastion") {
        shieldUntilRef.current = now + 1100;
      }

      const ang = angleRef.current;
      const tipDist = classId === "ghost" ? 46 : 36;
      const mx = Math.cos(ang) * tipDist;
      const my = Math.sin(ang) * tipDist;

      // Muzzle sparks & tracers
      const count = classId === "bastion" ? 14 : 8;
      for (let i = 0; i < count; i++) {
        const spread = (Math.random() - 0.5) * (classId === "bastion" ? 0.55 : 0.35);
        const spd = 160 + Math.random() * 240;
        sparksRef.current.push({
          x: mx,
          y: my,
          vx: Math.cos(ang + spread) * spd,
          vy: Math.sin(ang + spread) * spd,
          life: 0.28 + Math.random() * 0.16,
          maxLife: 0.44,
          color: i % 2 === 0 ? "#ffffff" : skin.tracerColor,
          size: 2.2 + Math.random() * 2.2,
        });
      }

      // Ejected brass shell
      const ejectAng = ang + Math.PI / 2 + (Math.random() - 0.5) * 0.4;
      sparksRef.current.push({
        x: Math.cos(ang) * 8,
        y: Math.sin(ang) * 8,
        vx: Math.cos(ejectAng) * (55 + Math.random() * 35),
        vy: Math.sin(ejectAng) * (55 + Math.random() * 35),
        life: 0.55,
        maxLife: 0.55,
        color: "#facc15",
        size: 3.2,
        isShell: true,
        rot: Math.random() * Math.PI,
      });
    }
  }, [fireTrigger, classId, skinId]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let rafId = 0;
    let lastTime = performance.now();

    const draw = (now: number) => {
      const dt = Math.min(0.05, (now - lastTime) / 1000);
      lastTime = now;

      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      const rect = canvas.getBoundingClientRect();
      const w = Math.max(1, Math.floor(rect.width));
      const h = Math.max(1, Math.floor(rect.height));

      if (canvas.width !== Math.floor(w * dpr) || canvas.height !== Math.floor(h * dpr)) {
        canvas.width = Math.floor(w * dpr);
        canvas.height = Math.floor(h * dpr);
      }

      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, w, h);

      const spec = OPERATORS[classId];
      const skin = getSkinById(skinId, classId);
      const rarity = RARITY_META[skin.rarity];

      // Smooth idle sway when not dragging
      if (!draggingRef.current) {
        if (variant === "pedestal") {
          targetAngleRef.current += dt * 0.24;
        } else {
          targetAngleRef.current = -0.35 + Math.sin(now * 0.0014) * 0.32;
        }
      }
      angleRef.current += (targetAngleRef.current - angleRef.current) * Math.min(1, dt * 10);
      recoilRef.current = Math.max(0, recoilRef.current - dt * 28);

      const cx = w / 2;
      const cy = variant === "pedestal" ? h * 0.52 : h * 0.52;
      const scale =
        variant === "pedestal"
          ? Math.min(w, h) / 140
          : variant === "portrait"
            ? Math.min(w, h) / 72
            : Math.min(w, h) / 96;

      // Pedestal holographic environment
      if (variant === "pedestal") {
        // Deep radial spotlight pool
        const floorGrad = ctx.createRadialGradient(
          cx,
          cy,
          12,
          cx,
          cy,
          Math.min(w, h) * 0.48
        );
        floorGrad.addColorStop(0, `rgba(${skin.beamRgb}, 0.22)`);
        floorGrad.addColorStop(0.55, rarity.bgGlow);
        floorGrad.addColorStop(1, "rgba(0,0,0,0)");
        ctx.fillStyle = floorGrad;
        ctx.beginPath();
        ctx.arc(cx, cy, Math.min(w, h) * 0.48, 0, Math.PI * 2);
        ctx.fill();

        // Outer rotating tactical compass ring
        const outerR = Math.min(w, h) * 0.39;
        ctx.save();
        ctx.translate(cx, cy);
        ctx.rotate(now * 0.00025);
        ctx.strokeStyle = `${skin.vestTrim}44`;
        ctx.lineWidth = 1.5;
        ctx.setLineDash([12, 10]);
        ctx.beginPath();
        ctx.arc(0, 0, outerR, 0, Math.PI * 2);
        ctx.stroke();
        ctx.setLineDash([]);

        // Compass degree ticks
        ctx.strokeStyle = "rgba(148, 163, 184, 0.28)";
        ctx.lineWidth = 1.2;
        for (let t = 0; t < 24; t++) {
          const a = (t / 24) * Math.PI * 2;
          const inner = t % 6 === 0 ? outerR - 10 : outerR - 5;
          ctx.beginPath();
          ctx.moveTo(Math.cos(a) * inner, Math.sin(a) * inner);
          ctx.lineTo(Math.cos(a) * outerR, Math.sin(a) * outerR);
          ctx.stroke();
        }
        ctx.restore();

        // Inner hexagonal / circular holo pad
        const padR = Math.min(w, h) * 0.25;
        ctx.save();
        ctx.translate(cx, cy);
        ctx.strokeStyle = `${skin.visorColor}88`;
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(0, 0, padR, 0, Math.PI * 2);
        ctx.stroke();

        ctx.strokeStyle = "rgba(255,255,255,0.08)";
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.arc(0, 0, padR * 0.72, 0, Math.PI * 2);
        ctx.stroke();
        ctx.restore();
      } else {
        // Subtle card spotlight
        const cardGlow = ctx.createRadialGradient(cx, cy, 4, cx, cy, Math.min(w, h) * 0.46);
        cardGlow.addColorStop(0, `${skin.vestTrim}38`);
        cardGlow.addColorStop(1, "rgba(0,0,0,0)");
        ctx.fillStyle = cardGlow;
        ctx.beginPath();
        ctx.arc(cx, cy, Math.min(w, h) * 0.46, 0, Math.PI * 2);
        ctx.fill();
      }

      // Draw volumetric flashlight cone radiating from operator!
      ctx.save();
      ctx.translate(cx, cy);
      ctx.scale(scale, scale);

      const coneLen = variant === "pedestal" ? 96 : variant === "card" ? 56 : 36;
      const coneHalf = spec.visionHalfAngle;
      ctx.save();
      ctx.rotate(angleRef.current);
      const coneGrad = ctx.createRadialGradient(8, 0, 4, 8, 0, coneLen);
      coneGrad.addColorStop(0, `rgba(${skin.beamRgb}, 0.36)`);
      coneGrad.addColorStop(0.65, `rgba(${skin.beamRgb}, 0.12)`);
      coneGrad.addColorStop(1, `rgba(${skin.beamRgb}, 0)`);
      ctx.fillStyle = coneGrad;
      ctx.beginPath();
      ctx.moveTo(8, 0);
      ctx.arc(8, 0, coneLen, -coneHalf, coneHalf);
      ctx.closePath();
      ctx.fill();

      // Crisp flashlight edges
      ctx.strokeStyle = `${skin.vestTrim}55`;
      ctx.lineWidth = 0.8;
      ctx.beginPath();
      ctx.moveTo(8, 0);
      ctx.lineTo(8 + Math.cos(-coneHalf) * coneLen, Math.sin(-coneHalf) * coneLen);
      ctx.moveTo(8, 0);
      ctx.lineTo(8 + Math.cos(coneHalf) * coneLen, Math.sin(coneHalf) * coneLen);
      ctx.stroke();
      ctx.restore();

      // Contact shadow beneath operator
      ctx.fillStyle = "rgba(0, 0, 0, 0.55)";
      ctx.beginPath();
      ctx.ellipse(2, 5, 19, 16, 0, 0, Math.PI * 2);
      ctx.fill();

      // Render exact in-game operator sprite with equipped skin!
      const idleBreath = Math.sin(now * 0.0024) * 0.35;
      drawOperatorFigure(ctx, {
        classId,
        skin,
        angle: angleRef.current,
        stridePhase: idleBreath,
        recoilOffset: recoilRef.current,
        hitFlash: 0,
        muzzleFlash: now < muzzleUntilRef.current,
        isShielded: now < shieldUntilRef.current,
        isCloaked: false,
        isLocalPlayer: true,
        now,
        showSniperLaser: variant === "pedestal",
      });

      // Update & draw test-fire sparks & brass shells
      for (let i = sparksRef.current.length - 1; i >= 0; i--) {
        const s = sparksRef.current[i];
        s.life -= dt;
        if (s.life <= 0) {
          sparksRef.current.splice(i, 1);
          continue;
        }
        s.x += s.vx * dt;
        s.y += s.vy * dt;
        s.vx *= Math.pow(0.88, dt * 60);
        s.vy *= Math.pow(0.88, dt * 60);
        const alpha = Math.max(0, s.life / s.maxLife);
        ctx.save();
        ctx.globalAlpha = alpha;
        ctx.fillStyle = s.color;
        if (s.isShell) {
          ctx.translate(s.x, s.y);
          ctx.rotate((s.rot ?? 0) + (1 - alpha) * 8);
          ctx.fillRect(-2.5, -1, 5, 2);
        } else {
          ctx.beginPath();
          ctx.arc(s.x, s.y, s.size * alpha, 0, Math.PI * 2);
          ctx.fill();
        }
        ctx.restore();
      }

      ctx.restore();

      rafId = requestAnimationFrame(draw);
    };

    rafId = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(rafId);
  }, [classId, skinId, variant]);

  const handlePointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!interactive) return;
    draggingRef.current = true;
    lastPointerXRef.current = e.clientX;
    e.currentTarget.setPointerCapture(e.pointerId);
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!interactive || !draggingRef.current) return;
    const dx = e.clientX - lastPointerXRef.current;
    lastPointerXRef.current = e.clientX;
    targetAngleRef.current += dx * 0.016;
  };

  const handlePointerUp = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!interactive) return;
    draggingRef.current = false;
    if (e.currentTarget.hasPointerCapture(e.pointerId)) {
      e.currentTarget.releasePointerCapture(e.pointerId);
    }
  };

  return (
    <canvas
      ref={canvasRef}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerCancel={handlePointerUp}
      className={`block ${interactive ? "cursor-grab active:cursor-grabbing touch-none" : ""} ${className}`}
    />
  );
}
