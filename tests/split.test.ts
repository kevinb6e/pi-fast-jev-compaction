import { describe, expect, it } from "vitest";

import { collectToolCalls, decide, type JevAsker, type JevQuestions, type Message } from "../src/core/index.ts";

function message(
  role: Message["role"],
  text: string,
  extra: Partial<Message> = {}
): Message {
  return {
    sourceIndex: 0,
    role,
    text,
    toolUses: [],
    toolResults: [],
    ...extra,
  };
}

function hugeTranscript(): Message[] {
  const big = "x".repeat(2000);
  const out: Message[] = [];
  for (let i = 0; i < 20; i += 1) {
    out.push(message("user", `${big} turn ${i}`));
    out.push(
      message("assistant", "", {
        toolUses: [{ toolCallId: `tool-${i}`, tool: "read", input: { path: `f${i}.ts` } }],
      })
    );
    out.push(
      message("user", "", {
        toolResults: [{ toolCallId: `tool-${i}`, text: big, isError: false }],
      })
    );
  }
  return out.map((entry, sourceIndex) => ({ ...entry, sourceIndex }));
}

describe("split context compaction", () => {
  it("splits an oversized history instead of throwing", async () => {
    const asker: JevAsker = {
      async ask() {
        return { answers: {} };
      },
    };
    const msgs = hugeTranscript();
    const msgs2 = msgs;
    const result = await decide(msgs2, asker, {
      maxStateTokens: 1,
      maxRequestTokens: 30_000,
      preserveRecentMessages: 0,
      splitContext: true,
    });
expect(result.decisions).toBeDefined();
  });

  it("throws when splitting is disabled", async () => {
    const asker: JevAsker = {
      async ask() {
        return { answers: {} };
      },
    };
    await expect(
      decide(hugeTranscript(), asker, {
        maxStateTokens: 1,
        maxRequestTokens: 30_000,
        preserveRecentMessages: 0,
        splitContext: false,
      })
    ).rejects.toThrow(/history too large for Jev/i);
  });
});
