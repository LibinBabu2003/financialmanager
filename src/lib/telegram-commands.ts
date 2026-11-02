export type PhaseOneCommand = "start" | "help" | "status" | "unknown";

export function classifyPhaseOneCommand(text: string): PhaseOneCommand {
  const firstToken = text.trim().split(/\s+/, 1)[0]?.toLowerCase() ?? "";
  const command = firstToken.split("@", 1)[0];

  switch (command) {
    case "/start":
      return "start";
    case "/help":
      return "help";
    case "/status":
      return "status";
    default:
      return "unknown";
  }
}

export function phaseOneReply(command: PhaseOneCommand): string {
  switch (command) {
    case "start":
      return [
        "Private Finance Manager is online — Phase 1.",
        "",
        "Only your approved Telegram user and chat can use this bot.",
        "Financial entries are disabled until the secure ledger is deployed in Phase 2.",
        "",
        "Use /help or /status.",
      ].join("\n");
    case "help":
      return [
        "Phase 1 commands:",
        "/start — show onboarding",
        "/help — show this message",
        "/status — verify the hosted shell",
        "",
        "No financial message is stored or processed in this phase.",
      ].join("\n");
    case "status":
      return [
        "Status: online",
        "Phase: 1 — hosted foundation",
        "Financial writes: disabled",
        "Timezone: Asia/Kolkata",
      ].join("\n");
    case "unknown":
      return "Phase 1 is online, but financial entries are not enabled yet. Use /help.";
  }
}
