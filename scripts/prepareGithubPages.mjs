import { copyFile, rm } from "node:fs/promises";
import path from "node:path";

const outputDir = path.resolve(import.meta.dirname, "..", "dist-github-pages");
await copyFile(path.join(outputDir, "github-pages.html"), path.join(outputDir, "index.html"));
await rm(path.join(outputDir, "github-pages.html"));
