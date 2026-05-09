import type { DialogueTree, NpcId } from './dialogueTypes';

// Authored by Zuikaku (T41) — see research/story-dialogue-trees.md.
// Phase A nodes (NPC_INITIAL) are the dialogueRootIds in npcRoster.ts.
// Phase B/C/D nodes are reachable from Phase A choices for now; once Convex
// state lands (T29), an engine-side phase resolver will pick the right
// entry node based on has_visited_hut / holds_item_* / beacon_lit flags.

const naro: DialogueTree = {
  NAR_INITIAL: {
    id: 'NAR_INITIAL', speaker: 'npc.naro',
    line: { en: '[she sets down a tray of small loaves; flour on her apron] Oh — one of you again.' },
    choices: [
      { id: 'q',     text: { en: '"...?"' },                next: 'NAR_AGAIN' },
      { id: 'wave',  text: { en: '[Wave]' },                next: 'NAR_WAVE' },
      { id: 'point', text: { en: '[Point to the loaves]' }, next: 'NAR_BREAD' },
      { id: 'leave', text: { en: '[Leave]' },               next: null },
    ],
  },
  NAR_AGAIN: {
    id: 'NAR_AGAIN', speaker: 'npc.naro',
    line: { en: "[softer] It's nothing. The sea brings who it brings. Are you hungry? [she offers a small loaf]" },
    choices: [
      { id: 'take',    text: { en: '[Take the bread, eat]' }, next: 'NAR_GIFT_BREAD' },
      { id: 'decline', text: { en: '[Decline politely]' },    next: 'NAR_DECLINE' },
      { id: 'leave',   text: { en: '[Leave]' },               next: null },
    ],
  },
  NAR_WAVE: {
    id: 'NAR_WAVE', speaker: 'npc.naro',
    line: { en: "[she waves back, smiling] You don't talk much yet. That's all right." },
    choices: [
      { id: 'continue', text: { en: '...' }, next: 'NAR_AGAIN' },
    ],
  },
  NAR_BREAD: {
    id: 'NAR_BREAD', speaker: 'npc.naro',
    line: { en: '[laughs] Yes, bread. Take one. We always have extra.' },
    choices: [
      { id: 'continue', text: { en: '...' }, next: 'NAR_GIFT_BREAD' },
    ],
  },
  NAR_GIFT_BREAD: {
    id: 'NAR_GIFT_BREAD', speaker: 'npc.naro',
    line: { en: "[watches you eat] Mm. Maren — that one — they liked the salted ones. You'll find their hut on the cliff path, west. I think it's still standing. [she returns to kneading]" },
    choices: [
      { id: 'leave', text: { en: '[Take your leave]' }, next: null },
    ],
  },
  NAR_DECLINE: {
    id: 'NAR_DECLINE', speaker: 'npc.naro',
    line: { en: 'All right. The offer stands. [she points west with her chin] Walk that way some time.' },
    choices: [
      { id: 'leave', text: { en: '[Take your leave]' }, next: null },
    ],
  },
  NAR_RETURN: {
    id: 'NAR_RETURN', speaker: 'npc.naro',
    line: { en: "[she's stacking firewood next to the oven; pauses when she sees you] You found Maren's place, then. Your face says you did." },
    choices: [
      { id: 'wood',  text: { en: '"I need to light a beacon. Can you spare some wood?"' }, next: 'NAR_ASK_WOOD' },
      { id: 'maren', text: { en: '"Tell me about Maren."' },                              next: 'NAR_ABOUT_MAREN' },
      { id: 'stay',  text: { en: '"Did Maren leave or stay?"' },                          next: 'NAR_LEAVE_OR_STAY' },
      { id: 'leave', text: { en: '[Leave]' },                                              next: null },
    ],
  },
  NAR_ASK_WOOD: {
    id: 'NAR_ASK_WOOD', speaker: 'npc.naro',
    line: { en: '[she looks at the stack, then at you, and nods slowly] For the headland fire? Of course. Maren took some too, in the end. [she pulls a bundle of seasoned logs and places it in your arms]' },
    choices: [
      { id: 'continue', text: { en: '...' }, next: 'NAR_HANDOVER_WOOD' },
    ],
  },
  NAR_HANDOVER_WOOD: {
    id: 'NAR_HANDOVER_WOOD', speaker: 'npc.naro',
    line: { en: '"Mind your steps. The path bends near the bramble." [she pats your shoulder]' },
    choices: [
      { id: 'continue', text: { en: '...' }, next: 'NAR_POST_ITEM' },
    ],
  },
  NAR_ABOUT_MAREN: {
    id: 'NAR_ABOUT_MAREN', speaker: 'npc.naro',
    line: { en: '"They were quieter than you. Sat at this counter for a year before they could ask for bread without pointing. We sang to teach them words — daft songs, mostly about the weather." [she smiles]' },
    choices: [
      { id: 'continue', text: { en: '...' }, next: 'NAR_RETURN' },
    ],
  },
  NAR_LEAVE_OR_STAY: {
    id: 'NAR_LEAVE_OR_STAY', speaker: 'npc.naro',
    line: { en: "[her smile dims] Hala was the one they told. Go ask her, by the shrine on the headland path. I'll have wood ready when you come back." },
    choices: [
      { id: 'continue', text: { en: '...' }, next: 'NAR_RETURN' },
    ],
  },
  NAR_POST_ITEM: {
    id: 'NAR_POST_ITEM', speaker: 'npc.naro',
    line: { en: "[she's dusting flour from her hands] The farmer has oil pressed for the lamps. The guard keeps a striker. Go in any order — they'll know what you mean. [she nods toward the south path]" },
    choices: [
      { id: 'leave', text: { en: '[Take your leave]' }, next: null },
    ],
  },
};

