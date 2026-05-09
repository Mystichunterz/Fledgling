# Fledgling

A procedurally-generated language-learning game. Built for the [AI Engineer Hackathon Singapore](https://luma.com/aie-hack), 2026-05-09.

The player is dropped into a village of NPCs speaking a language generated at runtime, and must learn it by overhearing dialogue and watching daily routines.

A self-contained 5–10 minute loop: crash on the beach, meet a child who teaches you a handful of anchor words, work out which villagers hold the wood, oil, and flint you'll need, ask each in their tongue, light the lighthouse beacon to signal a passing ship, and choose whether to leave or stay. *Cosy, no combat, no fail states.*

The headline trick: **the language, the lexicon, and the predecessor's name and fate are all procedurally generated** each run. Re-roll for a fresh playthrough — replayability is the point. Detailed plan in [`../PLAN.md`](../PLAN.md), the build contract in [`../REQUIREMENTS.md`](../REQUIREMENTS.md).

## Stack

- Phaser 4 + TypeScript + Vite
- Convex — runtime NPC state and tick loop
- GPT-5.5 — procedural language generation
- ElevenLabs Flash v2.5 (pre-rendered) + Gemini 3.1 Flash Live (climax NPC voice)
- Fal — pixel-art sprites (build-time)
- Lyria — ambient music
- Hosted on Vercel

## Develop

```bash
npm install
cp .env.example .env   # fill in keys
npm run dev
```

| Script | Purpose |
|---|---|
| `npm run dev` | Vite dev server |
| `npm run build` | Type-check, then production build |
| `npm run preview` | Preview production build |
| `npm run typecheck` | Type-check only |

## Layout

- `src/` — Phaser game (engine, scenes, actors, state)
- `index.html` — Vite entry
- `.env.example` — required environment variables

Project planning, research notes, and the Convex backend live one level up alongside this directory.
