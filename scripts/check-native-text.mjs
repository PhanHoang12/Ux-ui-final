import ts from "typescript";
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
const errors = [];
function walk(dir) {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) walk(path);
    else if (path.endsWith(".tsx")) {
      const src = ts.createSourceFile(
        path,
        readFileSync(path, "utf8"),
        ts.ScriptTarget.Latest,
        true,
        ts.ScriptKind.TSX,
      );
      function visit(n) {
        if (ts.isJsxElement(n)) {
          const name = n.openingElement.tagName.getText(src);
          if (!["T", "Text"].includes(name))
            for (const c of n.children) {
              if (ts.isJsxText(c) && (c.text.trim() || c.text === " "))
                errors.push(path + ": raw text under " + name);
            }
        }
        ts.forEachChild(n, visit);
      }
      visit(src);
    }
  }
}
walk("apps/mobile/src");
if (errors.length) {
  console.error(errors.join("\n"));
  process.exitCode = 1;
} else console.log("Native JSX: no raw text outside Text components.");