const lemu: DialogueTree = {
  LEM_INITIAL: {
    id: 'LEM_INITIAL', speaker: 'npc.lemu',
    line: { en: "[she's leaning on a stone press, watching the sea] Plane brought you. Loud thing." },
    choices: [
      { id: 'saw',   text: { en: '"You saw it?"' },                  next: 'LEM_SAW_PLANE' },
      { id: 'mime',  text: { en: '[Mime "yes, my plane"]' },         next: 'LEM_SAW_PLANE' },
      { id: 'sea',   text: { en: '[Look toward the sea with her]' }, next: 'LEM_SEA' },
      { id: 'leave', text: { en: '[Leave]' },                         next: null },
    ],
  },
  LEM_SAW_PLANE: {
    id: 'LEM_SAW_PLANE', speaker: 'npc.lemu',
    line: { en: '"Heard it. Like the last one — twenty winters. I knew before I looked." [she resumes turning a wheel on the press]' },
    choices: [
      { id: 'continue', text: { en: '...' }, next: 'LEM_OFFER' },
    ],
  },
  LEM_SEA: {
    id: 'LEM_SEA', speaker: 'npc.lemu',
    line: { en: '[after a long beat] "Boats come every two months. The next one will see your fire if you light it." [she taps the press] "Oil\'s for fire."' },
    choices: [
      { id: 'continue', text: { en: '...' }, next: 'LEM_OFFER' },
    ],
  },
  LEM_OFFER: {
    id: 'LEM_OFFER', speaker: 'npc.lemu',
    line: { en: '"Walk west when you\'re ready. There\'s a hut. The other one left their book there — pages and all. Read it before you ask me anything."' },
    choices: [
      { id: 'leave', text: { en: '[Take your leave]' }, next: null },
    ],
  },
  LEM_RETURN: {
    id: 'LEM_RETURN', speaker: 'npc.lemu',
    line: { en: '[she sets down the press handle] "So you read it. Then you know what to ask."' },
    choices: [
      { id: 'oil',   text: { en: '"I need oil for the beacon."' },         next: 'LEM_ASK_OIL' },
      { id: 'press', text: { en: '"Did Maren press oil with you?"' },      next: 'LEM_MAREN_PRESS' },
      { id: 'end',   text: { en: '"What was Maren like, near the end?"' }, next: 'LEM_MAREN_END' },
      { id: 'leave', text: { en: '[Leave]' },                              next: null },
    ],
  },
  LEM_ASK_OIL: {
    id: 'LEM_ASK_OIL', speaker: 'npc.lemu',
    line: { en: "[unstoppers a clay flask and fills it from the press's spout] \"Three measures. Enough to start any fire and keep it through a wet wind.\" [she stoppers it and offers it across the press]" },
    choices: [
      { id: 'continue', text: { en: '...' }, next: 'LEM_HANDOVER_OIL' },
    ],
  },
  LEM_HANDOVER_OIL: {
    id: 'LEM_HANDOVER_OIL', speaker: 'npc.lemu',
    line: { en: '"Don\'t drop it. The cliff\'s slick after the morning fog."' },
    choices: [
      { id: 'continue', text: { en: '...' }, next: 'LEM_POST_ITEM' },
    ],
  },
  LEM_MAREN_PRESS: {
    id: 'LEM_MAREN_PRESS', speaker: 'npc.lemu',
    line: { en: '"Every press-day for years. They had a hand for the wheel. Could keep the rhythm without watching, which is rare." [half-smile]' },
    choices: [
      { id: 'continue', text: { en: '...' }, next: 'LEM_RETURN' },
    ],
  },
  LEM_MAREN_END: {
    id: 'LEM_MAREN_END', speaker: 'npc.lemu',
    line: { en: '[her face closes] "Hala will tell you. I held them at the press for the goodbye, but the words belong to her."' },
    choices: [
      { id: 'continue', text: { en: '...' }, next: 'LEM_RETURN' },
    ],
  },
  LEM_POST_ITEM: {
    id: 'LEM_POST_ITEM', speaker: 'npc.lemu',
    line: { en: '"If you\'re missing flint, Toka has one on his belt. He\'ll fuss before he hands it over. He always does."' },
    choices: [
      { id: 'leave', text: { en: '[Take your leave]' }, next: null },
    ],
  },
};

