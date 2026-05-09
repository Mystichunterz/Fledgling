import { FilledFrame, ref } from "../lang/frames.js";

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
  gloss: string;
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
        gloss: `${npc.displayName} tells ${audience.displayName} they ate the ${eaten.toLowerCase()}`,
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
        gloss: `${npc.displayName} sees ${here.displayName}`,
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
        gloss: `${npc.displayName} sees the ${it.toLowerCase()}`,
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
      gloss: `${npc.displayName} lingers at the ${npc.location.toLowerCase()}`,
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
      gloss:
        item === "WATER"
          ? `${npc.displayName} drinks the water`
          : `${npc.displayName} eats the ${item.toLowerCase()}`,
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
      gloss: `${npc.displayName} picks up the ${item.toLowerCase()}`,
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
      gloss: `${npc.displayName} walks to the ${home.toLowerCase()}`,
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
    gloss: `${npc.displayName} wants ${item.toLowerCase()}`,
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
// resolve every NPC's action in turn. Returns the per-NPC decisions
// in turn order so the caller can render them.
export function tickAll(world: World, npcs: NPC[]): TickEntry[] {
  respawnItems(world);
  for (const n of npcs) n.tickNeeds();
  const out: TickEntry[] = [];
  for (const npc of npcs) {
    const decision = decide(world, npc, npcs);
    out.push({ npc, decision });
    decision.apply(world, npc);
  }
  return out;
}
