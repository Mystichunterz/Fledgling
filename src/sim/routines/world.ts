import type { ScheduleEntry, SimNpc, SimWorld, Vec2 } from './types';
import { SCHEDULES } from './schedules';

interface NpcDef {
  id: string;
  name: string;
  color: number;
  schedule: ScheduleEntry[];
  walkSpeed: number;  // px per in-game minute
}

export const SIM_NPCS: NpcDef[] = [
  { id: 'npc.naro', name: 'Naro', color: 0xe5a07a, schedule: SCHEDULES.naro, walkSpeed: 4 },
  { id: 'npc.lemu', name: 'Lemu', color: 0xc4d76a, schedule: SCHEDULES.lemu, walkSpeed: 4 },
  { id: 'npc.toka', name: 'Toka', color: 0x9aa3c7, schedule: SCHEDULES.toka, walkSpeed: 5 },
  { id: 'npc.pemi', name: 'Pemi', color: 0xf5d97a, schedule: SCHEDULES.pemi, walkSpeed: 6 },
  { id: 'npc.hala', name: 'Hala', color: 0xb893d4, schedule: SCHEDULES.hala, walkSpeed: 3 },
];

export interface CreateSimWorldOpts {
  msPerMin: number;
  startMin?: number;
  playerStart?: Vec2;
}

export function createSimWorld(opts: CreateSimWorldOpts): SimWorld {
  const npcs: SimNpc[] = SIM_NPCS.map(def => {
    const first = def.schedule[0]!;
    return {
      id: def.id,
      name: def.name,
      color: def.color,
      pos: { x: first.location.x, y: first.location.y },
      schedule: def.schedule,
      scheduleIdx: 0,
      fsm: { kind: 'idle' },
      walkSpeed: def.walkSpeed,
    };
  });
  return {
    npcs,
    conversations: [],
    player: { pos: opts.playerStart ?? { x: 640, y: 360 } },
    nowMin: opts.startMin ?? 360,
    msPerMin: opts.msPerMin,
    msAccum: 0,
    convoCounter: 0,
  };
}
