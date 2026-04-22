import neo4j, { Driver, Node, Relationship, Path, Integer } from "neo4j-driver";

/**
 * Singleton Neo4j driver for AeroScope.
 *
 * Vercel serverless functions can reuse a hot container across invocations,
 * so we cache the Driver instance on the Node.js global to survive module
 * re-imports. `beforeExit` hooks are unreliable in serverless environments,
 * so we intentionally do NOT register a shutdown handler — the driver is
 * closed by the container lifecycle.
 */

type GlobalWithDriver = typeof globalThis & {
  __aeroscopeNeo4jDriver?: Driver;
};

const globalWithDriver = globalThis as GlobalWithDriver;

export function getDriver(): Driver {
  if (globalWithDriver.__aeroscopeNeo4jDriver) {
    return globalWithDriver.__aeroscopeNeo4jDriver;
  }

  const uri = process.env.NEO4J_URI;
  const user = process.env.NEO4J_USER;
  const password = process.env.NEO4J_PASSWORD;

  if (!uri || !user || !password) {
    throw new Error(
      "Missing Neo4j credentials. Set NEO4J_URI, NEO4J_USER, NEO4J_PASSWORD."
    );
  }

  const driver = neo4j.driver(uri, neo4j.auth.basic(user, password), {
    // 15s cap aligns with per-query timeout enforced in route handler.
    connectionAcquisitionTimeout: 15_000,
    maxConnectionPoolSize: 20,
    disableLosslessIntegers: false,
    userAgent: "aeroscope/0.1.0",
  });

  globalWithDriver.__aeroscopeNeo4jDriver = driver;
  return driver;
}

/**
 * Convert a single Neo4j driver value into a plain, JSON-safe JavaScript value.
 *
 * Handles:
 *  - neo4j.Integer    -> number (or string if it would lose precision)
 *  - Node             -> { id, labels, properties }
 *  - Relationship     -> { type, start, end, properties }
 *  - Path             -> { segments: [{ start, relationship, end }] }
 *  - arrays/objects   -> recursively serialized
 *  - primitives       -> passed through
 */
export function serializeValue(v: unknown): unknown {
  if (v === null || v === undefined) return v;

  // neo4j Integer (BigInt-backed). Uses isInt helper for duck-type safety.
  if (neo4j.isInt(v as unknown as Integer)) {
    const asInt = v as Integer;
    if (asInt.inSafeRange()) return asInt.toNumber();
    return asInt.toString();
  }

  // Native BigInt fallback.
  if (typeof v === "bigint") {
    const n = Number(v);
    return Number.isSafeInteger(n) ? n : v.toString();
  }

  // Node
  if (v instanceof (neo4j.types.Node as unknown as { new (): Node })) {
    const node = v as Node;
    return {
      id: serializeValue(node.identity),
      labels: node.labels,
      properties: serializeProperties(node.properties),
      // Also expose the Requirement.id / Module.name style business key if present.
      elementId: (node as unknown as { elementId?: string }).elementId,
    };
  }

  // Relationship
  if (
    v instanceof
    (neo4j.types.Relationship as unknown as { new (): Relationship })
  ) {
    const rel = v as Relationship;
    return {
      id: serializeValue(rel.identity),
      type: rel.type,
      start: serializeValue(rel.start),
      end: serializeValue(rel.end),
      properties: serializeProperties(rel.properties),
      elementId: (rel as unknown as { elementId?: string }).elementId,
    };
  }

  // Path
  if (v instanceof (neo4j.types.Path as unknown as { new (): Path })) {
    const path = v as Path;
    return {
      segments: path.segments.map((seg) => ({
        start: serializeValue(seg.start),
        relationship: serializeValue(seg.relationship),
        end: serializeValue(seg.end),
      })),
      length: path.length,
    };
  }

  // Array
  if (Array.isArray(v)) {
    return v.map((item) => serializeValue(item));
  }

  // Plain object (property maps returned by Cypher projections).
  if (typeof v === "object") {
    return serializeProperties(v as Record<string, unknown>);
  }

  return v;
}

function serializeProperties(
  props: Record<string, unknown>
): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const k of Object.keys(props)) {
    out[k] = serializeValue(props[k]);
  }
  return out;
}
