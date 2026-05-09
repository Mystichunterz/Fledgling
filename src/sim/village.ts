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

// One thing an NPC overheard. We keep the SAY frame whole rather than
// just the inner content because the responder needs to know who spoke
// (frame.roles.speaker) to address them back.
export interface HeardEntry {
  from: string; // speaker NPC id
  frame: FilledFrame; // the full SAY frame
}

const HEARD_CAP = 4;

export class NPC {
  inventory = new Set<ItemId>();
  hunger = 0;
  thirst = 0;
  // Last meal, briefly held so the NPC can later boast about it
  // ("I ate the bread") in past tense to a same-room companion.
  lastEaten: ItemId | null = null;
  // Things said TO this NPC by others in the same location, oldest
  // first. Each turn the NPC pops the head and may respond. Capped to
  // avoid runaway buildup if both sides go quiet.
  heard: HeardEntry[] = [];

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

// Build a SAY frame wrapping `inner`, addressed from `speaker` to
// `audience`. Used by every dialogue branch below — saves repeating the
// outer scaffold five times.
function sayTo(speaker: NPC, audience: NPC, inner: FilledFrame): FilledFrame {
  return {
    predicate: "SAY",
    mood: "declarative",
    roles: {
      speaker: ref("ANIMATE", speaker.id),
      recipient: ref("ANIMATE", audience.id),
      content: { kind: "frame", frame: inner },
    },
  };
}

// Try to produce a response to something the NPC just heard. Returns
// null when there's nothing useful to say — the caller falls through to
// normal goal-driven behaviour. Only handles a few specific shapes; the
// rest pass silently to keep the stream from drowning in chit-chat.
function tryRespond(
  _world: World,
  npc: NPC,
  audience: NPC,
  heardSay: FilledFrame,
): Decision | null {
  if (heardSay.predicate !== "SAY") return null;
  const content = heardSay.roles.content;
  if (!content || isPronoun(content) || !("kind" in content)) return null;
  const inner = content.frame;

  // 1. Heard a "where is X?" question (BE_AT with unknown ground for an
  //    item). Answer with the item's known home.
  if (
    inner.predicate === "BE_AT" &&
    inner.roles.ground === "unknown"
  ) {
    const figure = inner.roles.figure;
    if (figure && !isPronoun(figure) && isEntityRef(figure) && figure.type === "ITEM") {
      const home = ITEM_HOMES[figure.conceptId as ItemId];
      if (home) {
        const answer: FilledFrame = {
          predicate: "BE_AT",
          mood: "declarative",
          roles: {
            figure: ref("ITEM", figure.conceptId),
            ground: ref("LOCATION", home),
          },
        };
        return { frame: sayTo(npc, audience, answer), apply() {} };
      }
    }
  }

  // 2. Heard "I want X". If we're carrying X, offer it: "I have X".
  if (inner.predicate === "WANT") {
    const desired = inner.roles.desired;
    if (desired && !isPronoun(desired) && isEntityRef(desired) && desired.type === "ITEM") {
      const item = desired.conceptId as ItemId;
      if (npc.inventory.has(item)) {
        const offer: FilledFrame = {
          predicate: "HAVE",
          mood: "declarative",
          roles: {
            owner: ref("ANIMATE", npc.id),
            theme: ref("ITEM", item),
          },
        };
        return { frame: sayTo(npc, audience, offer), apply() {} };
      }
    }
  }

  // 3. Heard a past-tense boast ("I ate the bread"). Acknowledge by
  //    saying you see them — short, terminal, doesn't trigger a reply
  //    loop because tryRespond ignores SEE-acks.
  if (inner.predicate === "EAT" && inner.tense === "past") {
    const ack: FilledFrame = {
      predicate: "SEE",
      mood: "declarative",
      roles: {
        viewer: ref("ANIMATE", npc.id),
        target: ref("ANIMATE", audience.id),
      },
    };
    return { frame: sayTo(npc, audience, ack), apply() {} };
  }

  return null;
}

export function decide(world: World, npc: NPC, others: NPC[]): Decision {
  // 0. Conversation: if someone spoke to us and is still here, try to
  //    respond. Pop one heard entry per turn; whatever doesn't trigger
  //    a response silently expires.
  while (npc.heard.length > 0) {
    const entry = npc.heard.shift()!;
    const speaker = others.find((o) => o.id === entry.from);
    if (!speaker || speaker.location !== npc.location) continue; // out of earshot now
    const resp = tryRespond(world, npc, speaker, entry.frame);
    if (resp) return resp;
  }

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
    // 5a. If a companion is here, sometimes ask them out loud first
    //     ("where is bread?"). The companion's tryRespond will answer
    //     next tick. Performative — we already know — but it produces
    //     visible dialogue and exercises the wh-question machinery.
    const companion = others.find(
      (o) => o !== npc && o.location === npc.location,
    );
    if (companion && Math.random() < 0.35) {
      const question: FilledFrame = {
        predicate: "BE_AT",
        mood: "declarative",
        roles: {
          figure: ref("ITEM", item),
          ground: "unknown",
        },
      };
      return { frame: sayTo(npc, companion, question), apply() {} };
    }
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

// If `frame` is a SAY directed at a same-room NPC, push it onto that
// NPC's heard queue so they can respond on their next turn. Out-of-room
// recipients are dropped silently — out of earshot. Capped per recipient.
function routeSpeech(frame: FilledFrame, speaker: NPC, npcs: NPC[]): void {
  if (frame.predicate !== "SAY") return;
  const r = frame.roles.recipient;
  if (!r || isPronoun(r)) return;
  if (!isEntityRef(r) || r.type !== "ANIMATE") return;
  const recipient = npcs.find((n) => n.id === r.conceptId);
  if (!recipient || recipient === speaker) return;
  if (recipient.location !== speaker.location) return;
  recipient.heard.push({ from: speaker.id, frame });
  if (recipient.heard.length > HEARD_CAP) {
    recipient.heard.splice(0, recipient.heard.length - HEARD_CAP);
  }
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
    // Route AFTER apply so any state changes the SAY caused (e.g.
    // clearing lastEaten) land first. This lets the same tick produce
    // A speaks → B speaks if A was earlier in turn order.
    routeSpeech(decision.frame, npc, npcs);
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