const toka: DialogueTree = {
  TOK_INITIAL: {
    id: 'TOK_INITIAL', speaker: 'npc.toka',
    line: { en: '[rests a hand on the staff propped beside him; doesn\'t stand] "Stop there. Hands open."' },
    choices: [
      { id: 'hands', text: { en: '[Show empty hands]' }, next: 'TOK_HANDS_OPEN' },
      { id: 'mime',  text: { en: '[Mime "I crashed"]' }, next: 'TOK_CRASHED' },
      { id: 'leave', text: { en: '[Leave]' },             next: null },
    ],
  },
  TOK_HANDS_OPEN: {
    id: 'TOK_HANDS_OPEN', speaker: 'npc.toka',
    line: { en: '[grunts, half-satisfied] "All right. You\'re the new wreck. Stay out of my way until I see what you are." [he taps the striker on his belt — a small dark stone]' },
    choices: [
      { id: 'continue', text: { en: '...' }, next: 'TOK_HINT' },
    ],
  },
  TOK_CRASHED: {
    id: 'TOK_CRASHED', speaker: 'npc.toka',
    line: { en: '[eyes you, then nods once] "Like the last one. Walk west, find their hut. Read what they wrote. Then come back and we can talk."' },
    choices: [
      { id: 'leave', text: { en: '[Take your leave]' }, next: null },
    ],
  },
  TOK_HINT: {
    id: 'TOK_HINT', speaker: 'npc.toka',
    line: { en: '"There\'s a hut west. Belonged to Maren. They left a book in their own hand. Look at it before you ask me anything useful."' },
    choices: [
      { id: 'leave', text: { en: '[Take your leave]' }, next: null },
    ],
  },
  TOK_RETURN: {
    id: 'TOK_RETURN', speaker: 'npc.toka',
    line: { en: '[stands; brushes dust from his trousers] "Right. So you\'re going through with it."' },
    choices: [
      { id: 'flint', text: { en: '"I need a flint."' },                next: 'TOK_ASK_FLINT' },
      { id: 'maren', text: { en: '"Did Maren ask you for one too?"' }, next: 'TOK_MAREN_FLINT' },
      { id: 'why',   text: { en: '"Why do you say it like that?"' },   next: 'TOK_WHY_LIKE_THAT' },
      { id: 'leave', text: { en: '[Leave]' },                          next: null },
    ],
  },
  TOK_ASK_FLINT: {
    id: 'TOK_ASK_FLINT', speaker: 'npc.toka',
    line: { en: '[unties the striker from his belt, weighs it in his palm, then closes your hand around it] "Don\'t lose it. It\'s the second-oldest thing on this island after Hala." [half-grin]' },
    choices: [
      { id: 'continue', text: { en: '...' }, next: 'TOK_HANDOVER_FLINT' },
    ],
  },
  TOK_HANDOVER_FLINT: {
    id: 'TOK_HANDOVER_FLINT', speaker: 'npc.toka',
    line: { en: '"Strike sharp, not hard. The wind on the headland will do half the work."' },
    choices: [
      { id: 'continue', text: { en: '...' }, next: 'TOK_POST_ITEM' },
    ],
  },
  TOK_MAREN_FLINT: {
    id: 'TOK_MAREN_FLINT', speaker: 'npc.toka',
    line: { en: '"They asked me three times before I gave it. Each time more politely. The third was almost a song." [quiet laugh]' },
    choices: [
      { id: 'continue', text: { en: '...' }, next: 'TOK_RETURN' },
    ],
  },
  TOK_WHY_LIKE_THAT: {
    id: 'TOK_WHY_LIKE_THAT', speaker: 'npc.toka',
    line: { en: '[looks past you, toward the headland] "Because Hala will not have another easy week, that\'s why. Light it anyway. We owed Maren their leaving and we owe you yours."' },
    choices: [
      { id: 'continue', text: { en: '...' }, next: 'TOK_RETURN' },
    ],
  },
  TOK_POST_ITEM: {
    id: 'TOK_POST_ITEM', speaker: 'npc.toka',
    line: { en: '"Headland\'s south. The path forks at the shrine — Hala will be there, she\'s always there. Walk past her if she lets you. She probably won\'t."' },
    choices: [
      { id: 'leave', text: { en: '[Take your leave]' }, next: null },
    ],
  },
};

