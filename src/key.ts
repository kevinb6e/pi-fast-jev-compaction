import { readFile } from "node:fs/promises";
import { homedir } from "node:os";
import { join } from "node:path";

import type { ExtensionAPI } from "@earendil-works/pi-coding-agent";

export interface KeyResolver {
  resolve: (
    apiKeyCommand: string | undefined,
    signal?: AbortSignal
  ) => Promise<string>;
  clear: () => void;
}

async function fromAuthStore(): Promise<string | undefined> {
    try {
      const authPath = join(
        homedir(),
        ".local",
        "share",
        "opencode",
        "auth.json"
      );
      const auth = JSON.parse(await readFile(authPath, "utf-8")) as Record<
        string,
        { key?: unknown }
      >;
      for (const provider of [
        "opencode",
        "opencode-go",
        "openrouter",
        "typesafe",
      ]) {
        const key = auth[provider]?.key;
        if (typeof key === "string" && key.trim()) return key.trim();
    }
  } catch {
      // No OpenCode auth store or no usable key.
  }
    return undefined;
}

export function createKeyResolver(pi: Pick<ExtensionAPI, "exec">): KeyResolver {
  let cached: string | undefined;

  return {
    async resolve(apiKeyCommand, signal) {
      if (cached) return cached;
      if (apiKeyCommand) {
        const value = process.env.TYPESAFE_API_KEY?.trim();
        if (value) {
          cached = value;
          return cached;
        }
      } else {
        const stored = await fromAuthStore();
        if (stored) {
          cached = stored;
          return cached;
        }
        for (const name of [
          "TYPESAFE_API_KEY",
          "OPENROUTER_API_KEY",
          "OPENCODE_API_KEY",
        ]) {
          const value = process.env[name]?.trim();
          if (value) {
            cached = value;
            return cached;
          }
        }
      }
      if (!apiKeyCommand) throw new Error("TypeSafe API key is not configured");
      const result = await pi.exec("sh", ["-lc", apiKeyCommand], {
        signal,
        timeout: 15_000,
      });
      const value = result.stdout.trim();
      if (result.code !== 0 || !value)
        throw new Error("TypeSafe API key command failed");
      cached = value;
      return cached;
    },
    clear() {
      cached = undefined;
    },
  };
}
