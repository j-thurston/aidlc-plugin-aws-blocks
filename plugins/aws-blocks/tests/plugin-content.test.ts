import { describe, it, expect } from "bun:test";
import { readFileSync, existsSync, readdirSync } from "fs";
import { resolve, dirname, basename, extname } from "path";
import { fileURLToPath } from "url";
import { parse as parseYaml } from "yaml";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");

// --- helpers ---------------------------------------------------------------

function readFrontmatter(relPath: string): { fm: any; body: string } {
  const abs = resolve(ROOT, relPath);
  const text = readFileSync(abs, "utf-8");
  const m = text.match(/^---\n([\s\S]*?)\n---\n?([\s\S]*)$/);
  if (!m) throw new Error(`No YAML frontmatter in ${relPath}`);
  return { fm: parseYaml(m[1]), body: m[2] };
}

function walk(dir: string, ext: string): string[] {
  const abs = resolve(ROOT, dir);
  if (!existsSync(abs)) return [];
  const out: string[] = [];
  for (const entry of readdirSync(abs, { withFileTypes: true })) {
    const rel = `${dir}/${entry.name}`;
    if (entry.isDirectory()) out.push(...walk(rel, ext));
    else if (entry.name.endsWith(ext)) out.push(rel);
  }
  return out;
}

const STAGE_FILES = [
  "stages/construction/aws-blocks-local-dev.md",
  "stages/operation/aws-blocks-sandbox-deploy.md",
  "stages/operation/aws-blocks-production-deploy.md",
];
const OVERLAY_FILES = [
  "contributions/inception/domain-design.md",
  "contributions/construction/build-and-test.md",
];
const AGENT_FILE = "agents/aws-blocks-developer-agent.md";
const SENSOR_FILE = "sensors/aidlc-blocks-local-health.md";

// --- manifest --------------------------------------------------------------

describe("manifest", () => {
  it("plugin.json is valid JSON with required fields", () => {
    const m = JSON.parse(readFileSync(resolve(ROOT, ".aidlc-plugin/plugin.json"), "utf-8"));
    expect(m.name).toBe("aws-blocks");
    expect(typeof m.version).toBe("string");
    expect(Array.isArray(m.dependencies)).toBe(true);
    expect(m.dependencies).toContain("core");
    expect(m.aidlc?.contributes).toBeDefined();
    for (const key of ["stages", "agents", "sensors", "knowledge", "tools", "overlays"]) {
      expect(typeof m.aidlc.contributes[key]).toBe("string");
    }
    // scopes are no longer shipped by this plugin
    expect(m.aidlc.contributes.scopes).toBeUndefined();
  });

  it("marketplace.json is valid JSON listing the plugin", () => {
    const m = JSON.parse(readFileSync(resolve(ROOT, "marketplace.json"), "utf-8"));
    expect(Array.isArray(m.plugins)).toBe(true);
    expect(m.plugins.some((p: any) => p.name === "aws-blocks")).toBe(true);
  });
});

// --- frontmatter validity --------------------------------------------------

describe("frontmatter validity", () => {
  const all = [...STAGE_FILES, ...OVERLAY_FILES, AGENT_FILE, SENSOR_FILE];
  for (const f of all) {
    it(`${f} has parseable YAML frontmatter`, () => {
      const { fm } = readFrontmatter(f);
      expect(fm).toBeTruthy();
      expect(typeof fm).toBe("object");
    });
  }

  for (const f of STAGE_FILES) {
    it(`${f} declares the required v2 schema fields`, () => {
      const { fm } = readFrontmatter(f);
      expect(typeof fm.slug).toBe("string");
      expect(["construction", "operation"]).toContain(fm.phase);
      expect(fm.plugin).toBe("aws-blocks");
      expect(["ALWAYS", "CONDITIONAL"]).toContain(fm.execution);
      expect(typeof fm.condition).toBe("string");
      expect(fm.condition.length).toBeGreaterThan(0);
      expect(["inline", "subagent", "pipeline", "mob", "agent-team"]).toContain(fm.mode);
      expect(typeof fm.inputs).toBe("string");
      expect(typeof fm.outputs).toBe("string");
      // `number` is engine-assigned; if authored it must be <phase>.<index>
      if (fm.number !== undefined) {
        expect(String(fm.number)).toMatch(/^\d+\.\d+$/);
      }
      // legacy fields must be gone
      expect(fm.topology).toBeUndefined();
    });
  }
});

