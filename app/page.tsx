import Link from "next/link";
import Image from "next/image";

export default function Home() {
  return (
    <main className="min-h-screen">
      <header className="border-b border-line bg-bg-1">
        <div className="max-w-container mx-auto px-6 h-14 flex items-center gap-3">
          <Image
            src="/logo.png"
            alt="AeroScope"
            width={32}
            height={32}
            className="rounded-md"
            priority
          />
          <div className="leading-tight">
            <div className="text-sm font-semibold tracking-tight">AeroScope</div>
            <div className="text-[10px] font-mono text-text-3 uppercase tracking-wider">
              Neo4j Aura Agent · 2026
            </div>
          </div>
          <div className="ml-auto">
            <Link href="/login" className="btn primary">
              Sign in →
            </Link>
          </div>
        </div>
      </header>

      {/* Hero banner */}
      <section className="max-w-container mx-auto px-6 pt-12">
        <div
          className="relative overflow-hidden rounded-[14px] border"
          style={{
            borderColor: "var(--line-2)",
            boxShadow: "var(--shadow-2)",
          }}
        >
          <Image
            src="/banner.png"
            alt="AeroScope — trace aerospace requirements like a systems engineer"
            width={1200}
            height={600}
            priority
            className="w-full h-auto"
          />
        </div>
      </section>

      <section className="max-w-container mx-auto px-6 pt-14 pb-16">
        <span className="inline-flex items-center gap-2 text-[11px] font-mono text-accent uppercase tracking-wider border border-accent/30 bg-accent/10 px-3 py-1 rounded-full mb-6">
          <span className="w-1.5 h-1.5 rounded-full bg-accent" />
          Hackathon 2026 · Built on Neo4j Aura Agent
        </span>
        <h1 className="text-6xl font-semibold tracking-tight mb-6 leading-none">
          Trace. Understand. Assure.
        </h1>
        <p className="text-lg text-text-2 max-w-2xl leading-relaxed">
          An aerospace requirements traceability agent on Neo4j Aura. Walks the
          graph to answer impact analysis, compliance, and coverage questions
          that document stores cannot — across 30 modules and four fictional UAV
          platforms.
        </p>
        <div className="mt-10 flex gap-3">
          <Link href="/login" className="btn primary">
            Enter console →
          </Link>
          <a
            href="https://github.com/mftnakrsu/aeroscope-neo4j-hackathon"
            className="btn"
            target="_blank"
            rel="noopener noreferrer"
          >
            View source
          </a>
        </div>

        <div className="mt-20 grid grid-cols-1 md:grid-cols-3 gap-4">
          {[
            {
              k: "CORPUS",
              v: "30 modules",
              sub: "~1,000 synthetic requirements",
            },
            {
              k: "GRAPH",
              v: "14 rel types",
              sub: "explicit + LLM-discovered implicit",
            },
            {
              k: "AGENT",
              v: "3 tools",
              sub: "Cypher Template · Text2Cypher · Similarity",
            },
          ].map((c) => (
            <div key={c.k} className="card pad">
              <div className="text-[10px] font-mono text-text-3 uppercase tracking-wider mb-2">
                {c.k}
              </div>
              <div className="text-2xl font-semibold tracking-tight">
                {c.v}
              </div>
              <div className="text-sm text-text-2 mt-1">{c.sub}</div>
            </div>
          ))}
        </div>
      </section>

      <footer className="border-t border-line bg-bg-1 mt-12">
        <div className="max-w-container mx-auto px-6 py-6 flex items-center gap-4 text-xs font-mono text-text-3 uppercase tracking-wider">
          <span>AeroSys Dynamics · fictional domain</span>
          <span className="spacer" />
          <a
            href="https://github.com/mftnakrsu/aeroscope-neo4j-hackathon"
            className="hover:text-text"
          >
            GitHub
          </a>
          <span>·</span>
          <Link href="/login" className="hover:text-text">
            Console
          </Link>
        </div>
      </footer>
    </main>
  );
}
