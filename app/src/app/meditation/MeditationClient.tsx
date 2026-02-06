"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";

type Offset = { dx: number; dy: number };
import {
  BREATH_CYCLE_SEC,
  completedCycles,
  formatDuration,
  getBreathPhase,
} from "../../lib/breathing";

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

function coerceInt(value: string | null): number | null {
  if (value === null) return null;
  const v = value.trim();
  if (!/^[0-9]+$/.test(v)) return null;
  const n = Number(v);
  if (!Number.isInteger(n)) return null;
  return n;
}

function clamp(n: number, min: number, max: number) {
  return Math.max(min, Math.min(max, n));
}

function mulberry32(seed: number) {
  let t = seed >>> 0;
  return function () {
    t += 0x6d2b79f5;
    let x = Math.imul(t ^ (t >>> 15), 1 | t);
    x ^= x + Math.imul(x ^ (x >>> 7), 61 | x);
    return ((x ^ (x >>> 14)) >>> 0) / 4294967296;
  };
}

function fade(t: number) {
  return t * t * t * (t * (t * 6 - 15) + 10);
}

function lerp(a: number, b: number, t: number) {
  return a + (b - a) * t;
}

function hash2D(ix: number, iy: number, seed: number) {
  // 32-bit mix
  let h = seed ^ (ix * 374761393) ^ (iy * 668265263);
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  return (h ^ (h >>> 16)) >>> 0;
}

function valueNoise2D(x: number, y: number, seed: number) {
  const x0 = Math.floor(x);
  const y0 = Math.floor(y);
  const x1 = x0 + 1;
  const y1 = y0 + 1;

  const sx = fade(x - x0);
  const sy = fade(y - y0);

  const n00 = hash2D(x0, y0, seed) / 4294967295;
  const n10 = hash2D(x1, y0, seed) / 4294967295;
  const n01 = hash2D(x0, y1, seed) / 4294967295;
  const n11 = hash2D(x1, y1, seed) / 4294967295;

  const ix0 = lerp(n00, n10, sx);
  const ix1 = lerp(n01, n11, sx);

  return lerp(ix0, ix1, sy) * 2 - 1; // [-1, 1]
}

function perlinishStaticOffset(
  baseAngleRad: number,
  seed: number,
): { dx: number; dy: number } {
  const nx = Math.cos(baseAngleRad) * 2;
  const ny = Math.sin(baseAngleRad) * 2;

  const a = valueNoise2D(nx + 10.1, ny + 3.7, seed + 11);
  const b = valueNoise2D(nx + 4.2, ny + 9.9, seed + 97);

  const c = valueNoise2D(nx + 1.3, ny + 2.1, seed + 211);
  const m = 0.5 + 0.5 * c;

  const amp = 2 + 2 * m; // 2-4px
  return { dx: a * amp, dy: b * amp };
}

function flowVelocity(
  xPct: number,
  yPct: number,
  seed: number,
  tSec: number,
): { vx: number; vy: number } {
  // Return a velocity vector (px/s). Using noise-driven direction for a flow-field feel.
  const x = (xPct - 50) / 50;
  const y = (yPct - 50) / 50;

  const freq = 1.35;
  const speed = 0.18;

  const theta =
    (0.5 +
      0.5 *
        valueNoise2D(
          x * freq + tSec * speed,
          y * freq + tSec * speed,
          seed + 301,
        )) *
    Math.PI *
    2;

  const ampNoise =
    0.5 + 0.5 * valueNoise2D(x * 1.9 + 7.1, y * 1.9 + 3.3, seed + 911);
  const speedPxPerSec = 1.5 + 3.5 * ampNoise; // Reduced flow speed

  return {
    vx: Math.cos(theta) * speedPxPerSec,
    vy: Math.sin(theta) * speedPxPerSec,
  };
}

function getBreathingScale(tInCycle: number) {
  // Wrap time to [0, 19)
  let t = tInCycle % BREATH_CYCLE_SEC;
  if (t < 0) t += BREATH_CYCLE_SEC;

  // Inhale (0-4s): 0.8 -> 1.4
  if (t < 4) {
    const p = t / 4;
    return 0.8 + (1.4 - 0.8) * p;
  }
  // Hold (4-11s): 1.4
  if (t < 11) {
    return 1.4;
  }
  // Exhale (11-19s): 1.4 -> 0.8
  const p = (t - 11) / 8;
  return 1.4 - (1.4 - 0.8) * p;
}


