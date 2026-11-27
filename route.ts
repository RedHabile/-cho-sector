import { NextResponse } from "next/server";
import { desc, sql } from "drizzle-orm";
import { db } from "@/db";
import { highScores } from "@/db/schema";
import { GameMode, OperatorClassId } from "@/game/types";

export const dynamic = "force-dynamic";

const VALID_CLASSES = new Set<OperatorClassId>([
  "spectre",
  "bastion",
  "vanguard",
  "ghost",
]);

const SEED_SCORES = [
  {
    callsign: "KESTREL",
    operatorClass: "ghost",
    score: 3680,
    kills: 7,
    placement: 1,
    totalPlayers: 10,
    damageDealt: 1240,
    survivalSeconds: 112,
    mode: "multiplayer",
  },
  {
    callsign: "NYX-09",
    operatorClass: "spectre",
    score: 3240,
    kills: 6,
    placement: 1,
    totalPlayers: 10,
    damageDealt: 980,
    survivalSeconds: 98,
    mode: "solo",
  },
  {
    callsign: "IRONCLAD",
    operatorClass: "bastion",
    score: 2890,
    kills: 5,
    placement: 1,
    totalPlayers: 10,
    damageDealt: 1120,
    survivalSeconds: 104,
    mode: "multiplayer",
  },
  {
    callsign: "WARDEN",
    operatorClass: "vanguard",
    score: 2410,
    kills: 4,
    placement: 2,
    totalPlayers: 10,
    damageDealt: 845,
    survivalSeconds: 94,
    mode: "solo",
  },
  {
    callsign: "CIPHER",
    operatorClass: "spectre",
    score: 1980,
    kills: 3,
    placement: 2,
    totalPlayers: 10,
    damageDealt: 640,
    survivalSeconds: 82,
    mode: "solo",
  },
  {
    callsign: "VEX",
    operatorClass: "ghost",
    score: 1640,
    kills: 3,
    placement: 3,
    totalPlayers: 10,
    damageDealt: 590,
    survivalSeconds: 76,
    mode: "multiplayer",
  },
];

async function ensureTableAndSeed() {
  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS high_scores (
      id SERIAL PRIMARY KEY,
      callsign VARCHAR(32) NOT NULL,
      operator_class VARCHAR(24) NOT NULL,
      score INTEGER NOT NULL,
      kills INTEGER NOT NULL,
      placement INTEGER NOT NULL,
      total_players INTEGER NOT NULL DEFAULT 10,
      damage_dealt INTEGER NOT NULL DEFAULT 0,
      survival_seconds INTEGER NOT NULL DEFAULT 0,
      mode VARCHAR(24) NOT NULL DEFAULT 'solo',
      created_at TIMESTAMP NOT NULL DEFAULT NOW()
    );
  `);

  const existing = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(highScores);

  if ((existing[0]?.count ?? 0) === 0) {
    await db.insert(highScores).values(SEED_SCORES);
  }
}

export async function GET() {
  try {
    await ensureTableAndSeed();
    const rows = await db
      .select()
      .from(highScores)
      .orderBy(desc(highScores.score), desc(highScores.kills))
      .limit(15);

    return NextResponse.json({
      ok: true,
      scores: rows.map((r) => ({
        id: r.id,
        callsign: r.callsign,
        operatorClass: r.operatorClass as OperatorClassId,
        score: r.score,
        kills: r.kills,
        placement: r.placement,
        totalPlayers: r.totalPlayers,
        damageDealt: r.damageDealt,
        survivalSeconds: r.survivalSeconds,
        mode: (r.mode === "multiplayer" ? "multiplayer" : "solo") as GameMode,
        createdAt: r.createdAt.toISOString(),
      })),
    });
  } catch (err) {
    console.error("GET /api/scores error:", err);
    return NextResponse.json({ ok: false, scores: [] }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    await ensureTableAndSeed();
    const body = (await request.json()) as {
      callsign?: string;
      operatorClass?: OperatorClassId;
      score?: number;
      kills?: number;
      placement?: number;
      totalPlayers?: number;
      damageDealt?: number;
      survivalSeconds?: number;
      mode?: GameMode;
    };

    const callsign =
      typeof body.callsign === "string" && body.callsign.trim().length > 0
        ? body.callsign.trim().toUpperCase().slice(0, 18)
        : "OPERATIVE";

    const operatorClass: OperatorClassId =
      body.operatorClass && VALID_CLASSES.has(body.operatorClass)
        ? body.operatorClass
        : "vanguard";

    const score = Math.max(0, Math.min(999999, Math.round(Number(body.score) || 0)));
    const kills = Math.max(0, Math.min(99, Math.round(Number(body.kills) || 0)));
    const totalPlayers = Math.max(
      2,
      Math.min(32, Math.round(Number(body.totalPlayers) || 10))
    );
    const placement = Math.max(
      1,
      Math.min(totalPlayers, Math.round(Number(body.placement) || totalPlayers))
    );
    const damageDealt = Math.max(
      0,
      Math.min(99999, Math.round(Number(body.damageDealt) || 0))
    );
    const survivalSeconds = Math.max(
      0,
      Math.min(3600, Math.round(Number(body.survivalSeconds) || 0))
    );
    const mode: GameMode = body.mode === "multiplayer" ? "multiplayer" : "solo";

    const [inserted] = await db
      .insert(highScores)
      .values({
        callsign,
        operatorClass,
        score,
        kills,
        placement,
        totalPlayers,
        damageDealt,
        survivalSeconds,
        mode,
      })
      .returning();

    return NextResponse.json({
      ok: true,
      entry: {
        id: inserted.id,
        callsign: inserted.callsign,
        operatorClass: inserted.operatorClass,
        score: inserted.score,
        kills: inserted.kills,
        placement: inserted.placement,
        totalPlayers: inserted.totalPlayers,
        damageDealt: inserted.damageDealt,
        survivalSeconds: inserted.survivalSeconds,
        mode: inserted.mode,
        createdAt: inserted.createdAt.toISOString(),
      },
    });
  } catch (err) {
    console.error("POST /api/scores error:", err);
    return NextResponse.json({ ok: false }, { status: 500 });
  }
}
