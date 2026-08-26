import { execSync } from "child_process";
import { existsSync } from "fs";
import { resolve } from "path";

interface Check {
  pass: boolean;
  label: string;
  fix?: string;
  severity?: "error" | "advisory";
}

const checks: Check[] = [];

// Check Node.js version
try {
  const version = execSync("node --version", { encoding: "utf-8" }).trim();
  const major = parseInt(version.replace("v", "").split(".")[0], 10);
  checks.push({
    pass: major >= 20,
    label: `Node.js >= 20 (found ${version})`,
    fix: "Install Node.js 20+ via nvm or fnm",
    severity: "error",
  });
} catch {
  checks.push({
    pass: false,
    label: "Node.js is installed",
    fix: "Install Node.js 20+ from https://nodejs.org",
    severity: "error",
  });
}

// Check @aws-blocks/blocks is installed
try {
  execSync("npm list @aws-blocks/blocks", { encoding: "utf-8" });
  checks.push({ pass: true, label: "@aws-blocks/blocks is installed" });
} catch {
  checks.push({
    pass: false,
    label: "@aws-blocks/blocks is installed",
    fix: "Run: npm install @aws-blocks/blocks",
    severity: "error",
  });
}

// Check aws-blocks/index.ts exists (IFC layer present)
const ifcPath = resolve(
  process.env.AIDLC_PROJECT_DIR || ".",
  "aws-blocks/index.ts",
);
checks.push({
  pass: existsSync(ifcPath),
  label: "IFC layer exists (aws-blocks/index.ts)",
  fix: "Run: npm create @aws-blocks/blocks-app@latest .",
  severity: "advisory",
});

console.log(JSON.stringify({ checks }));
