import { useEffect, useMemo, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import TopBar from '../components/TopBar'
import { createRecording, listCategories } from '../lib/api'
import { formatDuration, getSaveAudio } from '../lib/format'
import type { CategoryWithCount } from '../lib/types'
import { speechSupported, useSpeechRecorder } from '../lib/useSpeechRecorder'

const LANG = 'ar-EG'

async function reverseGeocode(lat: number, lon: number): Promise<string | null> {
  try {
    const res = await fetch(
      `https://nominatim.openstreetmap.org/reverse?format=jsonv2&zoom=16&lat=${lat}&lon=${lon}&accept-language=ar,en`,
    )
    const data = await res.json()
    const a = data.address ?? {}
    const parts = [a.road ?? a.neighbourhood, a.suburb ?? a.city_district, a.city ?? a.town ?? a.village ?? a.state]
    return parts.filter(Boolean).join('، ') || data.display_name || null
  } catch {
    return null
  }
}

export default function RecordPage() {
  const { categoryId = '' } = useParams()
  const navigate = useNavigate()
  const rec = useSpeechRecorder(LANG)

  const [categories, setCategories] = useState<CategoryWithCount[]>([])
  const [category, setCategory] = useState(categoryId)
  const [title, setTitle] = useState('')
  // null until the user edits it; until then the recognised text is shown.
  const [editedTranscript, setTranscript] = useState<string | null>(null)
  const transcript = editedTranscript ?? rec.text
  const [locationName, setLocationName] = useState('')
  const [coords, setCoords] = useState<{ latitude: number; longitude: number } | null>(null)
  const [locating, setLocating] = useState(false)
  const [photo, setPhoto] = useState<File | null>(null)
  const [pdf, setPdf] = useState<File | null>(null)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    listCategories().then(setCategories, () => {})
  }, [])

  const photoPreview = useMemo(() => (photo ? URL.createObjectURL(photo) : null), [photo])
  useEffect(
    () => () => {
      if (photoPreview) URL.revokeObjectURL(photoPreview)
    },
    [photoPreview],
  )

  function locate() {
    if (!navigator.geolocation) return setError('Location is not available on this device.')
    setLocating(true)
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const { latitude, longitude } = pos.coords
        setCoords({ latitude, longitude })
        setLocationName((await reverseGeocode(latitude, longitude)) ?? `${latitude.toFixed(4)}, ${longitude.toFixed(4)}`)
        setLocating(false)
      },
      (err) => {
        setError(`Couldn't get location: ${err.message}`)
        setLocating(false)
      },
      { enableHighAccuracy: false, timeout: 15000 },
    )
  }

  async function save() {
    setSaving(true)
    setError(null)
    try {
      const id = await createRecording({
        categoryId: category,
        title: title.trim() || null,
        transcript: transcript.trim(),
        locationName: locationName.trim() || null,
        latitude: coords?.latitude ?? null,
        longitude: coords?.longitude ?? null,
        durationMs: rec.elapsed,
        audio: rec.audio,
        photo,
        pdf,
      })
      navigate(`/recording/${id}`, { replace: true })
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
      setSaving(false)
    }
  }

  function discard() {
    if (confirm('Discard this recording?')) navigate(-1)
  }

  if (!speechSupported) {
    return (
      <>
        <TopBar title="New recording" back />
        <main className="page narrow">
          <p className="notice error">
            This browser doesn't support speech recognition. On iPhone use Safari (iOS 14.5 or newer) with Siri &amp;
            Dictation turned on.
          </p>
        </main>
      </>
    )
  }

  if (rec.status !== 'done') {
    const recording = rec.status === 'recording'
    return (
      <div className="record-screen">
        <TopBar title="New recording" back={rec.status === 'idle'} />
        <div className="live" dir="rtl">
          {rec.text || rec.interim ? (
            <p className="arabic live-text">
              {rec.text} <span className="muted">{rec.interim}</span>
            </p>
          ) : (
            <p className="center muted" dir="ltr">
              {recording ? 'Listening… ابدأ الكلام' : 'Tap the button and start speaking in Arabic.'}
            </p>
          )}
        </div>
        {rec.error ? <p className="notice error">{rec.error}</p> : null}
        {rec.audioWarning ? <p className="notice">{rec.audioWarning}</p> : null}
        <div className="controls">
          <div className="timer">{formatDuration(rec.elapsed)}</div>
          <button
            className={`big-button ${recording ? 'active' : ''}`}
            disabled={rec.status === 'stopping'}
            onClick={recording ? rec.stop : () => rec.start(getSaveAudio())}
            aria-label={recording ? 'Stop recording' : 'Start recording'}
          >
            <span className={recording ? 'stop-square' : 'record-circle'} />
          </button>
          <div className="muted small">
            {rec.status === 'stopping' ? 'Finishing…' : recording ? 'Tap to finish' : 'Tap to record'}
          </div>
        </div>
      </div>
    )
  }

  return (
    <>
      <TopBar
        title="Save recording"
        left={
          <button className="danger-link" onClick={discard} disabled={saving}>
            Discard
          </button>
        }
        right={
          <button className="link bold" onClick={save} disabled={saving}>
            {saving ? 'Saving…' : 'Save'}
          </button>
        }
      />
      <main className="page narrow stack">
        {error ? <p className="notice error">{error}</p> : null}

        <label className="label">Title (optional)</label>
        <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Untitled — the date will be used" />

        <label className="label">Category</label>
        <div className="chips">
          {categories.map((c) => (
            <button
              key={c.id}
              type="button"
              className={`chip ${category === c.id ? 'selected' : ''}`}
              style={category === c.id ? { background: c.color, borderColor: c.color } : undefined}
              onClick={() => setCategory(c.id)}
            >
              {c.emoji} {c.name}
            </button>
          ))}
        </div>

        <label className="label">Location (optional)</label>
        <div className="row">
          <input className="grow" value={locationName} onChange={(e) => setLocationName(e.target.value)} placeholder="Type a place" dir="auto" />
          <button type="button" className="secondary" onClick={locate} disabled={locating}>
            {locating ? '…' : '📍 Current'}
          </button>
        </div>

        <label className="label">Picture (optional)</label>
        {photoPreview ? (
          <div>
            <img src={photoPreview} alt="" className="photo" />
            <button type="button" className="danger-link" onClick={() => setPhoto(null)}>
              Remove picture
            </button>
          </div>
        ) : (
          <div className="row">
            <label className="secondary grow file-button">
              📷 Camera
              <input type="file" accept="image/*" capture="environment" hidden onChange={(e) => setPhoto(e.target.files?.[0] ?? null)} />
            </label>
            <label className="secondary grow file-button">
              🖼️ Photos
              <input type="file" accept="image/*" hidden onChange={(e) => setPhoto(e.target.files?.[0] ?? null)} />
            </label>
          </div>
        )}

        <label className="label">PDF (optional)</label>
        {pdf ? (
          <div className="row">
            <span className="grow ellipsis">📄 {pdf.name}</span>
            <button type="button" className="danger-link" onClick={() => setPdf(null)}>
              Remove
            </button>
          </div>
        ) : (
          <label className="secondary file-button">
            📎 Attach PDF
            <input type="file" accept="application/pdf" hidden onChange={(e) => setPdf(e.target.files?.[0] ?? null)} />
          </label>
        )}

        <label className="label">
          Transcript {rec.audio ? <span className="muted">· audio saved 🔊</span> : null}
        </label>
        <textarea
          className="arabic"
          dir="auto"
          rows={8}
          value={transcript}
          onChange={(e) => setTranscript(e.target.value)}
          placeholder="Nothing was recognised — you can type here."
        />
      </main>
    </>
  )
}
