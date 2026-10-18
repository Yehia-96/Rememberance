import { useEffect, useMemo, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import TopBar from '../components/TopBar'
import { getCategory, listRecordings } from '../lib/api'
import { formatDate, formatDuration } from '../lib/format'
import type { Category, Recording } from '../lib/types'

export default function CategoryPage() {
  const { id = '' } = useParams()
  const [category, setCategory] = useState<Category | null>(null)
  const [recordings, setRecordings] = useState<Recording[] | null>(null)
  const [search, setSearch] = useState('')
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    getCategory(id).then(setCategory, (e) => setError(String(e)))
    listRecordings(id).then(setRecordings, (e) => setError(String(e)))
  }, [id])

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    if (!recordings || !q) return recordings
    return recordings.filter((r) =>
      [r.title, r.transcript, r.summary, r.location_name].some((f) => f?.toLowerCase().includes(q)),
    )
  }, [recordings, search])

  return (
    <>
      <TopBar
        title={category ? `${category.emoji} ${category.name}` : ''}
        back="/"
        right={<Link to={`/category/${id}/edit`}>Edit</Link>}
      />
      <main className="page with-fab">
        <input type="search" placeholder="Search titles and transcripts" value={search} onChange={(e) => setSearch(e.target.value)} />
        {error ? <p className="notice error">{error}</p> : null}
        {!recordings && !error ? <p className="center muted">Loading…</p> : null}
        {filtered?.length === 0 ? (
          <p className="center muted">{search ? 'No matches.' : 'No recordings yet. Tap Record to start.'}</p>
        ) : null}
        <div className="stack">
          {filtered?.map((r) => (
            <Link key={r.id} to={`/recording/${r.id}`} className="card recording-item">
              <div className="recording-title">{r.title || formatDate(r.created_at)}</div>
              {r.transcript ? (
                <div className="arabic preview" dir="auto">
                  {r.transcript}
                </div>
              ) : null}
              <div className="meta-row muted small">
                <span>
                  {r.title ? formatDate(r.created_at) + ' · ' : ''}
                  {formatDuration(r.duration_ms)}
                </span>
                <span>
                  {r.summary ? '✨' : ''}
                  {r.location_name ? ' 📍' : ''}
                  {r.audio_path ? ' 🔊' : ''}
                  {r.photo_path ? ' 🖼️' : ''}
                  {r.pdf_path ? ' 📄' : ''}
                </span>
              </div>
            </Link>
          ))}
        </div>
      </main>
      <Link to={`/record/${id}`} className="fab">
        <span className="fab-dot" /> Record
      </Link>
    </>
  )
}
