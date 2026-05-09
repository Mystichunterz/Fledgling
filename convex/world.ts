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
