export type Minute = number;
export type SimNpcId = string;
export type LocationTag = string;
export type TopicId = string;

export interface Vec2 { x: number; y: number; }
export interface NamedLocation { x: number; y: number; tag: LocationTag; }

export type Activity =
  | { kind: 'sleep' }
  | { kind: 'work'; jobId: string }
  | { kind: 'wander'; radius: number }
  | { kind: 'meet'; with: SimNpcId };

export interface ScheduleEntry {
  startMin: Minute;
  endMin: Minute;
  location: NamedLocation;
  activity: Activity;
  topics?: TopicId[];
}

export type FsmState =
  | { kind: 'travelling'; toward: Vec2 }
  | { kind: 'working'; jobId: string }
  | { kind: 'conversing'; conversationId: string; partner: SimNpcId }
  | { kind: 'sleeping' }
  | { kind: 'idle' };

export interface SimNpc {
  id: SimNpcId;
  name: string;
  color: number;
  pos: Vec2;
  schedule: ScheduleEntry[];
  scheduleIdx: number;
  fsm: FsmState;
  walkSpeed: number;
}

export interface ConversationLine {
  speaker: SimNpcId;
  textProcedural: string;
  textGloss: string;
  emittedAtMin: Minute;
}

export interface Conversation {
  id: string;
  participants: [SimNpcId, SimNpcId];
  topicId: TopicId;
  position: Vec2;
  lines: ConversationLine[];
  startedAtMin: Minute;
  state: 'opening' | 'middle' | 'closing' | 'ended';
  nextLineAtMin: Minute;
}

export interface SimWorld {
  npcs: SimNpc[];
  conversations: Conversation[];
  player: { pos: Vec2 };
  nowMin: Minute;
  msPerMin: number;
  msAccum: number;
  convoCounter: number;
}
