import {
  FilledFrame,
  RoleFiller,
  isEntityRef,
  isPronoun,
  ref,
} from "../lang/frames.js";

// Tiny village simulation, decoupled from any rendering. The CLI demo
// and the HTML viewer both consume this module: they call tickAll()
// each step, then encode + display the resulting frames themselves.

export type LocationId = "FOREST" | "MEADOW" | "FORGE" | "CAVE";
export type ItemId = "BREAD" | "WATER" | "STICK";
export type Need = "hunger" | "thirst";

export interface World {
  itemsAt: Record<LocationId, ItemId[]>;
}

export const ALL_LOCATIONS: LocationId[] = [
  "FOREST",
  "MEADOW",
  "FORGE",
  "CAVE",
];

export const SATIATES: Record<Need, ItemId> = {
  hunger: "BREAD",
  thirst: "WATER",
};

// Where each item respawns. NPCs treat this as common knowledge.
export const ITEM_HOMES: Record<ItemId, LocationId> = {
  BREAD: "MEADOW",
  WATER: "FOREST",
  STICK: "FORGE",
};

export class NPC {
  inventory = new Set<ItemId>();
  hunger = 0;
  thirst = 0;
  // Last meal, briefly held so the NPC can later boast about it
  // ("I ate the bread") in past tense to a same-room companion.
  lastEaten: ItemId | null = null;

  constructor(
    public id: string,
    public displayName: string,
    public location: LocationId,
    public threshold = { hunger: 60, thirst: 55 },
  ) {}

  tickNeeds(): void {
    this.hunger = Math.min(100, this.hunger + 4 + Math.floor(Math.random() * 6));
    this.thirst = Math.min(100, this.thirst + 5 + Math.floor(Math.random() * 6));
  }

  pressingNeed(): Need | null {
    const overH = this.hunger - this.threshold.hunger;
    const overT = this.thirst - this.threshold.thirst;
    if (overH < 0 && overT < 0) return null;
    return overH >= overT ? "hunger" : "thirst";
  }
}

export interface Decision {
  frame: FilledFrame;
  apply(world: World, npc: NPC): void;
}

export function decide(world: World, npc: NPC, others: NPC[]): Decision {
  // 1. Past-tense gossip: if we recently ate and a companion is here,
  //    most of the time we'll boast about it via SAY-with-nested-EAT.
  if (npc.lastEaten) {
    const audience = others.find(
      (o) => o !== npc && o.location === npc.location,
    );
    if (audience && Math.random() < 0.6) {
      const eaten = npc.lastEaten;
      const inner: FilledFrame = {
        predicate: "EAT",
        mood: "declarative",
        tense: "past",
        roles: {
          agent: ref("ANIMATE", npc.id),
          patient: ref("ITEM", eaten),
        },
      };
      return {
        frame: {
          predicate: "SAY",
          mood: "declarative",
          roles: {
            speaker: ref("ANIMATE", npc.id),
            recipient: ref("ANIMATE", audience.id),
            content: { kind: "frame", frame: inner },
          },
        },
        apply(_w, n) {
          n.lastEaten = null;
        },
      };
    }
    if (Math.random() < 0.4) npc.lastEaten = null;
  }

  const need = npc.pressingNeed();
  if (need === null) {
    // 2. Idle observation. Prefer noticing companions, then items.
    const here = others.find(
      (o) => o !== npc && o.location === npc.location,
    );
    if (here) {
      return {
        frame: {
          predicate: "SEE",
          mood: "declarative",
          roles: {
            viewer: ref("ANIMATE", npc.id),
            target: ref("ANIMATE", here.id),
          },
        },
        apply() {},
      };
    }
    const visible = world.itemsAt[npc.location];
    if (visible.length > 0) {
      const it = visible[0]!;
      return {
        frame: {
          predicate: "SEE",
          mood: "declarative",
          roles: {
            viewer: ref("ANIMATE", npc.id),
            target: ref("ITEM", it),
          },
        },
        apply() {},
      };
    }
    return {
      frame: {
        predicate: "BE_AT",
        mood: "declarative",
        roles: {
          figure: ref("ANIMATE", npc.id),
          ground: ref("LOCATION", npc.location),
        },
      },
      apply() {},
    };
  }

  const item = SATIATES[need];

  // 3. Already carrying it → consume.
  if (npc.inventory.has(item)) {
    return {
      frame: {
        predicate: "EAT",
        mood: "declarative",
        roles: {
          agent: ref("ANIMATE", npc.id),
          patient: ref("ITEM", item),
        },
      },
      apply(_w, n) {
        n.inventory.delete(item);
        if (need === "hunger") n.hunger = Math.max(0, n.hunger - 70);
        else n.thirst = Math.max(0, n.thirst - 70);
        n.lastEaten = item;
      },
    };
  }

  // 4. At a location holding it → take.
  const hereItems = world.itemsAt[npc.location];
  if (hereItems.includes(item)) {
    return {
      frame: {
        predicate: "TAKE",
        mood: "declarative",
        roles: {
          agent: ref("ANIMATE", npc.id),
          theme: ref("ITEM", item),
        },
      },
      apply(w, n) {
        const list = w.itemsAt[n.location];
        const idx = list.indexOf(item);
        if (idx >= 0) list.splice(idx, 1);
        n.inventory.add(item);
      },
    };
  }

  // 5. Know where it lives → walk there.
  const home = ITEM_HOMES[item];
  if (npc.location !== home) {
    return {
      frame: {
        predicate: "MOVE",
        mood: "declarative",
        roles: {
          agent: ref("ANIMATE", npc.id),
          destination: ref("LOCATION", home),
        },
      },
      apply(_w, n) {
        n.location = home;
      },
    };
  }

  // 6. We're at the right place but it's empty — declare the want.
  return {
    frame: {
      predicate: "WANT",
      mood: "declarative",
      roles: {
        wanter: ref("ANIMATE", npc.id),
        desired: ref("ITEM", item),
      },
    },
    apply() {},
  };
}

