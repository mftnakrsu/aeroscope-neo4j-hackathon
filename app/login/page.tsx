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

function LoginInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const supabase = createClient();
  const nextPath = searchParams.get("next") || "/dashboard";
  const initialError = searchParams.get("error");

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(
    initialError === "auth_callback_failed"
      ? "Google sign-in was cancelled or failed. Please try again."
      : null,
  );
  const [submitting, setSubmitting] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);

  async function handleEmailSignIn(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (submitting) return;

    setError(null);
    setSubmitting(true);

    try {
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
    } catch {
      setError("Network error. Please try again.");
      setSubmitting(false);
    }
  }

  async function handleGoogleSignIn() {
    if (googleLoading) return;
    setError(null);
    setGoogleLoading(true);

    try {
      const { error: oauthError } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo: `${window.location.origin}/auth/callback?next=${encodeURIComponent(nextPath)}`,
        },
      });
      if (oauthError) {
        setError(oauthError.message || "Google sign-in failed.");
        setGoogleLoading(false);
      }
      // On success, Supabase will handle redirect to Google.
    } catch {
      setError("Network error. Please try again.");
      setGoogleLoading(false);
    }
  }

  return (
    <main className="relative min-h-screen overflow-hidden bg-bg text-text">
      {/* ========= Ambient background layers ========= */}
      {/* Radial base wash */}
      <div
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            "radial-gradient(1200px 700px at 28% 55%, rgba(79, 209, 197, 0.08), transparent 60%), radial-gradient(900px 600px at 80% 30%, rgba(255, 176, 32, 0.05), transparent 55%)",
        }}
      />

      {/* Flight path overlay — full-page foreground */}
      <div
        className="pointer-events-none absolute inset-0"
        style={{ opacity: 0.85 }}
      >
        <FlightPath className="h-full w-full" />
      </div>

      {/* Radar scope — ambient, anchored left ~40% */}
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

      {/* Fine grid overlay for texture */}
      <div
        className="pointer-events-none absolute inset-0"
        style={{
          backgroundImage:
            "linear-gradient(rgba(46, 56, 73, 0.25) 1px, transparent 1px), linear-gradient(90deg, rgba(46, 56, 73, 0.25) 1px, transparent 1px)",
          backgroundSize: "56px 56px",
          maskImage:
            "radial-gradient(ellipse 900px 700px at 70% 50%, #000 30%, transparent 85%)",
          WebkitMaskImage:
            "radial-gradient(ellipse 900px 700px at 70% 50%, #000 30%, transparent 85%)",
          opacity: 0.4,
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
                  "linear-gradient(180deg, rgba(255,255,255,0.04) 0%, rgba(255,255,255,0.01) 100%)",
                border: "1px solid rgba(255,255,255,0.08)",
                boxShadow: "0 10px 40px rgba(0,0,0,0.35)",
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

          {/* Login card (glass-morphism) */}
          <div className="w-full justify-self-center lg:justify-self-end">
            <div
              className="relative rounded-[10px] backdrop-blur-xl"
              style={{
                background:
                  "linear-gradient(180deg, rgba(17, 21, 29, 0.82) 0%, rgba(11, 14, 19, 0.88) 100%)",
                border: "1px solid var(--line-2)",
                boxShadow:
                  "0 30px 80px rgba(0, 0, 0, 0.55), 0 0 0 1px rgba(255, 255, 255, 0.02) inset, 0 0 60px rgba(255, 176, 32, 0.05)",
              }}
            >
              {/* Card inner border accent */}
              <div
                className="pointer-events-none absolute inset-0 rounded-[10px]"
                style={{
                  background:
                    "linear-gradient(135deg, rgba(255, 176, 32, 0.12), transparent 30%, transparent 70%, rgba(79, 209, 197, 0.1))",
                  mixBlendMode: "screen",
                }}
              />

              <div className="relative p-8">
                {/* Card header */}
                <div className="mb-7 flex items-start justify-between">
                  <div>
                    <div
                      className="mb-2 font-mono text-[10px] uppercase tracking-[0.2em]"
                      style={{ color: "var(--accent)" }}
                    >
                      Access Required
                    </div>
                    <h2 className="text-[22px] font-semibold tracking-tight text-text">
                      Sign in to console
                    </h2>
                    <p
                      className="mt-1.5 text-[13px]"
                      style={{ color: "var(--text-2)" }}
                    >
                      Continue with email or Google.
                    </p>
                  </div>
                  <div
                    className="font-mono text-[9px] uppercase tracking-[0.15em]"
                    style={{ color: "var(--text-4)" }}
                  >
                    AS · 01
                  </div>
                </div>

                <form onSubmit={handleEmailSignIn} noValidate>
                  {/* Email field */}
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

                  {/* Password field */}
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
                        autoComplete="current-password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        placeholder="••••••••"
                        className="input"
                        style={{ paddingLeft: 36, paddingRight: 40 }}
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

                  {/* Inline error */}
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

                  {/* Submit */}
                  <button
                    type="submit"
                    disabled={submitting}
                    className="group mt-2 flex h-11 w-full items-center justify-center gap-2 rounded-[6px] font-semibold tracking-tight transition-all disabled:opacity-60"
                    style={{
                      background: "var(--accent)",
                      color: "#000",
                      boxShadow:
                        "0 8px 24px rgba(255, 176, 32, 0.25), 0 0 0 1px rgba(255, 176, 32, 0.4)",
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
                      {submitting ? "Authorizing…" : "Enter console"}
                    </span>
                    {!submitting && (
                      <ArrowRightIcon
                        width={18}
                        height={18}
                        className="transition-transform group-hover:translate-x-0.5"
                      />
                    )}
                  </button>
                </form>

                {/* Divider */}
                <div className="my-5 flex items-center gap-3">
                  <div
                    className="h-px flex-1"
                    style={{ background: "var(--line)" }}
                  />
                  <span
                    className="font-mono text-[10px] uppercase tracking-[0.2em]"
                    style={{ color: "var(--text-4)" }}
                  >
                    or
                  </span>
                  <div
                    className="h-px flex-1"
                    style={{ background: "var(--line)" }}
                  />
                </div>

                {/* Google OAuth button */}
                <button
                  type="button"
                  onClick={handleGoogleSignIn}
                  disabled={googleLoading}
                  className="flex h-11 w-full items-center justify-center gap-2.5 rounded-[6px] font-medium tracking-tight transition-all disabled:opacity-60"
                  style={{
                    background: "var(--bg-2)",
                    color: "var(--text)",
                    border: "1px solid var(--line-2)",
                  }}
                  onMouseEnter={(e) => {
                    if (!googleLoading)
                      e.currentTarget.style.background = "var(--bg-hover)";
                  }}
                  onMouseLeave={(e) => {
                    if (!googleLoading)
                      e.currentTarget.style.background = "var(--bg-2)";
                  }}
                >
                  <GoogleGlyph />
                  <span>
                    {googleLoading ? "Redirecting…" : "Continue with Google"}
                  </span>
                </button>

                {/* Helper text */}
                <div className="mt-5 flex items-center justify-between">
                  <div
                    className="font-mono text-[11px]"
                    style={{ color: "var(--text-3)" }}
                  >
                    New here? Google creates your account automatically.
                  </div>
                  <div
                    className="font-mono text-[10px] uppercase tracking-[0.15em]"
                    style={{ color: "var(--text-4)" }}
                  >
                    TLS 1.3
                  </div>
                </div>
              </div>

              {/* Card footer strip */}
              <div
                className="relative flex items-center justify-between rounded-b-[10px] px-8 py-3 font-mono text-[10px] uppercase tracking-[0.18em]"
                style={{
                  borderTop: "1px solid var(--line)",
                  background: "rgba(11, 14, 19, 0.6)",
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

// Official Google "G" mark. SVG from Google's brand guidelines; 4-color.
function GoogleGlyph() {
  return (
    <svg width="18" height="18" viewBox="0 0 48 48" aria-hidden="true">
      <path
        fill="#FFC107"
        d="M43.6 20.5H42V20.4H24v7.2h11.3c-1.5 4.2-5.5 7.2-10.3 7.2-6 0-10.8-4.8-10.8-10.8S18.9 13.2 24.9 13.2c2.7 0 5.2 1 7.1 2.8l5.1-5.1C33.8 7.9 29.6 6 25.1 6 14.6 6 6 14.6 6 25.1s8.6 19.1 19.1 19.1c10.6 0 19.1-8.6 19.1-19.1 0-1.6-.2-3.1-.6-4.6z"
      />
      <path
        fill="#FF3D00"
        d="M8.3 14.4l6 4.4c1.6-3.9 5.4-6.6 9.8-6.6 2.7 0 5.2 1 7.1 2.8l5.1-5.1C33.8 7.9 29.6 6 25.1 6 17.8 6 11.5 10 8.3 14.4z"
      />
      <path
        fill="#4CAF50"
        d="M25.1 44.2c5.4 0 10.2-2 13.8-5.4l-6.4-5.4c-1.9 1.4-4.4 2.2-7.4 2.2-4.8 0-8.9-3-10.3-7.2l-6 4.6c2.8 5.5 8.8 9.2 16.3 9.2z"
      />
      <path
        fill="#1976D2"
        d="M43.6 20.5H42V20.4H24v7.2h11.3c-.7 2-2.1 3.8-3.9 5l.1.1 6.4 5.4c-.4.4 7.1-5.2 7.1-13 0-1.6-.2-3.1-.6-4.6z"
      />
    </svg>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={<main className="min-h-screen bg-bg" />}>
      <LoginInner />
    </Suspense>
  );
}