function usePrefersReducedMotion(): boolean {
  const [reduced, setReduced] = useState(false);

  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    const update = () => setReduced(mq.matches);
    update();

    mq.addEventListener("change", update);
    return () => mq.removeEventListener("change", update);
  }, []);

  return reduced;
}

export default function MeditationClient() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const prefersReducedMotion = usePrefersReducedMotion();

  const debugOverlay = searchParams.get("__debugOverlay") === "1";
  const DEBUG_IDX = 0;

  const debugSampleRef = useRef<{
    idx: number;
    elapsedActiveSec: number;
    tInCycle: number;
    phase: string;
    wHold: number;
    wFlow: number;
    dx: number;
    dy: number;
    dMag: number;
    holdJdx: number;
    holdJdy: number;
    holdJMag: number;
    flowVx: number;
    flowVy: number;
    flowVMag: number;
    holdVx: number;
    holdVy: number;
    holdVMag: number;
    vx: number;
    vy: number;
    vMag: number;
    ringPullVx: number;
    ringPullVy: number;
    stiffness: number;
    follow: number;
  } | null>(null);

  const lastDebugUpdateMsRef = useRef<number>(0);
  const [debugTick, setDebugTick] = useState(0);

  const init = useMemo(() => {
    const fromQuery = coerceInt(searchParams.get("durationMin"));
    let durationMin: number | null = fromQuery;

    if (durationMin === null && typeof window !== "undefined") {
      durationMin = coerceInt(window.sessionStorage.getItem(DURATION_MIN_KEY));
    }

    let usedFallback = false;
    if (durationMin === null || durationMin < 1 || durationMin > 60) {
      durationMin = 10;
      usedFallback = true;
    }

    const maybeOverride = coerceInt(searchParams.get("__testDurationSec"));
    const testOverrideSec =
      maybeOverride === null ? null : clamp(maybeOverride, 1, 120);

    const maybeSeed = coerceInt(searchParams.get("__testSeed"));
    const testSeed = maybeSeed === null ? 0 : maybeSeed;

    return {
      durationMin,
      targetDurationSec: testOverrideSec ?? durationMin * 60,
      usedFallback,
      testSeed,
    };
  }, [searchParams]);

  const [status, setStatus] = useState<"running" | "paused">("running");
  const [elapsedActiveSec, setElapsedActiveSec] = useState(0);

  const lastTickMsRef = useRef<number | null>(null);
  const rafIdRef = useRef<number | null>(null);

  const phase = getBreathPhase(elapsedActiveSec % BREATH_CYCLE_SEC);
  const tInCycle =
    ((elapsedActiveSec % BREATH_CYCLE_SEC) + BREATH_CYCLE_SEC) %
    BREATH_CYCLE_SEC;

  const phaseSchedule =
    phase.phase === "inhale"
      ? { start: 0, end: 4 }
      : phase.phase === "hold"
        ? { start: 4, end: 11 }
        : { start: 11, end: 19 };
  const phaseProgress = clamp(
    (tInCycle - phaseSchedule.start) / (phaseSchedule.end - phaseSchedule.start),
    0,
    1,
  );

  const positionsRef = useRef<Map<number, Offset>>(new Map());

  const phaseOpacity = useMemo(() => {
    if (status === "paused") return 0.7;
    if (prefersReducedMotion) return 1;

    const HOLD_SEC = 2;
    const clamp01 = (x: number) => Math.max(0, Math.min(1, x));

    const schedule =
      phase.phase === "inhale"
        ? { start: 0, end: 4 }
        : phase.phase === "hold"
          ? { start: 4, end: 11 }
          : { start: 11, end: 19 };

    // No fade-in: keep fully visible for first 2s of each phase,
    // then fade out for the remaining time of that phase.
    const t = tInCycle;
    const timeInPhase = t - schedule.start;
    const phaseLen = schedule.end - schedule.start;
    const fadeOutLen = Math.max(0.001, phaseLen - HOLD_SEC);

    if (timeInPhase <= HOLD_SEC) return 1;
    const p = clamp01((timeInPhase - HOLD_SEC) / fadeOutLen);

    // Stronger fade-out curve (faster drop early).
    return Math.pow(1 - p, 2);
  }, [phase.phase, prefersReducedMotion, status, tInCycle]);

  const [uiHidden, setUiHidden] = useState(false);
  const idleTimerRef = useRef<number | null>(null);

  const particles = useMemo(() => {
    // If seed/reduced-motion changes we want fresh, consistent particle state.
    positionsRef.current.clear();
    const total = 230;
    const onRingCount = 170;
    const aroundCount = total - onRingCount;
    const baseRadiusPx = 150;
    const containerRadiusPx = 300;

    const rng = mulberry32(init.testSeed || 0);

    type Particle = {
      x: number;
      y: number;
      baseAngle: number;
      size: number;
      opacity: number;
      particleSeed: number;
      baseDx: number;
      baseDy: number;
      z: number; // [0,1], larger is closer
    };

    const ring: Particle[] = [];
    const around: Particle[] = [];

    const placed: {
      xPx: number;
      yPx: number;
      size: number;
      offDx: number;
      offDy: number;
    }[] = [];

    const paddingPx = 2;
    const glowPaddingPx = 2;
    const maxTries = 220;

    function toPx(xPct: number, yPct: number) {
      return {
        xPx: ((xPct - 50) / 50) * containerRadiusPx,
        yPx: ((yPct - 50) / 50) * containerRadiusPx,
      };
    }

    function collidesWithPlaced(
      xPx: number,
      yPx: number,
      size: number,
      offDx: number,
      offDy: number,
    ) {
      const cx = xPx + offDx;
      const cy = yPx + offDy;
      return placed.some((p) => {
        const dx = cx - (p.xPx + p.offDx);
        const dy = cy - (p.yPx + p.offDy);
        const dist = Math.hypot(dx, dy);
        const rA = size / 2 + glowPaddingPx;
        const rB = p.size / 2 + glowPaddingPx;
        return dist < rA + rB + paddingPx;
      });
    }

    for (let i = 0; i < onRingCount; i++) {
      const baseAngle = (i / onRingCount) * Math.PI * 2;
      const particleSeed = init.testSeed + i * 101;
      const size = 4 + (i % 9);

      let chosen: {
        x: number;
        y: number;
        angle: number;
        xPx: number;
        yPx: number;
        offDx: number;
        offDy: number;
      } | null = null;

      for (let tries = 0; tries < maxTries; tries++) {
        const aJitter = (rng() * 2 - 1) * (10 * (Math.PI / 180));
        const angle = baseAngle + aJitter;

        const r = baseRadiusPx + (rng() * 80 - 40);
        const x = 50 + Math.cos(angle) * (r / containerRadiusPx) * 50;
        const y = 50 + Math.sin(angle) * (r / containerRadiusPx) * 50;
        const { xPx, yPx } = toPx(x, y);

        const staticO = prefersReducedMotion
          ? { dx: 0, dy: 0 }
          : perlinishStaticOffset(angle, particleSeed);

        if (!collidesWithPlaced(xPx, yPx, size, staticO.dx, staticO.dy)) {
          chosen = {
            x,
            y,
            angle,
            xPx,
            yPx,
            offDx: staticO.dx,
            offDy: staticO.dy,
          };
          break;
        }

        if (chosen === null && tries === maxTries - 1) {
          chosen = {
            x,
            y,
            angle,
            xPx,
            yPx,
            offDx: staticO.dx,
            offDy: staticO.dy,
          };
        }
      }

      if (!chosen) continue;

      placed.push({
        xPx: chosen.xPx,
        yPx: chosen.yPx,
        size,
        offDx: chosen.offDx,
        offDy: chosen.offDy,
      });
      ring.push({
        x: chosen.x,
        y: chosen.y,
        baseAngle: chosen.angle,
        size,
        opacity: 0.78,
        particleSeed,
        baseDx: chosen.offDx,
        baseDy: chosen.offDy,
        z: rng(),
      });
    }

    for (let j = 0; j < aroundCount; j++) {
      const i = onRingCount + j;
      const particleSeed = init.testSeed + i * 101;
      const size = 4 + Math.floor(rng() * 9);

      let chosen: {
        x: number;
        y: number;
        angle: number;
        xPx: number;
        yPx: number;
        offDx: number;
        offDy: number;
      } | null = null;

      for (let tries = 0; tries < maxTries; tries++) {
        const angle = rng() * Math.PI * 2;
        const r = baseRadiusPx + 110 + (rng() * 80 - 40);

        const x = 50 + Math.cos(angle) * (r / containerRadiusPx) * 50;
        const y = 50 + Math.sin(angle) * (r / containerRadiusPx) * 50;
        const { xPx, yPx } = toPx(x, y);

        const staticO = prefersReducedMotion
          ? { dx: 0, dy: 0 }
          : perlinishStaticOffset(angle, particleSeed);

        if (!collidesWithPlaced(xPx, yPx, size, staticO.dx, staticO.dy)) {
          chosen = {
            x,
            y,
            angle,
            xPx,
            yPx,
            offDx: staticO.dx,
            offDy: staticO.dy,
          };
          break;
        }

        if (chosen === null && tries === maxTries - 1) {
          chosen = {
            x,
            y,
            angle,
            xPx,
            yPx,
            offDx: staticO.dx,
            offDy: staticO.dy,
          };
        }
      }

      if (!chosen) continue;

      placed.push({
        xPx: chosen.xPx,
        yPx: chosen.yPx,
        size,
        offDx: chosen.offDx,
        offDy: chosen.offDy,
      });
      around.push({
        x: chosen.x,
        y: chosen.y,
        baseAngle: chosen.angle,
        size,
        opacity: 0.55,
        particleSeed,
        baseDx: chosen.offDx,
        baseDy: chosen.offDy,
        z: rng(),
      });
    }

    return [...ring, ...around];
  }, [init.testSeed, prefersReducedMotion]);

  useEffect(() => {
    function clearIdleTimer() {
      if (idleTimerRef.current !== null) {
        window.clearTimeout(idleTimerRef.current);
        idleTimerRef.current = null;
      }
    }

    function bump() {
      if (status === "paused") return;
      setUiHidden(false);
      clearIdleTimer();
      idleTimerRef.current = window.setTimeout(() => {
        // avoid hiding while user is working within chrome
        if (document.activeElement instanceof HTMLElement) {
          // Don't hide while the user is interacting with controls (keyboard focus).
          if (document.activeElement.closest("[aria-label='Controls']")) return;
        }
        setUiHidden(true);
      }, 3000);
    }

    function onVisibilityChange() {
      if (document.visibilityState === "hidden") {
        // Allow the idle timer to keep running; don't force-show or cancel.
        return;
      }
      bump();
    }

    function onBlur() {
      // Still allow hiding while unfocused: keep the idle timer running.
      // We only force-show UI when coming back.
    }

    function onFocus() {
      bump();
    }

    function onPageShow() {
      bump();
    }

    bump();

    const events: (keyof WindowEventMap)[] = [
      "pointermove",
      "pointerdown",
      "wheel",
      "keydown",
      "touchstart",
      "focus",
      "blur",
      "pageshow",
    ];

    events.forEach((ev) => {
      const handler =
        ev === "blur"
          ? onBlur
          : ev === "focus"
            ? onFocus
            : ev === "pageshow"
              ? onPageShow
              : bump;
      window.addEventListener(ev, handler as EventListener, { passive: true });
    });
    document.addEventListener("visibilitychange", onVisibilityChange);

    return () => {
      events.forEach((ev) => {
        const handler =
          ev === "blur"
            ? onBlur
            : ev === "focus"
              ? onFocus
              : ev === "pageshow"
                ? onPageShow
                : bump;
        window.removeEventListener(ev, handler as EventListener);
      });
      document.removeEventListener("visibilitychange", onVisibilityChange);
      clearIdleTimer();
    };
  }, [status]);

  useEffect(() => {
    if (status === "paused") setUiHidden(false);
  }, [status]);

  function stopRaf() {
    if (rafIdRef.current !== null) {
      cancelAnimationFrame(rafIdRef.current);
      rafIdRef.current = null;
    }
  }

  const writeSummary = useCallback((endReason: EndReason, elapsed: number) => {
    const summary: Summary = {
      elapsedActiveSec: elapsed,
      targetDurationSec: init.targetDurationSec,
      endReason,
      completedCycles: completedCycles(elapsed),
      durationMin: init.durationMin,
    };
    window.sessionStorage.setItem(SUMMARY_KEY, JSON.stringify(summary));
  }, [init.durationMin, init.targetDurationSec]);

  function end(endReason: EndReason) {
    stopRaf();
    const elapsed = elapsedActiveSec;
    writeSummary(endReason, elapsed);
    router.push("/completion");
  }

  useEffect(() => {
    window.sessionStorage.setItem(DURATION_MIN_KEY, String(init.durationMin));
  }, [init.durationMin]);

  useEffect(() => {
    function tick(nowMs: number) {
      if (status !== "running") return;

      const last = lastTickMsRef.current;
      lastTickMsRef.current = nowMs;

      if (last !== null) {
        const delta = (nowMs - last) / 1000;
        setElapsedActiveSec((prev) => {
          const next = prev + delta;
          if (next >= init.targetDurationSec) {
            const clamped = init.targetDurationSec;
            writeSummary("normal", clamped);
            stopRaf();
            router.push("/completion");
            return clamped;
          }
          return next;
        });
      }

      rafIdRef.current = requestAnimationFrame(tick);
    }

    if (status === "running") {
      lastTickMsRef.current = performance.now();
      rafIdRef.current = requestAnimationFrame(tick);
    }

    return () => {
      stopRaf();
    };
  }, [init.targetDurationSec, router, status, writeSummary]);

  const elapsedRounded = Math.floor(elapsedActiveSec);

  if (typeof window === "undefined") {
    return null;
  }

  return (
    <main
      className="min-h-screen text-zinc-100"
      style={{
        background:
          "radial-gradient(1200px circle at 50% 20%, #1e1b4b 0%, #0f172a 55%, #020617 100%)",
      }}
    >
      <div className="mx-auto flex min-h-screen max-w-3xl flex-col items-center justify-center gap-6 px-6">
        <header
          className="text-center"
          style={{
            opacity: uiHidden ? 0 : 1,
            transition: prefersReducedMotion
              ? "opacity 150ms linear"
              : "opacity 600ms ease",
            pointerEvents: uiHidden ? "none" : "auto",
          }}
        >
          <h1 className="text-3xl font-semibold tracking-tight">Meditation</h1>
          <p className="mt-2 text-zinc-400">
            Target: {formatDuration(init.targetDurationSec)} ({init.durationMin}{" "}
            min)
          </p>
          {init.usedFallback ? (
            <p className="mt-2 text-sm text-amber-300" role="status">
              Duration missing/invalid; defaulted to 10 minutes.
            </p>
          ) : null}
        </header>

        <div className="flex flex-col items-center gap-4">
          <div
            data-testid="breathing-circle"
            aria-label="Breathing guide"
            className="relative h-[600px] w-[600px]"
          >
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="flex flex-col items-center">
                <p
                  data-testid="phase-text"
                  aria-live="polite"
                  className="select-none text-2xl font-semibold tracking-tight"
                  style={{
                    opacity: phaseOpacity,
                    transition: prefersReducedMotion
                      ? "opacity 150ms linear"
                      : "opacity 600ms ease",
                    fontFamily:
                      "var(--font-inter), Inter, system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial",
                    textShadow: "0 0 24px rgba(0,0,0,0.55)",
                  }}
                >
                  {phase.label}
                </p>

                <div
                  aria-hidden="true"
                  className="mt-3 h-1 w-44 overflow-hidden rounded-full bg-white/10"
                >
                  <div
                    className="h-full rounded-full bg-white/50"
                    style={{
                      width: `${(phaseProgress * 100).toFixed(2)}%`,
                      transition: prefersReducedMotion
                        ? "width 150ms linear"
                        : "width 0ms linear",
                      willChange: prefersReducedMotion ? undefined : "width",
                    }}
                  />
                </div>
              </div>
            </div>
            <div
              data-testid="breathing-circle-scale"
              className="absolute inset-0"
              style={(() => {
                if (prefersReducedMotion) {
                  const scale = phase.phase === "exhale" ? 0.8 : 1.2;
                  return {
                    transform: `scale(${scale})`,
                    transition: "transform 150ms linear",
                  };
                }

                return { transform: "scale(1)" };
              })()}
            >
              <div
                data-testid="breathing-particles"
                aria-hidden="true"
                className="absolute inset-0"
              >
                {(() => {
                  const phaseColor =
                    phase.phase === "inhale"
                      ? "#67e8f9" // Cyan 300
                      : phase.phase === "hold"
                        ? "#c084fc" // Purple 400
                        : "#fbbf24"; // Amber 400

                  // Integrate motion into a persistent per-particle position so flow/jitter are
                  // always applied on top of the current position (no phase switching jumps).
                  if (status === "running" && !prefersReducedMotion) {
                    const dt = 1 / 60;
                    particles.forEach((pp, idx) => {
                      const dyn =
                        positionsRef.current.get(idx) ??
                        ({ dx: 0, dy: 0 } satisfies Offset);

                      let dx = dyn.dx;
                      let dy = dyn.dy;

                      // 1. Calculate Phase-Based Scale with Lag
                      // Normalize distance: 0 (center) to 1 (edge)
                      const rPx = (Math.hypot(pp.x - 50, pp.y - 50) / 50) * 300;
                      const dRatio = clamp(rPx / 300, 0, 1);

                      let currentScale = 1.0;

                      // Helper for smooth easing (Sine)
                      const easeInOutSine = (x: number) => -(Math.cos(Math.PI * x) - 1) / 2;
                      // Helper for smooth masking (Hermite)
                      const smoothStep = (x: number) => x * x * (3 - 2 * x);

                      if (tInCycle < 4) {
                        // --- INHALE (0-4s) ---
                        // Target: 0.8 -> 1.4
                        const phaseDur = 4.0;
                        const p = tInCycle / phaseDur;

                        // Logic: All start at t=0.
                        // Outer is faster initially to create separation, then Inner catches up.
                        // Or simple easing variation:
                        // Inner: Sine Ease (Slow start, fast middle, slow end)
                        // Outer: Cubic Ease Out (Fast start, slow end) -> "Expands out eagerly"

                        // Let's try explicit curve shaping for "Inner leads" visual but immediate start:
                        // Inner: Standard smooth expansion
                        // Outer: Slightly delayed curve response but p=0 -> val=0 always.

                        const easeInner = easeInOutSine(p);
                        // Outer lags in value, not time.
                        // Power curve makes it stay low longer then shoot up.
                        const easeOuter = Math.pow(p, 2.5);

                        // Blend based on distance
                        // Inner (dRatio=0) uses easeInner
                        // Outer (dRatio=1) uses easeOuter
                        // But we want Inner to lead (be larger earlier).
                        // easeInner (Sine) is usually higher than pow(p, 2.5) at early t.
                        // e.g. at p=0.5: Sine=0.5, Pow(0.5, 2.5)=0.17 -> Inner is way ahead. Good.

                        const progress = easeInner * (1 - dRatio) + easeOuter * dRatio;

                        currentScale = 0.8 + (1.4 - 0.8) * progress;

                      } else if (tInCycle < 11) {
                        // --- HOLD (4-11s) ---
                        // Target: 1.4
                        currentScale = 1.4;

                      } else {
                        // --- EXHALE (11-19s) ---
                        // Target: 1.4 -> 0.8
                        const phaseDur = 8.0;
                        const p = (tInCycle - 11) / phaseDur;

                        // Logic: All start at t=0 (p=0).
                        // Outer leads (shrinks faster/earlier).
                        // Inner lags (stays big longer).

                        // Outer: Fast contraction (Ease Out Quart)
                        const easeOuter = 1 - Math.pow(1 - p, 4);
                        // p=0.1 -> 1 - 0.9^4 = 0.34 (shrunk 34% already)

                        // Inner: Slow contraction initially (Ease In Quad)
                        const easeInner = p * p;
                        // p=0.1 -> 0.01 (shrunk 1% only)

                        // At p=0, both are 0.
                        // At p=1, both are 1.
                        // Blend:
                        const progress = easeInner * (1 - dRatio) + easeOuter * dRatio;

                        // progress 0 -> Scale 1.4
                        // progress 1 -> Scale 0.8
                        currentScale = 1.4 - (1.4 - 0.8) * progress;
                      }

                      const targetScale = currentScale;

                      // 2. Calculate Shimmer (Hold phase only)
                      let waveScaleDelta = 0;

                      // Soft mask for Hold phase (4s to 11s)
                      let shimmerMask = 0;
                      if (tInCycle >= 4 && tInCycle < 11) {
                         // Normalized time within hold phase [0, 1]
                         const hDuration = 7;
                         const hTime = tInCycle - 4;

                         // Fade in over 1.5s, Fade out over 1.5s
                         const fadeDur = 1.5;

                         if (hTime < fadeDur) {
                           shimmerMask = smoothStep(hTime / fadeDur);
                         } else if (hTime > hDuration - fadeDur) {
                           shimmerMask = smoothStep((hDuration - hTime) / fadeDur);
                         } else {
                           shimmerMask = 1;
                         }
                      }

                      if (shimmerMask > 0) {
                        // Slowed down frequency (~0.8Hz), opposing phases
                        waveScaleDelta =
                          Math.sin(elapsedActiveSec * 5.0 + dRatio * Math.PI) *
                          0.02 * shimmerMask;
                      }

                      // Combine breathing scale and shimmer
                      const finalScale = targetScale + waveScaleDelta;

                      // 3. Calculate Target Offset (Radial Only)
                      const vPxX = ((pp.x - 50) / 50) * 300;
                      const vPxY = ((pp.y - 50) / 50) * 300;

                      // Target offset from the base position
                      const targetDx = vPxX * (finalScale - 1);
                      const targetDy = vPxY * (finalScale - 1);

                      // 4. Apply Spring Force
                      const stiffness = 3.0;
                      const springVx = (targetDx - dx) * stiffness;
                      const springVy = (targetDy - dy) * stiffness;

                      // 5. Integrate
                      const vx = springVx;
                      const vy = springVy;

                      dx += vx * dt;
                      dy += vy * dt;

                      if (debugOverlay && idx === DEBUG_IDX) {
                        debugSampleRef.current = {
                          idx,
                          elapsedActiveSec,
                          tInCycle,
                          phase: phase.phase,
                          wHold: 0,
                          wFlow: 0,
                          dx,
                          dy,
                          dMag: Math.hypot(dx, dy),
                          holdJdx: 0,
                          holdJdy: 0,
                          holdJMag: 0,
                          flowVx: 0,
                          flowVy: 0,
                          flowVMag: 0,
                          holdVx: springVx,
                          holdVy: springVy,
                          holdVMag: Math.hypot(springVx, springVy),
                          vx,
                          vy,
                          vMag: Math.hypot(vx, vy),
                          ringPullVx: 0,
                          ringPullVy: 0,
                          stiffness,
                          follow: 0,
                        };

                        // eslint-disable-next-line
                        const nowMs = performance.now();
                        if (nowMs - lastDebugUpdateMsRef.current >= 100) {
                          lastDebugUpdateMsRef.current = nowMs;
                          setDebugTick((t) => (t + 1) % 1_000_000);
                        }
                      }

                      positionsRef.current.set(idx, { dx, dy });
                    });
                  }

                  return particles.map((p, i) => {
                    const dyn =
                      positionsRef.current.get(i) ??
                      ({ dx: 0, dy: 0 } satisfies Offset);

                    const xPos = p.x;
                    const yPos = p.y;

                    const dx = p.baseDx + dyn.dx;
                    const dy = p.baseDy + dyn.dy;

                    const z = clamp(p.z, 0, 1);
                    const sizeScale = 0.6 + (1.0 - 0.6) * z;
                    const sizePx = Math.max(1, p.size * sizeScale);
                    const blurPx = prefersReducedMotion ? 0 : (1 - z) * 1.2;

                    const baseOpacity = p.opacity * (0.55 + 0.45 * z);

                    return (
                      <span
                        key={i}
                        data-testid="breathing-particle"
                        className="absolute rounded-full"
                        style={{
                          left: `${xPos.toFixed(3)}%`,
                          top: `${yPos.toFixed(3)}%`,
                          width: `${sizePx.toFixed(2)}px`,
                          height: `${sizePx.toFixed(2)}px`,
                          opacity: baseOpacity,
                          backgroundColor: phaseColor,
                          filter:
                            blurPx > 0
                              ? `blur(${blurPx.toFixed(2)}px)`
                              : undefined,
                          boxShadow: `0 0 ${22 * (0.6 + 0.6 * z)}px ${phaseColor}66`,
                          transform: `translate(calc(-50% + ${dx.toFixed(2)}px), calc(-50% + ${dy.toFixed(2)}px))`,
                          transition: prefersReducedMotion
                            ? "background-color 150ms linear"
                            : "background-color 500ms ease, box-shadow 500ms ease",
                        }}
                      />
                    );
                  });
                })()}
              </div>
            </div>
          </div>

          <div
            className="text-center"
            style={{
              opacity: uiHidden ? 0 : 1,
              transition: prefersReducedMotion
                ? "opacity 150ms linear"
                : "opacity 600ms ease",
              pointerEvents: uiHidden ? "none" : "auto",
            }}
          >
            <p className="mt-1 text-sm text-zinc-400">
              Elapsed:{" "}
              <span aria-label="elapsed-seconds">{elapsedRounded}</span>s
            </p>
          </div>
        </div>

        <section
          className="flex flex-wrap items-center justify-center gap-3"
          aria-label="Controls"
          style={{
            opacity: uiHidden ? 0 : 1,
            transition: prefersReducedMotion
              ? "opacity 150ms linear"
              : "opacity 600ms ease",
            pointerEvents: uiHidden ? "none" : "auto",
          }}
        >
          <button
            type="button"
            tabIndex={uiHidden ? -1 : 0}
            onClick={() => {
              if (status === "running") {
                setStatus("paused");
                stopRaf();
              } else {
                setStatus("running");
              }
            }}
            className="rounded-md border border-zinc-700 bg-transparent px-4 py-2 text-sm font-medium hover:border-zinc-500 focus:outline-none focus:ring-2 focus:ring-zinc-300"
          >
            {status === "running" ? "Pause" : "Resume"}
          </button>

          <button
            type="button"
            tabIndex={uiHidden ? -1 : 0}
            onClick={() => {
              stopRaf();
              lastTickMsRef.current = null;
              setElapsedActiveSec(0);
              setStatus("running");
            }}
            className="rounded-md border border-zinc-700 bg-transparent px-4 py-2 text-sm font-medium hover:border-zinc-500 focus:outline-none focus:ring-2 focus:ring-zinc-300"
          >
            Restart
          </button>

          <button
            type="button"
            tabIndex={uiHidden ? -1 : 0}
            onClick={() => end("early")}
            className="rounded-md bg-zinc-100 px-4 py-2 text-sm font-semibold text-black hover:bg-zinc-200 focus:outline-none focus:ring-2 focus:ring-zinc-300"
          >
            End
          </button>
        </section>
      </div>

      {debugOverlay ? (
        <div
          data-testid="debug-overlay"
          style={{
            position: "fixed",
            top: 12,
            left: 12,
            zIndex: 9999,
            pointerEvents: "none",
            fontFamily:
              "ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, 'Liberation Mono', 'Courier New', monospace",
            fontSize: 11,
            lineHeight: 1.25,
            color: "#e5e7eb",
            background: "rgba(0,0,0,0.55)",
            border: "1px solid rgba(255,255,255,0.12)",
            borderRadius: 8,
            padding: "10px 10px",
            maxWidth: 360,
            whiteSpace: "pre",
          }}
        >
          {(() => {
            // subscribe to debugTick (state) but render from ref
            void debugTick;
            const s = debugSampleRef.current;
            if (!s) {
              return `debug overlay\nwaiting for sample…`;
            }

            const fmt = (n: number) =>
              Number.isFinite(n) ? n.toFixed(3) : "NaN";
            return [
              `debug overlay (idx=${s.idx})`,
              `elapsedActiveSec=${fmt(s.elapsedActiveSec)}  tInCycle=${fmt(s.tInCycle)}  phase=${s.phase}`,
              `wHold=${fmt(s.wHold)}  wFlow=${fmt(s.wFlow)}`,
              `dx=${fmt(s.dx)}  dy=${fmt(s.dy)}  |d|=${fmt(s.dMag)}`,
              `holdJ.dx=${fmt(s.holdJdx)}  holdJ.dy=${fmt(s.holdJdy)}  |holdJ|=${fmt(s.holdJMag)}`,
              `flowV.vx=${fmt(s.flowVx)}  flowV.vy=${fmt(s.flowVy)}  |flowV|=${fmt(s.flowVMag)}`,
              `holdVx=${fmt(s.holdVx)}  holdVy=${fmt(s.holdVy)}  |holdV|=${fmt(s.holdVMag)}  (follow=${fmt(s.follow)})`,
              `vx=${fmt(s.vx)}  vy=${fmt(s.vy)}  |v|=${fmt(s.vMag)}`,
              `ringPullVx=${fmt(s.ringPullVx)}  ringPullVy=${fmt(s.ringPullVy)}  (stiff=${fmt(s.stiffness)})`,
            ].join("\n");
          })()}
        </div>
      ) : null}
    </main>
  );
}
