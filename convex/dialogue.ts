import { query, mutation } from "./_generated/server";
import { v } from "convex/values";

const SCENE = v.union(
  v.literal("beach"),
  v.literal("village"),
  v.literal("forest"),
  v.literal("hut"),
  v.literal("lighthouse"),
);

export const since = query({
  args: { gameTime: v.number() },
  handler: async (ctx, { gameTime }) => {
    return await ctx.db
      .query("dialogueEvents")
      .withIndex("by_gameTime", (q) => q.gte("gameTime", gameTime))
      .collect();
  },
});

export const bySpeaker = query({
  args: { speakerId: v.id("npcs"), limit: v.optional(v.number()) },
  handler: async (ctx, { speakerId, limit }) => {
    return await ctx.db
      .query("dialogueEvents")
      .withIndex("by_speaker", (q) => q.eq("speakerId", speakerId))
      .order("desc")
      .take(limit ?? 50);
  },
});

export const recent = query({
  args: { limit: v.optional(v.number()) },
  handler: async (ctx, { limit }) => {
    return await ctx.db
      .query("dialogueEvents")
      .withIndex("by_gameTime")
      .order("desc")
      .take(limit ?? 20);
  },
});

export const emit = mutation({
  args: {
    speakerId: v.id("npcs"),
    listenerIds: v.array(v.id("npcs")),
    procText: v.string(),
    glossText: v.string(),
    wordIds: v.array(v.string()),
    location: SCENE,
    gameTime: v.number(),
    voiceLineId: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    return await ctx.db.insert("dialogueEvents", args);
  },
});
