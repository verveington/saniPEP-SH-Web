import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const read = (relativePath) => fs.readFileSync(path.join(root, relativePath), "utf8");
const readSourceFiles = (relativeDir) => {
  const absoluteDir = path.join(root, relativeDir);
  return fs
    .readdirSync(absoluteDir, { withFileTypes: true })
    .flatMap((entry) => {
      const entryPath = path.join(relativeDir, entry.name);
      if (entry.isDirectory()) return readSourceFiles(entryPath);
      if (!/\.(ts|tsx)$/.test(entry.name)) return [];
      return read(entryPath);
    });
};

const fail = (message) => {
  throw new Error(message);
};

const assert = (condition, message) => {
  if (!condition) fail(message);
};

const css = read("apps/frontend/src/styles/global.css");
const publicUiSource = [
  read("apps/frontend/src/App.tsx"),
  ...readSourceFiles("apps/frontend/src/app"),
  ...readSourceFiles("apps/frontend/src/components"),
  ...readSourceFiles("apps/frontend/src/pages"),
].join("\n");

const requiredBreakpoints = ["max-width: 430px", "max-width: 390px", "max-width: 360px"];
const requiredViewportChecklist = ["360px", "390px", "430px", "768px", "1024px", "1280px"];

for (const breakpoint of requiredBreakpoints) {
  assert(css.includes(breakpoint), `Missing CSS breakpoint ${breakpoint}`);
}

assert(css.includes("min-height: 44px"), "Touch target baseline must include min-height: 44px");
assert(css.includes("overflow-x: clip"), "Global horizontal overflow guard is missing");
assert(css.includes(".formStep"), "Mobile form step styling is missing");
assert(publicUiSource.includes("function FormStep"), "Mobile form step component is missing");
assert(css.includes("grid-template-columns: 1fr"), "Mobile one-column grid fallback is missing");
assert(!/<table[\s>]/i.test(publicUiSource), "Tables are not allowed without a mobile alternative");
assert(!publicUiSource.includes("Tabellenansicht"), "Mobile portal history must not expose a table-only design variant");

for (const viewport of requiredViewportChecklist) {
  assert(css.includes(viewport) || publicUiSource.includes(viewport), `Mobile checklist viewport ${viewport} is not documented in code`);
}

console.log("Responsive static check passed");
console.log("Viewports documented: 360, 390, 430, 768, 1024, 1280+");
