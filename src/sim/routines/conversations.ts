import type { Conversation, ConversationLine, Minute, SimNpc, SimNpcId, TopicId, Vec2 } from './types';

export const LINE_INTERVAL_MIN = 30;
export const LINES_PER_CONVO = 4;

const TOPIC_GLOSS: Record<string, string> = {
  weather:         'sky',
  missing_net:     'net',
  gossip_visitor:  'stranger',
  bread_recipe:    'bread',
  harvest:         'crop',
  lights:          'lights',
  festival_plans:  'feast',
};

interface LineTemplate {
  speakerIdx: 0 | 1;
  procPattern: string;   // {topic} placeholder
  glossPattern: string;  // {topic} and {listener} placeholders
}

const TEMPLATE: LineTemplate[] = [
  { speakerIdx: 0, procPattern: 'tana {listener}.',   glossPattern: 'hello {listener}.' },
  { speakerIdx: 1, procPattern: '{topic} aru ke?',    glossPattern: '{topic} good?' },
  { speakerIdx: 0, procPattern: '{topic} no mira.',   glossPattern: '{topic} not here.' },
  { speakerIdx: 1, procPattern: 'keto.',              glossPattern: 'bye.' },
];

const CONS = ['m','n','p','t','k','s','l','r','h','w'];
const VOWS = ['a','e','i','o','u'];

function mulberry32(seed: number): () => number {
  let s = seed >>> 0;
  return () => {
    s = (s + 0x6D2B79F5) >>> 0;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function syllable(rng: () => number): string {
  return CONS[Math.floor(rng() * CONS.length)]! + VOWS[Math.floor(rng() * VOWS.length)]!;
}

function word(rng: () => number, n: number): string {
  let w = '';
  for (let i = 0; i < n; i++) w += syllable(rng);
  return w;
}

function topicSeed(topicId: TopicId): number {
  let h = 2166136261;
  for (let i = 0; i < topicId.length; i++) {
    h ^= topicId.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

function topicWordFor(topicId: TopicId): string {
  return word(mulberry32(topicSeed(topicId)), 2);
}

export function startConversation(
  participants: [SimNpc, SimNpc],
  topicId: TopicId,
  startedAtMin: Minute,
  position: Vec2,
  convoCounter: number,
): Conversation {
  return {
    id: `convo.${convoCounter}`,
    participants: [participants[0].id, participants[1].id],
    topicId,
    position,
    lines: [],
    startedAtMin,
    state: 'opening',
    nextLineAtMin: startedAtMin,
  };
}

export function emitNextLine(
  convo: Conversation,
  participants: [SimNpc, SimNpc],
  nowMin: Minute,
): ConversationLine | null {
  const idx = convo.lines.length;
  if (idx >= LINES_PER_CONVO) return null;
  const tmpl = TEMPLATE[idx]!;
  const speakerNpc = participants[tmpl.speakerIdx];
  const listenerNpc = participants[(1 - tmpl.speakerIdx) as 0 | 1];
  const tword = topicWordFor(convo.topicId);
  const tgloss = TOPIC_GLOSS[convo.topicId] ?? convo.topicId;
  const proc = tmpl.procPattern
    .replace('{topic}', tword)
    .replace('{listener}', listenerNpc.name.toLowerCase());
  const gloss = tmpl.glossPattern
    .replace('{topic}', tgloss)
    .replace('{listener}', listenerNpc.name);
  const line: ConversationLine = {
    speaker: speakerNpc.id,
    textProcedural: proc,
    textGloss: gloss,
    emittedAtMin: nowMin,
  };
  convo.lines.push(line);
  convo.nextLineAtMin = nowMin + LINE_INTERVAL_MIN;
  if (convo.lines.length >= LINES_PER_CONVO) convo.state = 'ended';
  else if (convo.lines.length === LINES_PER_CONVO - 1) convo.state = 'closing';
  else convo.state = 'middle';
  return line;
}
