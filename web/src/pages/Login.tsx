import { useState, type FormEvent } from 'react'
import { supabase } from '../lib/supabase'

export default function Login() {
  const [mode, setMode] = useState<'signin' | 'signup'>('signin')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState<string | null>(null)

  async function submit(e: FormEvent) {
    e.preventDefault()
    setBusy(true)
    setMessage(null)
    const { data, error } =
      mode === 'signin'
        ? await supabase.auth.signInWithPassword({ email, password })
        : await supabase.auth.signUp({
            email,
            password,
            options: { emailRedirectTo: window.location.origin + window.location.pathname },
          })
    setBusy(false)
    if (error) setMessage(error.message)
    else if (mode === 'signup' && !data.session) setMessage('Check your email to confirm your account, then sign in.')
  }

  return (
    <main className="page narrow login">
      <div className="login-logo">🎙️</div>
      <h1>Rememberance</h1>
      <p className="muted">Arabic voice notes, organised by category.</p>
      <form onSubmit={submit} className="stack">
        <input type="email" required placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="email" />
        <input
          type="password"
          required
          minLength={6}
          placeholder="Password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          autoComplete={mode === 'signin' ? 'current-password' : 'new-password'}
        />
        <button className="primary" disabled={busy}>
          {busy ? '…' : mode === 'signin' ? 'Sign in' : 'Create account'}
        </button>
      </form>
      {message ? <p className="notice">{message}</p> : null}
      <button className="link" onClick={() => setMode(mode === 'signin' ? 'signup' : 'signin')}>
        {mode === 'signin' ? 'First time? Create an account' : 'Already have an account? Sign in'}
      </button>
    </main>
  )
}
