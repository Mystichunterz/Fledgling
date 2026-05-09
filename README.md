# Fledgling

A procedurally-generated language-learning game. Built for the [AI Engineer Hackathon Singapore](https://luma.com/aie-hack), 2026-05-09.

The player is dropped into a village of NPCs speaking a language generated at runtime, and must learn it by overhearing dialogue and watching daily routines.

Inspirations: *Chants of Senaar*, *Heaven's Vault*, *7 Days to End With You*.

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
