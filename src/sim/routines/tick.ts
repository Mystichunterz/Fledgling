import { emitNextLine, startConversation } from './conversations';
import { withinChatRadius } from './earshot';
import type { ScheduleEntry, SimNpc, SimWorld, TopicId } from './types';

const ARRIVE_EPS = 2;

export function tickSim(world: SimWorld, deltaMs: number): void {
  world.msAccum += deltaMs;
  if (world.msAccum < world.msPerMin) return;
  const stepMin = world.msAccum / world.msPerMin;
  world.msAccum = 0;
  world.nowMin = (world.nowMin + stepMin) % 1440;

  for (const npc of world.npcs) advanceSchedule(npc, world.nowMin, stepMin);
  spawnConversations(world);
  advanceConversations(world);
  pruneEndedConversations(world);
}

function currentEntry(npc: SimNpc): ScheduleEntry {
  return npc.schedule[npc.scheduleIdx]!;
}

function entryActive(entry: ScheduleEntry, now: number): boolean {
  return now >= entry.startMin && now < entry.endMin;
}

function advanceSchedule(npc: SimNpc, now: number, stepMin: number): void {
  if (npc.fsm.kind === 'conversing') return;

  let entry = currentEntry(npc);
  if (!entryActive(entry, now)) {
    for (let i = 0; i < npc.schedule.length; i++) {
      const candidate = npc.schedule[i]!;
      if (entryActive(candidate, now)) {
        npc.scheduleIdx = i;
        npc.fsm = { kind: 'idle' };
        break;
      }
    }
    entry = currentEntry(npc);
  }

  const target = entry.location;
  const dx = target.x - npc.pos.x;
  const dy = target.y - npc.pos.y;
  const dist = Math.hypot(dx, dy);

  if (dist > ARRIVE_EPS) {
    if (npc.fsm.kind !== 'travelling'
        || npc.fsm.toward.x !== target.x
        || npc.fsm.toward.y !== target.y) {
      npc.fsm = { kind: 'travelling', toward: { x: target.x, y: target.y } };
    }
    const step = Math.min(npc.walkSpeed * stepMin, dist);
    npc.pos.x += (dx / dist) * step;
    npc.pos.y += (dy / dist) * step;
    return;
  }

  if (npc.fsm.kind === 'travelling' || npc.fsm.kind === 'idle') {
    switch (entry.activity.kind) {
      case 'sleep':  npc.fsm = { kind: 'sleeping' }; break;
      case 'work':   npc.fsm = { kind: 'working', jobId: entry.activity.jobId }; break;
      case 'wander': npc.fsm = { kind: 'idle' }; break;
      case 'meet':   npc.fsm = { kind: 'idle' }; break;
    }
  }
}

function spawnConversations(world: SimWorld): void {
  for (let i = 0; i < world.npcs.length; i++) {
    const a = world.npcs[i]!;
    for (let j = i + 1; j < world.npcs.length; j++) {
      const b = world.npcs[j]!;
      if (a.fsm.kind === 'conversing' || b.fsm.kind === 'conversing') continue;
      const ea = currentEntry(a);
      const eb = currentEntry(b);
      const aWantsB = ea.activity.kind === 'meet' && ea.activity.with === b.id;
      const bWantsA = eb.activity.kind === 'meet' && eb.activity.with === a.id;
      if (!aWantsB || !bWantsA) continue;
      if (!withinChatRadius(a.pos, b.pos)) continue;

      const topic: TopicId = ea.topics?.[0] ?? eb.topics?.[0] ?? 'weather';
      const convo = startConversation(
        [a, b],
        topic,
        world.nowMin,
        { x: (a.pos.x + b.pos.x) / 2, y: (a.pos.y + b.pos.y) / 2 },
        world.convoCounter++,
      );
      world.conversations.push(convo);
      a.fsm = { kind: 'conversing', conversationId: convo.id, partner: b.id };
      b.fsm = { kind: 'conversing', conversationId: convo.id, partner: a.id };
    }
  }
}

function advanceConversations(world: SimWorld): void {
  const byId = new Map(world.npcs.map(n => [n.id, n]));
  for (const convo of world.conversations) {
    if (convo.state === 'ended') continue;
    if (convo.lines.length > 0 && world.nowMin < convo.nextLineAtMin) continue;
    const a = byId.get(convo.participants[0]);
    const b = byId.get(convo.participants[1]);
    if (!a || !b) continue;
    emitNextLine(convo, [a, b], world.nowMin);
    if ((convo.state as string) === 'ended') {
      a.fsm = { kind: 'idle' };
      b.fsm = { kind: 'idle' };
    }
  }
}

function pruneEndedConversations(world: SimWorld): void {
  const cutoff = world.nowMin - 60;
  world.conversations = world.conversations.filter(c => {
    if (c.state !== 'ended') return true;
    const last = c.lines[c.lines.length - 1]?.emittedAtMin ?? c.startedAtMin;
    return last >= cutoff;
  });
}
