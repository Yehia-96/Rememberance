# Rememberance

Arabic (Egyptian) voice notes, organised by category. A free web app: hosted on GitHub Pages, data in Supabase,
installed on the iPhone with **Safari → Share → Add to Home Screen**.

- `web/` — the web app (React + Vite, installable PWA) ← **this is the one in use**
- `supabase/schema.sql` — database tables, security rules and file storage bucket
- `native/` — an earlier native iPhone version (Expo). Needs a $99/yr Apple Developer account to install; kept for later.

## Features
- Categories: Business and Homework built in, add / edit / delete your own
- Live Arabic transcription (`ar-EG`) using Safari's built-in speech recognition — free
- Optional audio recording of the whole session
- After each recording: optional title, location, picture (camera or photos), PDF, category; editable transcript
- **Summarize with Claude**: copies the transcript + instructions and opens claude.ai, so your Claude plan does the
  summary for free; paste the bullets back and they're saved with the recording
- Search inside a category; works on your laptop too (same account)

## One-time setup

### 1. Supabase
1. In your Supabase project: **SQL Editor → New query**, paste all of `supabase/schema.sql`, **Run**.
2. **Authentication → Sign In / Providers → Email**: turn **off** "Confirm email" (simplest for a personal app), or
   leave it on and confirm via the email you get.
3. **Authentication → URL Configuration**: set *Site URL* to your GitHub Pages address (step 2 below), e.g.
   `https://YOUR-USERNAME.github.io/rememberance/`.
4. **Project Settings → API** (or the **Connect** button): copy the *Project URL* and the *anon* / *publishable* key.

### 2. GitHub Pages
1. Create a new GitHub repository (e.g. `rememberance`) and push this folder to it.
2. Repo **Settings → Pages → Build and deployment → Source: GitHub Actions**.
3. Repo **Settings → Secrets and variables → Actions → Variables** tab → add:
   - `VITE_SUPABASE_URL` = your Project URL
   - `VITE_SUPABASE_KEY` = your anon / publishable key
4. Push (or **Actions → Deploy web app → Run workflow**). The site appears at
   `https://YOUR-USERNAME.github.io/REPO-NAME/`.

### 3. iPhone
1. Open the site in **Safari**, create your account, then **Share → Add to Home Screen**.
2. Make sure **Settings → Siri (or Apple Intelligence & Siri) → Siri & Dictation / Dictation** is on — Safari's speech
   recognition depends on it.
3. Allow the microphone when asked.

## Local development
```bash
cd web
cp .env.example .env.local   # then fill in your Supabase URL and key
npm install
npm run dev
```

## Known limits (web on iPhone)
- Safari's recognition stops after pauses; the app restarts it automatically, but a word may be lost at each restart.
- Some iPhones can't record audio and transcribe at the same time. If transcription fails, turn off
  **Settings → Save audio with recordings** in the app.
- If speech recognition doesn't work from the Home Screen icon, try the same site in a normal Safari tab.
- "📍 Current" location sends your coordinates to OpenStreetMap (Nominatim) to look up the place name.

## v2 ideas
- More accurate dialect transcription (Whisper via a free-tier API), re-transcribe saved audio
- Ask questions across all recordings, export as PDF, offline mode
