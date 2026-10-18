function focusFor(categoryName: string) {
  const name = categoryName.trim().toLowerCase()
  if (name === 'business') return 'Prioritise decisions, action items (who / what / when), numbers and open questions.'
  if (name === 'homework') return 'Prioritise the main concepts, definitions, steps, and anything to review or submit.'
  return `This note belongs to my "${categoryName}" category.`
}

export const SUMMARY_INSTRUCTIONS = `Turn voice-note transcripts into short bullet-point notes.
The transcript is mostly Egyptian Arabic (sometimes mixed with English) from speech recognition, so it may contain mistakes, repetitions and filler words — infer what the speaker meant.
Write the bullets in the same language the speaker used (Arabic stays Arabic).
Output only the bullets, one per line, each starting with "• ". No title, introduction or closing remarks. Usually 3–10 bullets depending on length.`

/** Message for an API model (instructions go in the system prompt). */
export function summaryUserMessage(transcript: string, categoryName: string) {
  return `${focusFor(categoryName)}\n\nTranscript:\n${transcript}`
}

/** Self-contained prompt to paste into claude.ai. */
export function claudePastePrompt(transcript: string, categoryName: string) {
  return `${SUMMARY_INSTRUCTIONS}\n\n${summaryUserMessage(transcript, categoryName)}`
}
