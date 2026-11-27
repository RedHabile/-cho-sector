import { desc, sql } from "drizzle-orm";
import { db } from "@/db";
import { highScores } from "@/db/schema";
import { GameShell } from "@/components/GameShell";
import { GameMode, HighScoreEntry, OperatorClassId } from "@/game/types";

export const dynamic = "force-dynamic";

const INITIAL_FALLBACK_SCORES = [
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

async function getInitialGlobalScores(): Promise<HighScoreEntry[]> {
  try {
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

    const countRows = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(highScores);

    if ((countRows[0]?.count ?? 0) === 0) {
      await db.insert(highScores).values(INITIAL_FALLBACK_SCORES);
    }

    const rows = await db
      .select()
      .from(highScores)
      .orderBy(desc(highScores.score), desc(highScores.kills))
      .limit(15);

    return rows.map((r) => ({
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
    }));
  } catch {
    return INITIAL_FALLBACK_SCORES.map((s, idx) => ({
      id: `seed_${idx}`,
      callsign: s.callsign,
      operatorClass: s.operatorClass as OperatorClassId,
      score: s.score,
      kills: s.kills,
      placement: s.placement,
      totalPlayers: s.totalPlayers,
      damageDealt: s.damageDealt,
      survivalSeconds: s.survivalSeconds,
      mode: s.mode as GameMode,
      createdAt: new Date().toISOString(),
    }));
  }
}

export default async function HomePage() {
  const initialGlobalScores = await getInitialGlobalScores();
  return <GameShell initialGlobalScores={initialGlobalScores} />;
}
