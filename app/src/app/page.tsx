"use client";

import { Suspense, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";

const DURATION_MIN_KEY = "breathing:durationMin";

function coerceInt(value: string): number | null {
  if (!/^[0-9]+$/.test(value)) return null;
  const n = Number(value);
  if (!Number.isInteger(n)) return null;
  return n;
}

function isValidDurationMin(n: number | null): n is number {
  return n !== null && n >= 1 && n <= 60;
}

function HomeContent() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const initialMin = useMemo(() => {
    const fromQuery = coerceInt(searchParams.get("durationMin") ?? "");
    if (isValidDurationMin(fromQuery)) return fromQuery;

    if (typeof window !== "undefined") {
      const stored = coerceInt(window.sessionStorage.getItem(DURATION_MIN_KEY) ?? "");
      if (isValidDurationMin(stored)) return stored;
    }

    return 10;
  }, [searchParams]);

  const [selectedMin, setSelectedMin] = useState<number>(initialMin);
  const [customRaw, setCustomRaw] = useState<string>(String(initialMin));
  const [touchedCustom, setTouchedCustom] = useState(false);

  const customParsed = coerceInt(customRaw.trim());
  const customValid = isValidDurationMin(customParsed);
  const customError = touchedCustom && !customValid;

  const canStart = isValidDurationMin(selectedMin) && !customError;

  function persistDurationMin(min: number) {
    window.sessionStorage.setItem(DURATION_MIN_KEY, String(min));
  }

  function start() {
    if (!canStart) return;
    persistDurationMin(selectedMin);
    router.push(`/meditation?durationMin=${selectedMin}`);
  }

  return (
    <main
      className="min-h-screen text-zinc-100"
      style={{
        background:
          "radial-gradient(1200px circle at 50% 20%, #1e1b4b 0%, #0f172a 55%, #020617 100%)",
      }}
    >
      <div className="mx-auto flex min-h-screen max-w-xl flex-col items-center justify-center gap-10 px-6">
        <header className="text-center animate-warmup">
          <h1 className="text-6xl font-semibold tracking-tight font-hand mb-2">4-7-8 Breathing</h1>
          <p className="text-zinc-400 text-lg">Select a duration to begin your session.</p>
        </header>

        <section className="w-full flex flex-col items-center gap-8">
          <div className="flex flex-col items-center gap-4 w-full">
            <h2 className="text-2xl font-medium font-hand text-zinc-300">Choose Duration</h2>
            <div className="flex flex-wrap justify-center gap-4">
              {[5, 10, 15].map((min) => (
                <button
                  key={min}
                  type="button"
                  className={
                    selectedMin === min
                      ? "min-w-[80px] rounded-full bg-zinc-100 px-6 py-3 text-lg font-bold text-black shadow-[0_0_20px_rgba(255,255,255,0.3)] transform scale-105 transition-all duration-300"
                      : "min-w-[80px] rounded-full border border-zinc-700 bg-black/20 px-6 py-3 text-lg font-medium text-zinc-300 hover:border-zinc-500 hover:bg-white/5 hover:scale-105 transition-all duration-300"
                  }
                  onClick={() => {
                    setSelectedMin(min);
                    setCustomRaw(String(min));
                    setTouchedCustom(false);
                  }}
                >
                  {min}m
                </button>
              ))}
            </div>
          </div>

          <div className="flex flex-col items-center gap-3">
             <label htmlFor="duration-custom" className="text-zinc-400 text-sm hover:text-zinc-200 transition-colors cursor-pointer">
              Or enter custom minutes (1–60)
            </label>
            <div className="relative group">
              <input
                id="duration-custom"
                inputMode="numeric"
                value={customRaw}
                onChange={(e) => {
                  const v = e.currentTarget.value;
                  setCustomRaw(v);
                  setTouchedCustom(true);
                  const parsed = coerceInt(v.trim());
                  if (isValidDurationMin(parsed)) {
                    setSelectedMin(parsed);
                  }
                }}
                onBlur={() => setTouchedCustom(true)}
                className="w-24 text-center rounded-lg border-b-2 border-zinc-700 bg-transparent py-2 text-2xl font-hand text-zinc-100 outline-none focus:border-emerald-400 transition-colors placeholder-zinc-700"
                aria-invalid={customError ? "true" : "false"}
              />
              {customError && (
                <div className="absolute top-full left-1/2 -translate-x-1/2 mt-2 w-max text-red-400 text-sm font-hand animate-pulse">
                  1-60 mins only
                </div>
              )}
            </div>
          </div>

          <button
            type="button"
            onClick={start}
            disabled={!canStart}
            className={
              canStart
                ? "mt-4 rounded-full bg-emerald-500/90 px-12 py-4 text-2xl font-bold font-hand text-black shadow-[0_0_30px_rgba(16,185,129,0.4)] hover:bg-emerald-400 hover:scale-105 hover:shadow-[0_0_50px_rgba(16,185,129,0.6)] active:scale-95 transition-all duration-300"
                : "mt-4 rounded-full bg-zinc-800/50 px-12 py-4 text-2xl font-bold font-hand text-zinc-500 cursor-not-allowed transition-all duration-300"
            }
          >
            Start Breathing
          </button>
        </section>
      </div>
    </main>
  );
}

export default function Home() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-black" />}>
      <HomeContent />
    </Suspense>
  );
}
