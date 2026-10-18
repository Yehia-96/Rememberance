import { useCallback, useEffect, useRef, useState } from 'react'

// Minimal typings for the Web Speech API (Safari exposes it as webkitSpeechRecognition).
type RecognitionResultList = ArrayLike<{ isFinal: boolean; 0: { transcript: string } }>
type RecognitionEvent = { results: RecognitionResultList }
type RecognitionErrorEvent = { error: string; message?: string }
type Recognition = {
  lang: string
  continuous: boolean
  interimResults: boolean
  maxAlternatives: number
  onresult: ((e: RecognitionEvent) => void) | null
  onerror: ((e: RecognitionErrorEvent) => void) | null
  onend: (() => void) | null
  start(): void
  stop(): void
  abort(): void
}
type RecognitionCtor = new () => Recognition

const w = window as unknown as { SpeechRecognition?: RecognitionCtor; webkitSpeechRecognition?: RecognitionCtor }
const RecognitionImpl = w.SpeechRecognition ?? w.webkitSpeechRecognition

export const speechSupported = Boolean(RecognitionImpl)

export type RecorderStatus = 'idle' | 'recording' | 'stopping' | 'done'

function join(...parts: string[]) {
  return parts
    .map((p) => p.trim())
    .filter(Boolean)
    .join(' ')
}

const FATAL_ERRORS = new Set(['not-allowed', 'service-not-allowed', 'language-not-supported', 'audio-capture'])

/**
 * Live speech-to-text with automatic restarts (Safari ends recognition after pauses / ~1 minute),
 * plus optional audio capture with MediaRecorder for the whole session.
 */
export function useSpeechRecorder(lang: string) {
  const [status, setStatus] = useState<RecorderStatus>('idle')
  const [text, setText] = useState('')
  const [interim, setInterim] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [audioWarning, setAudioWarning] = useState<string | null>(null)
  const [elapsed, setElapsed] = useState(0)
  const [audio, setAudio] = useState<Blob | null>(null)

  const committed = useRef('')
  const sessionFinal = useRef('')
  const sessionInterim = useRef('')
  const stopRequested = useRef(false)
  const recognition = useRef<Recognition | null>(null)
  const recorder = useRef<MediaRecorder | null>(null)
  const stream = useRef<MediaStream | null>(null)
  const chunks = useRef<Blob[]>([])
  const startedAt = useRef(0)
  const finished = useRef(false)
  const startSessionRef = useRef<() => void>(() => {})

  useEffect(() => {
    if (status !== 'recording') return
    const t = setInterval(() => setElapsed(Date.now() - startedAt.current), 500)
    return () => clearInterval(t)
  }, [status])

  const finish = useCallback(() => {
    if (finished.current) return
    finished.current = true
    // Keep any text from a session that never reported "end".
    committed.current = join(committed.current, sessionFinal.current, sessionInterim.current)
    sessionFinal.current = ''
    sessionInterim.current = ''
    setElapsed(Date.now() - startedAt.current)
    setText(committed.current)
    setInterim('')
    const mr = recorder.current
    const done = () => {
      stream.current?.getTracks().forEach((t) => t.stop())
      stream.current = null
      recorder.current = null
      setStatus('done')
    }
    if (mr && mr.state !== 'inactive') {
      mr.onstop = () => {
        if (chunks.current.length) setAudio(new Blob(chunks.current, { type: mr.mimeType || 'audio/mp4' }))
        done()
      }
      mr.stop()
    } else {
      done()
    }
  }, [])

  const startSession = useCallback(() => {
    if (!RecognitionImpl) return
    const r = new RecognitionImpl()
    r.lang = lang
    r.continuous = true
    r.interimResults = true
    r.maxAlternatives = 1
    sessionFinal.current = ''
    sessionInterim.current = ''

    r.onresult = (e) => {
      let fin = ''
      let inter = ''
      for (let i = 0; i < e.results.length; i++) {
        const res = e.results[i]
        if (res.isFinal) fin = join(fin, res[0].transcript)
        else inter = join(inter, res[0].transcript)
      }
      sessionFinal.current = fin
      sessionInterim.current = inter
      setText(join(committed.current, fin))
      setInterim(inter)
    }

    r.onerror = (e) => {
      if (e.error === 'no-speech' || e.error === 'aborted') return
      if (FATAL_ERRORS.has(e.error)) {
        stopRequested.current = true
        setError(
          e.error === 'not-allowed' || e.error === 'service-not-allowed'
            ? 'Microphone or speech recognition is blocked. On iPhone: Settings → Safari → Microphone → Allow, and make sure Siri & Dictation is turned on.'
            : e.error === 'audio-capture'
              ? 'The microphone is busy. Try turning off “Save audio” in Settings.'
              : `Speech recognition error: ${e.error}`,
        )
      }
    }

    r.onend = () => {
      committed.current = join(committed.current, sessionFinal.current, sessionInterim.current)
      sessionFinal.current = ''
      sessionInterim.current = ''
      setText(committed.current)
      setInterim('')
      if (!stopRequested.current) {
        try {
          startSessionRef.current()
          return
        } catch {
          // fall through and finish
        }
      }
      finish()
    }

    recognition.current = r
    r.start()
  }, [lang, finish])

  useEffect(() => {
    startSessionRef.current = startSession
  }, [startSession])

  const start = useCallback(
    async (saveAudio: boolean) => {
      if (!RecognitionImpl) return
      committed.current = ''
      chunks.current = []
      stopRequested.current = false
      finished.current = false
      setText('')
      setInterim('')
      setError(null)
      setAudioWarning(null)
      setAudio(null)
      setElapsed(0)

      if (saveAudio && typeof MediaRecorder !== 'undefined') {
        try {
          stream.current = await navigator.mediaDevices.getUserMedia({ audio: true })
          const mr = new MediaRecorder(stream.current)
          mr.ondataavailable = (ev) => {
            if (ev.data.size > 0) chunks.current.push(ev.data)
          }
          mr.start(1000)
          recorder.current = mr
        } catch {
          setAudioWarning('Audio could not be recorded — only the transcript will be saved.')
        }
      }

      startedAt.current = Date.now()
      setStatus('recording')
      try {
        startSession()
      } catch (e) {
        setError(String(e))
        finish()
      }
    },
    [startSession, finish],
  )

  const stop = useCallback(() => {
    stopRequested.current = true
    setStatus('stopping')
    recognition.current?.stop()
    // Safety net: if Safari never fires "end", finish anyway.
    setTimeout(finish, 2500)
  }, [finish])

  // Abort everything if the page is left mid-recording.
  useEffect(
    () => () => {
      stopRequested.current = true
      recognition.current?.abort()
      stream.current?.getTracks().forEach((t) => t.stop())
    },
    [],
  )

  return { status, text, interim, error, audioWarning, elapsed, audio, start, stop }
}
