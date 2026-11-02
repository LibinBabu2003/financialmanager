import { timingSafeEqual } from "node:crypto";

export function secretsMatch(received: string | null, expected: string): boolean {
  if (received === null) return false;

  const receivedBuffer = Buffer.from(received);
  const expectedBuffer = Buffer.from(expected);
  if (receivedBuffer.length !== expectedBuffer.length) return false;

  return timingSafeEqual(receivedBuffer, expectedBuffer);
}

export function telegramSenderIsAllowed(
  userId: number,
  chatId: number,
  allowedUserId: string,
  allowedChatId: string,
): boolean {
  return String(userId) === allowedUserId && String(chatId) === allowedChatId;
}
