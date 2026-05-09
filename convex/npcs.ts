import { query, mutation } from "./_generated/server";
import { v } from "convex/values";

const SCENE = v.union(
  v.literal("beach"),
  v.literal("village"),
  v.literal("forest"),
  v.literal("hut"),
  v.literal("lighthouse"),
);

export const list = query({
  args: {},
  handler: async (ctx) => {
    return await ctx.db.query("npcs").collect();
  },
});

export const byScene = query({
  args: { scene: SCENE },
  handler: async (ctx, { scene }) => {
    return await ctx.db
      .query("npcs")
      .withIndex("by_scene", (q) => q.eq("scene", scene))
      .collect();
  },
});

export const byLocation = query({
  args: { location: SCENE },
  handler: async (ctx, { location }) => {
    return await ctx.db
      .query("npcs")
      .withIndex("by_location", (q) => q.eq("currentLocation", location))
      .collect();
  },
});

export const bySlug = query({
  args: { slug: v.string() },
  handler: async (ctx, { slug }) => {
    return await ctx.db
      .query("npcs")
      .withIndex("by_slug", (q) => q.eq("slug", slug))
      .unique();
  },
});

export const updateState = mutation({
  args: {
    id: v.id("npcs"),
    x: v.optional(v.number()),
    y: v.optional(v.number()),
    currentAction: v.optional(v.string()),
    currentLocation: v.optional(SCENE),
    routineStepIndex: v.optional(v.number()),
  },
  handler: async (ctx, { id, ...patch }) => {
    const stripped = Object.fromEntries(
      Object.entries(patch).filter(([, value]) => value !== undefined),
    );
    await ctx.db.patch(id, stripped);
  },
});

export const giveItem = mutation({
  args: { id: v.id("npcs") },
  handler: async (ctx, { id }) => {
    await ctx.db.patch(id, { itemGiven: true });
  },
});
