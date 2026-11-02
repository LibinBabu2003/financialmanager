import { describe, expect, it } from "vitest";
import { secretsMatch, telegramSenderIsAllowed } from "./telegram-auth";

describe("secretsMatch", () => {
  it("accepts the exact secret", () => {
    expect(secretsMatch("a_secure_secret-123", "a_secure_secret-123")).toBe(true);
  });

  it("rejects missing, changed, and differently sized secrets", () => {
    expect(secretsMatch(null, "a_secure_secret-123")).toBe(false);
    expect(secretsMatch("a_secure_secret-124", "a_secure_secret-123")).toBe(false);
    expect(secretsMatch("short", "a_secure_secret-123")).toBe(false);
  });
});

describe("telegramSenderIsAllowed", () => {
  it("requires both the allowed user and chat", () => {
    expect(telegramSenderIsAllowed(101, 202, "101", "202")).toBe(true);
    expect(telegramSenderIsAllowed(999, 202, "101", "202")).toBe(false);
    expect(telegramSenderIsAllowed(101, 999, "101", "202")).toBe(false);
  });
});
