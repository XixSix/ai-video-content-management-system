import { existsSync } from "node:fs";
import { mkdir } from "node:fs/promises";
import path from "node:path";
import readline from "node:readline/promises";
import { stdin as input, stdout as output } from "node:process";
import { chromium } from "playwright";

const frontendRoot = process.cwd();
const repoRoot = path.resolve(frontendRoot, "..");
const outputDir = path.resolve(repoRoot, "snapshot");
const userDataDir = path.resolve(outputDir, ".playwright-profile");

const args = parseArgs(process.argv.slice(2));
const baseUrl = String(args["base-url"] ?? process.env.SNAPSHOT_BASE_URL ?? "http://localhost:5173").replace(/\/$/, "");
const targetUrl = resolveTargetUrl(String(args.url ?? "/media-library"), baseUrl);
const outputName = normalizeOutputName(String(args.name ?? inferNameFromUrl(targetUrl)));
const screenshotPath = path.join(outputDir, `${outputName}.png`);
const headed = Boolean(args.headed);
const fullPage = Boolean(args["full-page"]);
const width = getPositiveInteger(args.width, 1920);
const height = getPositiveInteger(args.height, 1080);

await mkdir(outputDir, { recursive: true });

const context = await chromium.launchPersistentContext(userDataDir, {
  headless: !headed,
  viewport: { width, height },
  deviceScaleFactor: 1,
});

try {
  const page = context.pages()[0] ?? (await context.newPage());

  await page.goto(targetUrl, {
    waitUntil: "domcontentloaded",
    timeout: 30_000,
  });

  await maybeWaitForManualLogin(page, headed, targetUrl);
  await settlePage(page);

  await page.screenshot({
    path: screenshotPath,
    fullPage,
  });

  console.log(`Saved snapshot: ${path.relative(repoRoot, screenshotPath)}`);
} catch (error) {
  const message = error instanceof Error ? error.message : String(error);
  console.error(`Snapshot failed: ${message}`);
  console.error(`Make sure the frontend is running at ${baseUrl}.`);
  process.exitCode = 1;
} finally {
  await context.close();
}

function parseArgs(argv) {
  const parsed = {};

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];

    if (!arg.startsWith("--")) {
      continue;
    }

    const key = arg.slice(2);
    const next = argv[index + 1];

    if (!next || next.startsWith("--")) {
      parsed[key] = true;
      continue;
    }

    parsed[key] = next;
    index += 1;
  }

  return parsed;
}

function resolveTargetUrl(url, baseUrlValue) {
  if (url.startsWith("http://") || url.startsWith("https://")) {
    return url;
  }

  return `${baseUrlValue}${url.startsWith("/") ? url : `/${url}`}`;
}

function inferNameFromUrl(url) {
  const parsedUrl = new URL(url);
  const pathName = parsedUrl.pathname.replace(/^\/+|\/+$/g, "");

  return pathName || "home";
}

function normalizeOutputName(name) {
  return (
    name
      .toLowerCase()
      .replace(/[^a-z0-9-_]+/g, "-")
      .replace(/^-+|-+$/g, "") || "snapshot"
  );
}

function getPositiveInteger(value, fallback) {
  const parsed = Number(value);

  return Number.isInteger(parsed) && parsed > 0 ? parsed : fallback;
}

async function maybeWaitForManualLogin(page, shouldPrompt, requestedUrl) {
  if (!shouldPrompt) {
    return;
  }

  const rl = readline.createInterface({ input, output });

  try {
    await rl.question(
      "Log in or open the page you want in the browser, then press Enter here to capture...",
    );
  } finally {
    rl.close();
  }

  const currentPath = new URL(page.url()).pathname;
  const requestedPath = new URL(requestedUrl).pathname;

  if (currentPath !== requestedPath) {
    await page.goto(requestedUrl, {
      waitUntil: "domcontentloaded",
      timeout: 30_000,
    });
  }
}

async function settlePage(page) {
  await page.waitForLoadState("networkidle", { timeout: 15_000 }).catch(() => {});
  await page.waitForTimeout(1_000);

  await page
    .waitForFunction(
      () => Array.from(document.images).every((image) => image.complete),
      undefined,
      { timeout: 10_000 },
    )
    .catch(() => {});

  if (!existsSync(outputDir)) {
    await mkdir(outputDir, { recursive: true });
  }
}
