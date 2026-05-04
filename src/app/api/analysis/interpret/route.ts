export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type InterpretRequest = {
  baseUrl?: string;
  apiKey?: string;
  model?: string;
  temperature?: number;
  question?: string;
  context?: unknown;
};

type ChatCompletionResponse = {
  choices?: Array<{
    message?: {
      content?: string;
    };
  }>;
  usage?: unknown;
};

const SYSTEM_PROMPT = [
  "You are an evidence-grounded spatial planning assistant for the Milan TP-IPT platform.",
  "Use only the provided dashboard context, score definitions, city2graph fields, and methodology notes.",
  "Do not invent routes, stops, municipalities, scores, budgets, timelines, or interventions.",
  "Separate score-based evidence from transit-dependency evidence.",
  "Always include data confidence and caveats when relevant.",
  "Return concise planning-oriented answers.",
].join(" ");

export async function POST(request: Request) {
  let payload: InterpretRequest;

  try {
    payload = (await request.json()) as InterpretRequest;
  } catch {
    return Response.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const baseUrl = payload.baseUrl?.trim();
  const apiKey = payload.apiKey?.trim();
  const model = payload.model?.trim();
  const question = payload.question?.trim();

  if (!baseUrl || !apiKey || !model || !question) {
    return Response.json(
      { error: "Missing baseUrl, apiKey, model or question" },
      { status: 400 },
    );
  }

  let endpoint: URL;

  try {
    const normalizedBase = baseUrl.endsWith("/") ? baseUrl : `${baseUrl}/`;
    endpoint = new URL("chat/completions", normalizedBase);

    if (!["http:", "https:"].includes(endpoint.protocol)) {
      throw new Error("Unsupported protocol");
    }
  } catch {
    return Response.json({ error: "Invalid OpenAI-compatible base URL" }, { status: 400 });
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 45_000);

  try {
    const upstream = await fetch(endpoint, {
      method: "POST",
      signal: controller.signal,
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model,
        temperature: payload.temperature ?? 0.2,
        messages: [
          {
            role: "system",
            content: SYSTEM_PROMPT,
          },
          {
            role: "user",
            content: JSON.stringify(
              {
                question,
                context: payload.context,
              },
              null,
              2,
            ),
          },
        ],
      }),
    });

    if (!upstream.ok) {
      const text = await upstream.text();

      return Response.json(
        {
          error: "LLM request failed",
          status: upstream.status,
          detail: text.slice(0, 800),
        },
        { status: 502 },
      );
    }

    const data = (await upstream.json()) as ChatCompletionResponse;
    const answer = data.choices?.[0]?.message?.content?.trim();

    if (!answer) {
      return Response.json(
        { error: "LLM response did not include message content" },
        { status: 502 },
      );
    }

    return Response.json({ answer, usage: data.usage ?? null });
  } catch (error) {
    const message =
      error instanceof Error && error.name === "AbortError"
        ? "LLM request timed out"
        : "LLM request failed";

    return Response.json({ error: message }, { status: 502 });
  } finally {
    clearTimeout(timeout);
  }
}

