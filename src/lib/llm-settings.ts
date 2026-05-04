export type LlmProviderId =
  | "openai"
  | "openrouter"
  | "deepseek"
  | "openai-compatible";

export type LlmSettings = {
  enabled: boolean;
  provider: LlmProviderId;
  baseUrl: string;
  apiKey: string;
  model: string;
  temperature: number;
};

export const LLM_PROVIDER_PRESETS: Record<
  LlmProviderId,
  {
    label: string;
    baseUrl: string;
    defaultModel: string;
  }
> = {
  openai: {
    label: "OpenAI",
    baseUrl: "https://api.openai.com/v1",
    defaultModel: "gpt-4o-mini",
  },
  openrouter: {
    label: "OpenRouter",
    baseUrl: "https://openrouter.ai/api/v1",
    defaultModel: "openai/gpt-4o-mini",
  },
  deepseek: {
    label: "DeepSeek",
    baseUrl: "https://api.deepseek.com/v1",
    defaultModel: "deepseek-chat",
  },
  "openai-compatible": {
    label: "Custom OpenAI-compatible",
    baseUrl: "https://api.example.com/v1",
    defaultModel: "gpt-4o-mini",
  },
};

export const DEFAULT_LLM_SETTINGS: LlmSettings = {
  enabled: false,
  provider: "openai",
  baseUrl: "https://api.openai.com/v1",
  apiKey: "",
  model: "gpt-4o-mini",
  temperature: 0.2,
};
