import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import TopBar from '../components/TopBar'
import { listCategories } from '../lib/api'
import type { CategoryWithCount } from '../lib/types'

export default function Home() {
  const [categories, setCategories] = useState<CategoryWithCount[] | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    listCategories().then(setCategories, (e) => setError(String(e.message ?? e)))
  }, [])

  return (
    <>
      <TopBar title="Rememberance" right={<Link to="/settings">Settings</Link>} />
      <main className="page">
        {error ? <p className="notice error">{error}</p> : null}
        {!categories && !error ? <p className="center muted">Loading…</p> : null}
        <div className="grid">
          {categories?.map((c) => {
            const count = c.recordings[0]?.count ?? 0
            return (
              <Link key={c.id} to={`/category/${c.id}`} className="category-card" style={{ borderTopColor: c.color }}>
                <span className="category-emoji">{c.emoji}</span>
                <span className="category-name">{c.name}</span>
                <span className="muted small">
                  {count} recording{count === 1 ? '' : 's'}
                </span>
              </Link>
            )
          })}
          {categories ? (
            <Link to="/category/new" className="category-card add">
              <span className="add-plus">＋</span>
              <span className="muted">New category</span>
            </Link>
          ) : null}
        </div>
      </main>
    </>
  )
}
