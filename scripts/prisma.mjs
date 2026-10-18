import { createRequire } from "node:module";
import { spawnSync } from "node:child_process";
import { dirname, join } from "node:path";
import { mkdirSync } from "node:fs";
import { fileURLToPath } from "node:url";
const temp = fileURLToPath(new URL("../.data/tmp", import.meta.url));
mkdirSync(temp, { recursive: true });
const require = createRequire(import.meta.url);
// Disable Prisma's optional version/telemetry checkpoint; schema generation remains enabled.
const r = spawnSync(
  process.execPath,
  [
    join(dirname(require.resolve("prisma/package.json")), "build/index.js"),
    ...process.argv.slice(2),
  ],
  {
    stdio: "inherit",
    env: {
      ...process.env,
      TMPDIR: temp,
      CHECKPOINT_DISABLE: "1",
      PRISMA_HIDE_UPDATE_MESSAGE: "1",
    },
  },
);
process.exitCode = r.status ?? 1;
