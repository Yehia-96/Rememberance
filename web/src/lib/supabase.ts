import { createClient } from '@supabase/supabase-js'

const url = import.meta.env.VITE_SUPABASE_URL as string | undefined
const key = import.meta.env.VITE_SUPABASE_KEY as string | undefined

export const supabaseConfigured = Boolean(url && key)

// The publishable/anon key is safe to ship in the browser; Row Level Security protects the data.
export const supabase = createClient(url ?? 'http://localhost', key ?? 'missing')

export const MEDIA_BUCKET = 'media'
