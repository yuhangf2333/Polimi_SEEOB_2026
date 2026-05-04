export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type ModelsRequest = {
  baseUrl?: string;
  apiKey?: string;
};

type ModelsResponse = {
  data?: Array<{ id?: string }>;
};

export async function POST(request: Request) {
  let payload: ModelsRequest;

  try {
    payload = (await request.json()) as ModelsRequest;
  } catch {
    return Response.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const baseUrl = payload.baseUrl?.trim();
  const apiKey = payload.apiKey?.trim();

  if (!baseUrl || !apiKey) {
    return Response.json(
      { error: "Missing baseUrl or apiKey" },
      { status: 400 },
    );
  }

  let endpoint: URL;

  try {
    const normalizedBase = baseUrl.endsWith("/") ? baseUrl : `${baseUrl}/`;
    endpoint = new URL("models", normalizedBase);

    if (!["http:", "https:"].includes(endpoint.protocol)) {
      throw new Error("Unsupported protocol");
    }
  } catch {
    return Response.json(
      { error: "Invalid OpenAI-compatible base URL" },
      { status: 400 },
    );
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 20_000);

  try {
    const response = await fetch(endpoint, {
      signal: controller.signal,
      headers: {
        Authorization: `Bearer ${apiKey}`,
        Accept: "application/json",
      },
    });

    if (!response.ok) {
      const detail = await response.text();

      return Response.json(
        {
          error: "Model list request failed",
          status: response.status,
          detail: detail.slice(0, 500),
        },
        { status: 502 },
      );
    }

    const payload = (await response.json()) as ModelsResponse;
    const models = (payload.data ?? [])
      .flatMap((model) => (model.id ? [model.id] : []))
      .sort((a, b) => a.localeCompare(b));

    return Response.json({ models });
  } catch (error) {
    const message =
      error instanceof Error && error.name === "AbortError"
        ? "Model list request timed out"
        : "Model list request failed";

    return Response.json({ error: message }, { status: 502 });
  } finally {
    clearTimeout(timeout);
  }
}

