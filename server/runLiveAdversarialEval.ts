import { mkdir, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { runLiveAdversarialEval } from "./liveAdversarialEval";

async function main() {
  if (process.env.RUN_LIVE_GROQ_EVAL !== "1") {
    throw new Error("Refusing live provider calls. Run with RUN_LIVE_GROQ_EVAL=1 pnpm eval:live-adversarial.");
  }

  const result = await runLiveAdversarialEval(undefined, { batchSize: 4, pauseMs: 65_000 });
  const outputPath = resolve(process.cwd(), "docs/evaluations/live-groq-adversarial-latest.json");
  await mkdir(dirname(outputPath), { recursive: true });
  await writeFile(outputPath, `${JSON.stringify(result, null, 2)}\n`, "utf8");
  console.log(JSON.stringify({ outputPath, summary: result.summary }, null, 2));
}

void main();
