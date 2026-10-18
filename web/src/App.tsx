import type { Session } from '@supabase/supabase-js'
import { useEffect, useState } from 'react'
import { HashRouter, Route, Routes } from 'react-router-dom'
import { supabase, supabaseConfigured } from './lib/supabase'
import CategoryEdit from './pages/CategoryEdit'
import CategoryPage from './pages/CategoryPage'
import Home from './pages/Home'
import Login from './pages/Login'
import RecordPage from './pages/RecordPage'
import RecordingPage from './pages/RecordingPage'
import Settings from './pages/Settings'

export default function App() {
  const [session, setSession] = useState<Session | null | undefined>(undefined)

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setSession(data.session))
    const { data } = supabase.auth.onAuthStateChange((_event, s) => setSession(s))
    return () => data.subscription.unsubscribe()
  }, [])

  if (!supabaseConfigured) {
    return (
      <main className="page narrow">
        <h1>Setup needed</h1>
        <p className="muted">
          Supabase isn't configured. Create <code>web/.env.local</code> with <code>VITE_SUPABASE_URL</code> and{' '}
          <code>VITE_SUPABASE_KEY</code> (see the README).
        </p>
      </main>
    )
  }
  if (session === undefined) return <div className="center muted">Loading…</div>
  if (!session) return <Login />

  return (
    <HashRouter>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/settings" element={<Settings email={session.user.email ?? ''} />} />
        <Route path="/category/new" element={<CategoryEdit />} />
        <Route path="/category/:id" element={<CategoryPage />} />
        <Route path="/category/:id/edit" element={<CategoryEdit />} />
        <Route path="/record/:categoryId" element={<RecordPage />} />
        <Route path="/recording/:id" element={<RecordingPage />} />
      </Routes>
    </HashRouter>
  )
}
