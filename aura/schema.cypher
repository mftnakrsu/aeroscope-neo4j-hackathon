// ============================================================================
// AeroScope — Neo4j Aura Agent Hackathon Schema
// ----------------------------------------------------------------------------
// Idempotent bootstrap script for the AeroScope requirements traceability
// graph. Safe to run multiple times on Neo4j 5.x (Aura Free). Every statement
// uses `IF NOT EXISTS` so re-execution is a no-op against an existing graph.
//
// Graph shape (summary):
//   :Requirement is the atomic unit. Structural context (Module, Platform),
//   certification context (Standard), engineering context (Component,
//   Interface, OperationalMode, TestProcedure), and social context
//   (Stakeholder, Organization) all attach via typed relationships.
//
// Index strategy:
//   - Uniqueness constraints for every node label's business key.
//   - B-tree / range indexes on hot filter properties (module, object_type,
//     heading, classification).
//   - Full-text index across text/heading/summary for keyword fallback.
//   - Vector index on :Requirement(embedding), 1536 dims, cosine — sized for
//     OpenAI text-embedding-3-small.
//
// Execution order below mirrors the ingestion pipeline: constraints first
// (so MERGE operations in loaders can rely on them), then property indexes,
// then search indexes. Commit boundaries are implicit between statements.
// ============================================================================


// ----------------------------------------------------------------------------
// 1. Uniqueness constraints — one per node label.
//    Constraints also create a backing index usable by planner for lookups
//    on the key property, so no separate index is needed for e.g. Module.name.
// ----------------------------------------------------------------------------

// Requirement is the atomic unit — id is the DOORS-style unique identifier
// (e.g. "FCC-REQ-0042"). Everything in the graph hangs off this key.
CREATE CONSTRAINT requirement_id IF NOT EXISTS
FOR (r:Requirement) REQUIRE r.id IS UNIQUE;

// Module groups requirements that were exported together from the same
// DOORS module (e.g. FCC, INS, POWER, CDL). name is unique per corpus.
CREATE CONSTRAINT module_name IF NOT EXISTS
FOR (m:Module) REQUIRE m.name IS UNIQUE;

// Platform is a fictional UAV airframe (Stratos-7, AeroLynx-X2,
// Skyrunner-T1, Nimbus-C3). A single Requirement may apply to multiple
// platforms via ALLOCATED_TO.
CREATE CONSTRAINT platform_name IF NOT EXISTS
FOR (p:Platform) REQUIRE p.name IS UNIQUE;

// Standard models a public aerospace standard (DO-178C, ARP4754A, DO-254,
// DO-160, MIL-STD-1553B, ARINC-429, STANAG 4586, etc.). name is the
// canonical standard identifier.
CREATE CONSTRAINT standard_name IF NOT EXISTS
FOR (s:Standard) REQUIRE s.name IS UNIQUE;

// Component is a generic avionics component type (FCC, INS, IMU, GPS,
// MFD, HUD). Used for USES and ALLOCATED_TO traversals.
CREATE CONSTRAINT component_name IF NOT EXISTS
FOR (c:Component) REQUIRE c.name IS UNIQUE;

// TestProcedure represents a verification artefact. id is the test case
// identifier (e.g. "TP-FCC-0007").
CREATE CONSTRAINT test_procedure_id IF NOT EXISTS
FOR (t:TestProcedure) REQUIRE t.id IS UNIQUE;

// Stakeholder models fictional engineering roles — Chief Engineer,
// Certification Lead, Systems Architect, etc. name is the role label.
CREATE CONSTRAINT stakeholder_name IF NOT EXISTS
FOR (s:Stakeholder) REQUIRE s.name IS UNIQUE;

// Organization models companies involved in the supply chain / standards
// bodies. name is the org name (e.g. "AeroSys Dynamics", "RTCA").
CREATE CONSTRAINT organization_name IF NOT EXISTS
FOR (o:Organization) REQUIRE o.name IS UNIQUE;

// Interface models communication buses & protocols (MIL-STD-1553B,
// ARINC 429, Ethernet, RS-422, CAN Bus, AFDX, Link-16). Distinct from
// Standard because Interface exposes USES semantics.
CREATE CONSTRAINT interface_name IF NOT EXISTS
FOR (i:Interface) REQUIRE i.name IS UNIQUE;

// OperationalMode models avionics state machine modes (Flight, Ground,
// Standby, Emergency, BIT, Combat).
CREATE CONSTRAINT operational_mode_name IF NOT EXISTS
FOR (o:OperationalMode) REQUIRE o.name IS UNIQUE;


// ----------------------------------------------------------------------------
// 2. Property indexes — accelerate common filters on :Requirement.
//    These are range indexes (Neo4j 5.x default); supports equality and
//    range predicates, which covers all filter cases in the corpus.
// ----------------------------------------------------------------------------

// Filter by parent module — "show me all FCC requirements".
CREATE INDEX requirement_module IF NOT EXISTS
FOR (r:Requirement) ON (r.module);

// Filter by object_type — distinguishes Requirement / Heading / Information
// / Image chunks within the same label.
CREATE INDEX requirement_object_type IF NOT EXISTS
FOR (r:Requirement) ON (r.object_type);

// Filter by heading — useful for "what's in section 4.2" style queries.
CREATE INDEX requirement_heading IF NOT EXISTS
FOR (r:Requirement) ON (r.heading);

// Filter by classification — Functional / Non-Functional / Safety /
// Interface / Performance. Populated by the LLM enricher.
CREATE INDEX requirement_classification IF NOT EXISTS
FOR (r:Requirement) ON (r.classification);

// Filter by verification method — Analysis / Test / Inspection /
// Demonstration. Drives verification-coverage queries.
CREATE INDEX requirement_verification_method IF NOT EXISTS
FOR (r:Requirement) ON (r.verification_method);

// Filter by safety classification — DAL-A through DAL-E (DO-178C DAL).
CREATE INDEX requirement_safety_classification IF NOT EXISTS
FOR (r:Requirement) ON (r.safety_classification);


// ----------------------------------------------------------------------------
// 3. Full-text index — keyword fallback when vector search misses.
//    Covers the three highest-signal text fields on Requirement. Queried
//    via `db.index.fulltext.queryNodes('requirement_fulltext', $query)`.
//    Handles acronyms, exact phrases, and near-string matches cheaply.
// ----------------------------------------------------------------------------

CREATE FULLTEXT INDEX requirement_fulltext IF NOT EXISTS
FOR (r:Requirement) ON EACH [r.text, r.heading, r.summary];


// ----------------------------------------------------------------------------
// 4. Vector index — semantic similarity on :Requirement(embedding).
//    Dimensions: 1536 — matches OpenAI text-embedding-3-small.
//    Similarity: cosine — standard for normalized text embeddings.
//    Queried via `db.index.vector.queryNodes('requirement_embeddings',
//    $k, $queryEmbedding)`. Results come back with a built-in `score`.
//    The Aura Agent Similarity Search tool wraps this index directly.
// ----------------------------------------------------------------------------

CREATE VECTOR INDEX requirement_embeddings IF NOT EXISTS
FOR (r:Requirement) ON (r.embedding)
OPTIONS {
  indexConfig: {
    `vector.dimensions`: 1536,
    `vector.similarity_function`: 'cosine'
  }
};


// ----------------------------------------------------------------------------
// 5. Sanity probe — returns index + constraint counts so an operator can
//    confirm the bootstrap succeeded. Safe to leave in; purely informational.
// ----------------------------------------------------------------------------

CALL db.indexes() YIELD name, type, state
RETURN name, type, state
ORDER BY name;
