import type { Activity, NamedLocation, ScheduleEntry, TopicId } from './types';

const at = (x: number, y: number, tag: string): NamedLocation => ({ x, y, tag });

const LOC = {
  baker_home:    at(180, 250, 'home.baker'),
  bakery_oven:   at(220, 200, 'bakery.oven'),
  bakery_stall:  at(260, 230, 'bakery.stall'),
  farmer_home:   at(380, 600, 'home.farmer'),
  farm_field:    at(340, 580, 'farm.field'),
  guard_home:    at(840, 220, 'home.guard'),
  guard_post:    at(800, 180, 'guard.post'),
  hala_home:     at(220, 440, 'home.hala'),
  shrine:        at(240, 410, 'shrine'),
  pemi_home:     at(640, 480, 'home.pemi'),
  play_area:     at(800, 380, 'play_area'),
  well:          at(640, 280, 'well'),
};

function e(start: number, end: number, location: NamedLocation, activity: Activity, topics?: TopicId[]): ScheduleEntry {
  return topics ? { startMin: start, endMin: end, location, activity, topics }
                : { startMin: start, endMin: end, location, activity };
}

export const SCHEDULES: Record<'naro' | 'lemu' | 'toka' | 'pemi' | 'hala', ScheduleEntry[]> = {
  naro: [
    e(   0,  360, LOC.baker_home,   { kind: 'sleep' }),
    e( 360,  540, LOC.bakery_oven,  { kind: 'work',   jobId: 'bake_morning_batch' }),
    e( 540,  600, LOC.well,         { kind: 'meet',   with:  'npc.lemu' }, ['weather', 'missing_net']),
    e( 600,  900, LOC.bakery_stall, { kind: 'work',   jobId: 'sell_bread' }),
    e( 900,  960, LOC.bakery_stall, { kind: 'meet',   with:  'npc.pemi' }, ['bread_recipe']),
    e( 960, 1080, LOC.bakery_stall, { kind: 'work',   jobId: 'sell_bread' }),
    e(1080, 1440, LOC.baker_home,   { kind: 'sleep' }),
  ],
  lemu: [
    e(   0,  420, LOC.farmer_home,  { kind: 'sleep' }),
    e( 420,  540, LOC.farm_field,   { kind: 'work',   jobId: 'tend_oil_press' }),
    e( 540,  600, LOC.well,         { kind: 'meet',   with:  'npc.naro' }, ['weather', 'harvest']),
    e( 600,  720, LOC.farm_field,   { kind: 'work',   jobId: 'tend_oil_press' }),
    e( 720,  780, LOC.well,         { kind: 'meet',   with:  'npc.toka' }, ['gossip_visitor']),
    e( 780, 1020, LOC.farm_field,   { kind: 'work',   jobId: 'press_oil' }),
    e(1020, 1080, LOC.farmer_home,  { kind: 'wander', radius: 16 }),
    e(1080, 1440, LOC.farmer_home,  { kind: 'sleep' }),
  ],
  toka: [
    e(   0,  360, LOC.guard_home,   { kind: 'sleep' }),
    e( 360,  720, LOC.guard_post,   { kind: 'work',   jobId: 'patrol_morning' }),
    e( 720,  780, LOC.well,         { kind: 'meet',   with:  'npc.lemu' }, ['gossip_visitor']),
    e( 780,  900, LOC.guard_post,   { kind: 'work',   jobId: 'patrol_afternoon' }),
    e( 900,  960, LOC.shrine,       { kind: 'meet',   with:  'npc.hala' }, ['lights']),
    e( 960, 1080, LOC.guard_post,   { kind: 'work',   jobId: 'patrol_evening' }),
    e(1080, 1440, LOC.guard_home,   { kind: 'sleep' }),
  ],
  pemi: [
    e(   0,  480, LOC.pemi_home,    { kind: 'sleep' }),
    e( 480,  900, LOC.play_area,    { kind: 'wander', radius: 24 }),
    e( 900,  960, LOC.bakery_stall, { kind: 'meet',   with:  'npc.naro' }, ['bread_recipe']),
    e( 960, 1080, LOC.play_area,    { kind: 'wander', radius: 24 }),
    e(1080, 1140, LOC.play_area,    { kind: 'meet',   with:  'npc.hala' }, ['festival_plans']),
    e(1140, 1440, LOC.pemi_home,    { kind: 'sleep' }),
  ],
  hala: [
    e(   0,  360, LOC.hala_home,    { kind: 'sleep' }),
    e( 360,  900, LOC.shrine,       { kind: 'work',   jobId: 'tend_shrine' }),
    e( 900,  960, LOC.shrine,       { kind: 'meet',   with:  'npc.toka' }, ['lights']),
    e( 960, 1080, LOC.shrine,       { kind: 'work',   jobId: 'tend_shrine' }),
    e(1080, 1140, LOC.play_area,    { kind: 'meet',   with:  'npc.pemi' }, ['festival_plans']),
    e(1140, 1440, LOC.hala_home,    { kind: 'sleep' }),
  ],
};
