import { NextResponse } from "next/server";

type AssistantMode = "hint" | "block";

type ChatCompletionsResponse = {
  choices?: Array<{
    message?: {
      content?: string | Array<{ type?: string; text?: string }>;
    };
  }>;
  model?: string;
  error?: {
    message?: string;
    type?: string;
    code?: string | number;
  };
};

const MWS_CHAT_COMPLETIONS_URL = "https://api.gpt.mws.ru/v1/chat/completions";
const DEFAULT_HINT_MODEL =
  process.env.MWS_GPT_MODEL_HINT ||
  process.env.MWS_GPT_MODEL ||
  "mws-gpt-alpha";
const DEFAULT_BLOCK_MODEL =
  process.env.MWS_GPT_MODEL_BLOCK ||
  process.env.MWS_GPT_MODEL ||
  "qwen2.5-72b-instruct";
const FALLBACK_MODEL = "mws-gpt-alpha";

function extractContent(payload: ChatCompletionsResponse): string {
  const content = payload.choices?.[0]?.message?.content;
  if (typeof content === "string") {
    return content.trim();
  }
  if (Array.isArray(content)) {
    return content
      .map((part) => (typeof part?.text === "string" ? part.text : ""))
      .join("")
      .trim();
  }
  return "";
}

function normalizePotentialMojibake(text: string): string {
  if (!text || !/[\u00D0\u00D1]/.test(text)) {
    return text;
  }

  try {
    const bytes = new Uint8Array(
      Array.from(text, (ch) => ch.charCodeAt(0) & 0xff),
    );
    const decoded = new TextDecoder("utf-8").decode(bytes).trim();
    return decoded || text;
  } catch {
    return text;
  }
}

function systemPromptForMode(mode: AssistantMode): string {
  if (mode === "block") {
    return [
      "You are an expert Russian copywriter for an editor.",
      "Return only final content in Russian, ready to paste.",
      "No explanations, no meta-comments, no preface.",
      "No markdown syntax characters like #, *, ```.",
      "Use clean structure with short paragraphs and lists where useful.",
    ].join(" ");
  }

  return [
    "You are a Russian writing assistant.",
    "Return concise, practical output in Russian.",
    "No extra explanations or framing text.",
  ].join(" ");
}

function parseErrorMessage(
  payload: ChatCompletionsResponse,
  rawText: string,
): string {
  if (typeof payload.error?.message === "string" && payload.error.message) {
    return payload.error.message;
  }

  return rawText || "MWS GPT request failed";
}

async function callMwsChatCompletions(params: {
  apiKey: string;
  model: string;
  mode: AssistantMode;
  userContent: string;
}) {
  const abortController = new AbortController();
  const timeout = setTimeout(() => abortController.abort(), 30000);

  try {
    const response = await fetch(MWS_CHAT_COMPLETIONS_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${params.apiKey}`,
      },
      body: JSON.stringify({
        model: params.model,
        temperature: params.mode === "block" ? 0.7 : 0.4,
        max_tokens: params.mode === "block" ? 700 : 350,
        messages: [
          { role: "system", content: systemPromptForMode(params.mode) },
          { role: "user", content: params.userContent },
        ],
      }),
      signal: abortController.signal,
    });

    const rawText = await response.text();
    let payload: ChatCompletionsResponse = {};
    try {
      payload = JSON.parse(rawText) as ChatCompletionsResponse;
    } catch {
      payload = {};
    }

    return { response, rawText, payload };
  } finally {
    clearTimeout(timeout);
  }
}

export async function POST(request: Request) {
  const apiKey = process.env.MWS_GPT_API_KEY;
  if (!apiKey) {
    return NextResponse.json(
      { error: "MWS_GPT_API_KEY is not configured in frontend/.env.local" },
      { status: 500 },
    );
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const mode: AssistantMode =
    typeof body === "object" &&
    body !== null &&
    "mode" in body &&
    body.mode === "block"
      ? "block"
      : "hint";

  const prompt =
    typeof body === "object" &&
    body !== null &&
    "prompt" in body &&
    typeof body.prompt === "string"
      ? body.prompt.trim()
      : "";

  const context =
    typeof body === "object" &&
    body !== null &&
    "context" in body &&
    typeof body.context === "string"
      ? body.context.trim()
      : "";

  if (!prompt) {
    return NextResponse.json({ error: "Prompt is required" }, { status: 400 });
  }

  const userContent = [
    `User request:\n${prompt}`,
    context ? `Editor context:\n${context.slice(0, 6000)}` : "",
  ]
    .filter(Boolean)
    .join("\n\n");

  const primaryModel = mode === "block" ? DEFAULT_BLOCK_MODEL : DEFAULT_HINT_MODEL;
  const modelCandidates = Array.from(new Set([primaryModel, FALLBACK_MODEL]));

  let lastError = "MWS GPT request failed";
  let lastStatus = 500;

  for (const model of modelCandidates) {
    for (let attempt = 1; attempt <= 2; attempt += 1) {
      try {
        const { response, rawText, payload } = await callMwsChatCompletions({
          apiKey,
          model,
          mode,
          userContent,
        });

        if (response.ok) {
          const text = normalizePotentialMojibake(extractContent(payload));
          if (!text) {
            lastError = "MWS GPT returned empty content";
            lastStatus = 502;
            break;
          }

          return NextResponse.json({ text, model: payload.model || model });
        }

        const message = parseErrorMessage(payload, rawText);
        lastError = message;
        lastStatus = response.status;

        const modelDenied =
          response.status === 401 &&
          (payload.error?.type === "team_model_access_denied" ||
            payload.error?.code === "401");
        if (modelDenied) {
          break;
        }

        const transientError =
          response.status === 429 || response.status >= 500;
        if (transientError && attempt < 2) {
          continue;
        }

        return NextResponse.json({ error: message }, { status: response.status });
      } catch (error) {
        lastError =
          error instanceof Error ? error.message : "MWS GPT request failed";
        lastStatus = 500;

        if (attempt < 2) {
          continue;
        }
      }
    }
  }

  return NextResponse.json({ error: lastError }, { status: lastStatus });
}
