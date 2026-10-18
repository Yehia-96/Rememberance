import { useEffect, useState, type FormEvent } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import TopBar from '../components/TopBar'
import { deleteCategory, getCategory, saveCategory } from '../lib/api'
import { CATEGORY_COLORS, CATEGORY_EMOJIS } from '../lib/format'

export default function CategoryEdit() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [name, setName] = useState('')
  const [emoji, setEmoji] = useState(CATEGORY_EMOJIS[2])
  const [color, setColor] = useState(CATEGORY_COLORS[2])
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!id) return
    getCategory(id).then((c) => {
      if (!c) return
      setName(c.name)
      setEmoji(c.emoji)
      setColor(c.color)
    })
  }, [id])

  async function submit(e: FormEvent) {
    e.preventDefault()
    if (!name.trim()) return
    setBusy(true)
    try {
      await saveCategory({ id, name: name.trim(), emoji, color })
      navigate(id ? `/category/${id}` : '/', { replace: true })
    } catch (err) {
      setError(String(err))
      setBusy(false)
    }
  }

  async function remove() {
    if (!id || !confirm(`Delete "${name}" and all of its recordings? This can't be undone.`)) return
    setBusy(true)
    try {
      await deleteCategory(id)
      navigate('/', { replace: true })
    } catch (err) {
      setError(String(err))
      setBusy(false)
    }
  }

  return (
    <>
      <TopBar title={id ? 'Edit category' : 'New category'} back />
      <main className="page narrow">
        <form onSubmit={submit} className="stack">
          <label className="label">Name</label>
          <input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Ideas, Meetings, University" autoFocus={!id} />

          <label className="label">Icon</label>
          <div className="wrap">
            {CATEGORY_EMOJIS.map((e) => (
              <button type="button" key={e} className={`emoji-box ${emoji === e ? 'selected' : ''}`} onClick={() => setEmoji(e)}>
                {e}
              </button>
            ))}
          </div>

          <label className="label">Colour</label>
          <div className="wrap">
            {CATEGORY_COLORS.map((c) => (
              <button
                type="button"
                key={c}
                aria-label={c}
                className={`swatch ${color === c ? 'selected' : ''}`}
                style={{ background: c }}
                onClick={() => setColor(c)}
              />
            ))}
          </div>

          {error ? <p className="notice error">{error}</p> : null}
          <button className="primary" disabled={busy || !name.trim()}>
            {id ? 'Save changes' : 'Create category'}
          </button>
          {id ? (
            <button type="button" className="danger-link" onClick={remove} disabled={busy}>
              Delete category
            </button>
          ) : null}
        </form>
      </main>
    </>
  )
}
