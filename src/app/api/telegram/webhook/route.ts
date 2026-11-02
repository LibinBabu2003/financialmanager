import { z } from "zod";
import { readTelegramEnv } from "@/lib/server-env";
import { sendTelegramMessage } from "@/lib/telegram-api";
import { secretsMatch, telegramSenderIsAllowed } from "@/lib/telegram-auth";
import { classifyPhaseOneCommand, phaseOneReply } from "@/lib/telegram-commands";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const maxDuration = 10;

const telegramUpdateSchema = z.object({
  update_id: z.number().int(),
  message: z
    .object({
      message_id: z.number().int(),
      text: z.string().max(4_096).optional(),
      chat: z.object({ id: z.number().int() }),
      from: z.object({ id: z.number().int() }),
    })
    .optional(),
});

const MAX_UPDATE_BYTES = 64 * 1024;

export async function POST(request: Request) {
  let env: ReturnType<typeof readTelegramEnv>;
  try {
    env = readTelegramEnv();
  } catch {
    return Response.json({ ok: false, error: "service_not_configured" }, { status: 503 });
  }

  const secret = request.headers.get("x-telegram-bot-api-secret-token");
  if (!secretsMatch(secret, env.TELEGRAM_WEBHOOK_SECRET)) {
    return Response.json({ ok: false, error: "unauthorized" }, { status: 401 });
  }

  const declaredLength = Number(request.headers.get("content-length") ?? 0);
  if (declaredLength > MAX_UPDATE_BYTES) {
    return Response.json({ ok: false, error: "payload_too_large" }, { status: 413 });
  }

  let body: unknown;
  try {
    const rawBody = await request.text();
    if (Buffer.byteLength(rawBody, "utf8") > MAX_UPDATE_BYTES) {
      return Response.json({ ok: false, error: "payload_too_large" }, { status: 413 });
    }
    body = JSON.parse(rawBody) as unknown;
  } catch {
    return Response.json({ ok: false, error: "invalid_json" }, { status: 400 });
  }

  const parsed = telegramUpdateSchema.safeParse(body);
  if (!parsed.success) {
    return Response.json({ ok: true, ignored: true });
  }

  const { message } = parsed.data;
  if (!message?.text) {
    return Response.json({ ok: true, ignored: true });
  }
  if (
    !telegramSenderIsAllowed(
      message.from.id,
      message.chat.id,
      env.ALLOWED_TELEGRAM_USER_ID,
      env.ALLOWED_TELEGRAM_CHAT_ID,
    )
  ) {
    return Response.json({ ok: true, ignored: true });
  }

  const reply = phaseOneReply(classifyPhaseOneCommand(message.text));
  try {
    await sendTelegramMessage({
      botToken: env.TELEGRAM_BOT_TOKEN,
      chatId: message.chat.id,
      text: reply,
    });
  } catch {
    return Response.json({ ok: false, error: "telegram_delivery_failed" }, { status: 502 });
  }

  return Response.json({ ok: true });
}
