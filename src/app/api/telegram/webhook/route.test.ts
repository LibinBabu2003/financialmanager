import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/telegram-api", () => ({
  sendTelegramMessage: vi.fn().mockResolvedValue(undefined),
}));

import { sendTelegramMessage } from "@/lib/telegram-api";
import { POST } from "./route";

const configuredEnvironment = {
  TELEGRAM_BOT_TOKEN: "fake_token_without_telegram_format_123",
  TELEGRAM_WEBHOOK_SECRET: "phase_one_test_secret_123456",
  ALLOWED_TELEGRAM_USER_ID: "101",
  ALLOWED_TELEGRAM_CHAT_ID: "202",
  APP_TIMEZONE: "Asia/Kolkata",
};

function makeUpdateRequest({
  secret = configuredEnvironment.TELEGRAM_WEBHOOK_SECRET,
  userId = 101,
  chatId = 202,
  text = "/status",
}: {
  secret?: string | null;
  userId?: number;
  chatId?: number;
  text?: string;
} = {}) {
  const headers = new Headers({ "content-type": "application/json" });
  if (secret !== null) {
    headers.set("x-telegram-bot-api-secret-token", secret);
  }

  return new Request("https://example.test/api/telegram/webhook", {
    method: "POST",
    headers,
    body: JSON.stringify({
      update_id: 1,
      message: {
        message_id: 2,
        text,
        chat: { id: chatId },
        from: { id: userId },
      },
    }),
  });
}

describe("Telegram webhook", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    Object.assign(process.env, configuredEnvironment);
  });

  afterEach(() => {
    for (const key of Object.keys(configuredEnvironment)) delete process.env[key];
  });

  it("rejects requests without Telegram's secret header", async () => {
    const response = await POST(makeUpdateRequest({ secret: null }));

    expect(response.status).toBe(401);
    expect(sendTelegramMessage).not.toHaveBeenCalled();
  });

  it("silently ignores a different Telegram user", async () => {
    const response = await POST(makeUpdateRequest({ userId: 999 }));

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toMatchObject({ ok: true, ignored: true });
    expect(sendTelegramMessage).not.toHaveBeenCalled();
  });

  it("silently ignores a different Telegram chat", async () => {
    const response = await POST(makeUpdateRequest({ chatId: 999 }));

    expect(response.status).toBe(200);
    expect(sendTelegramMessage).not.toHaveBeenCalled();
  });

  it("replies to an allowed status command without financial writes", async () => {
    const response = await POST(makeUpdateRequest());

    expect(response.status).toBe(200);
    expect(sendTelegramMessage).toHaveBeenCalledOnce();
    expect(sendTelegramMessage).toHaveBeenCalledWith(
      expect.objectContaining({
        chatId: 202,
        text: expect.stringContaining("Financial writes: disabled"),
      }),
    );
  });
});
