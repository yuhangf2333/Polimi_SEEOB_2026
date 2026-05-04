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
    baseUrl: "https://token-plan-cn.xiaomimimo.com/v1",
    defaultModel: "mimo-v2-omni",
  },
};

export const DEFAULT_LLM_SETTINGS: LlmSettings = {
  enabled: true,
  provider: "openai-compatible",
  baseUrl: "https://token-plan-cn.xiaomimimo.com/v1",
  apiKey: "",
  model: "mimo-v2-omni",
  temperature: 0.1,
};
