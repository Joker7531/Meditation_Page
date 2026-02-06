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
    <main className="min-h-screen bg-black text-zinc-100">
      <div className="mx-auto flex min-h-screen max-w-3xl flex-col items-center justify-center gap-6 px-6">
        <header className="text-center">
          <h1 className="text-3xl font-semibold tracking-tight">Landing</h1>
          <p className="mt-2 text-zinc-400">Select a duration and start 4-7-8 breathing.</p>
        </header>

        <section className="w-full rounded-lg border border-zinc-800 bg-zinc-950 p-5">
          <h2 className="text-lg font-medium">Duration</h2>

          <div className="mt-4 flex flex-wrap gap-3">
            {[5, 10, 15].map((min) => (
              <button
                key={min}
                type="button"
                className={
                  selectedMin === min
                    ? "rounded-md bg-zinc-100 px-4 py-2 text-sm font-medium text-black focus:outline-none focus:ring-2 focus:ring-zinc-300"
                    : "rounded-md border border-zinc-700 bg-transparent px-4 py-2 text-sm font-medium text-zinc-100 hover:border-zinc-500 focus:outline-none focus:ring-2 focus:ring-zinc-300"
                }
                onClick={() => {
                  setSelectedMin(min);
                  setCustomRaw(String(min));
                  setTouchedCustom(false);
                }}
              >
                {min} min
              </button>
            ))}
          </div>

          <div className="mt-5">
            <label htmlFor="duration-custom" className="block text-sm font-medium">
              Custom (1–60 minutes)
            </label>
            <div className="mt-2 flex items-center gap-3">
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
                className="w-32 rounded-md border border-zinc-700 bg-black px-3 py-2 text-sm text-zinc-100 outline-none focus:border-zinc-300 focus:ring-2 focus:ring-zinc-300"
                aria-invalid={customError ? "true" : "false"}
                aria-describedby={customError ? "duration-error" : undefined}
              />
              <span className="text-sm text-zinc-400">minutes</span>
            </div>
            {customError ? (
              <p id="duration-error" className="mt-2 text-sm text-red-400">
                请输入 1-60 之间的整数
              </p>
            ) : null}
          </div>

          <div className="mt-6 flex items-center gap-3">
            <button
              type="button"
              onClick={start}
              disabled={!canStart}
              className={
                canStart
                  ? "rounded-md bg-emerald-500 px-5 py-2 text-sm font-semibold text-black hover:bg-emerald-400 focus:outline-none focus:ring-2 focus:ring-emerald-300"
                  : "cursor-not-allowed rounded-md bg-zinc-800 px-5 py-2 text-sm font-semibold text-zinc-400"
              }
            >
              Start
            </button>
          </div>
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