// Refill empty home items with some probability so the world doesn't
// dead-end after both NPCs hoover everything up.
export function respawnItems(world: World, chance = 0.45): void {
  for (const [item, home] of Object.entries(ITEM_HOMES) as [
    ItemId,
    LocationId,
  ][]) {
    const here = world.itemsAt[home];
    if (!here.includes(item) && Math.random() < chance) {
      here.push(item);
    }
  }
}

export function makeStartingWorld(): World {
  return {
    itemsAt: {
      FOREST: ["WATER"],
      MEADOW: ["BREAD"],
      FORGE: ["STICK"],
      CAVE: [],
    },
  };
}

// Seed two NPCs with staggered needs so something interesting happens
// in the first few ticks.
export function makeStartingNPCs(): NPC[] {
  const henu = new NPC("WOODSMAN", "Henu", "FOREST");
  const tova = new NPC("SMITH", "Tova", "FORGE");
  henu.thirst = 22;
  tova.hunger = 30;
  return [henu, tova];
}

export interface TickEntry {
  npc: NPC;
  decision: Decision;
}

// Advance the world one tick: respawn, tick needs for everyone, then
// resolve every NPC's action in turn. If `overrides` supplies a Decision
// for an NPC, that decision is used instead of the autonomous one — this
// is how player imperatives steer NPC behaviour. Each override is consumed
// (deleted from the map) once applied.
export function tickAll(
  world: World,
  npcs: NPC[],
  overrides?: Map<string, Decision>,
): TickEntry[] {
  respawnItems(world);
  for (const n of npcs) n.tickNeeds();
  const out: TickEntry[] = [];
  for (const npc of npcs) {
    const override = overrides?.get(npc.id);
    if (override) overrides!.delete(npc.id);
    const decision = override ?? decide(world, npc, npcs);
    out.push({ npc, decision });
    decision.apply(world, npc);
  }
  return out;
}

// Resolve a role filler to the NPC it refers to, given the addressee
// (the NPC the player is speaking to, used for "listener" pronouns) and
// the speaker self (always the player here, so "self" → null).
function resolveAnimate(
  filler: RoleFiller | undefined,
  addressee: NPC | null,
  npcs: NPC[],
): NPC | null {
  if (!filler) return null;
  if (isPronoun(filler)) {
    if (filler === "listener") return addressee;
    return null;
  }
  if (isEntityRef(filler) && filler.type === "ANIMATE") {
    return npcs.find((n) => n.id === filler.conceptId) ?? null;
  }
  return null;
}

function entityId(filler: RoleFiller | undefined): string | null {
  if (!filler || isPronoun(filler)) return null;
  if ("kind" in filler) return null;
  return filler.conceptId;
}

// Convert an imperative FilledFrame produced by the decoder into a
// concrete Decision for the addressee NPC. Supports MOVE, TAKE, and EAT —
// the verbs whose effects map cleanly onto the existing world model.
// Returns null if the frame can't be acted on (unknown verb, missing
// roles, or a referent that can't be resolved). Anything declarative or
// non-actionable just gets narrated; the caller decides what to do with
// the null.
export function decisionFromImperative(
  frame: FilledFrame,
  addressee: NPC,
  npcs: NPC[],
  world: World,
): Decision | null {
  if (frame.mood !== "imperative") return null;

  // The agent must resolve to the addressee — otherwise the player is
  // talking past the person they selected.
  const agent = resolveAnimate(frame.roles.agent, addressee, npcs);
  if (!agent || agent.id !== addressee.id) return null;

  switch (frame.predicate) {
    case "MOVE": {
      const destId = entityId(frame.roles.destination);
      if (!destId) return null;
      if (!ALL_LOCATIONS.includes(destId as LocationId)) return null;
      const dest = destId as LocationId;
      return {
        frame,
        apply(_w, n) {
          n.location = dest;
        },
      };
    }
    case "TAKE": {
      const itemId = entityId(frame.roles.theme);
      if (!itemId) return null;
      const item = itemId as ItemId;
      return {
        frame,
        apply(w, n) {
          const here = w.itemsAt[n.location];
          const idx = here.indexOf(item);
          if (idx >= 0) {
            here.splice(idx, 1);
            n.inventory.add(item);
          }
          // If the item isn't here, the imperative still narrates — the
          // NPC "tries" but nothing changes. This keeps the stream honest
          // about player commands that don't pan out.
        },
      };
    }
    case "EAT": {
      const itemId = entityId(frame.roles.patient);
      if (!itemId) return null;
      const item = itemId as ItemId;
      // Sanity: only consumables satisfy needs. STICK is a no-op.
      return {
        frame,
        apply(_w, n) {
          if (!n.inventory.has(item)) return;
          n.inventory.delete(item);
          if (item === SATIATES.hunger) n.hunger = Math.max(0, n.hunger - 70);
          else if (item === SATIATES.thirst) n.thirst = Math.max(0, n.thirst - 70);
          n.lastEaten = item;
        },
      };
    }
    default:
      return null;
  }
}
