# Read Explanation Aloud (Text-to-Speech) 🔊

Have the AI SQL Explainer's answer read aloud instead of reading it on screen — useful for a quick review while your hands are on the keyboard doing something else, or for accessibility.

## Where to find it

Open the **Smart SQL Editor**, run **AI SQL Explainer** on a query, then use the **Sound** button next to the finished explanation. The button turns into **Stop** while audio is loading or playing.

## How it works

- The narration script follows the structured explanation exactly as it reads on screen: objective, output, filters, and referenced tables, in that order — including the "no filters" sentence when a query has none, so nothing is silently skipped.
- Audio for the same explanation is cached for the session: replaying it does not re-synthesize speech or re-spend a request.
- Long explanations are trimmed to a safe length at a sentence boundary (falling back to a word boundary) so playback never cuts off mid-word.
- The voice matches the UI language (English or Vietnamese) automatically — the language is not detected from the text, so switching the app's language switches the voice used.

## Two speech engines (server-configured, not a Settings toggle)

| Engine | Requires | Notes |
| --- | --- | --- |
| **Piper (local)** — default | `npm run setup:piper` once, to download voice files (~140 MB) | No API key, no network call, no per-request cost. Only works when self-hosting or running `npm run dev` — not available on a serverless deployment. |
| **OpenAI (cloud)** | `OPENAI_API_KEY` (or a dedicated `OPENAI_SPEECH_API_KEY`) on the server | Works anywhere, including serverless. Uses `gpt-4o-mini-tts` by default. |

Which engine is active is controlled by the server environment variable `AI_SPEECH_PROVIDER` (`piper` or `openai`) — there is no per-user switch in Settings, because the choice depends on how the app is hosted, not on personal preference.

## Troubleshooting

- **"Local read-aloud is missing its voice model"** — the Piper voice files were never downloaded. Run `npm run setup:piper`, or set `AI_SPEECH_PROVIDER=openai` to use the cloud engine instead.
- **"No speech credential on the server"** — `AI_SPEECH_PROVIDER=openai` is set but no key is configured. Add `OPENAI_API_KEY` (or `OPENAI_SPEECH_API_KEY`) to `.env` and restart the server.
- **404 from the speech provider** — a custom `AI_SPEECH_BASE_URL` is pointed at a gateway that does not publish `/v1/audio/speech` or the configured model. Point it at an endpoint that does, or switch back to the local Piper engine.

## Notes

- Text-to-speech is independent of which chat provider you use for AI explanations — even if your chat provider is Ollama or Anthropic, the OpenAI cloud engine (or the local Piper engine) still handles narration, since chat-completion models cannot generate audio themselves.
- This feature only reads AI explanations aloud; it does not read raw SQL, the Guideline page, or other panels.
