import { z } from "zod";

const telegramEnvSchema = z.object({
  TELEGRAM_BOT_TOKEN: z.string().min(20),
  TELEGRAM_WEBHOOK_SECRET: z
    .string()
    .min(16)
    .max(256)
    .regex(/^[A-Za-z0-9_-]+$/),
  ALLOWED_TELEGRAM_USER_ID: z.string().regex(/^\d+$/),
  ALLOWED_TELEGRAM_CHAT_ID: z.string().regex(/^-?\d+$/),
  APP_TIMEZONE: z.literal("Asia/Kolkata").default("Asia/Kolkata"),
});

export type TelegramEnv = z.infer<typeof telegramEnvSchema>;

export function readTelegramEnv(): TelegramEnv {
  return telegramEnvSchema.parse({
    TELEGRAM_BOT_TOKEN: process.env.TELEGRAM_BOT_TOKEN,
    TELEGRAM_WEBHOOK_SECRET: process.env.TELEGRAM_WEBHOOK_SECRET,
    ALLOWED_TELEGRAM_USER_ID: process.env.ALLOWED_TELEGRAM_USER_ID,
    ALLOWED_TELEGRAM_CHAT_ID: process.env.ALLOWED_TELEGRAM_CHAT_ID,
    APP_TIMEZONE: process.env.APP_TIMEZONE ?? "Asia/Kolkata",
  });
}

export function telegramEnvironmentIsConfigured(): boolean {
  return telegramEnvSchema.safeParse({
    TELEGRAM_BOT_TOKEN: process.env.TELEGRAM_BOT_TOKEN,
    TELEGRAM_WEBHOOK_SECRET: process.env.TELEGRAM_WEBHOOK_SECRET,
    ALLOWED_TELEGRAM_USER_ID: process.env.ALLOWED_TELEGRAM_USER_ID,
    ALLOWED_TELEGRAM_CHAT_ID: process.env.ALLOWED_TELEGRAM_CHAT_ID,
    APP_TIMEZONE: process.env.APP_TIMEZONE ?? "Asia/Kolkata",
  }).success;
}
