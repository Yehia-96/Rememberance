import Anthropic from "@anthropic-ai/sdk";
import * as SecureStore from "expo-secure-store";

const KEY_NAME = "anthropic_api_key";

export async function getApiKey(): Promise<string | null> {
  return SecureStore.getItemAsync(KEY_NAME);
}

export async function setApiKey(key: string) {
  if (key.trim()) await SecureStore.setItemAsync(KEY_NAME, key.trim());
  else await SecureStore.deleteItemAsync(KEY_NAME);
}

const SYSTEM_PROMPT = `You turn raw speech-to-text transcripts into short, useful bullet-point notes.
The transcript is usually Egyptian Arabic, sometimes mixed with English words, and may contain recognition mistakes, repetitions and filler words — infer the intended meaning.
Write the notes in the same language the speaker used (Egyptian Arabic stays Arabic).
Output only the bullets, one per line, each starting with "• ". No title, no introduction, no closing remarks.
Keep it concise: usually 3–10 bullets depending on the transcript length.`;

const CATEGORY_HINTS: Record<string, string> = {
  business: "This is a business recording. Prioritise decisions, action items (who / what / when), numbers, and open questions.",
  homework: "This is a study/homework recording. Prioritise the main concepts, definitions, steps, and anything to review or submit.",
};

export async function summarizeTranscript(transcript: string, categoryName: string): Promise<string> {
  const apiKey = await getApiKey();
  if (!apiKey) throw new Error("Add your Anthropic API key in Settings first.");

  const client = new Anthropic({ apiKey });
  const hint =
    CATEGORY_HINTS[categoryName.trim().toLowerCase()] ?? `This recording belongs to the category "${categoryName}".`;

  // Server-side fallback: if the request is declined by a safety classifier, the API reruns it on a fallback model.
  const response = await client.beta.messages.create({
    model: "claude-opus-5-5",
    max_tokens: 4000,
    betas: ["server-side-fallback-2026-07-01"],
    fallbacks: "default",
    output_config: { effort: "medium" },
    system: SYSTEM_PROMPT,
    messages: [{ role: "user", content: `${hint}\n\n<transcript>\n${transcript}\n</transcript>` }],
  });

  if (response.stop_reason === "refusal") {
    throw new Error("The AI declined to summarize this recording.");
  }
  const text = response.content
    .map((block) => (block.type === "text" ? block.text : ""))
    .join("")
    .trim();
  if (!text) throw new Error("The AI returned an empty summary.");
  return text;
}
