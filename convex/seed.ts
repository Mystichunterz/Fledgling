import { mutation } from "./_generated/server";
import { v } from "convex/values";

const ROLE = v.union(
  v.literal("child"),
  v.literal("elder_woman"),
  v.literal("man"),
  v.literal("chief"),
);

const SCENE = v.union(
  v.literal("beach"),
  v.literal("village"),
  v.literal("forest"),
  v.literal("hut"),
  v.literal("lighthouse"),
);

const HOLDS_ITEM = v.union(
  v.literal("wood"),
  v.literal("oil"),
  v.literal("flint"),
  v.null(),
);

const NpcInput = v.object({
  slug: v.string(),
  name: v.string(),
  role: ROLE,
  occupation: v.optional(v.string()),
  scene: SCENE,
  spriteKey: v.string(),
  spriteColor: v.optional(v.number()),
  x: v.number(),
  y: v.number(),
  holdsItem: HOLDS_ITEM,
  isClimaxNpc: v.boolean(),
  dialogueRootId: v.string(),
});

export const bootstrap = mutation({
  args: {
    roster: v.array(NpcInput),
    predecessorName: v.string(),
    demoSeed: v.string(),
    inGameMinutesPerTick: v.optional(v.number()),
    tickIntervalMs: v.optional(v.number()),
    startScene: v.optional(SCENE),
    startTime: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db.query("worldState").first();
    if (existing) return { alreadySeeded: true };

    await ctx.db.insert("worldState", {
      currentTime: args.startTime ?? 360,
      tickIntervalMs: args.tickIntervalMs ?? 2000,
      inGameMinutesPerTick: args.inGameMinutesPerTick ?? 30,
      itemsCollected: [],
      beaconLit: false,
      endingChoice: null,
      predecessorName: args.predecessorName,
      demoSeed: args.demoSeed,
      currentScene: args.startScene ?? "beach",
    });

    for (const npc of args.roster) {
      await ctx.db.insert("npcs", {
        ...npc,
        currentAction: "idle",
        currentLocation: npc.scene,
        routineStepIndex: 0,
        itemGiven: false,
      });
    }

    return { alreadySeeded: false, npcCount: args.roster.length };
  },
});

export const reset = mutation({
  args: {},
  handler: async (ctx) => {
    for (const tbl of [
      "dialogueEvents",
      "npcs",
      "routines",
      "dialogueTemplates",
      "worldState",
    ] as const) {
      const rows = await ctx.db.query(tbl).collect();
      for (const r of rows) await ctx.db.delete(r._id);
    }
  },
});
