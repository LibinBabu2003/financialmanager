type SendMessageInput = {
  botToken: string;
  chatId: number;
  text: string;
};

export async function sendTelegramMessage({
  botToken,
  chatId,
  text,
}: SendMessageInput): Promise<void> {
  const response = await fetch(
    `https://api.telegram.org/bot${botToken}/sendMessage`,
    {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        chat_id: chatId,
        text,
        disable_web_page_preview: true,
      }),
      cache: "no-store",
      signal: AbortSignal.timeout(8_000),
    },
  );

  if (!response.ok) {
    throw new Error(`Telegram send failed with status ${response.status}`);
  }
}
