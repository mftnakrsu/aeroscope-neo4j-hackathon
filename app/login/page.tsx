"use client";

import { FormEvent, useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Image from "next/image";
import { RadarScope } from "../../components/login/RadarScope";
import { FlightPath } from "../../components/login/FlightPath";
import { BrandMark } from "../../components/login/BrandMark";
import {
  ArrowRightIcon,
  EyeIcon,
  LockIcon,
  UserIcon,
} from "../../components/icons";
import { createClient } from "@/utils/supabase/client";

type Mode = "signin" | "signup";

function LoginInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const supabase = createClient();
  const nextPath = searchParams.get("next") || "/dashboard";

  const [mode, setMode] = useState<Mode>("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [confirmationSent, setConfirmationSent] = useState(false);

  const isSignup = mode === "signup";

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (submitting) return;

    setError(null);
    setSubmitting(true);

    try {
      if (!isSignup) {
        const { error: signInError } = await supabase.auth.signInWithPassword({
          email,
          password,
        });
        if (signInError) {
          setError(signInError.message || "Unable to sign in.");
          setSubmitting(false);
          return;
        }
        router.push(nextPath);
        router.refresh();
        return;
      }

      // Sign-up path.
      const { data, error: signUpError } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: `${window.location.origin}/auth/callback?next=${encodeURIComponent(nextPath)}`,
        },
      });
      if (signUpError) {
        setError(signUpError.message || "Unable to create account.");
        setSubmitting(false);
        return;
      }

      // If Supabase returned a session, email confirmation is disabled and
      // the user is signed in immediately. Otherwise, tell them to check
      // their inbox — the link in the confirmation email hits /auth/callback
      // and completes the sign-in.
      if (data.session) {
        router.push(nextPath);
        router.refresh();
      } else {
        setConfirmationSent(true);
        setSubmitting(false);
      }
    } catch {
      setError("Network error. Please try again.");
      setSubmitting(false);
    }
  }

  function toggleMode() {
    setMode(isSignup ? "signin" : "signup");
    setError(null);
    setConfirmationSent(false);
  }

  return (
    <main
      data-theme="light"
      className="relative min-h-screen overflow-hidden bg-white text-text"
    >
      {/* ========= Ambient background layers ========= */}
      <div
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            "radial-gradient(1200px 700px at 28% 55%, rgba(6, 148, 162, 0.09), transparent 60%), radial-gradient(900px 600px at 80% 30%, rgba(0, 82, 204, 0.06), transparent 55%)",
        }}
      />

      <div
        className="pointer-events-none absolute inset-0"
        style={{ opacity: 0.85 }}
      >
        <FlightPath className="h-full w-full" />
      </div>

      <div
        className="pointer-events-none absolute"
        style={{
          left: "-4%",
          top: "50%",
          transform: "translateY(-50%)",
          width: "min(780px, 60vw)",
          height: "min(780px, 60vw)",
          opacity: 0.85,
        }}
      >
        <RadarScope className="h-full w-full" />
      </div>

      <div
        className="pointer-events-none absolute inset-0"
        style={{
          backgroundImage:
            "linear-gradient(rgba(15, 20, 32, 0.08) 1px, transparent 1px), linear-gradient(90deg, rgba(15, 20, 32, 0.08) 1px, transparent 1px)",
          backgroundSize: "56px 56px",
          maskImage:
            "radial-gradient(ellipse 900px 700px at 70% 50%, #000 30%, transparent 85%)",
          WebkitMaskImage:
            "radial-gradient(ellipse 900px 700px at 70% 50%, #000 30%, transparent 85%)",
          opacity: 0.6,
        }}
      />

      {/* ========= Top bar ========= */}
      <header className="relative z-10 flex items-center justify-between px-8 py-6">
        <BrandMark size={32} />
        <div
          className="hidden items-center gap-2 font-mono text-[10px] uppercase tracking-[0.18em] sm:flex"
          style={{ color: "var(--text-3)" }}
        >
          <span
            className="inline-block h-1.5 w-1.5 rounded-full"
            style={{
              background: "var(--green)",
              boxShadow: "0 0 8px var(--green)",
              animation: "pulse 2s ease-in-out infinite",
            }}
          />
          <span>Secure Channel</span>
          <span style={{ color: "var(--text-4)" }}>·</span>
          <span>Node 03</span>
          <span style={{ color: "var(--text-4)" }}>·</span>
          <span>v0.1.0</span>
        </div>
      </header>

      {/* ========= Main composition ========= */}
      <section className="relative z-10 mx-auto flex max-w-container items-center px-8 py-6">
        <div className="grid w-full grid-cols-1 items-center gap-12 lg:grid-cols-[1.05fr_minmax(380px,440px)]">
          {/* Left copy column */}
          <div className="hidden lg:block">
            <div
              className="mb-6 inline-block rounded-[14px] p-3"
              style={{
                background:
                  "linear-gradient(180deg, rgba(255,255,255,1) 0%, rgba(248,250,253,1) 100%)",
                border: "1px solid rgba(15,20,32,0.08)",
                boxShadow: "0 10px 30px rgba(15,20,32,0.08)",
              }}
            >
              <Image
                src="/logo.png"
                alt="AeroScope"
                width={96}
                height={96}
                priority
                className="rounded-[10px]"
              />
            </div>
            <span
              className="mb-6 inline-flex items-center gap-2 rounded-full px-3 py-1 font-mono text-[10px] uppercase tracking-[0.18em]"
              style={{
                color: "var(--cyan)",
                background: "rgba(79, 209, 197, 0.08)",
                border: "1px solid rgba(79, 209, 197, 0.25)",
              }}
            >
              <span
                className="h-1.5 w-1.5 rounded-full"
                style={{ background: "var(--cyan)" }}
              />
              Neo4j Aura Agent · Hackathon 2026
            </span>
            <h1 className="text-5xl font-semibold leading-[1.02] tracking-tight text-text">
              Mission control
              <br />
              for aerospace
              <br />
              <span style={{ color: "var(--accent)" }}>requirements.</span>
            </h1>
            <p
              className="mt-6 max-w-md text-[15px] leading-relaxed"
              style={{ color: "var(--text-2)" }}
            >
              Sign in to explore impact analysis, compliance coverage, and
              traceability across AeroSys Dynamics platforms — Stratos-7,
              AeroLynx-X2, Skyrunner-T1, and Nimbus-C3.
            </p>

            <div className="mt-10 flex items-center gap-6">
              {[
                { k: "Modules", v: "30" },
                { k: "Requirements", v: "~1k" },
                { k: "Rel types", v: "14" },
              ].map((stat) => (
                <div key={stat.k}>
                  <div
                    className="font-mono text-[9px] uppercase tracking-[0.18em]"
                    style={{ color: "var(--text-3)" }}
                  >
                    {stat.k}
                  </div>
                  <div className="mt-1 text-2xl font-semibold tracking-tight">
                    {stat.v}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Login card — clean white glass-morphism.
              No theme override — inherits the page's light theme so every
              var() inside resolves to the Neo4j-blue / dark-text values. */}
          <div className="w-full justify-self-center lg:justify-self-end">
            <div
              className="relative rounded-[10px] backdrop-blur-xl"
              style={{
                background:
                  "linear-gradient(180deg, rgba(255, 255, 255, 0.98) 0%, rgba(248, 250, 253, 1) 100%)",
                border: "1px solid rgba(15, 20, 32, 0.1)",
                boxShadow:
                  "0 24px 60px rgba(15, 20, 32, 0.1), 0 1px 0 rgba(255, 255, 255, 0.8) inset",
              }}
            >
              <div
                className="pointer-events-none absolute inset-0 rounded-[10px]"
                style={{
                  background:
                    "linear-gradient(135deg, rgba(0, 82, 204, 0.04), transparent 30%, transparent 70%, rgba(6, 148, 162, 0.04))",
                }}
              />

              <div className="relative p-8">
                <div className="mb-7 flex items-start justify-between">
                  <div>
                    <div
                      className="mb-2 font-mono text-[10px] uppercase tracking-[0.2em]"
                      style={{ color: "var(--accent)" }}
                    >
                      {isSignup ? "Create Access" : "Access Required"}
                    </div>
                    <h2 className="text-[22px] font-semibold tracking-tight text-text">
                      {isSignup ? "Create account" : "Sign in to console"}
                    </h2>
                    <p
                      className="mt-1.5 text-[13px]"
                      style={{ color: "var(--text-2)" }}
                    >
                      {isSignup
                        ? "Use an email and a password of at least 6 characters."
                        : "Enter your email and password to continue."}
                    </p>
                  </div>
                  <div
                    className="font-mono text-[9px] uppercase tracking-[0.15em]"
                    style={{ color: "var(--text-4)" }}
                  >
                    AS · 01
                  </div>
                </div>

                {confirmationSent ? (
                  <div
                    role="status"
                    className="flex flex-col gap-3 rounded-[8px] px-4 py-4 text-[13px]"
                    style={{
                      background: "rgba(79, 209, 197, 0.08)",
                      border: "1px solid rgba(79, 209, 197, 0.3)",
                      color: "var(--cyan)",
                    }}
                  >
                    <div className="flex items-center gap-2 font-mono text-[10px] uppercase tracking-[0.18em]">
                      <span
                        className="inline-block h-1.5 w-1.5 rounded-full"
                        style={{
                          background: "var(--cyan)",
                          animation: "pulse 2s ease-in-out infinite",
                        }}
                      />
                      Confirmation sent
                    </div>
                    <div style={{ color: "var(--text)" }}>
                      Check <span className="font-mono">{email}</span> for the
                      sign-in link. Clicking it will bring you straight to the
                      console.
                    </div>
                    <button
                      type="button"
                      onClick={toggleMode}
                      className="self-start text-[12px] underline decoration-dotted underline-offset-4"
                      style={{ color: "var(--text-2)" }}
                    >
                      Back to sign in
                    </button>
                  </div>
                ) : (
                  <form onSubmit={handleSubmit} noValidate>
                    <label className="mb-4 block">
                      <span
                        className="mb-1.5 block font-mono text-[10px] uppercase tracking-[0.18em]"
                        style={{ color: "var(--text-3)" }}
                      >
                        Email
                      </span>
                      <div className="relative">
                        <span
                          className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2"
                          style={{ color: "var(--text-3)" }}
                        >
                          <UserIcon width={16} height={16} />
                        </span>
                        <input
                          type="email"
                          autoComplete="email"
                          value={email}
                          onChange={(e) => setEmail(e.target.value)}
                          placeholder="you@example.com"
                          className="input"
                          style={{ paddingLeft: 36 }}
                          required
                        />
                      </div>
                    </label>

                    <label className="mb-3 block">
                      <span
                        className="mb-1.5 block font-mono text-[10px] uppercase tracking-[0.18em]"
                        style={{ color: "var(--text-3)" }}
                      >
                        Password
                      </span>
                      <div className="relative">
                        <span
                          className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2"
                          style={{ color: "var(--text-3)" }}
                        >
                          <LockIcon width={16} height={16} />
                        </span>
                        <input
                          type={showPassword ? "text" : "password"}
                          autoComplete={isSignup ? "new-password" : "current-password"}
                          value={password}
                          onChange={(e) => setPassword(e.target.value)}
                          placeholder="••••••••"
                          className="input"
                          style={{ paddingLeft: 36, paddingRight: 40 }}
                          minLength={6}
                          required
                        />
                        <button
                          type="button"
                          onClick={() => setShowPassword((s) => !s)}
                          aria-label={
                            showPassword ? "Hide password" : "Show password"
                          }
                          className="absolute right-2 top-1/2 grid h-7 w-7 -translate-y-1/2 place-items-center rounded-[4px] transition-colors"
                          style={{ color: "var(--text-3)" }}
                          onMouseEnter={(e) =>
                            (e.currentTarget.style.color = "var(--text)")
                          }
                          onMouseLeave={(e) =>
                            (e.currentTarget.style.color = "var(--text-3)")
                          }
                        >
                          <EyeIcon width={16} height={16} off={showPassword} />
                        </button>
                      </div>
                    </label>

                    {error && (
                      <div
                        role="alert"
                        className="mb-3 flex items-center gap-2 rounded-[6px] px-3 py-2 text-[12.5px]"
                        style={{
                          background: "rgba(255, 107, 107, 0.08)",
                          border: "1px solid rgba(255, 107, 107, 0.3)",
                          color: "var(--red)",
                        }}
                      >
                        <span
                          className="inline-block h-1.5 w-1.5 rounded-full"
                          style={{ background: "var(--red)" }}
                        />
                        {error}
                      </div>
                    )}

                    <button
                      type="submit"
                      disabled={submitting}
                      className="group mt-2 flex h-11 w-full items-center justify-center gap-2 rounded-[6px] font-semibold tracking-tight transition-all disabled:opacity-60"
                      style={{
                        background: "var(--accent)",
                        color: "#fff",
                        boxShadow:
                          "0 8px 24px rgba(0, 82, 204, 0.22), 0 0 0 1px rgba(0, 82, 204, 0.35)",
                      }}
                      onMouseEnter={(e) => {
                        if (!submitting)
                          e.currentTarget.style.background = "var(--accent-2)";
                      }}
                      onMouseLeave={(e) => {
                        if (!submitting)
                          e.currentTarget.style.background = "var(--accent)";
                      }}
                    >
                      <span>
                        {submitting
                          ? isSignup
                            ? "Creating account…"
                            : "Authorizing…"
                          : isSignup
                            ? "Create account"
                            : "Enter console"}
                      </span>
                      {!submitting && (
                        <ArrowRightIcon
                          width={18}
                          height={18}
                          className="transition-transform group-hover:translate-x-0.5"
                        />
                      )}
                    </button>

                    <div className="mt-5 flex items-center justify-between">
                      <button
                        type="button"
                        onClick={toggleMode}
                        className="font-mono text-[11px] underline decoration-dotted underline-offset-4"
                        style={{ color: "var(--text-2)" }}
                      >
                        {isSignup
                          ? "Already have an account? Sign in"
                          : "Need an account? Create one"}
                      </button>
                      <div
                        className="font-mono text-[10px] uppercase tracking-[0.15em]"
                        style={{ color: "var(--text-4)" }}
                      >
                        TLS 1.3
                      </div>
                    </div>
                  </form>
                )}
              </div>

              <div
                className="relative flex items-center justify-between rounded-b-[10px] px-8 py-3 font-mono text-[10px] uppercase tracking-[0.18em]"
                style={{
                  borderTop: "1px solid var(--line)",
                  background: "rgba(248, 250, 253, 0.9)",
                  color: "var(--text-3)",
                }}
              >
                <span>AeroSys Dynamics</span>
                <span style={{ color: "var(--text-4)" }}>Fictional domain</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ========= Bottom telemetry strip ========= */}
      <footer
        className="relative z-10 mx-auto flex max-w-container items-center justify-between px-8 py-5 font-mono text-[10px] uppercase tracking-[0.18em]"
        style={{ color: "var(--text-3)" }}
      >
        <div className="flex items-center gap-4">
          <span>Lat 41.02N</span>
          <span style={{ color: "var(--text-4)" }}>·</span>
          <span>Lon 28.98E</span>
          <span style={{ color: "var(--text-4)" }}>·</span>
          <span>Alt 0 ft</span>
        </div>
        <div
          className="hidden items-center gap-2 sm:flex"
          style={{ color: "var(--cyan)" }}
        >
          <span
            className="inline-block h-1.5 w-1.5 rounded-full"
            style={{
              background: "var(--cyan)",
              animation: "blink 1.4s steps(1) infinite",
            }}
          />
          <span>Link Nominal</span>
        </div>
      </footer>
    </main>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={<main className="min-h-screen bg-bg" />}>
      <LoginInner />
    </Suspense>
  );
}
