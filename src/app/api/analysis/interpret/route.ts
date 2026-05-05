import { retrieveAnalysisKnowledge } from "@/lib/analysis-rag";
import { retrieveCity2graphRelationships } from "@/lib/city2graph-relationships";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type InterpretRequest = {
  baseUrl?: string;
  apiKey?: string;
  model?: string;
  temperature?: number;
  question?: string;
  context?: unknown;
  stream?: boolean;
};

type ChatCompletionResponse = {
  choices?: Array<{
    message?: {
      content?: string;
    };
  }>;
  usage?: unknown;
};

type ChatCompletionChunk = {
  choices?: Array<{
    delta?: {
      content?: string;
    };
  }>;
};

const SYSTEM_PROMPT = [
  "You are an evidence-grounded spatial planning assistant for the Milan TP-IPT platform.",
  "Use only the provided live dashboard context and retrieved current-project knowledge.",
  "You may answer broader questions about this project, but do not answer from general urban-planning knowledge unless the retrieved project evidence supports it.",
  "If a question is outside the current project evidence, say what is not covered and name the evidence that would be needed.",
  "Do not invent routes, stops, municipalities, scores, budgets, timelines, datasets, or interventions.",
  "Separate score-based evidence from transit-dependency evidence.",
  "city2graph evidence explains transit dependency and intervention logic; it does not recalculate the ABCD/IPI score.",
  "When city2graph_relationship_context is present, use it as the authoritative source for exact route dependency, stop dependency, primary route, primary stop, ranks, wait time, walk time, frequency, and redundancy.",
  "When nearest walking-access evidence is present, use it for closest healthcare, pharmacy, school, food retail, service walking distance, PTAL walking distance, detour ratios, and B/C mismatch; distinguish it from route and stop dependency.",
  "The user payload includes response_template. Use it as the answer shape, required evidence checklist, and table preference, but do not print the template JSON or mechanically repeat every section.",
  "Default answer pattern: one direct finding sentence, then a markdown table when it improves comparison, then interpretation, then the next action or validation step when relevant.",
  "For nearest_relationship answers, prefer a table with Relationship, Value, and Planning meaning. For comparison answers, prefer Evidence, Signal, Implication, and Caveat.",
  "Use a professional but natural planning tone. Avoid repeating the same rigid headings in every answer.",
  "Keep answers compact, but include enough reasoning to be useful.",
  "When comparing scores, evidence, caveats, interventions, or validation tasks, prefer a markdown table.",
  "Do not wrap markdown tables in code fences.",
  "When the user asks what to do next, include a concrete intervention recommendation and one validation step.",
  "Always include data confidence or caveats when they affect interpretation.",
].join(" ");

