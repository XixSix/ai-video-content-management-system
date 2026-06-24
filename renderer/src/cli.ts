import { bundle } from "@remotion/bundler";
import { renderMedia, selectComposition } from "@remotion/renderer";
import { renderDocumentSchema } from "@vidpilot/composition/render-document";
import { readFile } from "node:fs/promises";
import path from "node:path";

const args = new Map<string, string>();

for (let index = 2; index < process.argv.length; index += 2) {
  const key = process.argv[index];
  const value = process.argv[index + 1];

  if (!key?.startsWith("--") || !value) {
    continue;
  }

  args.set(key.slice(2), value);
}

const inputPath = args.get("input");
const outputPath = args.get("output");

if (!inputPath || !outputPath) {
  throw new Error("Usage: npm run render:document -- --input render.json --output output.mp4");
}

const main = async (): Promise<void> => {
  const rawDocument = JSON.parse(await readFile(inputPath, "utf8"));
  const document = renderDocumentSchema.parse(rawDocument);

  if (!document.sourceVideo.src) {
    throw new Error("Render document must include sourceVideo.src");
  }

  const entryPoint = path.join(process.cwd(), "src", "index.ts");
  const serveUrl = await bundle({
    entryPoint,
  });
  const composition = await selectComposition({
    serveUrl,
    id: "ExportRender",
    inputProps: document,
  });

  await renderMedia({
    composition,
    serveUrl,
    codec: "h264",
    outputLocation: outputPath,
    inputProps: document,
  });
};

main().catch((error: unknown) => {
  console.error(error);
  process.exitCode = 1;
});
