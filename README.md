# Snake Perfekt

German word-order Snake game with AI-generated level packs.

- one selected lexical theme for all 10 levels
- `compact` mode: four ordered fruit chunks and two distractors
- `full` mode: the complete sentence split into up to six chunks
- validated server-side generation with thematic fallback packs
- keyboard, canvas tap, and on-screen D-pad controls

## Run locally

```bash
npm install
npm start
```

Open `http://localhost:3000`.

Set `AITUNNEL_API_KEY` or `OPENAI_API_KEY` to generate fresh AI packs. Without
an AI key, the game uses validated fallback packs for local testing.