// --- slug / artifact consistency -------------------------------------------

describe("stage graph consistency", () => {
  const stages = STAGE_FILES.map((f) => readFrontmatter(f).fm);
  const bySlug = new Map(stages.map((s) => [s.slug, s]));

  it("all three expected stage slugs are present and unique", () => {
    const slugs = stages.map((s) => s.slug);
    expect(new Set(slugs).size).toBe(3);
    expect(slugs.sort()).toEqual(
      ["aws-blocks-local-dev", "aws-blocks-production-deploy", "aws-blocks-sandbox-deploy"],
    );
  });

  it("requires_stage references resolve to plugin or core stages", () => {
    for (const s of stages) {
      if (!s.requires_stage) continue;
      const reqs = Array.isArray(s.requires_stage)
        ? s.requires_stage
        : [s.requires_stage];
      for (const r of reqs) {
        expect(bySlug.has(r) || CORE_STAGE_SLUGS.has(r)).toBe(true);
      }
    }
  });

  it("consumed aws-blocks artifacts are produced somewhere in the plugin", () => {
    // Producers include both stage `produces` and overlay `adds.produces`
    // (an overlay adds an artifact to the core stage it targets).
    const produced = new Set<string>();
    for (const s of stages) for (const p of s.produces ?? []) produced.add(p);
    for (const f of OVERLAY_FILES) {
      const { fm } = readFrontmatter(f);
      for (const p of fm.adds?.produces ?? []) produced.add(p);
    }
    for (const s of stages) {
      for (const c of s.consumes ?? []) {
        if (typeof c.artifact === "string" && c.artifact.startsWith("aws-blocks-")) {
          expect(produced.has(c.artifact)).toBe(true);
        }
      }
    }
  });

  it("every stage carries at least one real core scope", () => {
    for (const s of stages) {
      const scopes = s.scopes ?? [];
      expect(scopes.length).toBeGreaterThan(0);
      for (const sc of scopes) expect(CORE_SCOPE_NAMES.has(sc)).toBe(true);
    }
  });
});

// --- overlay targets -------------------------------------------------------

// Real core stage slugs on the awslabs/aidlc-workflows v2 branch
// (core/aidlc-common/stages/**). An overlay whose `target` is not one of these
// is silently dropped at compose time — this set catches that at test time.
const CORE_STAGE_SLUGS = new Set([
  "state-init", "workspace-detection", "workspace-scaffold",
  "approval-handoff", "feasibility", "intent-capture", "market-research",
  "rough-mockups", "scope-definition", "team-formation",
  "contract-design", "delivery-planning", "domain-design",
  "practices-discovery", "refined-mockups", "requirements-analysis",
  "reverse-engineering", "units-generation", "user-stories",
  "build-and-test", "ci-pipeline", "code-generation", "functional-design",
  "infrastructure-design", "nfr-design", "nfr-requirements",
  "deployment-execution", "deployment-pipeline", "environment-provisioning",
  "feedback-optimization", "incident-response", "observability-setup",
  "performance-validation",
]);

// Real core scope names on the v2 branch (core/scopes/aidlc-*.md). A stage's
// scopes: must reference one of these to route.
const CORE_SCOPE_NAMES = new Set([
  "mvp", "enterprise", "feature", "poc", "bugfix", "refactor",
  "security-patch", "infra", "express", "classic", "workshop",
]);

// Fragment anchors the compose hook actually implements (v2 §6).
// `after-questions` is parsed-but-not-implemented (drop-logged) — excluded.
const IMPLEMENTED_ANCHOR = /^(after-step:\d+|before-step:\d+|end-of-steps|in:.+)$/;

