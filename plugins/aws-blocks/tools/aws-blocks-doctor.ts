import { execSync } from "child_process";

interface Check {
  pass: boolean;
  label: string;
  fix?: string;
  severity?: "error" | "advisory";
}

const checks: Check[] = [];

// Bun available (AI-DLC requirement)
try {
  execSync("bun --version", { encoding: "utf-8" });
  checks.push({ pass: true, label: "bun is available" });
} catch {
  checks.push({
    pass: false,
    label: "bun is available",
    fix: "Install bun: curl -fsSL https://bun.sh/install | bash",
    severity: "error",
  });
}

// npm available
try {
  execSync("npm --version", { encoding: "utf-8" });
  checks.push({ pass: true, label: "npm is available" });
} catch {
  checks.push({
    pass: false,
    label: "npm is available",
    fix: "Install Node.js (includes npm): https://nodejs.org",
    severity: "error",
  });
}

// Node.js >= 20
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
    label: "Node.js >= 20",
    fix: "Install Node.js 20+ from https://nodejs.org",
    severity: "error",
  });
}

// AWS CLI available (advisory — only needed for deploy stages)
try {
  execSync("aws --version", { encoding: "utf-8" });
  checks.push({ pass: true, label: "AWS CLI is available (for deploy stages)" });
} catch {
  checks.push({
    pass: false,
    label: "AWS CLI is available (for deploy stages)",
    fix: "Install AWS CLI: https://docs.aws.amazon.com/cli/latest/userguide/getting-started-install.html",
    severity: "advisory",
  });
}

// Git configured (for plugin versioning)
try {
  execSync("git --version", { encoding: "utf-8" });
  checks.push({ pass: true, label: "git is available" });
} catch {
  checks.push({
    pass: false,
    label: "git is available",
    fix: "Install git: https://git-scm.com/downloads",
    severity: "advisory",
  });
}

console.log(JSON.stringify({ checks }));
