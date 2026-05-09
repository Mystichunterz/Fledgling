import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

const SCENE = v.union(
  v.literal("beach"),
  v.literal("village"),
  v.literal("forest"),
  v.literal("hut"),
  v.literal("lighthouse"),
);

export const log = mutation({
  args: {
    speakerSlug: v.string(),
    speakerName: v.string(),
    line: v.string(),
    nodeId: v.string(),
    scene: SCENE,
  },
  handler: async (ctx, args) => {
    return await ctx.db.insert("dialogueLog", args);
  },
});

export const recent = query({
  args: { limit: v.optional(v.number()) },
  handler: async (ctx, { limit }) => {
    return await ctx.db
      .query("dialogueLog")
      .order("desc")
      .take(limit ?? 20);
  },
});
