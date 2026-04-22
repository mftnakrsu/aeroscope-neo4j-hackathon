"use client";

import { useMemo, useState } from "react";
import { TabHeader } from "@/components/dashboard/TabHeader";
import { ApiError, runQuery, type QueryResponse, type QueryRow } from "@/lib/api-client";

const EXAMPLE_QUESTIONS = [
  "Which DAL-A requirements on Stratos-7 have no test procedure?",
  "Show conflicts between FCC and PWR modules",
  "What breaks if I raise the undervoltage threshold on Nimbus-C3?",
  "How is FCC-042 related to PWR-033?",
];

export default function QueryTab() {
  const [question, setQuestion] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [response, setResponse] = useState<QueryResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const q = question.trim();
    if (!q) return;
    setSubmitting(true);
    setError(null);
    setResponse(null);
    try {
      const resp = await runQuery({ template_id: null, question: q });
      setResponse(resp);
    } catch (err: unknown) {
      const message =
        err instanceof ApiError
          ? err.message
          : err instanceof Error
            ? err.message
            : "Query failed.";
      setError(message);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <>
      <TabHeader
        title="Query"
        crumbs={[{ label: "Analysis" }, { label: "Query" }]}
        subtitle="Ask in natural language. The agent generates Cypher, runs it on Aura, and shows both the query and the results."
      />

      <form onSubmit={handleSubmit} className="card pad mb-6">
        <label
          htmlFor="question"
          className="text-[10px] font-mono uppercase tracking-wider text-text-3"
        >
          Question
        </label>
        <textarea
          id="question"
          value={question}
          onChange={(event) => setQuestion(event.target.value)}
          rows={4}
          placeholder="e.g. Which requirements in NAV reference ARP4754A at DAL-B?"
          className="input h-auto py-3 mt-2 resize-y font-sans"
          autoFocus
        />
        <div className="mt-3 flex items-center justify-between gap-3 flex-wrap">
          <div className="flex flex-wrap gap-1.5">
            {EXAMPLE_QUESTIONS.map((ex) => (
              <button
                key={ex}
                type="button"
                onClick={() => setQuestion(ex)}
                className="chip hover:bg-bg-hover cursor-pointer"
                title="Use this example"
              >
                {ex}
              </button>
            ))}
          </div>
          <button
            type="submit"
            className="btn primary"
            disabled={submitting || !question.trim()}
          >
            {submitting ? "Running..." : "Ask agent →"}
          </button>
        </div>
      </form>

      {error ? (
        <div className="card pad border-red/40 mb-4">
          <div className="text-[11px] font-mono uppercase tracking-wider text-red mb-1">
            Error
          </div>
          <div className="text-sm text-text-2">{error}</div>
        </div>
      ) : null}

      {response ? <QueryResults response={response} /> : null}
    </>
  );
}

function QueryResults({ response }: { response: QueryResponse }) {
  const rows = response.rows ?? [];
  return (
    <>
      {response.cypher ? (
        <section className="card mb-4 overflow-hidden">
          <div className="flex items-center justify-between px-4 py-2.5 border-b border-line bg-bg-2">
            <div className="text-[10px] font-mono uppercase tracking-wider text-text-3">
              Generated Cypher
              {response.template_id ? (
                <span className="ml-2 text-cyan">· {response.template_id}</span>
              ) : null}
            </div>
            <CopyButton text={response.cypher} />
          </div>
          <pre className="mono text-[12px] leading-relaxed px-4 py-3 overflow-x-auto text-text-2 whitespace-pre-wrap break-words">
            {response.cypher}
          </pre>
        </section>
      ) : null}

      <section className="card overflow-hidden">
        <div className="flex items-center justify-between px-4 py-2.5 border-b border-line bg-bg-2">
          <div className="text-[10px] font-mono uppercase tracking-wider text-text-3">
            Results
            {typeof response.elapsed_ms === "number" ? (
              <span className="ml-2 text-text-3">· {response.elapsed_ms} ms</span>
            ) : null}
          </div>
          <div className="text-[10px] font-mono uppercase tracking-wider text-text-3">
            {rows.length} rows
          </div>
        </div>
        {rows.length === 0 ? (
          <div className="pad text-center text-text-2 py-8">
            No rows returned.
          </div>
        ) : (
          <ResultsTable rows={rows} columns={response.columns} />
        )}
      </section>
    </>
  );
}

function ResultsTable({
  rows,
  columns,
}: {
  rows: QueryRow[];
  columns?: string[];
}) {
  const cols = useMemo<string[]>(() => {
    if (columns && columns.length > 0) return columns;
    const set = new Set<string>();
    for (const row of rows) {
      for (const key of Object.keys(row)) set.add(key);
    }
    return Array.from(set);
  }, [rows, columns]);

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-[12px]">
        <thead className="bg-bg-2 text-text-3">
          <tr className="text-left">
            {cols.map((c) => (
              <th
                key={c}
                className="px-4 py-2 font-mono uppercase tracking-wider text-[10px] font-medium whitespace-nowrap"
              >
                {c}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, idx) => (
            <tr
              key={idx}
              className="border-t border-line align-top hover:bg-bg-hover"
            >
              {cols.map((c) => (
                <td key={c} className="px-4 py-2.5 align-top">
                  <CellValue value={row[c]} columnName={c} />
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function CellValue({
  value,
  columnName,
}: {
  value: unknown;
  columnName: string;
}) {
  if (value === null || value === undefined) {
    return <span className="text-text-3">—</span>;
  }
  if (Array.isArray(value)) {
    if (value.length === 0) return <span className="text-text-3">—</span>;
    return (
      <div className="flex flex-wrap gap-1">
        {value.map((v, i) => (
          <span key={i} className="chip">
            {String(v)}
          </span>
        ))}
      </div>
    );
  }
  if (typeof value === "object") {
    return (
      <code className="mono text-[11px] text-text-2">{JSON.stringify(value)}</code>
    );
  }
  const str = String(value);
  // IDs and requirement-shaped values get the amber id chip treatment.
  if (/^(requirement_?id|id|anchor_id|dependent_id|req_a|req_b)$/i.test(columnName)) {
    return <span className="chip id">{str}</span>;
  }
  return <span className="text-text-2">{str}</span>;
}

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  async function onCopy() {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      // no-op; clipboard may be blocked
    }
  }
  return (
    <button type="button" onClick={onCopy} className="btn sm ghost">
      {copied ? "Copied" : "Copy"}
    </button>
  );
}
