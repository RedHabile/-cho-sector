import { NextResponse } from "next/server";
import { multiplayerHub } from "@/lib/multiplayer-hub";
import { MultiplayerEvent, MultiplayerPeerState } from "@/game/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as {
      roomCode?: unknown;
      playerId?: unknown;
      pose?: MultiplayerPeerState;
      event?: MultiplayerEvent;
    };

    if (typeof body.roomCode !== "string" || !body.roomCode.trim() ||
        typeof body.playerId !== "string" || !body.playerId.trim()) {
      return NextResponse.json({ ok: false, error: "roomCode and playerId are required" }, { status: 400 });
    }

    if (body.pose && typeof body.pose === "object") {
      multiplayerHub.updatePeerPose(body.roomCode, {
        ...body.pose,
        playerId: body.playerId.slice(0, 100),
      });
    }

    if (body.event && typeof body.event === "object" && typeof body.event.type === "string") {
      multiplayerHub.relayEvent(body.roomCode, body.playerId.slice(0, 100), body.event);
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("POST /api/multiplayer/sync error:", error);
    return NextResponse.json({ ok: false }, { status: 400 });
  }
}
