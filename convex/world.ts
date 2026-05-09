import { query, mutation } from "./_generated/server";
import { v } from "convex/values";

const SCENE = v.union(
  v.literal("beach"),
  v.literal("village"),
  v.literal("forest"),
  v.literal("hut"),
  v.literal("lighthouse"),
);

const ITEM = v.union(
  v.literal("wood"),
  v.literal("oil"),
  v.literal("flint"),
);

const ENDING = v.union(v.literal("leave"), v.literal("stay"));

export const get = query({
  args: {},
  handler: async (ctx) => {
    return await ctx.db.query("worldState").first();
  },
});

// Idempotent worldState seed. Created on first connect from the engine so
// world mutations (collectItem, lightBeacon, etc.) have a row to mutate
// without needing the full NPC seed:bootstrap flow first. Subsequent calls
// no-op. Defaults are demo-tier values that get overwritten by a later
// seed:bootstrap call if the team runs it.
export const ensure = mutation({
  args: {
    predecessorName: v.optional(v.string()),
    demoSeed: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db.query("worldState").first();
    if (existing) return { created: false, id: existing._id };

    const id = await ctx.db.insert("worldState", {
      currentTime: 360,
      tickIntervalMs: 2000,
      inGameMinutesPerTick: 30,
      itemsCollected: [],
      beaconLit: false,
      endingChoice: null,
      predecessorName: args.predecessorName ?? "Maren",
      demoSeed: args.demoSeed ?? "live",
      currentScene: "beach",
    });
    return { created: true, id };
  },
});

export const advanceTime = mutation({
  args: { deltaMinutes: v.number() },
  handler: async (ctx, { deltaMinutes }) => {
    const world = await ctx.db.query("worldState").first();
    if (!world) throw new Error("worldState not seeded");
    await ctx.db.patch(world._id, {
      currentTime: world.currentTime + deltaMinutes,
    });
  },
});

export const collectItem = mutation({
  args: { item: ITEM },
  handler: async (ctx, { item }) => {
    const world = await ctx.db.query("worldState").first();
    if (!world) throw new Error("worldState not seeded");
    if (world.itemsCollected.includes(item)) return;
    await ctx.db.patch(world._id, {
      itemsCollected: [...world.itemsCollected, item],
    });
  },
});

export const lightBeacon = mutation({
  args: {},
  handler: async (ctx) => {
    const world = await ctx.db.query("worldState").first();
    if (!world) throw new Error("worldState not seeded");
    await ctx.db.patch(world._id, { beaconLit: true });
  },
});

export const setEndingChoice = mutation({
  args: { choice: ENDING },
  handler: async (ctx, { choice }) => {
    const world = await ctx.db.query("worldState").first();
    if (!world) throw new Error("worldState not seeded");
    await ctx.db.patch(world._id, { endingChoice: choice });
  },
});

export const setCurrentScene = mutation({
  args: { scene: SCENE },
  handler: async (ctx, { scene }) => {
    const world = await ctx.db.query("worldState").first();
    if (!world) throw new Error("worldState not seeded");
    await ctx.db.patch(world._id, { currentScene: scene });
  },
});