export async function POST(request: Request) {
  let payload: InterpretRequest;

  try {
    payload = (await request.json()) as InterpretRequest;
  } catch {
    return Response.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const clientApiKey = payload.apiKey?.trim();
  const useServerCredential = !clientApiKey;
  const baseUrl = useServerCredential
    ? process.env.LLM_BASE_URL?.trim() || payload.baseUrl?.trim()
    : payload.baseUrl?.trim();
  const apiKey = clientApiKey || process.env.LLM_API_KEY?.trim();
  const model = useServerCredential
    ? process.env.LLM_MODEL?.trim() || payload.model?.trim()
    : payload.model?.trim();
  const question = payload.question?.trim();

  if (!baseUrl || !apiKey || !model || !question) {
    return Response.json(
      { error: "Missing baseUrl, apiKey, model or question" },
      { status: 400 },
    );
  }

  const envTemperature = Number(process.env.LLM_TEMPERATURE);
  const temperature = Number.isFinite(payload.temperature)
    ? payload.temperature
    : Number.isFinite(envTemperature)
      ? envTemperature
      : 0.2;

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
    const [projectKnowledge, city2graphRelationships] = await Promise.all([
      retrieveAnalysisKnowledge({
        question,
        context: payload.context,
      }),
      retrieveCity2graphRelationships({
        context: payload.context,
      }),
    ]);
    const upstream = await fetch(endpoint, {
      method: "POST",
      signal: controller.signal,
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model,
        temperature,
        stream: Boolean(payload.stream),
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
                answer_mode: projectKnowledge.answerMode,
                response_template: projectKnowledge.responseGuide,
                dashboard_context: payload.context,
                retrieved_project_knowledge: projectKnowledge.contextText,
                city2graph_relationship_context:
                  city2graphRelationships?.contextText ?? null,
                city2graph_relationship_sources:
                  city2graphRelationships?.sources ?? [],
                structured_city2graph_relationships: city2graphRelationships
                  ? {
                      h3_id: city2graphRelationships.h3Id,
                      summary: city2graphRelationships.summary,
                      top_routes: city2graphRelationships.topRoutes,
                      top_stops: city2graphRelationships.topStops,
                      nearest_access: city2graphRelationships.nearestAccess,
                    }
                  : null,
                retrieved_sources: projectKnowledge.entries.map((entry) => ({
                  id: entry.id,
                  title: entry.title,
                  source: entry.source,
                })),
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

    if (payload.stream) {
      const contentType = upstream.headers.get("content-type") ?? "";

      if (!upstream.body) {
        return Response.json(
          { error: "LLM stream did not include a response body" },
          { status: 502 },
        );
      }

      if (!contentType.includes("text/event-stream")) {
        const data = (await upstream.json()) as ChatCompletionResponse;
        const answer = data.choices?.[0]?.message?.content?.trim();

        if (!answer) {
          return Response.json(
            { error: "LLM response did not include message content" },
            { status: 502 },
          );
        }

        return new Response(answer, {
          headers: {
            "Cache-Control": "no-cache, no-transform",
            "Content-Type": "text/plain; charset=utf-8",
          },
        });
      }

      return new Response(streamOpenAiText(upstream.body), {
        headers: {
          "Cache-Control": "no-cache, no-transform",
          "Content-Type": "text/plain; charset=utf-8",
        },
      });
    }

    const data = (await upstream.json()) as ChatCompletionResponse;
    const answer = data.choices?.[0]?.message?.content?.trim();

    if (!answer) {
      return Response.json(
        { error: "LLM response did not include message content" },
        { status: 502 },
      );
    }

    return Response.json({
      answer,
      usage: data.usage ?? null,
      knowledge: {
        answerMode: projectKnowledge.answerMode,
        responseGuide: projectKnowledge.responseGuide,
        sources: projectKnowledge.entries.map((entry) => ({
          id: entry.id,
          title: entry.title,
          source: entry.source,
        })),
        city2graphRelationships: city2graphRelationships
          ? {
              h3Id: city2graphRelationships.h3Id,
              sources: city2graphRelationships.sources,
              nearestAccess: city2graphRelationships.nearestAccess,
            }
          : null,
      },
    });
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

function streamOpenAiText(body: ReadableStream<Uint8Array>) {
  const decoder = new TextDecoder();
  const encoder = new TextEncoder();
  let buffer = "";

  return body.pipeThrough(
    new TransformStream<Uint8Array, Uint8Array>({
      transform(chunk, controller) {
        buffer += decoder.decode(chunk, { stream: true });
        const lines = buffer.split(/\r?\n/);
        buffer = lines.pop() ?? "";

        for (const line of lines) {
          const trimmed = line.trim();
          if (!trimmed.startsWith("data:")) continue;

          const data = trimmed.slice(5).trim();
          if (!data || data === "[DONE]") continue;

          try {
            const parsed = JSON.parse(data) as ChatCompletionChunk;
            const content = parsed.choices?.[0]?.delta?.content;
            if (content) controller.enqueue(encoder.encode(content));
          } catch {
            // Ignore non-JSON keep-alive chunks from OpenAI-compatible providers.
          }
        }
      },
      flush(controller) {
        const tail = decoder.decode();
        if (tail) buffer += tail;

        const trimmed = buffer.trim();
        if (!trimmed.startsWith("data:")) return;

        const data = trimmed.slice(5).trim();
        if (!data || data === "[DONE]") return;

        try {
          const parsed = JSON.parse(data) as ChatCompletionChunk;
          const content = parsed.choices?.[0]?.delta?.content;
          if (content) controller.enqueue(encoder.encode(content));
        } catch {
          // Ignore malformed trailing chunks.
        }
      },
    }),
  );
}
