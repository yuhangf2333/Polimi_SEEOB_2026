import {
  DEFAULT_LLM_SETTINGS,
  LLM_PROVIDER_PRESETS,
  type LlmProviderId,
} from "./llm-settings.ts";

type LlmRuntimeInput = {
  provider?: string;
  baseUrl?: string;
  apiKey?: string;
  model?: string;
  question?: string;
};

type LlmRuntimeEnv = Record<string, string | undefined>;

export type LlmRuntimeConfig = {
  provider: LlmProviderId;
  baseUrl: string;
  apiKey: string;
  model: string;
  question: string;
  missingFields: string[];
};

export function resolveLlmRuntimeConfig(
  input: LlmRuntimeInput,
  env: LlmRuntimeEnv = process.env,
): LlmRuntimeConfig {
  const provider = isLlmProviderId(input.provider)
    ? input.provider
    : DEFAULT_LLM_SETTINGS.provider;
  const preset = LLM_PROVIDER_PRESETS[provider];
  const clientApiKey = input.apiKey?.trim() ?? "";
  const useServerCredential = !clientApiKey;
  const isDefaultProvider = provider === DEFAULT_LLM_SETTINGS.provider;
  const baseUrl =
    (useServerCredential ? env.LLM_BASE_URL?.trim() : undefined) ||
    input.baseUrl?.trim() ||
    (isDefaultProvider ? preset.baseUrl : "");
  const apiKey = clientApiKey || env.LLM_API_KEY?.trim() || "";
  const model =
    (useServerCredential ? env.LLM_MODEL?.trim() : undefined) ||
    input.model?.trim() ||
    (isDefaultProvider ? preset.defaultModel : "");
  const question = input.question?.trim() ?? "";
  const missingFields = [
    !baseUrl ? "baseUrl" : null,
    !apiKey
      ? isDefaultProvider && useServerCredential
        ? "serverApiKey"
        : "apiKey"
      : null,
    !model ? "model" : null,
    !question ? "question" : null,
  ].filter((field): field is string => Boolean(field));

  return {
    provider,
    baseUrl,
    apiKey,
    model,
    question,
    missingFields,
  };
}

export function buildLlmRequestHeaders(apiKey: string) {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };

  if (apiKey) {
    headers.Authorization = `Bearer ${apiKey}`;
  }

  return headers;
}

export function formatMissingLlmRuntimeConfigError(config: LlmRuntimeConfig) {
  if (config.missingFields.includes("serverApiKey")) {
    return "Default provider is missing the server owner API key. Set LLM_API_KEY on the server.";
  }

  if (config.missingFields.includes("apiKey")) {
    return "Missing apiKey. Enter an API key or configure LLM_API_KEY on the server.";
  }

  return `Missing ${config.missingFields.join(", ")}`;
}

export function formatLlmUpstreamError({
  config,
  detail,
  status,
}: {
  config: LlmRuntimeConfig;
  detail: string;
  status: number;
}) {
  if (
    config.provider === DEFAULT_LLM_SETTINGS.provider &&
    status === 401
  ) {
    return "Default provider server API key is invalid or expired.";
  }

  const upstreamMessage = extractUpstreamErrorMessage(detail);

  return upstreamMessage
    ? `LLM request failed (${status}): ${upstreamMessage}`
    : `LLM request failed (${status})`;
}

function extractUpstreamErrorMessage(detail: string) {
  try {
    const parsed = JSON.parse(detail) as {
      error?: {
        message?: string;
      };
    };

    return parsed.error?.message?.trim() || "";
  } catch {
    return detail.trim().split(/\r?\n/)[0]?.slice(0, 160) ?? "";
  }
}

function isLlmProviderId(provider: string | undefined): provider is LlmProviderId {
  return Boolean(provider && provider in LLM_PROVIDER_PRESETS);
}
