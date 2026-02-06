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
    <main className="min-h-screen bg-black text-zinc-100">
      <div className="mx-auto flex min-h-screen max-w-3xl flex-col items-center justify-center gap-6 px-6">
        <header className="text-center">
          <h1 className="text-3xl font-semibold tracking-tight">
            {summary.endReason === "normal" ? "Completed" : "Ended early"}
          </h1>
          <p className="mt-2 text-zinc-400">本次时长 {formatDuration(summary.elapsedActiveSec)}</p>
        </header>

        <section className="w-full rounded-lg border border-zinc-800 bg-zinc-950 p-5">
          <h2 className="text-lg font-medium">Summary</h2>

          <dl className="mt-4 grid grid-cols-1 gap-3 text-sm">
            <div className="flex justify-between gap-4">
              <dt className="text-zinc-400">Completed cycles</dt>
              <dd className="font-semibold" aria-label="completed-cycles">
                {summary.completedCycles}
              </dd>
            </div>

            {summary.endReason === "early" ? (
              <div className="rounded-md border border-amber-500/30 bg-amber-500/10 p-3">
                <p className="font-medium text-amber-200">提前结束</p>
                <p className="mt-1 text-amber-200/80">You can continue next time.</p>
              </div>
            ) : null}
          </dl>

          <div className="mt-6 flex flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={() => {
                // Keep last duration selection
                router.push(`/meditation?durationMin=${summary.durationMin}`);
              }}
              className="rounded-md bg-emerald-500 px-5 py-2 text-sm font-semibold text-black hover:bg-emerald-400 focus:outline-none focus:ring-2 focus:ring-emerald-300"
            >
              再来一次
            </button>

            <button
              type="button"
              onClick={() => {
                window.sessionStorage.removeItem(DURATION_MIN_KEY);
                window.sessionStorage.removeItem(SUMMARY_KEY);
                router.push("/");
              }}
              className="rounded-md border border-zinc-700 bg-transparent px-5 py-2 text-sm font-semibold text-zinc-100 hover:border-zinc-500 focus:outline-none focus:ring-2 focus:ring-zinc-300"
            >
              返回首页
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
