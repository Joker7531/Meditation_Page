"use client";

import { Suspense, useMemo } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { completedCycles, formatDuration } from "../../lib/breathing";

const DURATION_MIN_KEY = "breathing:durationMin";
const SUMMARY_KEY = "breathing:lastSummary";

type EndReason = "normal" | "early";

type Summary = {
  elapsedActiveSec: number;
  targetDurationSec: number;
  endReason: EndReason;
  completedCycles: number;
  durationMin: number;
};

function safeParseJSON<T>(raw: string | null): T | null {
  if (!raw) return null;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}

function coerceNumber(raw: string | null): number | null {
  if (raw === null) return null;
  const n = Number(raw);
  return Number.isFinite(n) ? n : null;
}

function coerceInt(raw: string | null): number | null {
  if (raw === null) return null;
  const v = raw.trim();
  if (!/^[0-9]+$/.test(v)) return null;
  const n = Number(v);
  return Number.isInteger(n) ? n : null;
}

function CompletionContent() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const summary = useMemo<Summary>(() => {
    const fromStorage =
      typeof window !== "undefined"
        ? safeParseJSON<Summary>(window.sessionStorage.getItem(SUMMARY_KEY))
        : null;

    // Query is "primary" per plan, but we keep it minimal; allow it to override if present.
    const elapsedQ = coerceNumber(searchParams.get("elapsedActiveSec"));
    const targetQ = coerceNumber(searchParams.get("targetDurationSec"));
    const endReasonQ = (searchParams.get("endReason") as EndReason | null) ?? null;

    const elapsedActiveSec = elapsedQ ?? fromStorage?.elapsedActiveSec ?? 0;
    const targetDurationSec = targetQ ?? fromStorage?.targetDurationSec ?? 10 * 60;

    const endReason: EndReason =
      endReasonQ === "early" || endReasonQ === "normal"
        ? endReasonQ
        : fromStorage?.endReason ?? "normal";

    const durationMin =
      fromStorage?.durationMin ??
      coerceInt(typeof window !== "undefined" ? window.sessionStorage.getItem(DURATION_MIN_KEY) : null) ??
      10;

    const cycles =
      typeof fromStorage?.completedCycles === "number"
        ? fromStorage.completedCycles
        : completedCycles(elapsedActiveSec);

    return {
      elapsedActiveSec,
      targetDurationSec,
      endReason,
      completedCycles: cycles,
      durationMin,
    };
  }, [searchParams]);

  return (
    <main
      className="min-h-screen text-zinc-100"
      style={{
        background:
          "radial-gradient(1200px circle at 50% 20%, #1e1b4b 0%, #0f172a 55%, #020617 100%)",
      }}
    >
      <div className="mx-auto flex min-h-screen max-w-xl flex-col items-center justify-center gap-10 px-6 animate-warmup">
        <header className="text-center">
          <h1 className="text-6xl font-semibold tracking-tight font-hand mb-4">
            {summary.endReason === "normal" ? "Session Complete" : "Session Paused"}
          </h1>
          <p className="text-zinc-400 text-lg">
            Time Focused: <span className="text-white font-medium">{formatDuration(summary.elapsedActiveSec)}</span>
          </p>
        </header>

        <section className="w-full flex flex-col items-center gap-8">
          <div className="flex flex-col items-center gap-2">
            <span className="text-6xl font-bold font-hand text-emerald-400 drop-shadow-[0_0_15px_rgba(52,211,153,0.4)]">
              {summary.completedCycles}
            </span>
            <span className="text-zinc-400 uppercase tracking-widest text-xs">Breathing Cycles</span>
          </div>

          {summary.endReason === "early" ? (
            <div className="rounded-2xl border border-amber-500/20 bg-amber-500/5 px-6 py-4 text-center max-w-xs">
              <p className="font-hand text-2xl text-amber-200 mb-1">Good Start!</p>
              <p className="text-sm text-amber-200/60 leading-relaxed">
                Even a few moments of mindfulness make a difference.
              </p>
            </div>
          ) : (
            <div className="h-4"></div> // Spacer to keep layout stable
          )}

          <div className="mt-4 flex flex-col sm:flex-row items-center gap-4 w-full justify-center">
            <button
              type="button"
              onClick={() => {
                // Keep last duration selection
                router.push(`/meditation?durationMin=${summary.durationMin}`);
              }}
              className="w-full sm:w-auto min-w-[160px] rounded-full bg-zinc-100 px-8 py-3 text-xl font-bold font-hand text-black shadow-[0_0_20px_rgba(255,255,255,0.2)] hover:bg-white hover:scale-105 active:scale-95 transition-all duration-300"
            >
              Breathe Again
            </button>

            <button
              type="button"
              onClick={() => {
                window.sessionStorage.removeItem(DURATION_MIN_KEY);
                window.sessionStorage.removeItem(SUMMARY_KEY);
                router.push("/");
              }}
              className="w-full sm:w-auto min-w-[160px] rounded-full border border-zinc-700 bg-transparent px-8 py-3 text-xl font-bold font-hand text-zinc-300 hover:border-zinc-500 hover:bg-white/5 hover:text-white hover:scale-105 active:scale-95 transition-all duration-300"
            >
              Back Home
            </button>
          </div>
        </section>
      </div>
    </main>
  );
}

export default function CompletionPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-black" />}>
      <CompletionContent />
    </Suspense>
  );
}
