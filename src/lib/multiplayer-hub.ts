import {
  MultiplayerEvent,
  MultiplayerPeerState,
  OperatorClassId,
  RoomSummary,
} from "@/game/types";

interface Subscriber {
  playerId: string;
  send: (event: MultiplayerEvent) => void;
}

interface RoomRecord {
  code: string;
  seed: number;
  createdAt: number;
  startedAt: number;
  hostCallsign: string;
  peers: Map<string, MultiplayerPeerState>;
  subscribers: Map<string, Subscriber>;
}

const MAX_HUMANS_PER_ROOM = 8;
const STALE_PEER_MS = 14000;
const EMPTY_ROOM_TTL_MS = 180000;

function generateRoomCode(): string {
  const prefixes = ["SEC", "OPS", "TAC", "ECHO", "APEX"];
  const prefix = prefixes[Math.floor(Math.random() * prefixes.length)];
  const num = 100 + Math.floor(Math.random() * 900);
  return `${prefix}-${num}`;
}

class MultiplayerHub {
  private rooms = new Map<string, RoomRecord>();

  public prune() {
    const now = Date.now();
    for (const [code, room] of this.rooms.entries()) {
      for (const [pid, peer] of room.peers.entries()) {
        if (now - peer.updatedAt > STALE_PEER_MS) {
          room.peers.delete(pid);
          room.subscribers.delete(pid);
          this.broadcast(code, { type: "peer_leave", playerId: pid }, pid);
        }
      }
      if (
        room.peers.size === 0 &&
        room.subscribers.size === 0 &&
        now - room.createdAt > EMPTY_ROOM_TTL_MS
      ) {
        this.rooms.delete(code);
      }
    }
  }

  public listRooms(): RoomSummary[] {
    this.prune();
    const out: RoomSummary[] = [];
    for (const room of this.rooms.values()) {
      out.push({
        code: room.code,
        playerCount: room.peers.size,
        maxPlayers: MAX_HUMANS_PER_ROOM,
        seed: room.seed,
        createdAt: room.createdAt,
        hostCallsign: room.hostCallsign,
      });
    }
    return out.sort((a, b) => b.playerCount - a.playerCount || b.createdAt - a.createdAt);
  }

  public createOrJoinRoom(opts: {
    roomCode?: string;
    quickJoin?: boolean;
    playerId: string;
    callsign: string;
    classId: OperatorClassId;
    skinId?: string;
  }): {
    roomCode: string;
    seed: number;
    startedAt: number;
    peers: MultiplayerPeerState[];
    created: boolean;
  } {
    this.prune();

    let room: RoomRecord | undefined;
    let created = false;

    if (opts.quickJoin) {
      // Join an existing room with space and at least 1 player
      for (const candidate of this.rooms.values()) {
        if (candidate.peers.size > 0 && candidate.peers.size < MAX_HUMANS_PER_ROOM) {
          room = candidate;
          break;
        }
      }
    } else if (opts.roomCode) {
      const normalized = opts.roomCode.trim().toUpperCase();
      room = this.rooms.get(normalized);
      if (!room) {
        const now = Date.now();
        room = {
          code: normalized,
          seed: Math.floor(Math.random() * 900000) + 10000,
          createdAt: now,
          startedAt: now,
          hostCallsign: opts.callsign,
          peers: new Map(),
          subscribers: new Map(),
        };
        this.rooms.set(normalized, room);
        created = true;
      }
    }

    if (!room) {
      let code = generateRoomCode();
      while (this.rooms.has(code)) {
        code = generateRoomCode();
      }
      const now = Date.now();
      room = {
        code,
        seed: Math.floor(Math.random() * 900000) + 10000,
        createdAt: now,
        startedAt: now,
        hostCallsign: opts.callsign,
        peers: new Map(),
        subscribers: new Map(),
      };
      this.rooms.set(code, room);
      created = true;
    }

    const peer: MultiplayerPeerState = {
      playerId: opts.playerId,
      callsign: opts.callsign,
      classId: opts.classId,
      skinId: opts.skinId,
      x: 1100,
      y: 1100,
      vx: 0,
      vy: 0,
      angle: 0,
      hp: 120,
      maxHp: 120,
      armor: 80,
      maxArmor: 80,
      alive: true,
      stealth: false,
      kills: 0,
      abilityActive: false,
      updatedAt: Date.now(),
    };

    room.peers.set(opts.playerId, peer);
    this.broadcast(room.code, { type: "peer_pose", peer }, opts.playerId);

    return {
      roomCode: room.code,
      seed: room.seed,
      startedAt: room.startedAt,
      peers: Array.from(room.peers.values()),
      created,
    };
  }

  public subscribe(
    roomCode: string,
    playerId: string,
    send: (event: MultiplayerEvent) => void
  ): () => void {
    const code = roomCode.trim().toUpperCase();
    const room = this.rooms.get(code);
    if (!room) {
      return () => {};
    }

    room.subscribers.set(playerId, { playerId, send });

    // Immediately push current room snapshot
    send({
      type: "room_state",
      roomCode: room.code,
      seed: room.seed,
      startedAt: room.startedAt,
      peers: Array.from(room.peers.values()),
    });

    return () => {
      const currentRoom = this.rooms.get(code);
      if (!currentRoom) return;
      currentRoom.subscribers.delete(playerId);
    };
  }

  public updatePeerPose(roomCode: string, peer: MultiplayerPeerState) {
    const code = roomCode.trim().toUpperCase();
    const room = this.rooms.get(code);
    if (!room) return;
    const stamped = { ...peer, updatedAt: Date.now() };
    room.peers.set(peer.playerId, stamped);
    this.broadcast(code, { type: "peer_pose", peer: stamped }, peer.playerId);
  }

  public relayEvent(roomCode: string, senderId: string, event: MultiplayerEvent) {
    const code = roomCode.trim().toUpperCase();
    const room = this.rooms.get(code);
    if (!room) return;
    if (event.type === "peer_leave") {
      room.peers.delete(senderId);
      room.subscribers.delete(senderId);
    }
    this.broadcast(code, event, senderId);
  }

  private broadcast(roomCode: string, event: MultiplayerEvent, excludePlayerId?: string) {
    const room = this.rooms.get(roomCode);
    if (!room) return;
    for (const [pid, sub] of room.subscribers.entries()) {
      if (excludePlayerId && pid === excludePlayerId) continue;
      try {
        sub.send(event);
      } catch {
        room.subscribers.delete(pid);
      }
    }
  }
}

const globalForHub = globalThis as typeof globalThis & {
  __echoSectorMultiplayerHub?: MultiplayerHub;
};

export const multiplayerHub =
  globalForHub.__echoSectorMultiplayerHub ?? new MultiplayerHub();

if (process.env.NODE_ENV !== "production") {
  globalForHub.__echoSectorMultiplayerHub = multiplayerHub;
} else {
  globalForHub.__echoSectorMultiplayerHub = multiplayerHub;
}
