import { readdir, readFile } from "node:fs/promises";
import { extname, join, relative } from "node:path";

const root = process.cwd();
const ignoredDirectories = new Set([
  ".git",
  ".next",
  ".vercel",
  "node_modules",
  "coverage",
  "backups",
  "exports",
]);
const scannedExtensions = new Set([
  ".ts",
  ".tsx",
  ".js",
  ".mjs",
  ".cjs",
  ".json",
  ".yml",
  ".yaml",
  ".md",
  ".sql",
  ".toml",
]);

const patterns = [
  { label: "private key", expression: /-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----/ },
  { label: "Telegram bot token", expression: /\b\d{8,12}:[A-Za-z0-9_-]{30,}\b/ },
  { label: "Google API key", expression: /\bAIza[A-Za-z0-9_-]{30,}\b/ },
  { label: "GitHub token", expression: /\b(?:ghp|github_pat)_[A-Za-z0-9_]{20,}\b/ },
  { label: "Supabase JWT", expression: /\beyJ[A-Za-z0-9_-]{20,}\.[A-Za-z0-9_-]{20,}\.[A-Za-z0-9_-]{20,}\b/ },
];

async function collectFiles(directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  const files = [];

  for (const entry of entries) {
    if (entry.isSymbolicLink()) continue;
    const path = join(directory, entry.name);
    if (entry.isDirectory()) {
      if (!ignoredDirectories.has(entry.name)) files.push(...(await collectFiles(path)));
      continue;
    }

    if (
      scannedExtensions.has(extname(entry.name)) ||
      entry.name === ".env.example" ||
      entry.name === ".gitignore"
    ) {
      files.push(path);
    }
  }

  return files;
}

const findings = [];
for (const file of await collectFiles(root)) {
  const content = await readFile(file, "utf8");
  for (const pattern of patterns) {
    if (pattern.expression.test(content)) {
      findings.push(`${relative(root, file)}: possible ${pattern.label}`);
    }
  }
}

if (findings.length > 0) {
  console.error("Potential committed secrets detected:");
  for (const finding of findings) console.error(`- ${finding}`);
  process.exit(1);
}

console.log("Secret scan passed.");
