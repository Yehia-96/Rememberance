export type Category = {
  id: string
  name: string
  emoji: string
  color: string
  created_at: string
}

export type CategoryWithCount = Category & { recordings: { count: number }[] }

export type Recording = {
  id: string
  category_id: string
  title: string | null
  transcript: string
  summary: string | null
  /** Storage paths inside the "media" bucket. */
  audio_path: string | null
  photo_path: string | null
  pdf_path: string | null
  pdf_name: string | null
  location_name: string | null
  latitude: number | null
  longitude: number | null
  duration_ms: number | null
  created_at: string
}
