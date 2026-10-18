import { useState } from 'react'
import {
  PROVIDERS,
  aiReady,
  getAiSettings,
  listModels,
  providerFor,
  setAiSettings,
  summarizeWithApi,
  type ProviderId,
} from '../lib/ai'

const TEST_TRANSCRIPT = 'اتفقنا في الاجتماع إن أحمد يبعت العرض للعميل يوم الخميس، والميزانية عشرين ألف جنيه.'

export default function AiSettingsCard() {
  const saved = getAiSettings()
  const [provider, setProvider] = useState<ProviderId>(saved?.provider ?? 'groq')
  const [baseUrl, setBaseUrl] = useState(saved?.baseUrl ?? providerFor('groq').baseUrl)
  const [model, setModel] = useState(saved?.model ?? providerFor('groq').defaultModel)
  const [apiKey, setApiKey] = useState(saved?.apiKey ?? '')
  const [status, setStatus] = useState<{ kind: 'ok' | 'error' | 'info'; text: string } | null>(null)
  const [testing, setTesting] = useState(false)
  const [models, setModels] = useState<string[]>([])
  const [loadingModels, setLoadingModels] = useState(false)

  const info = providerFor(provider)
  const current = { provider, baseUrl: baseUrl.trim(), model: model.trim(), apiKey: apiKey.trim() }

  function pickProvider(id: ProviderId) {
    const p = providerFor(id)
    setProvider(id)
    setBaseUrl(p.baseUrl)
    setModel(p.defaultModel)
    setModels([])
    setStatus(null)
  }

  async function loadModels() {
    if (!current.baseUrl || (info.needsKey && !current.apiKey)) {
      setStatus({ kind: 'error', text: 'Paste your API key first.' })
      return
    }
    setLoadingModels(true)
    try {
      const ids = await listModels(current)
      setModels(ids)
      setStatus(
        ids.length
          ? { kind: 'info', text: `${ids.length} models available — pick one above.` }
          : { kind: 'error', text: 'No chat models found for this key.' },
      )
    } catch (e) {
      setStatus({ kind: 'error', text: e instanceof Error ? e.message : String(e) })
    } finally {
      setLoadingModels(false)
    }
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
      {models.length ? (
        <select value={models.includes(model) ? model : ''} onChange={(e) => setModel(e.target.value)}>
          {models.includes(model) ? null : <option value="">Choose a model…</option>}
          {models.map((m) => (
            <option key={m} value={m}>
              {m}
            </option>
          ))}
        </select>
      ) : null}
      <div className="row">
        <input className="grow" value={model} onChange={(e) => setModel(e.target.value)} autoCapitalize="none" spellCheck={false} />
        <button className="secondary" onClick={loadModels} disabled={loadingModels}>
          {loadingModels ? '…' : 'Load models'}
        </button>
      </div>

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
