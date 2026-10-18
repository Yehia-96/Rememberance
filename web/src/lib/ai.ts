import { SUMMARY_INSTRUCTIONS, summaryUserMessage } from './prompt'

/** All providers below speak the OpenAI-compatible /chat/completions API and allow calls straight from the browser. */
export type ProviderId = 'groq' | 'gemini' | 'openrouter' | 'ollama' | 'custom'

export type Provider = {
  id: ProviderId
  label: string
  baseUrl: string
  defaultModel: string
  needsKey: boolean
  keyUrl?: string
  note: string
}

export const PROVIDERS: Provider[] = [
  {
    id: 'groq',
    label: 'Groq (free)',
    baseUrl: 'https://api.groq.com/openai/v1',
    defaultModel: 'openai/gpt-oss-120b',
    needsKey: true,
    keyUrl: 'https://console.groq.com/keys',
    note: 'Free, no card. Very fast. Tap “Load models” to see what your key can use (e.g. llama-3.3-70b-versatile, or the preview Qwen model).',
  },
  {
    id: 'gemini',
    label: 'Google Gemini (free)',
    baseUrl: 'https://generativelanguage.googleapis.com/v1beta/openai',
    defaultModel: 'gemini-3-flash-preview',
    needsKey: true,
    keyUrl: 'https://aistudio.google.com/apikey',
    note: 'Free tier. Strong Arabic. On the free tier Google may use your text to improve its products.',
  },
  {
    id: 'openrouter',
    label: 'OpenRouter (free models)',
    baseUrl: 'https://openrouter.ai/api/v1',
    defaultModel: 'openrouter/free',
    needsKey: true,
    keyUrl: 'https://openrouter.ai/keys',
    note: '"openrouter/free" picks any available free model. Or use one ending in ":free", e.g. google/gemma-4-31b-it:free. Free limit: 50 requests/day.',
  },
  {
    id: 'ollama',
    label: 'Ollama (your computer)',
    baseUrl: 'http://localhost:11434/v1',
    defaultModel: 'qwen3:8b',
    needsKey: false,
    note: 'Private and free, but your computer must be on. Works from the computer\'s own browser; set OLLAMA_ORIGINS=https://yehia-96.github.io first. From the iPhone you need an https tunnel (see README).',
  },
  {
    id: 'custom',
    label: 'Other (OpenAI-compatible)',
    baseUrl: '',
    defaultModel: '',
    needsKey: true,
    note: 'Any service with an OpenAI-compatible /chat/completions endpoint that allows browser requests.',
  },
]

export type AiSettings = { provider: ProviderId; baseUrl: string; model: string; apiKey: string }

const STORAGE_KEY = 'rememberance.ai'

export function getAiSettings(): AiSettings | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return null
    const s = JSON.parse(raw) as AiSettings
    // Groq retired this model; move saved settings to the current default.
    if (s.provider === 'groq' && s.model === 'qwen/qwen3-32b') s.model = providerFor('groq').defaultModel
    return s
  } catch {
    return null
  }
}

export function setAiSettings(s: AiSettings | null) {
  try {
    if (s) localStorage.setItem(STORAGE_KEY, JSON.stringify(s))
    else localStorage.removeItem(STORAGE_KEY)
  } catch {
    // ignore (private mode)
  }
}

export function providerFor(id: ProviderId): Provider {
  return PROVIDERS.find((p) => p.id === id) ?? PROVIDERS[PROVIDERS.length - 1]
}

/** True when settings are complete enough to call the API. */
export function aiReady(s: AiSettings | null): s is AiSettings {
  return !!s && !!s.baseUrl && !!s.model && (!providerFor(s.provider).needsKey || !!s.apiKey)
}

function cleanOutput(text: string) {
  // Reasoning models (Qwen3, DeepSeek…) may include their thinking.
  return text.replace(/<think>[\s\S]*?<\/think>/g, '').trim()
}

export async function summarizeWithApi(s: AiSettings, transcript: string, categoryName: string): Promise<string> {
  const body: Record<string, unknown> = {
    model: s.model,
    temperature: 0.3,
    messages: [
      { role: 'system', content: SUMMARY_INSTRUCTIONS },
      { role: 'user', content: summaryUserMessage(transcript, categoryName) },
    ],
  }
  // Groq can hide Qwen3's reasoning server-side.
  if (s.provider === 'groq' && s.model.includes('qwen')) body.reasoning_format = 'hidden'

  const headers: Record<string, string> = { 'Content-Type': 'application/json' }
  if (s.apiKey) headers.Authorization = `Bearer ${s.apiKey}`
  if (s.provider === 'openrouter') headers['X-Title'] = 'Rememberance'

  let res: Response
  try {
    res = await fetch(`${s.baseUrl.replace(/\/+$/, '')}/chat/completions`, {
      method: 'POST',
      headers,
      body: JSON.stringify(body),
    })
  } catch {
    throw new Error(
      s.provider === 'ollama'
        ? 'Could not reach Ollama. Is it running, and is OLLAMA_ORIGINS set? (See README.)'
        : 'Network error — check your connection and the API address in Settings.',
    )
  }

  const data = await res.json().catch(() => null)
  if (!res.ok) {
    const detail = data?.error?.message ?? data?.message ?? res.statusText
    if (res.status === 401 || res.status === 403) throw new Error(`The API key was rejected (${detail}). Check it in Settings.`)
    if (res.status === 429) throw new Error(`Free limit reached for now — try again later or switch provider. (${detail})`)
    if (res.status === 404) throw new Error(`Model "${s.model}" not found (${detail}). Change it in Settings.`)
    throw new Error(`AI error ${res.status}: ${detail}`)
  }

  const text = cleanOutput(data?.choices?.[0]?.message?.content ?? '')
  if (!text) throw new Error('The AI returned an empty answer — try again or pick another model.')
  return text
}

/** Lists the model IDs the key can use, via the OpenAI-compatible GET /models endpoint. */
export async function listModels(s: Pick<AiSettings, 'provider' | 'baseUrl' | 'apiKey'>): Promise<string[]> {
  const headers: Record<string, string> = {}
  if (s.apiKey) headers.Authorization = `Bearer ${s.apiKey}`
  let res: Response
  try {
    res = await fetch(`${s.baseUrl.replace(/\/+$/, '')}/models`, { headers })
  } catch {
    throw new Error('Network error while loading models.')
  }
  const data = await res.json().catch(() => null)
  if (!res.ok) throw new Error(`Could not load models (${res.status}): ${data?.error?.message ?? res.statusText}`)
  let ids: string[] = (data?.data ?? data?.models ?? []).map((m: { id?: string; name?: string }) =>
    String(m.id ?? m.name ?? '').replace(/^models\//, ''),
  )
  ids = ids.filter(Boolean)
  // Hide non-chat models (speech, safety classifiers, embeddings, image/audio).
  ids = ids.filter((id) => !/whisper|orpheus|guard|safeguard|embed|tts|imagen|veo|aqa|audio|image/i.test(id))
  if (s.provider === 'openrouter') ids = ids.filter((id) => id.endsWith(':free') || id === 'openrouter/free')
  return [...new Set(ids)].sort()
}
