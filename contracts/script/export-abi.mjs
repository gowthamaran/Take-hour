import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const artifact = resolve(here, "../out/HourlyCrown.sol/HourlyCrown.json");
const dest = resolve(here, "../../src/lib/abi.ts");

const json = JSON.parse(readFileSync(artifact, "utf8"));
mkdirSync(dirname(dest), { recursive: true });
writeFileSync(
  dest,
  `export const hourlyCrownAbi = ${JSON.stringify(json.abi, null, 2)} as const;\n`,
);
console.log("wrote", dest);
