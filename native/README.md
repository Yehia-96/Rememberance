# Rememberance

An iPhone app that transcribes Arabic (Egyptian) speech into categorised notes.

## v1 features
- Categories (Business, Homework built in; add / edit / delete your own — long-press a category)
- Live Arabic transcription (`ar-EG`) with Apple speech recognition; audio is saved too
- After each recording: optional title, location (current or typed), picture (camera / photos), PDF, category; transcript is editable
- AI bullet-point summary (Claude) — needs an Anthropic API key, entered in Settings
- Search inside a category, audio playback, delete

## Run it on your iPhone (no Mac needed)
Native modules (speech recognition, etc.) mean **Expo Go won't work** — you need a development build made in the cloud.

1. Create a free account at https://expo.dev and an Apple Developer account ($99/yr).
2. `npx eas-cli@latest login`
3. `npx eas-cli@latest device:create` — open the link on your iPhone to register it.
4. `npx eas-cli@latest build --profile development --platform ios` — sign in with your Apple ID when asked; install the result from the link/QR on your iPhone. On the phone, turn on Settings → Privacy & Security → Developer Mode.
5. `npx expo start` on this PC, then open the Rememberance app on the phone and connect (same Wi-Fi, or `npx expo start --tunnel`).

After step 4 you only rebuild when native packages change; JS changes reload instantly.

## Tips for better Egyptian Arabic recognition
- On the iPhone: Settings → General → Keyboard → Dictation Languages → add **Arabic (Egypt)**. When the on-device model is installed, the app uses it (offline, no time limit).
- Without it, Apple's online recogniser stops roughly every minute; the app restarts it automatically and keeps the audio as multiple parts.

## Code map
- `src/app/` — screens (Expo Router): `index` (categories), `category/[id]`, `record`, `recording/[id]`, `category-edit`, `settings`
- `src/lib/db.ts` — SQLite storage
- `src/lib/files.ts` — attachments & audio stored in the app's documents folder
- `src/lib/summarize.ts` — Claude summary call

## v2 ideas
- Whisper / cloud transcription for higher accuracy on dialect, option to re-transcribe saved audio
- Ask questions across all recordings, export / share as PDF, iCloud sync, background recording
- Move the API key behind a small server if the app is ever shared with other people