const pemi: DialogueTree = {
  PEM_INITIAL: {
    id: 'PEM_INITIAL', speaker: 'npc.pemi',
    line: { en: '[skips up, holds out a small smooth pebble] "For you! Maren gave me a stone like this once."' },
    choices: [
      { id: 'take',  text: { en: '[Take the pebble]' }, next: 'PEM_PEBBLE' },
      { id: 'who',   text: { en: '"Who\'s Maren?"' },   next: 'PEM_WHO_MAREN' },
      { id: 'leave', text: { en: '[Leave]' },           next: null },
    ],
  },
  PEM_PEBBLE: {
    id: 'PEM_PEBBLE', speaker: 'npc.pemi',
    line: { en: '[beams, pockets hands] "Now you have a stone. Maren had a book. It\'s still in their house on the cliff. I\'ve seen it."' },
    choices: [
      { id: 'leave', text: { en: '[Take your leave]' }, next: null },
    ],
  },
  PEM_WHO_MAREN: {
    id: 'PEM_WHO_MAREN', speaker: 'npc.pemi',
    line: { en: '"Before. The other one. They went home on a boat. Hala says they sent us a letter. We read it on the same day every year." [twirls]' },
    choices: [
      { id: 'continue', text: { en: '...' }, next: 'PEM_PEBBLE' },
    ],
  },
  PEM_RETURN: {
    id: 'PEM_RETURN', speaker: 'npc.pemi',
    line: { en: '[falls into step beside you] "Did you read it? The book?"' },
    choices: [
      { id: 'yes',   text: { en: '"Yes."' },                       next: 'PEM_KNEW_IT' },
      { id: 'some',  text: { en: '"Some of it."' },                next: 'PEM_SOME' },
      { id: 'with',  text: { en: '"Will you read it with me?"' },  next: 'PEM_WITH_ME' },
      { id: 'leave', text: { en: '[Leave]' },                       next: null },
    ],
  },
  PEM_KNEW_IT: {
    id: 'PEM_KNEW_IT', speaker: 'npc.pemi',
    line: { en: '"I knew you would. Hala says the sea brings people who are meant to find the book." [skips ahead, then back]' },
    choices: [
      { id: 'continue', text: { en: '...' }, next: 'PEM_RETURN' },
    ],
  },
  PEM_SOME: {
    id: 'PEM_SOME', speaker: 'npc.pemi',
    line: { en: '"That\'s already more than the bird who lives in there reads." [grin]' },
    choices: [
      { id: 'continue', text: { en: '...' }, next: 'PEM_RETURN' },
    ],
  },
  PEM_WITH_ME: {
    id: 'PEM_WITH_ME', speaker: 'npc.pemi',
    line: { en: '[suddenly serious] "I can\'t read all the words. I\'m only seven winters." [tugs your sleeve] "But you can ask Hala. She knew them best."' },
    choices: [
      { id: 'continue', text: { en: '...' }, next: 'PEM_RETURN' },
    ],
  },
};

