import fs from "node:fs/promises";
import path from "node:path";

export type TemplateParamType = "string" | "integer" | "array";

export interface TemplateParam {
  name: string;
  description?: string;
  type?: TemplateParamType | string;
  required?: boolean;
  default?: unknown;
}

export interface Template {
  /** The canonical id (matches the filename without `.json`). */
  id: string;
  /** Human-facing name. Falls back to `id` when absent. */
  name: string;
  description?: string;
  when_to_use?: string;
  cypher: string;
  parameters?: TemplateParam[];
  limit?: number;
  notes?: string;
}

const TEMPLATES_DIR = path.join(
  process.cwd(),
  "aura",
  "cypher_templates"
);

const templateCache = new Map<string, Template>();
let idsCache: string[] | null = null;

/** Basic id sanity — only lowercase letters, digits, and underscores. */
function isSafeTemplateId(id: string): boolean {
  return /^[a-z0-9_]+$/.test(id);
}

/**
 * List every template id (filename stem) under `aura/cypher_templates/`.
 * Result is cached in memory; the dev server can be restarted to pick up
 * new template files.
 */
export async function listTemplates(): Promise<string[]> {
  if (idsCache) return idsCache;
  const entries = await fs.readdir(TEMPLATES_DIR);
  idsCache = entries
    .filter((f) => f.endsWith(".json"))
    .map((f) => f.replace(/\.json$/, ""))
    .filter(isSafeTemplateId)
    .sort();
  return idsCache;
}

/**
 * Load one template by id. Returns `null` if the file does not exist or
 * does not parse. Successful reads are cached in memory.
 */
export async function loadTemplate(id: string): Promise<Template | null> {
  if (!isSafeTemplateId(id)) return null;

  const cached = templateCache.get(id);
  if (cached) return cached;

  const filePath = path.join(TEMPLATES_DIR, `${id}.json`);

  let raw: string;
  try {
    raw = await fs.readFile(filePath, "utf-8");
  } catch {
    return null;
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return null;
  }

  if (!parsed || typeof parsed !== "object") return null;
  const obj = parsed as Record<string, unknown>;
  const cypher = obj.cypher;
  if (typeof cypher !== "string" || !cypher.trim()) return null;

  const template: Template = {
    id,
    name: typeof obj.name === "string" ? obj.name : id,
    description:
      typeof obj.description === "string" ? obj.description : undefined,
    when_to_use:
      typeof obj.when_to_use === "string" ? obj.when_to_use : undefined,
    cypher,
    parameters: Array.isArray(obj.parameters)
      ? (obj.parameters as TemplateParam[])
      : [],
    limit: typeof obj.limit === "number" ? obj.limit : undefined,
    notes: typeof obj.notes === "string" ? obj.notes : undefined,
  };

  templateCache.set(id, template);
  return template;
}

/**
 * Clear the in-memory template cache. Exposed for tests; not exercised
 * at runtime on Vercel.
 */
export function __clearTemplateCacheForTests(): void {
  templateCache.clear();
  idsCache = null;
}
