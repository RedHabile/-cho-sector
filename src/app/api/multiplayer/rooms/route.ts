import { NextResponse } from "next/server";
import { multiplayerHub } from "@/lib/multiplayer-hub";
import { OperatorClassId } from "@/game/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const VALID_CLASSES = new Set<OperatorClassId>([
  "spectre",
  "bastion",
  "vanguard",
  "ghost",
]);

export async function GET() {
  return NextResponse.json({ ok: true, rooms: multiplayerHub.listRooms() });
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as {
      roomCode?: unknown;
      quickJoin?: unknown;
      playerId?: unknown;
      callsign?: unknown;
      classId?: unknown;
      skinId?: unknown;
    };

    if (typeof body.playerId !== "string" || !body.playerId.trim()) {
      return NextResponse.json({ ok: false, error: "playerId is required" }, { status: 400 });
    }

    const classId = typeof body.classId === "string" && VALID_CLASSES.has(body.classId as OperatorClassId)
      ? body.classId as OperatorClassId
      : "vanguard";
    const callsign = typeof body.callsign === "string" && body.callsign.trim()
      ? body.callsign.trim().toUpperCase().slice(0, 18)
      : "OPERATIVE";

    const result = multiplayerHub.createOrJoinRoom({
      roomCode: typeof body.roomCode === "string" ? body.roomCode : undefined,
      quickJoin: body.quickJoin === true,
      playerId: body.playerId.trim().slice(0, 100),
      callsign,
      classId,
      skinId: typeof body.skinId === "string" ? body.skinId.slice(0, 80) : undefined,
    });

    return NextResponse.json({ ok: true, ...result, playerId: body.playerId.trim().slice(0, 100) });
  } catch (error) {
    console.error("POST /api/multiplayer/rooms error:", error);
    return NextResponse.json({ ok: false }, { status: 400 });
  }
}
