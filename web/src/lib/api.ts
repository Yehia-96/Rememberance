import { MEDIA_BUCKET, supabase } from './supabase'
import type { Category, CategoryWithCount, Recording } from './types'

function check<T>(res: { data: T; error: { message: string } | null }): T {
  if (res.error) throw new Error(res.error.message)
  return res.data
}

// ---- Categories ----

let seeding: Promise<unknown> | null = null

export async function listCategories(): Promise<CategoryWithCount[]> {
  const fetchAll = async () =>
    check(await supabase.from('categories').select('*, recordings(count)').order('created_at')) as CategoryWithCount[]
  const cats = await fetchAll()
  if (cats.length === 0) {
    // First run for this account: create the default categories (once, even if called twice at the same time).
    seeding ??= Promise.resolve(
      supabase.from('categories').insert([
        { name: 'Business', emoji: '💼', color: '#2563eb' },
        { name: 'Homework', emoji: '📚', color: '#16a34a' },
      ]),
    )
    await seeding
    return fetchAll()
  }
  return cats
}

export async function getCategory(id: string): Promise<Category | null> {
  return check(await supabase.from('categories').select('*').eq('id', id).maybeSingle())
}

export async function saveCategory(fields: { id?: string; name: string; emoji: string; color: string }) {
  const { id, ...rest } = fields
  if (id) check(await supabase.from('categories').update(rest).eq('id', id))
  else check(await supabase.from('categories').insert(rest))
}

export async function deleteCategory(id: string) {
  const recs = await listRecordings(id)
  await removeFiles(recs.flatMap(filePaths))
  check(await supabase.from('categories').delete().eq('id', id))
}

// ---- Recordings ----

export async function listRecordings(categoryId: string): Promise<Recording[]> {
  return check(
    await supabase.from('recordings').select('*').eq('category_id', categoryId).order('created_at', { ascending: false }),
  ) ?? []
}

export async function getRecording(id: string): Promise<Recording | null> {
  return check(await supabase.from('recordings').select('*').eq('id', id).maybeSingle())
}

export async function updateRecording(id: string, fields: Partial<Omit<Recording, 'id' | 'created_at'>>) {
  check(await supabase.from('recordings').update(fields).eq('id', id))
}

export type NewRecording = {
  categoryId: string
  title: string | null
  transcript: string
  locationName: string | null
  latitude: number | null
  longitude: number | null
  durationMs: number
  audio: Blob | null
  photo: File | null
  pdf: File | null
}

function extensionFor(blob: Blob, fallback: string) {
  if (blob instanceof File && blob.name.includes('.')) return blob.name.split('.').pop()!.toLowerCase()
  if (blob.type.includes('mp4') || blob.type.includes('m4a') || blob.type.includes('aac')) return 'm4a'
  if (blob.type.includes('webm')) return 'webm'
  if (blob.type.includes('ogg')) return 'ogg'
  return fallback
}

async function upload(path: string, blob: Blob) {
  check(
    await supabase.storage.from(MEDIA_BUCKET).upload(path, blob, {
      contentType: blob.type || undefined,
      upsert: true,
    }),
  )
  return path
}

export async function createRecording(r: NewRecording): Promise<string> {
  const { data: userData } = await supabase.auth.getUser()
  const userId = userData.user?.id
  if (!userId) throw new Error('You are signed out. Sign in again and retry.')

  const row = check(
    await supabase
      .from('recordings')
      .insert({
        category_id: r.categoryId,
        title: r.title,
        transcript: r.transcript,
        location_name: r.locationName,
        latitude: r.latitude,
        longitude: r.longitude,
        duration_ms: r.durationMs,
      })
      .select('id')
      .single(),
  ) as { id: string }

  const base = `${userId}/${row.id}`
  const paths: Partial<Recording> = {}
  if (r.audio) paths.audio_path = await upload(`${base}/audio.${extensionFor(r.audio, 'm4a')}`, r.audio)
  if (r.photo) paths.photo_path = await upload(`${base}/photo.${extensionFor(r.photo, 'jpg')}`, r.photo)
  if (r.pdf) {
    paths.pdf_path = await upload(`${base}/document.pdf`, r.pdf)
    paths.pdf_name = r.pdf.name
  }
  if (Object.keys(paths).length) await updateRecording(row.id, paths)
  return row.id
}

function filePaths(r: Recording): string[] {
  return [r.audio_path, r.photo_path, r.pdf_path].filter((p): p is string => !!p)
}

async function removeFiles(paths: string[]) {
  if (paths.length) await supabase.storage.from(MEDIA_BUCKET).remove(paths)
}

export async function deleteRecording(r: Recording) {
  await removeFiles(filePaths(r))
  check(await supabase.from('recordings').delete().eq('id', r.id))
}

export async function signedUrl(path: string): Promise<string> {
  const data = check(await supabase.storage.from(MEDIA_BUCKET).createSignedUrl(path, 60 * 60))
  if (!data) throw new Error('Could not load file.')
  return data.signedUrl
}
