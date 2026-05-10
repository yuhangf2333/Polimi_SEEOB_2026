export type LlmProviderId =
  | "xiaomi"
  | "openai"
  | "google"
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
    description: string;
    baseUrl: string;
    defaultModel: string;
    modelOptions: string[];
  }
> = {
  xiaomi: {
    label: "Default",
    description: "Xiaomi Mimo built-in default for the analysis chat.",
    baseUrl: "https://token-plan-cn.xiaomimimo.com/v1",
    defaultModel: "mimo-v2-omni",
    modelOptions: ["mimo-v2-omni"],
  },
  openai: {
    label: "OpenAI",
    description: "OpenAI Chat Completions and compatible GPT models.",
    baseUrl: "https://api.openai.com/v1",
    defaultModel: "gpt-5-mini",
    modelOptions: ["gpt-5-mini", "gpt-4o-mini", "gpt-4o", "gpt-4.1-mini"],
  },
  google: {
    label: "Gemini",
    description: "Gemini through Google's OpenAI-compatible endpoint.",
    baseUrl: "https://generativelanguage.googleapis.com/v1beta/openai/",
    defaultModel: "gemini-2.5-flash",
    modelOptions: ["gemini-2.5-flash", "gemini-2.5-pro", "gemini-2.0-flash"],
  },
  "openai-compatible": {
    label: "OpenAI-compatible",
    description: "Custom provider using OpenAI-style /models and /chat/completions routes.",
    baseUrl: "https://api.example.com/v1",
    defaultModel: "use-custom-model",
    modelOptions: ["use-custom-model"],
  },
};

export const DEFAULT_LLM_SETTINGS: LlmSettings = {
  enabled: true,
  provider: "xiaomi",
  baseUrl: "https://token-plan-cn.xiaomimimo.com/v1",
  apiKey: "",
  model: "mimo-v2-omni",
  temperature: 0.1,
};