const hala: DialogueTree = {
  HAL_INITIAL: {
    id: 'HAL_INITIAL', speaker: 'npc.hala',
    line: { en: '[seated by the shrine, eyes closed, lips moving without sound; opens her eyes when you stop] "Not yet."' },
    choices: [
      { id: 'what',  text: { en: '"Not yet what?"' }, next: 'HAL_NOT_YET' },
      { id: 'bow',   text: { en: '[Bow and leave]' }, next: null },
      { id: 'leave', text: { en: '[Leave]' },         next: null },
    ],
  },
  HAL_NOT_YET: {
    id: 'HAL_NOT_YET', speaker: 'npc.hala',
    line: { en: '"Not yet your turn to talk to me. Walk west first. Read what was left for you. Then ask the three for what you need." [closes her eyes again]' },
    choices: [
      { id: 'leave', text: { en: '[Take your leave]' }, next: null },
    ],
  },
  HAL_POST_HUT: {
    id: 'HAL_POST_HUT', speaker: 'npc.hala',
    line: { en: '[without opening her eyes] "You read it. Now go. Bring fire to the headland. Then I will speak."' },
    choices: [
      { id: 'leave', text: { en: '[Take your leave]' }, next: null },
    ],
  },
  HAL_SOME_ITEMS: {
    id: 'HAL_SOME_ITEMS', speaker: 'npc.hala',
    line: { en: '[slight smile, eyes still closed] "Almost. Bring me a lit fire, not three things in your arms."' },
    choices: [
      { id: 'leave', text: { en: '[Take your leave]' }, next: null },
    ],
  },
  HAL_BEACON_OPEN: {
    id: 'HAL_BEACON_OPEN', speaker: 'npc.hala',
    line: { en: '[stands at the edge of the firelight; the beacon throws long shadows on the cliff] "There. The same fire. The same air. Twenty winters and the same wind."' },
    choices: [
      { id: 'knew',   text: { en: '"You knew Maren."' },         next: 'HAL_KNEW_MAREN' },
      { id: 'home',   text: { en: '"Did Maren make it home?"' }, next: 'HAL_DID_MAREN' },
      { id: 'crying', text: { en: '"Why are you crying?"' },     next: 'HAL_WHY_CRYING' },
      { id: 'wait',   text: { en: '[silent, wait]' },            next: 'HAL_WAIT' },
    ],
  },
  HAL_KNEW_MAREN: {
    id: 'HAL_KNEW_MAREN', speaker: 'npc.hala',
    line: { en: '"Knew. We sat together every dusk for nineteen years. They learned our words. I never learned theirs — not really. We didn\'t need to." [she meets your eyes for the first time]' },
    choices: [
      { id: 'end',    text: { en: '"Tell me what happened at the end."' }, next: 'HAL_END_STORY' },
      { id: 'letter', text: { en: '"Do you still hear from them?"' },      next: 'HAL_LETTER' },
      { id: 'love',   text: { en: '"Were you in love?"' },                 next: 'HAL_LOVE' },
    ],
  },
  HAL_DID_MAREN: {
    id: 'HAL_DID_MAREN', speaker: 'npc.hala',
    line: { en: '"Yes. The boat saw the fire that night. They went up the rope ladder and turned once at the top to look back. And then the ship went on." [beat] "A year later, the wind brought a folded paper in a fishing net."' },
    choices: [
      { id: 'continue', text: { en: '...' }, next: 'HAL_LETTER' },
    ],
  },
  HAL_WHY_CRYING: {
    id: 'HAL_WHY_CRYING', speaker: 'npc.hala',
    line: { en: '"Because the fire reminds me. Because you remind me. Because I always thought there\'d only be one." [she touches the shrine\'s worn wood]' },
    choices: [
      { id: 'continue', text: { en: '...' }, next: 'HAL_BEACON_OPEN' },
    ],
  },
  HAL_WAIT: {
    id: 'HAL_WAIT', speaker: 'npc.hala',
    line: { en: '[after a long quiet] "It\'s all right. There\'s no rush now. The boat that comes for you won\'t come until first light."' },
    choices: [
      { id: 'continue', text: { en: '...' }, next: 'HAL_BEACON_OPEN' },
    ],
  },
  HAL_END_STORY: {
    id: 'HAL_END_STORY', speaker: 'npc.hala',
    line: { en: '"They woke one morning and said it\'s time, isn\'t it. I said yes, because it was. We lit the beacon at this same headland. The boat came at dawn. They left me a smooth river-stone and a name they\'d written down — yours and mine on the same page — and they went."' },
    choices: [
      { id: 'right', text: { en: '"Was it the right choice?"' },              next: 'HAL_RIGHT_CHOICE' },
      { id: 'stay',  text: { en: '"Did they want to stay?"' },                next: 'HAL_WANTED_STAY' },
      { id: 'q',     text: { en: '"I think I have to ask the same question."' }, next: 'HAL_QUESTION' },
    ],
  },
  HAL_LETTER: {
    id: 'HAL_LETTER', speaker: 'npc.hala',
    line: { en: '"Six lines. They had taught their family our words. They said the bread on their side of the world was the wrong shape. They said the sea was louder there." [small laugh] "We read it once a year. The whole village."' },
    choices: [
      { id: 'continue', text: { en: '...' }, next: 'HAL_END_STORY' },
    ],
  },
  HAL_LOVE: {
    id: 'HAL_LOVE', speaker: 'npc.hala',
    line: { en: '[long beat; she is honest] "I don\'t know what your word for it is. I don\'t even know if I have one in mine. We were each other\'s. That is what I have."' },
    choices: [
      { id: 'continue', text: { en: '...' }, next: 'HAL_END_STORY' },
    ],
  },
  HAL_RIGHT_CHOICE: {
    id: 'HAL_RIGHT_CHOICE', speaker: 'npc.hala',
    line: { en: '"It was the choice they could live with. Both choices are real. Neither is better. The wrong one is the one you can\'t believe in."' },
    choices: [
      { id: 'continue', text: { en: '...' }, next: 'HAL_QUESTION' },
    ],
  },
  HAL_WANTED_STAY: {
    id: 'HAL_WANTED_STAY', speaker: 'npc.hala',
    line: { en: '[tilts her head] "Some days. So did I, want them to. They went anyway. They were right to."' },
    choices: [
      { id: 'continue', text: { en: '...' }, next: 'HAL_QUESTION' },
    ],
  },
  HAL_QUESTION: {
    id: 'HAL_QUESTION', speaker: 'npc.hala',
    line: { en: '[she takes both your hands] "So I ask you, the way I asked them. The boat is coming at first light. Will you go on it, or will you stay?"' },
    choices: [
      { id: 'go',     text: { en: '"I\'ll go."' },         next: 'END_LEAVE' },
      { id: 'stay',   text: { en: '"I\'ll stay."' },       next: 'END_STAY' },
      { id: 'moment', text: { en: '"I need a moment."' },  next: 'HAL_MOMENT' },
    ],
  },
  HAL_MOMENT: {
    id: 'HAL_MOMENT', speaker: 'npc.hala',
    line: { en: '[nods] "Take it. The fire will keep."' },
    choices: [
      { id: 'continue', text: { en: '...' }, next: 'HAL_QUESTION' },
    ],
  },
  END_LEAVE: {
    id: 'END_LEAVE', speaker: 'npc.hala',
    line: { en: '[she lets go of your hands and steps back] "Then go. Take a memory of us with you. We\'ll read your letter, when it comes."' },
    choices: [
      { id: 'leave', text: { en: '[End — ship sailing at dawn]' }, next: null },
    ],
  },
  END_STAY: {
    id: 'END_STAY', speaker: 'npc.hala',
    line: { en: '[her face cracks into a smile she didn\'t expect] "Then come. The bread is still warm. There\'s a stool at the press for you."' },
    choices: [
      { id: 'leave', text: { en: '[End — village hearth glowing]' }, next: null },
    ],
  },
};

export const DIALOGUE_TREES: Record<NpcId, DialogueTree> = {
  'npc.pemi': pemi,
  'npc.naro': naro,
  'npc.lemu': lemu,
  'npc.toka': toka,
  'npc.hala': hala,
};
