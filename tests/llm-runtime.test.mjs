import assert from "node:assert/strict";
import test from "node:test";

const {
  buildLlmRequestHeaders,
  formatMissingLlmRuntimeConfigError,
  formatLlmUpstreamError,
  resolveLlmRuntimeConfig,
} = await import("../src/lib/llm-runtime.ts");

test("default provider uses preset endpoint and model with the server owner key", () => {
  const runtime = resolveLlmRuntimeConfig(
    {
      provider: "xiaomi",
      baseUrl: "",
      apiKey: "",
      model: "",
      question: "Explain this hotspot.",
    },
    {
      LLM_API_KEY: "owner-key",
    },
  );

  assert.equal(runtime.baseUrl, "https://token-plan-cn.xiaomimimo.com/v1");
  assert.equal(runtime.model, "mimo-v2-omni");
  assert.equal(runtime.apiKey, "owner-key");
  assert.deepEqual(runtime.missingFields, []);
});

test("missing default provider server credential reports owner-side configuration", () => {
  const runtime = resolveLlmRuntimeConfig(
    {
      provider: "xiaomi",
      baseUrl: "",
      apiKey: "",
      model: "",
      question: "Explain this hotspot.",
    },
    {},
  );

  assert.deepEqual(runtime.missingFields, ["serverApiKey"]);
});

test("custom providers still require an api key when no server credential is configured", () => {
  const runtime = resolveLlmRuntimeConfig(
    {
      provider: "openai",
      baseUrl: "https://api.openai.com/v1",
      apiKey: "",
      model: "gpt-5-mini",
      question: "Explain this hotspot.",
    },
    {},
  );

  assert.deepEqual(runtime.missingFields, ["apiKey"]);
});

test("llm request headers omit authorization when no api key is available", () => {
  assert.deepEqual(buildLlmRequestHeaders(""), {
    "Content-Type": "application/json",
  });
});

test("llm request headers include authorization when an api key is available", () => {
  assert.deepEqual(buildLlmRequestHeaders("server-key"), {
    Authorization: "Bearer server-key",
    "Content-Type": "application/json",
  });
});

test("missing default provider credentials explain the required owner key", () => {
  const runtime = resolveLlmRuntimeConfig(
    {
      provider: "xiaomi",
      baseUrl: "",
      apiKey: "",
      model: "",
      question: "Explain this hotspot.",
    },
    {},
  );

  assert.equal(
    formatMissingLlmRuntimeConfigError(runtime),
    "Default provider is missing the server owner API key. Set LLM_API_KEY on the server.",
  );
});

test("default provider upstream 401 is reported as an owner key issue", () => {
  const runtime = resolveLlmRuntimeConfig(
    {
      provider: "xiaomi",
      baseUrl: "",
      apiKey: "",
      model: "",
      question: "Explain this hotspot.",
    },
    {
      LLM_API_KEY: "owner-key",
    },
  );

  assert.equal(
    formatLlmUpstreamError({
      config: runtime,
      status: 401,
      detail: JSON.stringify({
        error: {
          message: "Invalid API Key",
        },
      }),
    }),
    "Default provider server API key is invalid or expired.",
  );
});
