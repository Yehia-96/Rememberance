import { useState } from 'react'
import { PROVIDERS, aiReady, getAiSettings, providerFor, setAiSettings, summarizeWithApi, type ProviderId } from '../lib/ai'

const TEST_TRANSCRIPT = 'اتفقنا في الاجتماع إن أحمد يبعت العرض للعميل يوم الخميس، والميزانية عشرين ألف جنيه.'

export default function AiSettingsCard() {
  const saved = getAiSettings()
  const [provider, setProvider] = useState<ProviderId>(saved?.provider ?? 'groq')
  const [baseUrl, setBaseUrl] = useState(saved?.baseUrl ?? providerFor('groq').baseUrl)
  const [model, setModel] = useState(saved?.model ?? providerFor('groq').defaultModel)
  const [apiKey, setApiKey] = useState(saved?.apiKey ?? '')
  const [status, setStatus] = useState<{ kind: 'ok' | 'error' | 'info'; text: string } | null>(null)
  const [testing, setTesting] = useState(false)

  const info = providerFor(provider)
  const current = { provider, baseUrl: baseUrl.trim(), model: model.trim(), apiKey: apiKey.trim() }

  function pickProvider(id: ProviderId) {
    const p = providerFor(id)
    setProvider(id)
    setBaseUrl(p.baseUrl)
    setModel(p.defaultModel)
    setStatus(null)
  }

  function save() {
    if (!aiReady(current)) {
      setStatus({ kind: 'error', text: 'Fill in the address, model and API key first.' })
      return
    }
    setAiSettings(current)
    setStatus({ kind: 'ok', text: 'Saved. Recordings now have a one-tap “✨ Summarize” button.' })
  }

  async function test() {
    if (!aiReady(current)) {
      setStatus({ kind: 'error', text: 'Fill in the address, model and API key first.' })
      return
    }
    setTesting(true)
    setStatus({ kind: 'info', text: 'Testing…' })
    try {
      const out = await summarizeWithApi(current, TEST_TRANSCRIPT, 'Business')
      setStatus({ kind: 'ok', text: `It works:\n${out}` })
    } catch (e) {
      setStatus({ kind: 'error', text: e instanceof Error ? e.message : String(e) })
    } finally {
      setTesting(false)
    }
  }

  return (
    <div className="card stack">
      <div>
        <strong>AI summaries</strong>
        <div className="muted small">Pick a free AI for one-tap bullet points. The key is stored only on this device.</div>
      </div>

      <label className="label">Provider</label>
      <select value={provider} onChange={(e) => pickProvider(e.target.value as ProviderId)}>
        {PROVIDERS.map((p) => (
          <option key={p.id} value={p.id}>
            {p.label}
          </option>
        ))}
      </select>
      <div className="muted small">{info.note}</div>

      {info.needsKey ? (
        <>
          <label className="label">
            API key{' '}
            {info.keyUrl ? (
              <a href={info.keyUrl} target="_blank" rel="noreferrer" className="normal-case">
                — get a free key ↗
              </a>
            ) : null}
          </label>
          <input
            type="password"
            value={apiKey}
            onChange={(e) => setApiKey(e.target.value)}
            placeholder="Paste your key"
            autoComplete="off"
            autoCapitalize="none"
            spellCheck={false}
          />
        </>
      ) : null}

      <label className="label">Model</label>
      <input value={model} onChange={(e) => setModel(e.target.value)} autoCapitalize="none" spellCheck={false} />

      <label className="label">API address</label>
      <input value={baseUrl} onChange={(e) => setBaseUrl(e.target.value)} autoCapitalize="none" spellCheck={false} />

      {status ? <p className={`notice pre ${status.kind === 'error' ? 'error' : ''}`}>{status.text}</p> : null}

      <div className="row">
        <button className="secondary grow" onClick={test} disabled={testing}>
          Test
        </button>
        <button className="primary grow" onClick={save}>
          Save
        </button>
      </div>
      {saved ? (
        <button
          className="danger-link"
          onClick={() => {
            setAiSettings(null)
            setApiKey('')
            setStatus({ kind: 'info', text: 'AI settings removed. Only the Claude copy button will be shown.' })
          }}
        >
          Turn off AI summaries
        </button>
      ) : null}
    </div>
  )
}
