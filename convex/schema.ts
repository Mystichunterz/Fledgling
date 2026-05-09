import { defineSchema, defineTable } from "convex/server";
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

const ITEM = v.union(
  v.literal("wood"),
  v.literal("oil"),
  v.literal("flint"),
);

const HOLDS_ITEM = v.union(ITEM, v.null());

const ENDING = v.union(v.literal("leave"), v.literal("stay"), v.null());

export default defineSchema(
  {
    npcs: defineTable({
      slug: v.string(),
      name: v.string(),
      role: ROLE,
      occupation: v.optional(v.string()),
      scene: SCENE,
      spriteKey: v.string(),
      spriteColor: v.optional(v.number()),
      x: v.number(),
      y: v.number(),
      currentAction: v.string(),
      currentLocation: SCENE,
      routineId: v.optional(v.id("routines")),
      routineStepIndex: v.number(),
      holdsItem: HOLDS_ITEM,
      itemGiven: v.boolean(),
      isClimaxNpc: v.boolean(),
      dialogueRootId: v.string(),
    })
      .index("by_slug", ["slug"])
      .index("by_routine", ["routineId"])
      .index("by_location", ["currentLocation"])
      .index("by_scene", ["scene"]),

    routines: defineTable({
      label: v.string(),
      steps: v.array(
        v.object({
          atMinute: v.number(),
          action: v.string(),
          location: SCENE,
          dialogueTemplateId: v.optional(v.id("dialogueTemplates")),
          listenerSlugs: v.optional(v.array(v.string())),
        }),
      ),
    }),

    dialogueTemplates: defineTable({
      procText: v.string(),
      glossText: v.string(),
      wordIds: v.optional(v.array(v.string())),
      voiceLineId: v.optional(v.string()),
      weight: v.number(),
      tags: v.array(v.string()),
    }).index("by_tag", ["tags"]),

    dialogueEvents: defineTable({
      speakerId: v.id("npcs"),
      listenerIds: v.array(v.id("npcs")),
      procText: v.string(),
      glossText: v.string(),
      wordIds: v.array(v.string()),
      location: SCENE,
      gameTime: v.number(),
      voiceLineId: v.optional(v.string()),
    })
      .index("by_gameTime", ["gameTime"])
      .index("by_speaker", ["speakerId"])
      .index("by_location", ["location"]),

    worldState: defineTable({
      currentTime: v.number(),
      tickIntervalMs: v.number(),
      inGameMinutesPerTick: v.number(),
      itemsCollected: v.array(ITEM),
      beaconLit: v.boolean(),
      endingChoice: ENDING,
      predecessorName: v.string(),
      demoSeed: v.string(),
      currentScene: SCENE,
    }),
  },
  { schemaValidation: false },
);
