const GROQ_BASE_URL = "https://api.groq.com/openai/v1";
const DRAFT_MODEL = "openai/gpt-oss-20b";
const TRANSCRIPTION_MODEL = "whisper-large-v3";

type JsonSchema = Record<string, unknown>;

type TranscriptSegment = {
  avg_logprob?: number;
  compression_ratio?: number;
  no_speech_prob?: number;
};

export type TranscriptionQuality = {
  assessment: "clear" | "review" | "retry";
  segmentCount: number;
  lowConfidenceSegments: number;
  likelyNonSpeechSegments: number;
  unusualCompressionSegments: number;
};

export function assessTranscriptionQuality(input: { text: string; segments?: TranscriptSegment[] }): TranscriptionQuality {
  const segments = Array.isArray(input.segments) ? input.segments : [];
  const lowConfidenceSegments = segments.filter((segment) => typeof segment.avg_logprob === "number" && segment.avg_logprob <= -0.85).length;
  const likelyNonSpeechSegments = segments.filter((segment) => typeof segment.no_speech_prob === "number" && segment.no_speech_prob >= 0.72).length;
  const unusualCompressionSegments = segments.filter((segment) => typeof segment.compression_ratio === "number" && segment.compression_ratio >= 2.7).length;
  const shortTranscript = Array.from(input.text.trim()).length < 8;
  const mostlyNonSpeech = segments.length > 0 && likelyNonSpeechSegments >= Math.ceil(segments.length / 2);
  const assessment = shortTranscript || mostlyNonSpeech
    ? "retry"
    : lowConfidenceSegments > 0 || likelyNonSpeechSegments > 0 || unusualCompressionSegments > 0
      ? "review"
      : "clear";
  return { assessment, segmentCount: segments.length, lowConfidenceSegments, likelyNonSpeechSegments, unusualCompressionSegments };
}

function groqHeaders() {
  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) throw new Error("Portable AI provider is not configured.");
  return { Authorization: `Bearer ${apiKey}` };
}

async function requestWithTimeout(url: string, init: RequestInit, timeoutMs: number) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, { ...init, signal: controller.signal });
  } catch (error) {
    if (controller.signal.aborted) throw new Error("The portable AI provider did not respond in time.");
    throw error;
  } finally {
    clearTimeout(timer);
  }
}

export async function groqStructuredDraft(input: { systemPrompt: string; userPrompt: string; schema: JsonSchema }) {
  const strictBody = {
    model: DRAFT_MODEL,
    temperature: 0.000001,
    max_completion_tokens: 1_800,
    messages: [
      { role: "system", content: input.systemPrompt },
      { role: "user", content: input.userPrompt },
    ],
    response_format: { type: "json_schema", json_schema: { name: "fir_saathi_safe_draft", strict: true, schema: input.schema } },
  };
  let response = await requestWithTimeout(`${GROQ_BASE_URL}/chat/completions`, {
    method: "POST",
    headers: { ...groqHeaders(), "Content-Type": "application/json" },
    body: JSON.stringify(strictBody),
  }, 25_000);
  if (!response.ok && response.status === 400) {
    const failedDetail = await response.text();
    if (/failed_generation|jsonschema/i.test(failedDetail)) {
      response = await requestWithTimeout(`${GROQ_BASE_URL}/chat/completions`, {
        method: "POST",
        headers: { ...groqHeaders(), "Content-Type": "application/json" },
        body: JSON.stringify({
          ...strictBody,
          messages: [
            { role: "system", content: `${input.systemPrompt}\n\nReturn one valid JSON object only. It must include fields, missingDetails, followUpQuestions, and bnsSuggestions, even when each value is an empty array. Do not use markdown.` },
            { role: "user", content: input.userPrompt },
          ],
          response_format: { type: "json_object" },
        }),
      }, 25_000);
    } else {
      throw new Error(`Portable drafting provider returned ${response.status}: ${failedDetail.replace(/\s+/g, " ").slice(0, 300)}`);
    }
  }
  if (!response.ok) {
    const detail = (await response.text()).replace(/\s+/g, " ").slice(0, 300);
    throw new Error(`Portable drafting provider returned ${response.status}: ${detail}`);
  }
  const payload = await response.json() as { choices?: Array<{ message?: { content?: string | null } }> };
  const content = payload.choices?.[0]?.message?.content;
  if (typeof content !== "string" || !content.trim()) throw new Error("Portable drafting provider returned no structured content.");
  return content;
}

export async function groqTranscribe(input: { audio: Buffer; mimeType: string; language: string; prompt: string }) {
  if (!input.audio.length) throw new Error("The captured audio was empty.");
  if (input.audio.length > 25 * 1024 * 1024) throw new Error("The audio recording exceeds the portable provider limit.");
  const formData = new FormData();
  const extension = input.mimeType.split("/")[1]?.replace("mpeg", "mp3") || "webm";
  formData.append("file", new Blob([new Uint8Array(input.audio)], { type: input.mimeType }), `statement.${extension}`);
  formData.append("model", TRANSCRIPTION_MODEL);
  formData.append("language", input.language);
  formData.append("prompt", input.prompt);
  formData.append("response_format", "verbose_json");
  formData.append("timestamp_granularities[]", "segment");
  formData.append("timestamp_granularities[]", "word");
  formData.append("temperature", "0");

  const response = await requestWithTimeout(`${GROQ_BASE_URL}/audio/transcriptions`, {
    method: "POST",
    headers: groqHeaders(),
    body: formData,
  }, 45_000);
  if (!response.ok) throw new Error(`Portable transcription provider returned ${response.status}.`);
  const payload = await response.json() as { text?: string; language?: string; segments?: TranscriptSegment[] };
  if (typeof payload.text !== "string" || !payload.text.trim()) throw new Error("The recording did not contain a usable transcript.");
  const text = payload.text.trim();
  const quality = assessTranscriptionQuality({ text, segments: payload.segments });
  if (quality.assessment === "retry") throw new Error("The recording appears to contain too little clear speech. Please record again in a quieter space or use text input.");
  return { text, language: payload.language ?? input.language, quality };
}
