import { afterEach, describe, expect, it } from "vitest";

import { DEFAULT_CONFIG, parseConfig, parseEnvConfig } from "../src/config.ts";

const ENV_NAMES = [
  "FAST_JEV_KEEP_THRESHOLD",
  "FAST_JEV_PRESERVE_RECENT",
  "FAST_JEV_MAX_STATE_TOKENS",
  "FAST_JEV_MAX_REQUEST_TOKENS",
  "FAST_JEV_TRUNCATE_HEAD_CHARS",
  "FAST_JEV_COMPACT_AT_PERCENT",
  "FAST_JEV_MIN_REDUCTION",
  "FAST_JEV_COOLDOWN_TOKENS",
  "FAST_JEV_MODEL",
  "FAST_JEV_BASE_URL",
];

afterEach(() => {
  for (const name of ENV_NAMES) delete process.env[name];
});

describe("environment parity (B)", () => {
  it("reads the shared FAST_JEV_* names, mirroring omp", () => {
    const config = parseEnvConfig({
      FAST_JEV_MIN_REDUCTION: "0.1",
      FAST_JEV_PRESERVE_RECENT: "2",
      FAST_JEV_KEEP_THRESHOLD: "0.4",
      FAST_JEV_COMPACT_AT_PERCENT: "50",
      FAST_JEV_COOLDOWN_TOKENS: "1000",
    });
    expect(config.minReductionRatio).toBe(0.1);
    expect(config.preserveRecentMessages).toBe(2);
    expect(config.keepThreshold).toBe(0.4);
    expect(config.compactAtPercent).toBe(50);
    expect(config.cooldownTokens).toBe(1000);
    // Keys the environment does not set keep the built-in default.
    expect(config.maxStateTokens).toBe(DEFAULT_CONFIG.maxStateTokens);
  });

  it("clamps an out-of-range environment value back to the default", () => {
    // keepThreshold is bounded to [0,1]; a bogus 2 must not reach the scorer.
    expect(parseEnvConfig({ FAST_JEV_KEEP_THRESHOLD: "2" }).keepThreshold).toBe(
      DEFAULT_CONFIG.keepThreshold,
    );
  });

  it("ignores a malformed environment value", () => {
    expect(parseEnvConfig({ FAST_JEV_MIN_REDUCTION: "not-a-number" }).minReductionRatio).toBe(
      DEFAULT_CONFIG.minReductionRatio,
    );
  });

  it("lets settings.json win over the environment", () => {
    const envBase = parseEnvConfig({ FAST_JEV_MIN_REDUCTION: "0.1" });
    const merged = parseConfig({ minReductionRatio: 0.3 }, envBase);
    expect(merged.minReductionRatio).toBe(0.3);
  });

  it("falls through to the environment when settings.json omits a knob", () => {
    const envBase = parseEnvConfig({ FAST_JEV_MIN_REDUCTION: "0.1", FAST_JEV_MODEL: "jev-env" });
    const merged = parseConfig({ keepThreshold: 0.4 }, envBase);
    expect(merged.minReductionRatio).toBe(0.1);
    expect(merged.model).toBe("jev-env");
    expect(merged.keepThreshold).toBe(0.4);
  });

  it("reads the model and base URL from the environment", () => {
    const config = parseEnvConfig({
      FAST_JEV_MODEL: "typesafe/jev-1.13",
      FAST_JEV_BASE_URL: "https://openrouter.ai/api/v1/systemone",
    });
    expect(config.model).toBe("typesafe/jev-1.13");
    expect(config.baseUrl).toBe("https://openrouter.ai/api/v1/systemone");
  });

  it("honours process.env by default", () => {
    process.env.FAST_JEV_MIN_REDUCTION = "0.15";
    expect(parseEnvConfig().minReductionRatio).toBe(0.15);
  });
});
