export const CATEGORY_COLORS = ['#2563eb', '#16a34a', '#ea580c', '#9333ea', '#db2777', '#0891b2', '#ca8a04', '#4b5563']

export const CATEGORY_EMOJIS = ['💼', '📚', '💡', '🏠', '❤️', '🛒', '✈️', '🏋️', '🎓', '📝', '🧠', '📞']

export function formatDate(iso: string): string {
  return new Date(iso).toLocaleString(undefined, {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  })
}

export function formatDuration(ms: number | null): string {
  if (!ms) return '0:00'
  const total = Math.round(ms / 1000)
  return `${Math.floor(total / 60)}:${(total % 60).toString().padStart(2, '0')}`
}

const SAVE_AUDIO_KEY = 'rememberance.saveAudio'

export function getSaveAudio(): boolean {
  try {
    return localStorage.getItem(SAVE_AUDIO_KEY) !== 'false'
  } catch {
    return true
  }
}

export function setSaveAudio(value: boolean) {
  try {
    localStorage.setItem(SAVE_AUDIO_KEY, String(value))
  } catch {
    // ignore (private mode)
  }
}
