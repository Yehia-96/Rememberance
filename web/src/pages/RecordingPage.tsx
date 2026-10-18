import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import TopBar from '../components/TopBar'
import { deleteRecording, getCategory, getRecording, signedUrl, updateRecording } from '../lib/api'
import { formatDate, formatDuration } from '../lib/format'
import type { Category, Recording } from '../lib/types'

function claudePrompt(transcript: string, categoryName: string) {
  const focus =
    categoryName.toLowerCase() === 'business'
      ? 'Prioritise decisions, action items (who / what / when), numbers and open questions.'
      : categoryName.toLowerCase() === 'homework'
        ? 'Prioritise the main concepts, definitions, steps, and anything to review or submit.'
        : `This note belongs to my "${categoryName}" category.`
  return `Turn this voice-note transcript into short bullet-point notes.
It's mostly Egyptian Arabic (sometimes mixed with English) from speech recognition, so it may contain mistakes and filler words — infer what I meant.
Write the bullets in the same language I spoke. Output only the bullets, one per line, each starting with "• ". ${focus}

Transcript:
${transcript}`
}

export default function RecordingPage() {
  const { id = '' } = useParams()
  const navigate = useNavigate()
  const [rec, setRec] = useState<Recording | null | undefined>(undefined)
  const [category, setCategory] = useState<Category | null>(null)
  const [urls, setUrls] = useState<{ audio?: string; photo?: string; pdf?: string }>({})
  const [editingTranscript, setEditingTranscript] = useState(false)
  const [transcriptDraft, setTranscriptDraft] = useState('')
  const [summaryDraft, setSummaryDraft] = useState('')
  const [copied, setCopied] = useState(false)
  const [editingSummary, setEditingSummary] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    getRecording(id).then(async (r) => {
      setRec(r)
      if (!r) return
      setTranscriptDraft(r.transcript)
      setSummaryDraft(r.summary ?? '')
      getCategory(r.category_id).then(setCategory)
      const [audio, photo, pdf] = await Promise.all(
        [r.audio_path, r.photo_path, r.pdf_path].map((p) => (p ? signedUrl(p).catch(() => undefined) : undefined)),
      )
      setUrls({ audio, photo, pdf })
    }, (e) => setError(String(e)))
  }, [id])

  if (rec === undefined) return <div className="center muted">Loading…</div>
  if (rec === null) {
    return (
      <>
        <TopBar title="" back="/" />
        <p className="center muted">Recording not found.</p>
      </>
    )
  }
  const current = rec

  async function patch(fields: Partial<Recording>) {
    try {
      await updateRecording(current.id, fields)
      setRec({ ...current, ...fields })
    } catch (e) {
      setError(String(e))
    }
  }

  function rename() {
    const t = prompt('Title', current.title ?? '')
    if (t !== null) patch({ title: t.trim() || null })
  }

  function copyForClaude() {
    // Both calls must start synchronously inside the tap, or iOS Safari blocks them.
    navigator.clipboard
      .writeText(claudePrompt(current.transcript, category?.name ?? ''))
      .then(() => setCopied(true))
      .catch(() => setError('Could not copy to the clipboard.'))
    window.open('https://claude.ai/new', '_blank')
  }

  async function remove() {
    if (!confirm('Delete this recording? The audio, picture and PDF are deleted too.')) return
    try {
      await deleteRecording(current)
      navigate(`/category/${current.category_id}`, { replace: true })
    } catch (e) {
      setError(String(e))
    }
  }

  const showSummaryEditor = editingSummary || (!current.summary && copied)

  return (
    <>
      <TopBar
        title={category ? `${category.emoji} ${category.name}` : ''}
        back={`/category/${current.category_id}`}
        right={
          <button className="danger-link" onClick={remove}>
            Delete
          </button>
        }
      />
      <main className="page narrow">
        {error ? <p className="notice error">{error}</p> : null}
        <button className="title-button" onClick={rename}>
          {current.title || 'Untitled'} <span className="muted">✎</span>
        </button>
        <p className="muted small">
          {formatDate(current.created_at)} · {formatDuration(current.duration_ms)}
          {current.location_name ? (
            <>
              <br />📍 {current.location_name}
            </>
          ) : null}
        </p>

        {urls.audio ? <audio controls src={urls.audio} className="audio" preload="metadata" /> : null}
        {urls.photo ? <img src={urls.photo} alt="" className="photo" /> : null}
        {urls.pdf ? (
          <a href={urls.pdf} target="_blank" rel="noreferrer" className="card row pdf-link">
            <span className="grow ellipsis">📄 {current.pdf_name ?? 'Attached PDF'}</span>
            <span>Open</span>
          </a>
        ) : null}

        <div className="section-header">
          <h2>✨ Key points</h2>
          {current.summary && !editingSummary ? (
            <button className="link" onClick={() => setEditingSummary(true)}>
              Edit
            </button>
          ) : null}
        </div>
        {current.summary && !editingSummary ? (
          <div className="card arabic pre" dir="auto">
            {current.summary}
          </div>
        ) : null}
        {!current.summary || editingSummary ? (
          <div className="stack">
            <button className="primary" onClick={copyForClaude} disabled={!current.transcript.trim()}>
              {copied ? '✓ Copied — paste it in Claude' : 'Summarize with Claude'}
            </button>
            <p className="muted small">
              Copies the transcript with instructions and opens claude.ai (uses your Claude plan, free). Paste Claude's
              bullets below.
            </p>
            {showSummaryEditor || editingSummary ? (
              <>
                <textarea
                  className="arabic"
                  dir="auto"
                  rows={6}
                  placeholder="Paste the bullet points here"
                  value={summaryDraft}
                  onChange={(e) => setSummaryDraft(e.target.value)}
                />
                <div className="row">
                  <button
                    className="secondary grow"
                    onClick={async () => {
                      try {
                        setSummaryDraft(await navigator.clipboard.readText())
                      } catch {
                        setError('Paste manually: long-press the box and choose Paste.')
                      }
                    }}
                  >
                    Paste from clipboard
                  </button>
                  <button
                    className="primary grow"
                    onClick={async () => {
                      await patch({ summary: summaryDraft.trim() || null })
                      setEditingSummary(false)
                    }}
                  >
                    Save
                  </button>
                </div>
              </>
            ) : (
              <button className="link" onClick={() => setEditingSummary(true)}>
                I already have the bullets — paste them
              </button>
            )}
          </div>
        ) : null}

        <div className="section-header">
          <h2>Transcript</h2>
          <button
            className="link"
            onClick={async () => {
              if (editingTranscript) await patch({ transcript: transcriptDraft.trim() })
              setEditingTranscript(!editingTranscript)
            }}
          >
            {editingTranscript ? 'Done' : 'Edit'}
          </button>
        </div>
        {editingTranscript ? (
          <textarea className="arabic" dir="auto" rows={10} value={transcriptDraft} onChange={(e) => setTranscriptDraft(e.target.value)} autoFocus />
        ) : (
          <div className="card arabic pre" dir="auto">
            {current.transcript || <span className="muted">No transcript.</span>}
          </div>
        )}
      </main>
    </>
  )
}
