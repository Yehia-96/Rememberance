import { useState } from 'react'
import TopBar from '../components/TopBar'
import { getSaveAudio, setSaveAudio } from '../lib/format'
import { supabase } from '../lib/supabase'

export default function Settings({ email }: { email: string }) {
  const [saveAudio, setSaveAudioState] = useState(getSaveAudio)

  return (
    <>
      <TopBar title="Settings" back="/" />
      <main className="page narrow stack">
        <label className="card row toggle">
          <span className="grow">
            Save audio with recordings
            <br />
            <span className="muted small">
              If transcription stops working on your iPhone while this is on, turn it off — some iPhones can't record
              audio and transcribe at the same time.
            </span>
          </span>
          <input
            type="checkbox"
            checked={saveAudio}
            onChange={(e) => {
              setSaveAudio(e.target.checked)
              setSaveAudioState(e.target.checked)
            }}
          />
        </label>

        <div className="card">
          <div className="muted small">Signed in as</div>
          <div>{email}</div>
        </div>
        <button className="danger-link" onClick={() => supabase.auth.signOut()}>
          Sign out
        </button>

        <p className="muted small">
          Tip: in Safari tap Share → Add to Home Screen to use Rememberance like an app.
        </p>
      </main>
    </>
  )
}