describe("contribution overlays", () => {
  it("each overlay declares a target and fragment anchors", () => {
    const targets = OVERLAY_FILES.map((f) => readFrontmatter(f).fm);
    const targetNames = targets.map((t) => t.target).sort();
    expect(targetNames).toEqual(["build-and-test", "domain-design"]);
    for (const t of targets) {
      expect(Array.isArray(t.fragments)).toBe(true);
      expect(t.fragments.length).toBeGreaterThan(0);
      for (const frag of t.fragments) expect(typeof frag.anchor).toBe("string");
    }
  });

  it("every overlay targets a real core stage slug", () => {
    for (const f of OVERLAY_FILES) {
      const { fm } = readFrontmatter(f);
      expect(CORE_STAGE_SLUGS.has(fm.target)).toBe(true);
    }
  });

  it("every fragment anchor uses an implemented anchor form", () => {
    for (const f of OVERLAY_FILES) {
      const { fm } = readFrontmatter(f);
      for (const frag of fm.fragments) {
        expect(frag.anchor).toMatch(IMPLEMENTED_ANCHOR);
      }
    }
  });
});

// --- agent stem matches frontmatter name -----------------------------------

describe("agent", () => {
  it("file stem matches frontmatter name", () => {
    const { fm } = readFrontmatter(AGENT_FILE);
    const stem = basename(AGENT_FILE, extname(AGENT_FILE));
    expect(fm.name).toBe(stem);
    expect(fm.plugin).toBe("aws-blocks");
    expect(typeof fm.display_name).toBe("string");
    expect(fm.display_name.length).toBeGreaterThan(0);
  });

  it("knowledge directory matches the agent name and holds both docs", () => {
    const { fm } = readFrontmatter(AGENT_FILE);
    const kdir = `knowledge/${fm.name}`;
    for (const doc of ["blocks-catalog.md", "local-to-cloud-mapping.md"]) {
      expect(existsSync(resolve(ROOT, kdir, doc))).toBe(true);
    }
  });
});

// --- sensor manifest references an existing tool script --------------------

describe("sensor", () => {
  it("declares the real v2 sensor schema and its command points at an existing tool", () => {
    const { fm } = readFrontmatter(SENSOR_FILE);
    expect(fm.id).toBe("blocks-local-health");
    expect(fm.kind).toBe("deterministic");
    expect(typeof fm.default_severity).toBe("string");
    expect(typeof fm.category).toBe("string");
    expect(typeof fm.matches).toBe("string");
    // command: "bun {{HARNESS_DIR}}/tools/<script>.ts" — the referenced script must exist
    expect(typeof fm.command).toBe("string");
    const m = fm.command.match(/tools\/([\w.-]+\.ts)/);
    expect(m).not.toBeNull();
    expect(existsSync(resolve(ROOT, "tools", m![1]))).toBe(true);
  });

  it("is bound to a real stage via that stage's sensors list", () => {
    // Sensors bind through the stage's `sensors:` frontmatter, not a manifest field.
    const { fm } = readFrontmatter(SENSOR_FILE);
    const boundBy = STAGE_FILES.filter((f) =>
      (readFrontmatter(f).fm.sensors ?? []).includes(fm.id),
    );
    expect(boundBy.length).toBeGreaterThan(0);
  });
});

// --- tools present ---------------------------------------------------------

describe("tools", () => {
  it("both declared tool scripts exist", () => {
    for (const t of ["aidlc-blocks-local-health.ts", "aws-blocks-doctor.ts"]) {
      expect(existsSync(resolve(ROOT, "tools", t))).toBe(true);
    }
  });

  it("no unexpected .md files without frontmatter in content dirs", () => {
    const contentDirs = ["stages", "contributions", "sensors", "agents"];
    for (const d of contentDirs) {
      for (const f of walk(d, ".md")) {
        const text = readFileSync(resolve(ROOT, f), "utf-8");
        expect(text.startsWith("---\n")).toBe(true);
      }
    }
  });
});
