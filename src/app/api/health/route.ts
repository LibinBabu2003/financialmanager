import { telegramEnvironmentIsConfigured } from "@/lib/server-env";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET() {
  const sha =
    process.env.VERCEL_GIT_COMMIT_SHA ?? process.env.GITHUB_SHA ?? "development";

  return Response.json(
    {
      status: "ok",
      service: "private-finance-manager",
      phase: 1,
      financialWritesEnabled: false,
      environment: process.env.VERCEL_ENV ?? process.env.NODE_ENV ?? "unknown",
      build: sha === "development" ? sha : sha.slice(0, 12),
      dependencies: {
        telegram: telegramEnvironmentIsConfigured() ? "configured" : "not_configured",
        database: "phase_2",
        ai: "disabled",
      },
      timestamp: new Date().toISOString(),
    },
    {
      headers: {
        "cache-control": "no-store, max-age=0",
      },
    },
  );
}
