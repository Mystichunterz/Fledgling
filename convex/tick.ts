import { internalMutation, mutation } from "./_generated/server";
import { internal } from "./_generated/api";
import { v } from "convex/values";

const DEFAULT_TICK_INTERVAL_MS = 2000;
const DEFAULT_MINUTES_PER_TICK = 30;

export const run = internalMutation({
  args: {},
  handler: async (ctx) => {
    const world = await ctx.db.query("worldState").first();
    if (!world) return;

    const minutesPerTick = world.inGameMinutesPerTick ?? DEFAULT_MINUTES_PER_TICK;
    const nextTime = world.currentTime + minutesPerTick;
    await ctx.db.patch(world._id, { currentTime: nextTime });

    const npcs = await ctx.db.query("npcs").collect();
    const slugToId = new Map(npcs.map((n) => [n.slug, n._id]));

    for (const npc of npcs) {
      if (!npc.routineId) continue;
      const routine = await ctx.db.get(npc.routineId);
      if (!routine) continue;

      const step = pickStepForTime(routine.steps, nextTime);
      if (!step) continue;

      const stepIndex = routine.steps.indexOf(step);
      if (stepIndex === npc.routineStepIndex) continue;

      await ctx.db.patch(npc._id, {
        currentAction: step.action,
        currentLocation: step.location,
        routineStepIndex: stepIndex,
      });

      if (step.dialogueTemplateId) {
        const tmpl = await ctx.db.get(step.dialogueTemplateId);
        if (tmpl) {
          const listenerIds = (step.listenerSlugs ?? [])
            .map((s) => slugToId.get(s))
            .filter((id): id is NonNullable<typeof id> => id !== undefined);

          await ctx.db.insert("dialogueEvents", {
            speakerId: npc._id,
            listenerIds,
            procText: tmpl.procText,
            glossText: tmpl.glossText,
            wordIds: tmpl.wordIds ?? [],
            location: step.location,
            gameTime: nextTime,
            voiceLineId: tmpl.voiceLineId,
          });
        }
      }
    }

    await ctx.scheduler.runAfter(
      world.tickIntervalMs ?? DEFAULT_TICK_INTERVAL_MS,
      internal.tick.run,
      {},
    );
  },
});

export const start = mutation({
  args: { intervalMs: v.optional(v.number()) },
  handler: async (ctx, { intervalMs }) => {
    const world = await ctx.db.query("worldState").first();
    if (!world) throw new Error("worldState not seeded — run seed.bootstrap first");
    if (intervalMs) {
      await ctx.db.patch(world._id, { tickIntervalMs: intervalMs });
    }
    await ctx.scheduler.runAfter(0, internal.tick.run, {});
  },
});

function pickStepForTime<T extends { atMinute: number }>(
  steps: T[],
  minute: number,
): T | undefined {
  const dayMinute = minute % 1440;
  let best: T | undefined;
  for (const s of steps) {
    if (s.atMinute <= dayMinute && (!best || s.atMinute > best.atMinute)) {
      best = s;
    }
  }
  return best ?? steps[steps.length - 1];
}
